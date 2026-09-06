import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service.js';
import { ReportesController } from './reportes.controller.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ReportesController],
  providers: [ReportesService]
})
export class ReportesModule {}
