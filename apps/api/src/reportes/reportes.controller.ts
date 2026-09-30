import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ReportesService } from './reportes.service.js';
import { CreateReporteDto } from './dto/create-reporte.dto.js';
import { SupabasePublicAuthGuard } from '../auth/supabase-public-auth.guard.js';

@Controller('reportes')
@UseGuards(SupabasePublicAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  create(@Body() createReporteDto: CreateReporteDto, @Request() req: ExpressRequest) {
    return this.reportesService.create(createReporteDto, req.headers.authorization as string);
  }
}
