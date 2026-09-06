import { Controller, Get, Patch, UseGuards, Request, Body, NotImplementedException } from '@nestjs/common';
import { CupoService } from './cupo.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';
import { SubirCupoDto } from './dto/subir-cupo.dto.js';

@Controller('cupo')
@UseGuards(SupabaseAuthGuard)
export class CupoController {
  constructor(private readonly cupoService: CupoService) {}

  @Get()
  async getCupo(@Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.cupoService.getCupo(token);
  }

  @Patch()
  async subirCupo(@Body() dto: SubirCupoDto) {
    // TODO Fase 4: integración con Mercado Pago Suscripciones
    throw new NotImplementedException('Integración con Mercado Pago pendiente (Fase 4)');
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
