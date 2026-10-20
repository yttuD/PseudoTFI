import { Controller, Post, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { PagosService } from './pagos.service.js';
import { SupabaseAuthGuard, type AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';

@Controller('pagos')
export class PagosController {
  constructor(
    private readonly pagosService: PagosService,
    private readonly authzService: AuthorizationService,
  ) {}

  @UseGuards(SupabaseAuthGuard)
  @Post('mercadopago/preferencia')
  async crearPreferencia(@Req() req: AuthenticatedRequest, @Body('cupo_adquirido') cupo_adquirido: number) {
    this.authzService.assertOwnerOnly(req.user);
    const token = req.headers.authorization!.split(' ')[1];
    const gestorId = req.user.id;
    return this.pagosService.crearPreferenciaMercadoPago(token, gestorId, cupo_adquirido);
  }

  // PUBLIC route for MP webhook (no SupabaseAuthGuard)
  @Post('mercadopago/webhook')
  @HttpCode(200)
  async webhookMercadoPago(@Body() body: any) {
    await this.pagosService.procesarWebhookMercadoPago(body);
    return 'OK'; // Always return 200 OK so MP doesn't retry endlessly
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('efectivo')
  async registrarEfectivo(@Req() req: AuthenticatedRequest, @Body('cupo_adquirido') cupo_adquirido: number) {
    this.authzService.assertOwnerOnly(req.user);
    const token = req.headers.authorization!.split(' ')[1];
    const gestorId = req.user.id;
    return this.pagosService.registrarPagoEfectivo(token, gestorId, cupo_adquirido);
  }
}
