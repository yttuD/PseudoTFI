import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabasePublicAuthGuard } from './supabase-public-auth.guard.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import type { SupabaseAuthGuard } from './supabase-auth.guard.js';
import type { ExecutionContext } from '@nestjs/common';

afterEach(() => vi.unstubAllEnvs());

const seekerId = '77777777-7777-7777-7777-777777777771';

function makeGuard(authenticated: boolean, profileRole = 'buscador') {
  const user = authenticated ? { id: seekerId, email: 'seeker@example.test' } : null;
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({
      data: { id: seekerId, rol: profileRole, deleted_at: null }, error: null,
    }) }) }) })),
  };
  const guard = new SupabasePublicAuthGuard(
    { getClient: vi.fn(() => client) } as unknown as SupabaseService,
    { canActivate: vi.fn() } as unknown as SupabaseAuthGuard,
  );
  const request: { headers: { authorization: string }; user?: unknown } = {
    headers: { authorization: 'Bearer real-user-token' },
  };
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
  return { guard, context, request };
}

describe('public authenticated access', () => {
  it('accepts a canonical buscador for favorites without giving an operational context', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const { guard, context, request } = makeGuard(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: seekerId, rol: 'buscador' });
  });

  it('rejects invalid Supabase sessions', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const { guard, context, request } = makeGuard(false);
    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
    expect(request.user).toBeUndefined();
  });
});
