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

  it.each(['dev-random', 'mock-random', 'dev-token-gestor-demo', 'mock-arbitrary'])(
    'does not trust unverified demo prefix %s, even with development auth enabled',
    async (token) => {
      vi.stubEnv('RENDO_BETA_MODE', 'false');
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('AUTH_ALLOW_DEV_TOKENS', 'true');
      const { controller, marketplace, supabase } = setup(async () => ({
        data: { user: { id: 'should-not-be-used' } },
        error: null,
      }));
      await controller.findOne('unit', 'es', {
        headers: { authorization: `Bearer ${token}` },
      } as Request);
      expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'es');
      expect(supabase.getClient).not.toHaveBeenCalled();
    },
  );

  it('keeps private details inaccessible without a bearer session', async () => {
    const { controller, marketplace, supabase } = setup(async () => ({
      data: { user: { id: 'should-not-be-used' } },
      error: null,
    }));
    await controller.findOne('unit', 'en', { headers: {} } as Request);
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'en');
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it('does not unlock a detail when Supabase returns no verified user id', async () => {
    const { controller, marketplace } = setup(async () => ({
      data: { user: {} },
      error: null,
    }));
    await controller.findOne('unit', 'es', {
      headers: { authorization: 'Bearer fake-session' },
    } as Request);
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'es');
  });

  it('fails closed when Supabase token verification throws', async () => {
    const { controller, marketplace } = setup(async () => {
      throw new Error('Auth unavailable');
    });
    await controller.findOne('unit', 'es', {
      headers: { authorization: 'Bearer expired-session' },
    } as Request);
    expect(marketplace.findOne).toHaveBeenCalledWith('unit', false, 'es');
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
