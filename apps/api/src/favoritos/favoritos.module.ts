import { Module } from '@nestjs/common';
import { FavoritosService } from './favoritos.service.js';
import { FavoritosController } from './favoritos.controller.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [FavoritosController],
  providers: [FavoritosService]
})
export class FavoritosModule {}
