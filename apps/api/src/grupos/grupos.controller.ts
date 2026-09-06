import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { GruposService } from './grupos.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

@UseGuards(SupabaseAuthGuard)
@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.gruposService.findAll(req.user.workspace_id, token);
  }

  @Post()
  create(@Body() createGrupoDto: { nombre: string }, @Request() req: AuthenticatedRequest) {
    const token = this.extractToken(req);
    return this.gruposService.create(createGrupoDto.nombre, req.user.workspace_id, token);
  }

  private extractToken(req: AuthenticatedRequest): string {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}
