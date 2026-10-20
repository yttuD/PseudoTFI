import type { BrowserContext } from '@playwright/test';

/**
 * Standard deterministic actor taxonomy for Feature 005 (Web Product Readiness).
 * FR-004 to FR-008, FR-028.
 * 
 * Provides typed fixture identities, tokens, and browser session helpers without
 * weakening production authorization or introducing bypasses.
 */

export type ActorRole = 'anonymous' | 'public_user' | 'gestor' | 'delegado_read' | 'delegado_manage' | 'dev_admin';

export interface ActorDefinition {
  id: string;
  role: ActorRole;
  authRole: string;
  email: string;
  name: string;
  description: string;
  accessContext?: Record<string, unknown>;
}

export const ACTOR_DEFINITIONS: Record<ActorRole, ActorDefinition> = {
  anonymous: {
    id: '',
    role: 'anonymous',
    authRole: 'anon',
    email: '',
    name: 'Visitante Anónimo',
    description: 'Unauthenticated marketplace visitor exploring units and public pages',
  },
  public_user: {
    id: '22222222-2222-2222-2222-222222222222',
    role: 'public_user',
    authRole: 'buscador',
    email: 'buscador@test.com',
    name: 'Usuario Público Autenticado',
    description: 'Authenticated public/search account (canonical role buscador) able to manage favorites and receive delegate invitations',
    accessContext: {
      actor: 'public_user',
      ownerOnly: false,
      capabilities: ['favorites.manage', 'invitations.read', 'invitations.respond'],
    },
  },
  gestor: {
    id: '11111111-1111-1111-1111-111111111111',
    role: 'gestor',
    authRole: 'gestor',
    email: 'gestor@test.com',
    name: 'Gestor Titular',
    description: 'Property manager owner with unrestricted access to his portfolio, billing, AFIP, and team',
    accessContext: {
      actor: 'gestor',
      state: 'activo',
      permiso: 'gestionar',
      ownerOnly: true,
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['*'],
    },
  },
  delegado_read: {
    id: '33333333-3333-3333-3333-333333333333',
    role: 'delegado_read',
    authRole: 'delegado',
    email: 'delegado-ver@test.com',
    name: 'Delegado Sólo Lectura',
    description: 'Collaborator with read-only permission (ver) scoped to a specific group or account',
    accessContext: {
      actor: 'delegado',
      state: 'activo',
      permiso: 'ver',
      ownerOnly: false,
      scope: {
        alcanceTipo: 'grupo',
        grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      },
      capabilities: ['unidades.read', 'inquilinos.read', 'alquileres.read'],
    },
  },
  delegado_manage: {
    id: '44444444-4444-4444-4444-444444444444',
    role: 'delegado_manage',
    authRole: 'delegado',
    email: 'delegado-ges@test.com',
    name: 'Delegado de Gestión Operativa',
    description: 'Collaborator with management permission (gestionar) scoped to assigned units',
    accessContext: {
      actor: 'delegado',
      state: 'activo',
      permiso: 'gestionar',
      ownerOnly: false,
      scope: {
        alcanceTipo: 'unidades',
        unidadIds: ['a0000000-0000-0000-0000-000000000001'],
      },
      capabilities: ['unidades.manage', 'inquilinos.manage', 'alquileres.manage'],
    },
  },
  dev_admin: {
    id: '99999999-9999-9999-9999-999999999999',
    role: 'dev_admin',
    authRole: 'admin',
    email: 'admin@test.com',
    name: 'Operador de Desarrollo / Admin',
    description: 'Platform operator with access to internal moderation queue, global logs, and cluster metrics',
    accessContext: {
      actor: 'admin',
      state: 'activo',
      permiso: 'gestionar',
      ownerOnly: true,
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['*'],
    },
  },
};

/**
 * Creates a deterministic mock session JWT token for E2E testing.
 */
