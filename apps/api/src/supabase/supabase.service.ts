import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private supabaseServiceRoleKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.requiredSetting('SUPABASE_URL');
    this.supabaseAnonKey = this.requiredSetting('SUPABASE_ANON_KEY');
    this.supabaseServiceRoleKey = this.requiredSetting('SUPABASE_SERVICE_ROLE_KEY');
  }

  private requiredSetting(name: string): string {
    const value = this.configService.get<string>(name)?.trim();
    if (!value) throw new Error(`Missing required setting: ${name}`);
    return value;
  }

  // Obtiene un cliente con la sesión del usuario para respetar RLS (o anónimo si no hay token)
  getClient(token?: string): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        fetch: (url: any, options: any) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
        },
      },
    });
  }

  // Cliente con privilegios administrativos (bypassea RLS)
  getAdminClient(): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseServiceRoleKey, {
      global: {
        fetch: (url: any, options: any) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
        },
      },
    });
  }

  private isOnlineCached: boolean | null = null;
  private lastCheck: number = 0;

  async isOnline(): Promise<boolean> {
    const now = Date.now();
    if (this.isOnlineCached !== null && now - this.lastCheck < 15000) {
      return this.isOnlineCached;
    }
    
    try {
      const response = await fetch(new URL('/auth/v1/health', this.supabaseUrl).toString(), {
        headers: { apikey: this.supabaseAnonKey },
        signal: AbortSignal.timeout(3000),
      });
      this.isOnlineCached = response.ok;
    } catch {
      this.isOnlineCached = false;
    }
    this.lastCheck = now;
    return this.isOnlineCached;
  }
}
