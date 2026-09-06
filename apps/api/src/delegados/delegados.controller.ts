import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { DelegadosService } from './delegados.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

@Controller('delegados')
@UseGuards(SupabaseAuthGuard)
export class DelegadosController {
  constructor(private readonly delegadosService: DelegadosService) {}

  @Post('invitar')
  invitar(@Body('email') email: string, @Request() req: AuthenticatedRequest) {
    const user = req.user;
    return this.delegadosService.invitar(email, user.workspace_id, user.rol);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.delegadosService.findAll(req.user.workspace_id);
  }
}
