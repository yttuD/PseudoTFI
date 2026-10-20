import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service.js';

function config(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

afterEach(() => vi.unstubAllGlobals());

describe('hosted Supabase configuration', () => {
  it('refuses to start without an API-only service key', () => {
    expect(() => new SupabaseService(config({
      SUPABASE_URL: 'https://beta-data.example.test',
      SUPABASE_ANON_KEY: 'public-key',
    }))).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('checks the configured hosted Auth health endpoint, not local port 54321', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const service = new SupabaseService(config({
      SUPABASE_URL: 'https://beta-data.example.test',
      SUPABASE_ANON_KEY: 'public-key',
      SUPABASE_SERVICE_ROLE_KEY: 'private-key',
    }));

    expect(await service.isOnline()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://beta-data.example.test/auth/v1/health',
      expect.objectContaining({ headers: { apikey: 'public-key' } }),
    );
  });
});
