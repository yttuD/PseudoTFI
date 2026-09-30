import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SupabaseAuthGuard,
  AUTH_UNAUTHORIZED_MESSAGE,
  AuthenticatedUser,
} from './supabase-auth.guard.js';
import { SupabaseService } from '../supabase/supabase.service.js';

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser;
  [key: string]: unknown;
}

type MockGetUserResult = {
  data: {
    user: {
      id: string;
      email?: string;
      [key: string]: unknown;
    } | null;
  } | null;
  error: { message: string; status?: number; code?: string } | null;
};

type MockProfileResult = {
  data: {
    id: string;
    rol: string;
    workspace_id: string | null;
    deleted_at: string | null;
    [key: string]: unknown;
  } | null;
  error: { message: string; code?: string } | null;
};

interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn<[string?], Promise<MockGetUserResult>>>;
  };
  from: ReturnType<typeof vi.fn<[string], MockSupabaseClient>>;
  select: ReturnType<typeof vi.fn<[string], MockSupabaseClient>>;
  eq: ReturnType<typeof vi.fn<[string, unknown], MockSupabaseClient>>;
  single: ReturnType<typeof vi.fn<[], Promise<MockProfileResult>>>;
}

interface MockSupabaseService {
  getClient: ReturnType<typeof vi.fn<[string?], MockSupabaseClient>>;
  decode?: ReturnType<typeof vi.fn>;
}

interface MockConfigService {
  get: ReturnType<typeof vi.fn<[string], string | undefined>>;
}

function createMockContext(authHeader?: string): { context: ExecutionContext; req: MockRequest } {
  const req: MockRequest = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
    user: undefined,
  };

  const context: ExecutionContext = {
    switchToHttp: () => ({
      getRequest: <T>() => req as unknown as T,
      getResponse: <T>() => ({} as T),
      getNext: <T>() => ({} as T),
    }),
    getClass: () => Object as unknown as new (...args: unknown[]) => unknown,
    getHandler: () => (() => undefined) as unknown as (...args: unknown[]) => unknown,
    getArgs: () => [] as unknown[],
    getArgByIndex: () => undefined as unknown,
    switchToRpc: () => ({
      getData: <T>() => ({} as T),
      getContext: <T>() => ({} as T),
    }),
    switchToWs: () => ({
      getClient: <T>() => ({} as T),
      getData: <T>() => ({} as T),
      getPattern: () => '',
    }),
    getType: () => 'http',
  };

  return { context, req };
}

async function expectUnauthorized(
  promise: Promise<boolean>,
  req: MockRequest,
): Promise<void> {
  let caughtError: unknown;
  try {
    await promise;
  } catch (err) {
    caughtError = err;
  }
  expect(caughtError).toBeInstanceOf(UnauthorizedException);
  expect((caughtError as UnauthorizedException).message).toBe(AUTH_UNAUTHORIZED_MESSAGE);
  expect(req.user).toBeUndefined();
}

