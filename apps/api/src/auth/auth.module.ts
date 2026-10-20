import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { SupabasePublicAuthGuard } from './supabase-public-auth.guard.js';

@Global()
@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [SupabaseAuthGuard, SupabasePublicAuthGuard],
  exports: [SupabaseAuthGuard, SupabasePublicAuthGuard],
})
export class AuthModule {}
