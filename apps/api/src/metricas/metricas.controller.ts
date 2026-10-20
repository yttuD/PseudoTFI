import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { MetricasService } from './metricas.service.js';
import { GetMetricasDto } from './dto/get-metricas.dto.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

@UseGuards(SupabaseAuthGuard)
@Controller('metricas')
export class MetricasController {
  constructor(private readonly metricasService: MetricasService) {}

  @Get()
  getMetricas(
    @Query() query: GetMetricasDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const token = this.extractToken(req);
    return this.metricasService.getMetricas(query, req.user, token);
  }

  private extractToken(req: AuthenticatedRequest): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return token;
  }
}

