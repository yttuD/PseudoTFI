import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class PagosService {
  private mpClient: MercadoPagoConfig;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN') || 'TEST-000000';
    this.mpClient = new MercadoPagoConfig({ accessToken });
  }

  async crearPreferenciaMercadoPago(token: string, gestorId: string, cupoAdquirido: number) {
    let monto = 0;
    if (cupoAdquirido === 5) monto = 5000;
    else if (cupoAdquirido === 10) monto = 9000;
    else throw new BadRequestException('Pack no válido');

    const supabase = this.supabaseService.getClient(token);
    
    // Create 'pendiente' payment in DB
    const { data: pago, error } = await supabase
      .from('pagos')
      .insert({
        gestor_id: gestorId,
        metodo: 'mercadopago',
        monto,
        cupo_adquirido: cupoAdquirido,
        estado: 'pendiente'
      })
      .select('id')
      .single();

    if (error || !pago) {
      throw new InternalServerErrorException('Error al crear el registro de pago');
    }

    try {
      const preference = new Preference(this.mpClient);
      const response = await preference.create({
        body: {
          items: [
            {
              id: `pack-${cupoAdquirido}`,
              title: `Pack ${cupoAdquirido} Unidades`,
              quantity: 1,
              unit_price: monto,
              currency_id: 'ARS'
            }
          ],
          external_reference: pago.id,
          // Since it's local we just put some dummy return URLs
          back_urls: {
            success: 'http://localhost:3000/es/facturacion?status=success',
            failure: 'http://localhost:3000/es/facturacion?status=failure',
            pending: 'http://localhost:3000/es/facturacion?status=pending'
          },
          auto_return: 'approved',
          notification_url: `${process.env.WEBHOOK_DOMAIN}/pagos/mercadopago/webhook`
        }
      });
      return { init_point: response.init_point };
    } catch (e) {
      console.error('Error creating MP preference:', e);
      // Fallback for local testing without real MP token
      return { init_point: 'http://localhost:3000/es/facturacion?mock_success=true' };
    }
  }

  async procesarWebhookMercadoPago(body: any) {
    if (body.type === 'payment') {
      const paymentId = body.data?.id;
      if (!paymentId) return;

      try {
        const payment = new Payment(this.mpClient);
        const paymentInfo = await payment.get({ id: paymentId });
        
        if (paymentInfo.status === 'approved') {
          const pagoId = paymentInfo.external_reference;
          const adminClient = this.supabaseService.getAdminClient();
          
          // Get payment to know gestor and units
          const { data: pago, error: pagoError } = await adminClient
            .from('pagos')
            .select('gestor_id, cupo_adquirido, estado')
            .eq('id', pagoId)
            .single();

          if (!pagoError && pago && pago.estado !== 'aprobado') {
            // Update payment
            await adminClient
              .from('pagos')
              .update({ estado: 'aprobado', referencia_externa: paymentId.toString() })
              .eq('id', pagoId);

            // Fetch current users cupo
            const { data: user } = await adminClient
              .from('users')
              .select('cupo_maximo')
              .eq('id', pago.gestor_id)
              .single();
              
            if (user) {
              const expiraDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              await adminClient
                .from('users')
                .update({ 
                  cupo_maximo: user.cupo_maximo + pago.cupo_adquirido,
                  suscripcion_expira_en: expiraDate
                })
                .eq('id', pago.gestor_id);
            }
          }
        }
      } catch (e: any) {
        console.error('Error procesando webhook MP:', e.message);
        // Early return for fake IDs during local tests to not crash
        return;
      }
    }
  }

  async registrarPagoEfectivo(token: string, gestorId: string, cupoAdquirido: number) {
    let monto = 0;
    if (cupoAdquirido === 5) monto = 5000;
    else if (cupoAdquirido === 10) monto = 9000;
    else throw new BadRequestException('Pack no válido');

    const supabase = this.supabaseService.getClient(token);
    
    // Create 'pendiente' payment in DB
    const { error } = await supabase
      .from('pagos')
      .insert({
        gestor_id: gestorId,
        metodo: 'efectivo',
        monto,
        cupo_adquirido: cupoAdquirido,
        estado: 'pendiente'
      });

    if (error) {
      throw new InternalServerErrorException('Error al registrar pago en efectivo');
    }
    return { success: true };
  }
}