describe('SupabaseAuthGuard - User Story 1: Reject Untrusted Credentials', () => {
  let mockConfigService: MockConfigService;
  let mockSupabaseService: MockSupabaseService;
  let mockSupabaseClient: MockSupabaseClient;
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'false';
        if (key === 'SUPABASE_URL') return 'http://127.0.0.1:54321';
        if (key === 'SUPABASE_ANON_KEY') return 'anon-key';
        return undefined;
      }),
    };

    const client: Partial<MockSupabaseClient> = {
      auth: {
        getUser: vi.fn(),
      },
      single: vi.fn(),
    };
    client.from = vi.fn().mockReturnValue(client as MockSupabaseClient);
    client.select = vi.fn().mockReturnValue(client as MockSupabaseClient);
    client.eq = vi.fn().mockReturnValue(client as MockSupabaseClient);

    mockSupabaseClient = client as MockSupabaseClient;

    mockSupabaseService = {
      getClient: vi.fn(() => mockSupabaseClient),
    };

    guard = new SupabaseAuthGuard(
      mockSupabaseService as unknown as SupabaseService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('FR-001: Header validation and strict Bearer format', () => {
    it('denies access with uniform message when Authorization header is missing', async () => {
      const { context, req } = createMockContext(undefined);
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies access with uniform message when scheme is not Bearer (e.g. Basic)', async () => {
      const { context, req } = createMockContext('Basic dXNlcjpwYXNz');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies access with uniform message when Bearer token is empty', async () => {
      const { context, req } = createMockContext('Bearer ');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies access with uniform message when header contains extra space-delimited segments', async () => {
      const { context, req } = createMockContext('Bearer token extra-segment');
      await expectUnauthorized(guard.canActivate(context), req);
    });
  });

  describe('FR-003: Rejection of audited bypass vectors', () => {
    it('denies arbitrary token longer than 10 characters without fallback identity', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      const { context, req } = createMockContext('Bearer arbitrary-string-longer-than-ten');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies token containing "gestor" substring without fallback identity', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      const { context, req } = createMockContext('Bearer forge-gestor-token');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies token containing "delegado" substring without fallback identity', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      const { context, req } = createMockContext('Bearer forge-delegado-token');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies decodable JWT-shaped token without authoritative validation', async () => {
      const unverifiedJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEifQ.fake-signature';
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Signature verification failed' },
      });
      const { context, req } = createMockContext(`Bearer ${unverifiedJwt}`);
      await expectUnauthorized(guard.canActivate(context), req);
    });
  });

  describe('FR-002, FR-004: Authoritative provider failure handling (fail-closed)', () => {
    it('denies access when Supabase returns an explicit error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired', status: 401 },
      });
      const { context, req } = createMockContext('Bearer expired-token-12345');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies access when Supabase returns no user and no explicit error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      const { context, req } = createMockContext('Bearer unknown-token-12345');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies access when Supabase auth.getUser throws an exception or network timeout', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network connection timeout'));
      const { context, req } = createMockContext('Bearer timeout-token-12345');
      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies access when authenticated user ID is not a valid UUID', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'invalid-non-uuid-user', email: 'test@example.com' } },
        error: null,
      });
      const { context, req } = createMockContext('Bearer valid-token-bad-id');
      await expectUnauthorized(guard.canActivate(context), req);
    });
  });

  describe('FR-010: Error non-disclosure and exact message uniformity', () => {
    it('returns generic denial message without exposing internal provider error message or token', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('internal db connection failed on postgres://secret'),
      );
      const { context, req } = createMockContext('Bearer sensitive-token-xyz');

      let thrownError: unknown;
      try {
        await guard.canActivate(context);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(UnauthorizedException);
      expect((thrownError as UnauthorizedException).message).toBe(AUTH_UNAUTHORIZED_MESSAGE);
      expect((thrownError as UnauthorizedException).message).not.toContain('postgres://secret');
      expect((thrownError as UnauthorizedException).message).not.toContain('sensitive-token-xyz');
      expect(req.user).toBeUndefined();
    });
  });
});

