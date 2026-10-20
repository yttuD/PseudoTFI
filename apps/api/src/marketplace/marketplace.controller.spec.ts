import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceController } from './marketplace.controller.js';
import type { MarketplaceService } from './marketplace.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import type { Request } from 'express';

afterEach(() => vi.unstubAllEnvs());

describe('public detail contact privacy', () => {
  function setup(getUser: () => Promise<unknown>) {
    const marketplace = { findOne: vi.fn().mockResolvedValue({ id: 'unit' }) };
    const supabase = { getClient: vi.fn().mockReturnValue({ auth: { getUser } }) };
    return {
      marketplace,
      supabase,
      controller: new MarketplaceController(
        marketplace as unknown as MarketplaceService,
        supabase as unknown as SupabaseService,
      ),
    };
  }

  it('invalid bearer tokens do not reveal exact location or contact eligibility', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const { controller, marketplace } = setup(async () => ({ data: { user: null }, error: { message: 'bad token' } }));
    await controller.findOne('unit', 'es', { headers: { authorization: 'Bearer invalid' } } as Request);
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'es');
  });

  it('beta refuses development tokens even if an Authorization header is present', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const { controller, marketplace, supabase } = setup(async () => ({ data: { user: null } }));
    await controller.findOne('unit', 'es', { headers: { authorization: 'Bearer dev-token-gestor-demo' } } as Request);
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'es');
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it('accepts a verified Supabase user only', async () => {
    const { controller, marketplace, supabase } = setup(async () => ({ data: { user: { id: 'real-user' } }, error: null }));
    await controller.findOne('unit', 'es', { headers: { authorization: 'Bearer signed-token' } } as Request);
    expect(supabase.getClient).toHaveBeenCalledWith('signed-token');
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', true, 'es');
  });

  it('rejects an unsupported locale in the dynamic detail column selection', async () => {
    const { controller, marketplace } = setup(async () => ({ data: { user: null }, error: null }));
    await controller.findOne('unit', 'es,whatsapp', { headers: {} } as Request);
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'es');
  });
});