export function createMockSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
  accessContext?: Record<string, unknown>;
  simulateError?: boolean;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(
    JSON.stringify({
      sub: payload.userId,
      email: payload.email,
      role: 'authenticated',
      user_metadata: { role: payload.role, rol: payload.role },
      accessContext: payload.accessContext,
      simulateError: payload.simulateError,
      exp: Math.floor(Date.now() / 1000) + 86400 * 30,
    })
  ).toString('base64');
  return `${header}.${body}.mocksignature`;
}

/**
 * Decodes payload from mock JWT token for testing and inspection.
 */
export function decodeMockSessionToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Injects deterministic authentication cookies into a Playwright BrowserContext for the specified actor.
 */
export async function setTestSessionForActor(
  context: BrowserContext,
  actor: ActorRole
): Promise<void> {
  // Clear any existing cookies first
  await context.clearCookies();

  if (actor === 'anonymous') {
    return;
  }

  const def = ACTOR_DEFINITIONS[actor];
  const token = createMockSessionToken({
    userId: def.id,
    email: def.email,
    role: def.authRole,
    accessContext: def.accessContext,
  });

  const cookiePayload = {
    access_token: token,
    user: {
      id: def.id,
      email: def.email,
      user_metadata: { role: def.authRole, rol: def.authRole },
    },
  };

  const cookieValue = `base64-${Buffer.from(JSON.stringify(cookiePayload)).toString('base64')}`;

  const cookies = [
    {
      name: 'sb-127-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
    {
      name: 'sb-localhost-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
    {
      name: 'sb-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ];

  await context.addCookies(cookies);
}

/**
 * Returns Authorization header with mock token for direct API checks.
 */
export function getAuthHeadersForActor(actor: ActorRole): Record<string, string> {
  if (actor === 'anonymous') {
    return {};
  }
  const def = ACTOR_DEFINITIONS[actor];
  const token = createMockSessionToken({
    userId: def.id,
    email: def.email,
    role: def.authRole,
    accessContext: def.accessContext,
  });
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Injects deterministic authentication cookies for a Delegado with dynamic permission, scope, and state.
 */
export async function setTestSessionForDelegadoScope(
  context: BrowserContext,
  options: {
    permiso?: 'ver' | 'gestionar';
    alcanceTipo?: 'cuenta' | 'grupo' | 'unidades';
    grupoId?: string;
    unidadIds?: string[];
    state?: 'activo' | 'pendiente_configuracion' | 'revocada';
  }
): Promise<void> {
  await context.clearCookies();

  const state = options.state || 'activo';
  const permiso = state === 'pendiente_configuracion' || state === 'revocada' ? null : (options.permiso || 'ver');
  const alcanceTipo = state === 'pendiente_configuracion' || state === 'revocada' ? null : (options.alcanceTipo || 'cuenta');

  const scope = alcanceTipo ? {
    alcanceTipo,
    ...(alcanceTipo === 'grupo' ? { grupoId: options.grupoId || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } : {}),
    ...(alcanceTipo === 'unidades' ? { unidadIds: options.unidadIds || ['a0000000-0000-0000-0000-000000000001'] } : {}),
  } : null;

  const accessContext = {
    actor: 'delegado',
    state,
    permiso,
    ownerOnly: false,
    scope,
    capabilities: permiso === 'gestionar'
      ? ['unidades.manage', 'inquilinos.manage', 'alquileres.manage']
      : ['unidades.read', 'inquilinos.read', 'alquileres.read'],
  };

  const userId = permiso === 'gestionar'
    ? '44444444-4444-4444-4444-444444444444'
    : '33333333-3333-3333-3333-333333333333';
  const email = permiso === 'gestionar' ? 'delegado-ges@test.com' : 'delegado-ver@test.com';

  const token = createMockSessionToken({
    userId,
    email,
    role: 'delegado',
    accessContext,
  });

  const cookiePayload = {
    access_token: token,
    user: {
      id: userId,
      email,
      user_metadata: { role: 'delegado', rol: 'delegado' },
    },
  };

  const cookieValue = `base64-${Buffer.from(JSON.stringify(cookiePayload)).toString('base64')}`;

  const cookies = [
    {
      name: 'sb-127-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
    {
      name: 'sb-localhost-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
    {
      name: 'sb-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ];

  await context.addCookies(cookies);
}

