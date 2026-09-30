import { afterEach, describe, expect, it, vi } from 'vitest';
import { AfipService } from './afip.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';

afterEach(() => vi.unstubAllEnvs());

describe('release fiscal gate', () => {
  it('beta blocks fake CAE generation and fiscal configuration before database access', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const db = { getClient: vi.fn() };
    const service = new AfipService(db as unknown as SupabaseService);
    await expect(service.getConfig('token', 'owner')).rejects.toMatchObject({ status: 503 });
    await expect(service.emitirComprobante({} as never, 'token', 'owner'))
      .rejects.toMatchObject({ status: 503 });
    expect(db.getClient).not.toHaveBeenCalled();
  });
});
