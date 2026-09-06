import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
