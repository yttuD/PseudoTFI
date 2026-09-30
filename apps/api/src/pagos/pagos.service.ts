import { Injectable, BadRequestException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

import { calcularPrecioCompraIncremental } from '@tfi/types';
import { isReleaseRuntime } from '../config/release-readiness.js';

@Injectable()
export class PagosService {
  private mpClient: MercadoPagoConfig | null;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    this.mpClient = accessToken ? new MercadoPagoConfig({ accessToken }) : null;
  }

  private assertPaymentsEnabled(): void {
    if (process.env.RENDO_BETA_MODE === 'true' ||
        (isReleaseRuntime() && process.env.PAYMENTS_ENABLED !== 'true')) {
      throw new ServiceUnavailableException('Los pagos no están habilitados en esta versión de prueba');
    }
  }

  async crearPreferenciaMercadoPago(token: string, gestorId: string, cupoAdquirido: number) {
    this.assertPaymentsEnabled();
    if (!this.mpClient) throw new ServiceUnavailableException('Mercado Pago no está configurado');
    if (!cupoAdquirido || cupoAdquirido < 1) {
      throw new BadRequestException('La cantidad de unidades de cupo debe ser al menos 1');
    }

    const supabase = this.supabaseService.getClient(token);

    // Consultar el cupo_maximo actual para aplicar el descuento sobre el total consolidado
    const { data: userProfile } = await supabase
      .from('users')
      .select('cupo_maximo')
      .eq('id', gestorId)
      .single();

    const cupoActual = userProfile?.cupo_maximo || 0;
    const calculo = calcularPrecioCompraIncremental(cupoActual, cupoAdquirido);
    const monto = calculo.montoACobrar;
    
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
              id: `cupo-${cupoAdquirido}`,
              title: `Cupo adicional: +${cupoAdquirido} ${cupoAdquirido === 1 ? 'Unidad' : 'Unidades'} (Total cuenta: ${calculo.cupoTotalResultante} U, ${calculo.descuentoResultantePorcentaje}% desc.)`,
              quantity: 1,
              unit_price: monto,
              currency_id: 'ARS'
            }
          ],
          external_reference: pago.id,
          back_urls: {
            success: `${this.configService.get<string>('WEB_PUBLIC_URL') || 'http://localhost:3000'}/es/facturacion?status=success`,
            failure: `${this.configService.get<string>('WEB_PUBLIC_URL') || 'http://localhost:3000'}/es/facturacion?status=failure`,
            pending: `${this.configService.get<string>('WEB_PUBLIC_URL') || 'http://localhost:3000'}/es/facturacion?status=pending`
          },
          auto_return: 'approved',
          notification_url: `${process.env.WEBHOOK_DOMAIN}/pagos/mercadopago/webhook`
        }
      });
      return { init_point: response.init_point };
    } catch (e) {
      console.error('Error creating MP preference:', e);
      throw new ServiceUnavailableException('No se pudo iniciar el pago');
    }
  }

  async procesarWebhookMercadoPago(body: any) {
    this.assertPaymentsEnabled();
    if (!this.mpClient) throw new ServiceUnavailableException('Mercado Pago no está configurado');
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
    this.assertPaymentsEnabled();
    if (!cupoAdquirido || cupoAdquirido < 1) {
      throw new BadRequestException('La cantidad de unidades de cupo debe ser al menos 1');
    }

    const supabase = this.supabaseService.getClient(token);

    // Consultar el cupo_maximo actual para aplicar el descuento sobre el total consolidado
    const { data: userProfile } = await supabase
      .from('users')
      .select('cupo_maximo')
      .eq('id', gestorId)
      .single();

    const cupoActual = userProfile?.cupo_maximo || 0;
    const calculo = calcularPrecioCompraIncremental(cupoActual, cupoAdquirido);
    const monto = calculo.montoACobrar;

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
