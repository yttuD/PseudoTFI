import { Controller, Get, Patch, UseGuards, Request, Body, NotImplementedException } from '@nestjs/common';
import { CupoService } from './cupo.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { SubirCupoDto } from './dto/subir-cupo.dto.js';

@Controller('cupo')
@UseGuards(SupabaseAuthGuard)
export class CupoController {
  constructor(
    private readonly cupoService: CupoService,
    private readonly authzService: AuthorizationService,
  ) {}

  @Get()
  async getCupo(@Request() req: AuthenticatedRequest) {
    this.authzService.assertOwnerOnly(req.user);
    const token = this.extractToken(req);
    return this.cupoService.getCupo(token);
  }

  @Patch()
  async subirCupo(@Request() req: AuthenticatedRequest, @Body() dto: SubirCupoDto) {
    this.authzService.assertOwnerOnly(req.user);
    // TODO Fase 4: integración con Mercado Pago Suscripciones
    throw new NotImplementedException('Integración con Mercado Pago pendiente (Fase 4)');
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