describe('User Story 2: Resolve Canonical Operational Identity', () => {
  const gestorId = '11111111-1111-1111-1111-111111111111';
  const delegadoId = '33333333-3333-3333-3333-333333333333';
  const otherWsId = '99999999-9999-9999-9999-999999999999';

  let mockConfigService: MockConfigService;
  let mockSupabaseService: MockSupabaseService;
  let mockSupabaseClient: MockSupabaseClient;
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'false';
        return undefined;
      }),
    };

    const client: Partial<MockSupabaseClient> = {
      auth: {
        getUser: vi.fn(),
      },
      single: vi.fn(),
    };
    client.from = vi.fn().mockReturnValue(client as MockSupabaseClient);
    client.select = vi.fn().mockReturnValue(client as MockSupabaseClient);
    client.eq = vi.fn().mockReturnValue(client as MockSupabaseClient);

    mockSupabaseClient = client as MockSupabaseClient;

    mockSupabaseService = {
      getClient: vi.fn(() => mockSupabaseClient),
    };

    guard = new SupabaseAuthGuard(
      mockSupabaseService as unknown as SupabaseService,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('accepts valid Gestor with null workspace_id and resolves workspace_id to own id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: gestorId, email: 'gestor@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: gestorId, rol: 'gestor', workspace_id: null, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer valid-gestor-token');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: gestorId,
      email: 'gestor@renda.com.ar',
      rol: 'gestor',
      workspace_id: gestorId,
    });
  });

  it('accepts valid Gestor with workspace_id explicitly matching own id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: gestorId, email: 'gestor@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: gestorId, rol: 'gestor', workspace_id: gestorId, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer valid-gestor-token');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: gestorId,
      email: 'gestor@renda.com.ar',
      rol: 'gestor',
      workspace_id: gestorId,
    });
  });

  it('denies Gestor whose profile points to a different workspace_id (cross-workspace link)', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: gestorId, email: 'gestor@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: gestorId, rol: 'gestor', workspace_id: otherWsId, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer gestor-cross-ws-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('accepts valid Delegado with distinct owning Gestor workspace_id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: delegadoId, email: 'delegado@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: delegadoId, rol: 'delegado', workspace_id: gestorId, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer valid-delegado-token');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: delegadoId,
      email: 'delegado@renda.com.ar',
      rol: 'delegado',
      workspace_id: gestorId,
    });
  });

  it('denies Delegado with missing/null workspace_id', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: delegadoId, email: 'delegado@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: delegadoId, rol: 'delegado', workspace_id: null, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer delegado-no-ws-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('denies Delegado whose workspace_id equals own id (self-workspace)', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: delegadoId, email: 'delegado@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: delegadoId, rol: 'delegado', workspace_id: delegadoId, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer delegado-self-ws-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('denies Delegado whose workspace_id is not a valid UUID', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: delegadoId, email: 'delegado@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: delegadoId, rol: 'delegado', workspace_id: 'invalid-ws-id', deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer delegado-bad-ws-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('denies access when canonical profile does not exist or query fails', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: gestorId, email: 'gestor@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' },
    });
    const { context, req } = createMockContext('Bearer no-profile-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('denies access when canonical profile is soft-deleted (deleted_at is set)', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: gestorId, email: 'gestor@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: gestorId, rol: 'gestor', workspace_id: null, deleted_at: '2026-09-01T00:00:00Z' },
      error: null,
    });
    const { context, req } = createMockContext('Bearer deleted-profile-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('denies access when canonical profile has unsupported role (e.g. buscador or admin in public.users)', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: gestorId, email: 'gestor@renda.com.ar' } },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: gestorId, rol: 'buscador', workspace_id: null, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer unsupported-role-token');
    await expectUnauthorized(guard.canActivate(context), req);
  });

  it('never uses caller-controlled metadata or email to infer role or attach extra properties', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: gestorId,
          email: 'fake-delegado-in-email@renda.com.ar',
          user_metadata: { role: 'admin', superuser: true, workspace_id: otherWsId },
        },
      },
      error: null,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: gestorId, rol: 'gestor', workspace_id: null, deleted_at: null },
      error: null,
    });
    const { context, req } = createMockContext('Bearer metadata-tampering-token');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: gestorId,
      email: 'fake-delegado-in-email@renda.com.ar',
      rol: 'gestor',
      workspace_id: gestorId,
    });

    const userRecord = req.user as unknown as Record<string, unknown>;
    expect(userRecord.superuser).toBeUndefined();
    expect(userRecord.user_metadata).toBeUndefined();
  });
});

