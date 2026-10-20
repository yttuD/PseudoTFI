import { Module } from '@nestjs/common';
import { AfipController } from './afip.controller.js';
import { AfipService } from './afip.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';

@Module({
  imports: [SupabaseModule],
  controllers: [AfipController],
  providers: [AfipService],
  exports: [AfipService],
})
export class AfipModule {}
