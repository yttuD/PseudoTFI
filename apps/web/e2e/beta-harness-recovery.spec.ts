import { test, expect } from '@playwright/test';
import { BetaRealFixtureManager } from './beta-real-fixtures';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { RemoteAttempt } from './remote-tracking';

// Helper para crear un User mock
function createMockUser(id: string, email: string): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    confirmation_sent_at: '',
    recovery_sent_at: '',
    email_change_sent_at: '',
    new_email: '',
    invited_at: '',
    action_link: '',
    email,
    phone: '',
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone_confirmed_at: '',
    last_sign_in_at: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
    identities: [],
    is_anonymous: false,
    factors: [],
  };
}

test.describe('Harness N01 — Recuperación y Limpieza Determinista', () => {
  test('1. Creación parcial con timeout de GoTrue: reconciliación exitosa sin reintento ni borrado', async () => {
    const targetEmail = 'b007b_test_timeout_1@local.test';
    const mockCreatedUser = createMockUser('uid-timeout-1', targetEmail);

    // Estado simulado en el servidor Auth
    const authStore: User[] = [];
    let createUserCallCount = 0;

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: async () => {
            createUserCallCount++;
            // Simular que GoTrue hace timeout en el transporte pero commitea en DB
            authStore.push(mockCreatedUser);
            return {
              data: { user: null },
              error: { message: 'Processing this request timed out, please retry after a moment.' },
            };
          },
          listUsers: async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
            const start = (page - 1) * perPage;
            const users = authStore.slice(start, start + perPage);
            return { data: { users, total: authStore.length }, error: null };
          },
          deleteUser: async (id: string) => {
            const idx = authStore.findIndex((u) => u.id === id);
            if (idx >= 0) authStore.splice(idx, 1);
            return { data: {}, error: null };
          },
          getUserById: async (id: string) => {
            const user = authStore.find((u) => u.id === id);
            if (user) return { data: { user }, error: null };
            return { data: { user: null }, error: { status: 404, message: 'User not found' } };
          },
        },
      },
    } as unknown as SupabaseClient;

    const manager = new BetaRealFixtureManager(mockAdminClient);

    // Ejecutar createAuthUserWithReconciliation
    const adoptedUser = await manager.createAuthUserWithReconciliation(
      targetEmail,
      'password123',
      { role: 'gestor' }
    );

    // Debe adoptar el usuario reconciliado en 1 solo intento sin bucles ni borrado prematuro
    expect(createUserCallCount).toBe(1);
    expect(adoptedUser.id).toBe('uid-timeout-1');
    expect(adoptedUser.email).toBe(targetEmail);
    expect(manager.trackedAttemptEmails).toContain(targetEmail);
  });

  test('2. Aparición tardía: creación falla sin usuario inmediato, pero cleanup lo reconcilia y elimina', async () => {
    const targetEmail = 'b007b_test_late_2@local.test';
    const lateUser = createMockUser('uid-late-2', targetEmail);

    let authStore: User[] = [];
    let createUserCalls = 0;
    const deletedAuthIds: string[] = [];

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: async () => {
            createUserCalls++;
            return {
              data: { user: null },
              error: { message: '504 Gateway Timeout' },
            };
          },
          listUsers: async () => {
            return { data: { users: authStore }, error: null };
          },
          deleteUser: async (id: string) => {
            deletedAuthIds.push(id);
            authStore = authStore.filter((u) => u.id !== id);
            return { data: {}, error: null };
          },
          getUserById: async (id: string) => {
            const user = authStore.find((u) => u.id === id);
            if (user) return { data: { user }, error: null };
            return { data: { user: null }, error: { status: 404, message: 'User not found' } };
          },
        },
      },
      from: () => ({
        delete: () => ({ in: async () => ({ error: null }), eq: async () => ({ error: null }) }),
        select: () => ({ in: async () => ({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;

    const manager = new BetaRealFixtureManager(mockAdminClient);

    // Durante la creación inmediata, authStore está vacío, por lo que debe fallar explícitamente
    await expect(
      manager.createAuthUserWithReconciliation(targetEmail, 'password123', {})
    ).rejects.toThrow(/Creación de usuario Auth para .* falló/);

    expect(createUserCalls).toBe(1);
    expect(manager.trackedAttemptEmails).toContain(targetEmail);

    // Ahora simular que el commit en background terminó y la cuenta aparece tardíamente
    authStore.push(lateUser);

    // Ejecutar cleanup: debe detectar el usuario tardío por su email en trackedAttemptEmails y eliminarlo
    await manager.cleanup();

    expect(deletedAuthIds).toContain('uid-late-2');
    expect(authStore.length).toBe(0);
    // Trackers limpiados exitosamente tras verificar ausencia
    expect(manager.trackedAttemptEmails.length).toBe(0);
  });

  test('3. Cuenta fuera de primera página: paginación exhaustiva encuentra la cuenta en página 3', async () => {
    const alienUsers: User[] = [];
    for (let i = 1; i <= 110; i++) {
      alienUsers.push(createMockUser(`alien-${i}`, `alien_user_${i}@example.com`));
    }
    const targetEmail = 'b007b_test_page3@local.test';
    const targetUser = createMockUser('uid-page3', targetEmail);

    // Insertar el usuario al final (página 3, dado perPage=50)
    const allUsers = [...alienUsers, targetUser];

    const requestedPages: number[] = [];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: async ({ page = 1, perPage = 50 }: { page?: number; perPage?: number } = {}) => {
            requestedPages.push(page);
            const start = (page - 1) * perPage;
            const slice = allUsers.slice(start, start + perPage);
            return { data: { users: slice, total: allUsers.length }, error: null };
          },
        },
      },
    } as unknown as SupabaseClient;

    const manager = new BetaRealFixtureManager(mockAdminClient);

    const { user, error } = await manager.findAuthUserByExactEmail(targetEmail);

    expect(error).toBeNull();
    expect(user).not.toBeNull();
    expect(user?.id).toBe('uid-page3');
    expect(user?.email).toBe(targetEmail);
    // Debe haber paginado hasta la página 3
    expect(requestedPages).toContain(1);
    expect(requestedPages).toContain(2);
    expect(requestedPages).toContain(3);
  });

  test('4. Fallo de listado: detiene reconciliación, no asume ausencia y conserva tracking', async () => {
    const targetEmail = 'b007b_test_list_err@local.test';

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: async () => ({
            data: { user: null },
            error: { message: 'Connection dropped' },
          }),
          listUsers: async () => ({
            data: null,
            error: { message: 'Auth service database unreachable' },
          }),
        },
      },
      from: () => ({
        delete: () => ({ in: async () => ({ error: null }), eq: async () => ({ error: null }) }),
        select: () => ({ in: async () => ({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;

    const manager = new BetaRealFixtureManager(mockAdminClient);

    // Al crear: falla con ambigüedad y no reintenta ciegamente
    await expect(
      manager.createAuthUserWithReconciliation(targetEmail, 'password123', {})
    ).rejects.toThrow(/Respuesta ambigua; fallando explícitamente/);

    expect(manager.trackedAttemptEmails).toContain(targetEmail);

    // Al limpiar: el listado falla, por lo que cleanup debe lanzar error y CONSERVAR el tracking
    await expect(manager.cleanup()).rejects.toThrow(/Fallos en cleanup de DB\/Auth/);

    // El tracking se conserva para reintentos o intervención
    expect(manager.trackedAttemptEmails).toContain(targetEmail);
  });

  test('5. Fallo de borrado: conserva tracking y reporta error de ausencia', async () => {
    const targetEmail = 'b007b_test_delete_err@local.test';
    const userToDelete = createMockUser('uid-del-fail', targetEmail);

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [userToDelete] },
            error: null,
          }),
          deleteUser: async () => ({
            data: null,
            error: { message: 'Internal Server Error 500 deleting auth user' },
          }),
          getUserById: async () => ({
            data: { user: userToDelete }, // Sigue existiendo en Auth
            error: null,
          }),
        },
      },
      from: () => ({
        delete: () => ({ in: async () => ({ error: null }), eq: async () => ({ error: null }) }),
        select: () => ({ in: async () => ({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;

    const manager = new BetaRealFixtureManager(mockAdminClient);
    manager.trackedAttemptEmails.push(targetEmail);
    manager.trackedDelegadoIds.push('uid-del-fail');

    await expect(manager.cleanup()).rejects.toThrow(/residuo auth user: uid-del-fail/);

    // Tracking conservado intacto
    expect(manager.trackedDelegadoIds).toContain('uid-del-fail');
    expect(manager.trackedAttemptEmails).toContain(targetEmail);
  });

  test('6. Protección de cuentas ajenas: ninguna cuenta no registrada es adoptada, modificada o borrada', async () => {
    const alien1 = createMockUser('alien-uuid-1', 'admin@sistema.com');
    const alien2 = createMockUser('alien-uuid-2', 'tester_permanente@local.test');
    const ownTarget = createMockUser('own-uuid-1', 'b007b_own_fixture@local.test');

    const authStore: User[] = [alien1, alien2, ownTarget];
    const deletedUserIds: string[] = [];

    const mockAdminClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [...authStore] },
            error: null,
          }),
          deleteUser: async (id: string) => {
            deletedUserIds.push(id);
            const idx = authStore.findIndex((u) => u.id === id);
            if (idx >= 0) authStore.splice(idx, 1);
            return { data: {}, error: null };
          },
          getUserById: async (id: string) => {
            const u = authStore.find((x) => x.id === id);
            if (u) return { data: { user: u }, error: null };
            return { data: { user: null }, error: { status: 404, message: 'Not found' } };
          },
        },
      },
      from: () => ({
        delete: () => ({ in: async () => ({ error: null }), eq: async () => ({ error: null }) }),
        select: () => ({ in: async () => ({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;

    const manager = new BetaRealFixtureManager(mockAdminClient);
    // Solo registramos el intento del fixture propio
    manager.trackedAttemptEmails.push('b007b_own_fixture@local.test');

    await manager.cleanup();

    // Solo se debió borrar own-uuid-1
    expect(deletedUserIds).toEqual(['own-uuid-1']);
    // Las cuentas ajenas siguen intactas en el store
    expect(authStore.map((u) => u.id)).toEqual(['alien-uuid-1', 'alien-uuid-2']);
    expect(manager.trackedDelegadoIds).not.toContain('alien-uuid-1');
    expect(manager.trackedDelegadoIds).not.toContain('alien-uuid-2');
  });

  test('7. Preservación estricta de las tres cuentas residuales del JSON actual y manejo de formatos account/accounts sin convertir intentos en confirmadas', async () => {
    const { getTrackingFilePath, readTrackingFile, reconcileTrackingSummary } = await import('./remote-tracking');
    const trackingPath = getTrackingFilePath();
    const data = readTrackingFile(trackingPath);

    // 1. Validar que los 3 intentos históricos existen
    expect(data.attempts.length).toBeGreaterThanOrEqual(3);

    // 2. Comprobar que las 3 cuentas residuales históricas están presentes en summary.authAccountsResidual
    const historicalResiduals = [
      'test_gestor_1791434382116@example.com',
      'b008_1791436199542_ga@example.com',
      '7e83511a-0172-4ef1-9e1c-2c7e3e3c8c20',
    ];
    for (const emailOrId of historicalResiduals) {
      expect(data.summary.authAccountsResidual).toContain(emailOrId);
    }

    // 3. Simular reconciliación usando el módulo real compartido
    const simulatedAttempts: RemoteAttempt[] = [
      ...data.attempts,
      {
        attempt: 'simulated-unconfirmed',
        testFile: 'simulated.spec.ts',
        batchId: 'sim_1',
        timestamp: new Date().toISOString(),
        accounts: {
          gestorA: {
            email: 'unconfirmed_ga@test.local',
            authResidual: false,
            status: 'intentado' as const,
          },
          gestorB: {
            email: 'uncertain_gb@test.local',
            authResidual: true,
            status: 'incierto' as const,
          },
          delegado: {
            email: 'confirmed_del@test.local',
            id: 'uuid-confirmed-del',
            authResidual: true,
            status: 'creado_confirmado' as const,
          },
        },
        dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
        cleaned: false,
        cleanupStatus: 'IN_PROGRESS',
      },
    ];

    const summary = reconcileTrackingSummary(simulatedAttempts);

    // Comprobar que las 3 históricas siguen preservadas intactas en summary
    for (const emailOrId of historicalResiduals) {
      expect(summary.authAccountsResidual).toContain(emailOrId);
    }

    // Comprobar que intentos o resultados inciertos NO se convierten en confirmadas
    expect(summary.authAccountsCreated).not.toContain('unconfirmed_ga@test.local');
    expect(summary.authAccountsCreated).not.toContain('uncertain_gb@test.local');

    // Comprobar que cuentas pendientes de reconciliación quedan registradas
    expect(summary.accountsPendingReconciliation).toContain('unconfirmed_ga@test.local');
    expect(summary.accountsPendingReconciliation).toContain('uncertain_gb@test.local');

    // Comprobar que la cuenta confirmada sí se registra con su ID real
    expect(summary.authAccountsCreated).toContain('confirmed_del@test.local');
    expect(summary.authAccountsResidual).toContain('uuid-confirmed-del');
  });
});
