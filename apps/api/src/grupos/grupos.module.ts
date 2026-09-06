import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller.js';
import { GruposService } from './grupos.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [GruposController],
  providers: [GruposService]
})
export class GruposModule {}