describe('User Story 3: Explicit Local Demo Authentication', () => {
  const fixedGestorId = '11111111-1111-1111-1111-111111111111';
  const fixedDelegadoId = '33333333-3333-3333-3333-333333333333';
  const fixedBuscadorId = '22222222-2222-2222-2222-222222222222';
  const customUuid = '44444444-4444-4444-4444-444444444444';
  const customUuidUpper = '44444444-4444-4444-4444-44444444444A';

  let mockConfigService: MockConfigService;
  let mockSupabaseService: MockSupabaseService;
  let mockSupabaseClient: MockSupabaseClient;
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'true';
        return undefined;
      }),
    };

    const client: Partial<MockSupabaseClient> = {
      auth: {
        getUser: vi.fn(),
      },
      single: vi.fn(),
    };
    client.from = vi.fn().mockReturnValue(client as MockSupabaseClient);
    client.select = vi.fn().mockReturnValue(client as MockSupabaseClient);
    client.eq = vi.fn().mockReturnValue(client as MockSupabaseClient);

    mockSupabaseClient = client as MockSupabaseClient;

    mockSupabaseService = {
      getClient: vi.fn(() => mockSupabaseClient),
    };

    guard = new SupabaseAuthGuard(
      mockSupabaseService as unknown as SupabaseService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('FR-008: Dual-condition runtime gating', () => {
    it('denies exact demo token with uniform message when AUTH_ALLOW_DEV_TOKENS is not set', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });
      const { context, req } = createMockContext('Bearer dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies exact demo token with uniform message when AUTH_ALLOW_DEV_TOKENS is "false"', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'false';
        return undefined;
      });
      const { context, req } = createMockContext('Bearer dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies exact demo token when AUTH_ALLOW_DEV_TOKENS is not exact lowercase "true" (e.g. "True", "1")', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'True';
        return undefined;
      });
      const { context, req } = createMockContext('Bearer dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies exact demo token in production with uniform message even if AUTH_ALLOW_DEV_TOKENS is "true"', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'true';
        return undefined;
      });
      const { context, req } = createMockContext('Bearer dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies exact demo token in other/staging environments even if AUTH_ALLOW_DEV_TOKENS is "true"', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'staging';
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'true';
        return undefined;
      });
      const { context, req } = createMockContext('Bearer dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies exact demo token when NODE_ENV is undefined even if AUTH_ALLOW_DEV_TOKENS is "true"', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AUTH_ALLOW_DEV_TOKENS') return 'true';
        return undefined;
      });
      const { context, req } = createMockContext('Bearer dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });
  });

  describe('FR-009: Compatibility credentials and generated formats in allowed environment', () => {
    it('accepts exact "dev-access-token" as gestor with fixed id/workspace and no provider call', async () => {
      const { context, req } = createMockContext('Bearer dev-access-token');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: fixedGestorId,
        rol: 'gestor',
        workspace_id: fixedGestorId,
      });
      expect(req.user?.email).toBeUndefined();
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts exact "dev-access-token-gestor" as gestor with fixed id/workspace', async () => {
      const { context, req } = createMockContext('Bearer dev-access-token-gestor');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: fixedGestorId,
        rol: 'gestor',
        workspace_id: fixedGestorId,
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts exact "dev-access-token-delegado" as delegado linked to fixed Gestor workspace', async () => {
      const { context, req } = createMockContext('Bearer dev-access-token-delegado');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: fixedDelegadoId,
        rol: 'delegado',
        workspace_id: fixedGestorId,
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts exact "dev-access-token-buscador" as buscador with fixed id/workspace', async () => {
      const { context, req } = createMockContext('Bearer dev-access-token-buscador');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: fixedBuscadorId,
        rol: 'buscador',
        workspace_id: fixedBuscadorId,
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts generated "dev-token-gestor-<uuid>" format', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-gestor-${customUuid}`);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: customUuid,
        rol: 'gestor',
        workspace_id: customUuid,
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts generated "dev-token-gestor-<uuid>" format with uppercase UUID hex digits and normalizes id to lowercase', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-gestor-${customUuidUpper}`);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: customUuidUpper.toLowerCase(),
        rol: 'gestor',
        workspace_id: customUuidUpper.toLowerCase(),
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts generated "dev-token-delegado-<uuid>" format linked to fixed gestor workspace', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-delegado-${customUuid}`);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: customUuid,
        rol: 'delegado',
        workspace_id: fixedGestorId,
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('accepts generated "dev-token-buscador-<uuid>" format', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-buscador-${customUuid}`);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(req.user).toEqual({
        id: customUuid,
        rol: 'buscador',
        workspace_id: customUuid,
      });
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies generated token with unsupported role (e.g. dev-token-admin-<uuid>) with uniform message', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-admin-${customUuid}`);

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies generated token with invalid non-UUID identifier with uniform message', async () => {
      const { context, req } = createMockContext('Bearer dev-token-gestor-not-a-valid-uuid');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies demo-like token with prefix (e.g. prefix-dev-access-token) with uniform message', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      const { context, req } = createMockContext('Bearer prefix-dev-access-token');

      await expectUnauthorized(guard.canActivate(context), req);
    });

    it('denies demo-like token with suffix (e.g. dev-access-token-extra) with uniform message', async () => {
      const { context, req } = createMockContext('Bearer dev-access-token-extra');

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies generated token with extra trailing segment with uniform message', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-gestor-${customUuid}-extra`);

      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });
  });

  describe('CR-002: Strict lowercase demo grammar enforcement', () => {
    it('denies uppercase role in generated token (e.g. dev-token-GESTOR-<uuid>)', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-GESTOR-${customUuid}`);
      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies mixed-case role in generated token (e.g. dev-token-Gestor-<uuid>)', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-Gestor-${customUuid}`);
      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies uppercase role in delegado token (e.g. dev-token-DELEGADO-<uuid>)', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-DELEGADO-${customUuid}`);
      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies mixed-case role in delegado token (e.g. dev-token-Delegado-<uuid>)', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-Delegado-${customUuid}`);
      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies uppercase role in buscador token (e.g. dev-token-BUSCADOR-<uuid>)', async () => {
      const { context, req } = createMockContext(`Bearer dev-token-BUSCADOR-${customUuid}`);
      await expectUnauthorized(guard.canActivate(context), req);
      expect(mockSupabaseService.getClient).not.toHaveBeenCalled();
    });

    it('denies uppercase prefix in generated token (e.g. DEV-TOKEN-gestor-<uuid>)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      const { context, req } = createMockContext(`Bearer DEV-TOKEN-gestor-${customUuid}`);
      await expectUnauthorized(guard.canActivate(context), req);
    });
  });
});
