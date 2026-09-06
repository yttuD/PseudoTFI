import { Module } from '@nestjs/common';
import { CupoController } from './cupo.controller.js';
import { CupoService } from './cupo.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [CupoController],
  providers: [CupoService],
  exports: [CupoService],
})
export class CupoModule {}
