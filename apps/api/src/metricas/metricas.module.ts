import { Module } from '@nestjs/common';
import { MetricasController } from './metricas.controller.js';
import { MetricasService } from './metricas.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { SupabaseModule } from '../supabase/supabase.module.js';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [MetricasController],
  providers: [MetricasService],
  exports: [MetricasService],
})
export class MetricasModule {}
