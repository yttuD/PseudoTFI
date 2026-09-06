import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private supabaseServiceRoleKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL')!;
    // Locally, SUPABASE_ANON_KEY is usually in web/.env.local, but for the API, 
    // it's better to use the ANON KEY for JWT pass-through.
    // Wait, the API .env doesn't have ANON_KEY right now. I should add it, or just read the SERVICE_ROLE_KEY if needed.
    // Actually, createClient needs anon key for JWT pass-through.
    // Wait, if I use the Service Role Key for JWT pass-through, it overrides RLS? No, if we pass JWT in global headers,
    // the user's JWT takes precedence for RLS if we use the ANON key. If we use the SERVICE ROLE key, it bypasses RLS unless we do complex stuff.
    // We will just read SUPABASE_ANON_KEY.
    this.supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY')!;
    this.supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  // Obtiene un cliente con la sesión del usuario para respetar RLS (o anónimo si no hay token)
  getClient(token?: string): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, token ? {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    } : undefined);
  }

  // Cliente con privilegios administrativos (bypassea RLS)
  getAdminClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseServiceRoleKey);
  }
}
