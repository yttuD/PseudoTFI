import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getTrackingFilePath,
  readTrackingFile,
  saveTracking,
  reconcileTrackingSummary,
  finalizeRunAndCleanupContexts,
  cleanAndVerifyGrupos,
  cleanAndVerifyUnidades,
  cleanAndVerifyInvitacionesYDelegaciones,
  isValidContractItem,
  isValidGrupoItem,
  type RemoteAttempt,
  type ClosableContext,
  type InviteRecord,
  type DelegationRecord,
  type GroupRecord,
  type UnitRecord,
  type FetchFunction,
  type TrackingFile,
} from './remote-tracking';

test.describe('Pruebas Deterministas sobre la Implementación Real de Tracking', () => {
  test('1. Conservación de las tres cuentas históricas del JSON actual', () => {
    const trackingPath = getTrackingFilePath();
    expect(fs.existsSync(trackingPath)).toBe(true);

    const trackingData = readTrackingFile(trackingPath);
    const expectedResiduals = [
      'test_gestor_1791434382116@example.com',
      'b008_1791436199542_ga@example.com',
      '7e83511a-0172-4ef1-9e1c-2c7e3e3c8c20',
    ];

    for (const idOrEmail of expectedResiduals) {
      expect(trackingData.summary.authAccountsResidual).toContain(idOrEmail);
    }
  });

  test('2. Resultado incierto o intentado queda pendiente de reconciliación y no como ausencia ni confirmada', () => {
    const simulatedAttempt: RemoteAttempt = {
      attempt: 'test-uncertain',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {
        gestorA: {
          email: 'intentado_ga@test.local',
          authResidual: false,
          status: 'intentado',
        },
        gestorB: {
          email: 'incierto_gb@test.local',
          authResidual: true,
          status: 'incierto',
        },
        delegado: {
          email: 'confirmado_del@test.local',
          id: 'uuid-del-real-123',
          authResidual: true,
          status: 'creado_confirmado',
        },
      },
      dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'IN_PROGRESS',
    };

    const summary = reconcileTrackingSummary([simulatedAttempt]);

    // Pendientes de reconciliación
    expect(summary.accountsPendingReconciliation).toContain('intentado_ga@test.local');
    expect(summary.accountsPendingReconciliation).toContain('incierto_gb@test.local');

    // No se convierten en confirmadas
    expect(summary.authAccountsCreated).not.toContain('intentado_ga@test.local');
    expect(summary.authAccountsCreated).not.toContain('incierto_gb@test.local');

    // La cuenta confirmada sí se registra con ID real
    expect(summary.authAccountsCreated).toContain('confirmado_del@test.local');
    expect(summary.authAccountsResidual).toContain('uuid-del-real-123');
  });

  test('3. JSON corrupto lanza error y rehúsa sobrescribir el archivo histórico', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracking-corrupt-'));
    const corruptFile = path.join(tmpDir, 'corrupt-tracking.json');
    const corruptContent = '{ "trackingVersion": "2.0.0", invalid_json... ';
    fs.writeFileSync(corruptFile, corruptContent, 'utf8');

    const dummyAttempt: RemoteAttempt = {
      attempt: 'dummy',
      testFile: 'dummy.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'IN_PROGRESS',
    };

    expect(() => readTrackingFile(corruptFile)).toThrow(/CORRUPTED_TRACKING_FILE/);
    expect(() => saveTracking(corruptFile, dummyAttempt)).toThrow(/CORRUPTED_TRACKING_FILE/);

    // Comprobar que el contenido corrupto se preservó y no fue sobrescrito
    expect(fs.readFileSync(corruptFile, 'utf8')).toBe(corruptContent);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('4. Fallo de limpieza: CLEANUP_FAILED_WITH_ERRORS nunca se sobrescribe con PARTIAL_DATA_CLEANED_AUTH_RESIDUAL', () => {
    const attemptWithFailures: RemoteAttempt = {
      attempt: 'failed-cleanup-attempt',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'CLEANUP_FAILED_WITH_ERRORS',
    };

    const summary = reconcileTrackingSummary([attemptWithFailures]);
    expect(summary.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');
    expect(summary.cleanupStatus).not.toBe('PARTIAL_DATA_CLEANED_AUTH_RESIDUAL');
  });

  test('5. Recurso todavía activo tras limpieza se detecta como residuo no verificado y marca fallo', () => {
    const attemptWithActiveResource: RemoteAttempt = {
      attempt: 'active-resource-attempt',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: {
        grupos: [{ id: 'g-active-1', nombre: 'Grupo Activo', status: 'activo', owner: 'GA' }],
        unidades: [{ id: 'u-active-1', titulo: 'Unidad Activa', status: 'activo', owner: 'GA' }],
        invitaciones: [],
        delegaciones: [],
      },
      cleaned: false,
      cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL',
    };

    const summary = reconcileTrackingSummary([attemptWithActiveResource]);
    expect(summary.unverifiedDataResiduals).toBe(2);
    expect(summary.gruposActivosResidual).toBe(1);
    expect(summary.unidadesResidual).toBe(1);
    expect(summary.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');
  });

  test('6. Fallo de guardado en almacenamiento mediante función compartida garantiza cierre de contextos y propagación de error', async () => {
    let contextAClosed = false;
    let contextBClosed = false;

    const mockContextA: ClosableContext = {
      close: async () => {
        contextAClosed = true;
      },
    };
    const mockContextB: ClosableContext = {
      close: async () => {
        contextBClosed = true;
      },
    };

    const failingSaveFn = () => {
      throw new Error('EACCES: permission denied, open tracking.json');
    };

    const dummyAttempt: RemoteAttempt = {
      attempt: 'dummy-storage-fail',
      testFile: 'dummy.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'IN_PROGRESS',
    };

    // Llamada directa a la función compartida real; elimina el try/finally independiente
    await expect(
      finalizeRunAndCleanupContexts(
        'dummy-path.json',
        dummyAttempt,
        [mockContextA, mockContextB],
        [],
        failingSaveFn
      )
    ).rejects.toThrow(/EACCES: permission denied, open tracking.json/);

    expect(contextAClosed).toBe(true);
    expect(contextBClosed).toBe(true);
  });

  test('7. Invitación sin verificación contractual cuenta como pendiente; caso verificado no cuenta como pendiente', () => {
    // 7a: Sin verificación contractual
    const unverifiedInvAttempt: RemoteAttempt = {
      attempt: 'inv-unverified',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: {
        grupos: [],
        unidades: [],
        invitaciones: [{ id: 'inv-unverified-1', status: 'eliminada', verifiedContractual: false }],
        delegaciones: [],
      },
      cleaned: false,
      cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL',
    };
    const summaryUnverified = reconcileTrackingSummary([unverifiedInvAttempt]);
    expect(summaryUnverified.unverifiedDataResiduals).toBe(1);
    expect(summaryUnverified.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');

    // 7b: Con verificación contractual
    const verifiedInvAttempt: RemoteAttempt = {
      ...unverifiedInvAttempt,
      attempt: 'inv-verified',
      dataRecords: {
        ...unverifiedInvAttempt.dataRecords,
        invitaciones: [{ id: 'inv-verified-1', status: 'eliminada', verifiedContractual: true }],
      },
    };
    const summaryVerified = reconcileTrackingSummary([verifiedInvAttempt]);
    expect(summaryVerified.unverifiedDataResiduals).toBe(0);
    expect(summaryVerified.cleanupStatus).toBe('PARTIAL_DATA_CLEANED_AUTH_RESIDUAL');
  });

  test('8. Grupo archivado sin verifiedArchived cuenta como pendiente; caso verificado no cuenta como pendiente', () => {
    // 8a: Sin verifiedArchived
    const unverifiedGrpAttempt: RemoteAttempt = {
      attempt: 'grp-unverified',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: {
        grupos: [{ id: 'grp-unverified-1', nombre: 'Grupo G', status: 'archivado_logico', owner: 'GA', verifiedArchived: false }],
        unidades: [],
        invitaciones: [],
        delegaciones: [],
      },
      cleaned: false,
      cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL',
    };
    const summaryUnverified = reconcileTrackingSummary([unverifiedGrpAttempt]);
    expect(summaryUnverified.unverifiedDataResiduals).toBe(1);
    expect(summaryUnverified.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');

    // 8b: Con verifiedArchived
    const verifiedGrpAttempt: RemoteAttempt = {
      ...unverifiedGrpAttempt,
      attempt: 'grp-verified',
      dataRecords: {
        ...unverifiedGrpAttempt.dataRecords,
        grupos: [{ id: 'grp-verified-1', nombre: 'Grupo G', status: 'archivado_logico', owner: 'GA', verifiedArchived: true }],
      },
    };
    const summaryVerified = reconcileTrackingSummary([verifiedGrpAttempt]);
    expect(summaryVerified.unverifiedDataResiduals).toBe(0);
    expect(summaryVerified.cleanupStatus).toBe('PARTIAL_DATA_CLEANED_AUTH_RESIDUAL');
  });

  test('9. Delegación marcada eliminada sin verifiedContractual cuenta como pendiente; caso verificado no cuenta como pendiente', () => {
    // 9a: Sin verifiedContractual
    const unverifiedDelAttempt: RemoteAttempt = {
      attempt: 'del-unverified',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: {
        grupos: [],
        unidades: [],
        invitaciones: [],
        delegaciones: [{ id: 'del-unverified-1', status: 'eliminada', verifiedContractual: false }],
      },
      cleaned: false,
      cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL',
    };
    const summaryUnverified = reconcileTrackingSummary([unverifiedDelAttempt]);
    expect(summaryUnverified.unverifiedDataResiduals).toBe(1);
    expect(summaryUnverified.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');

    // 9b: Con verifiedContractual
    const verifiedDelAttempt: RemoteAttempt = {
      ...unverifiedDelAttempt,
      attempt: 'del-verified',
      dataRecords: {
        ...unverifiedDelAttempt.dataRecords,
        delegaciones: [{ id: 'del-verified-1', status: 'eliminada', verifiedContractual: true }],
      },
    };
    const summaryVerified = reconcileTrackingSummary([verifiedDelAttempt]);
    expect(summaryVerified.unverifiedDataResiduals).toBe(0);
    expect(summaryVerified.cleanupStatus).toBe('PARTIAL_DATA_CLEANED_AUTH_RESIDUAL');
  });

  test('10. Contrato offline: invitación cancelada presente con estado cancelada en GET /delegados', async () => {
    const inv: InviteRecord = { id: 'inv-offline-1', status: 'creada' };
    const dels: DelegationRecord[] = [];

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/delegados/invitaciones/inv-offline-1') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/delegados') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            invitaciones: [{ id: 'inv-offline-1', estado: 'cancelada' }],
            delegaciones: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [inv],
      dels,
      mockFetch
    );

    expect(errors).toHaveLength(0);
    expect(inv.status).toBe('cancelada');
    expect(inv.verifiedContractual).toBe(true);
    expect(inv.physicalAbsence).toBe('PENDING_ADMIN_ACCESS');
  });

  test('11. Contrato offline: invitación aceptada con delegación revocada (ausente en GET /delegados)', async () => {
    const inv: InviteRecord = { id: 'inv-offline-2', status: 'aceptada', delegacionId: 'del-offline-2' };
    const del: DelegationRecord = { id: 'del-offline-2', status: 'activa' };

    let deleteInvitationCalled = false;
    let deleteDelegationCalled = false;

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/delegados/invitaciones/')) {
        deleteInvitationCalled = true;
        return new Response(null, { status: 409 });
      }
      if (url.includes('/delegados/del-offline-2') && init?.method === 'DELETE') {
        deleteDelegationCalled = true;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/delegados') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            invitaciones: [{ id: 'inv-offline-2', estado: 'aceptada' }],
            delegaciones: [], // La delegación revocada no aparece en el listado del servicio
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [inv],
      [del],
      mockFetch
    );

    expect(errors).toHaveLength(0);
    expect(deleteInvitationCalled).toBe(false); // NO intenta cancelar invitación aceptada
    expect(deleteDelegationCalled).toBe(true);  // Sí revoca la delegación activa
    expect(inv.status).toBe('aceptada');       // Conserva registro histórico intacto
    expect(inv.verifiedContractual).toBe(true);
    expect(inv.physicalAbsence).toBe('PENDING_ADMIN_ACCESS');
    expect(del.status).toBe('revocada');
    expect(del.verifiedContractual).toBe(true);
  });

  test('12. Contrato offline: delegación todavía activa tras revocar reporta error y no acredita limpieza', async () => {
    const del: DelegationRecord = { id: 'del-offline-3', status: 'activa' };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/delegados/del-offline-3') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/delegados')) {
        // Simular que el servicio aún devuelve la delegación activa
        return new Response(
          JSON.stringify({
            invitaciones: [],
            delegaciones: [{ id: 'del-offline-3', estado: 'activa' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [],
      [del],
      mockFetch
    );

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].resource).toBe('delegaciones');
    expect(errors[0].id).toBe('del-offline-3');
    expect(del.verifiedContractual).toBe(false);
  });

  test('13. Contrato offline: respuesta incompleta en GET /delegados (sin arrays esperados) debe fallar', async () => {
    const inv: InviteRecord = { id: 'inv-offline-4', status: 'creada' };
    const del: DelegationRecord = { id: 'del-offline-4', status: 'activa' };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/delegados')) {
        // HTTP 200 pero cuerpo incompleto / sin arreglos esperados
        return new Response(
          JSON.stringify({ message: 'OK pero sin invitaciones ni delegaciones' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [inv],
      [del],
      mockFetch
    );

    expect(errors.length).toBe(2);
    expect(inv.verifiedContractual).toBe(false);
    expect(del.verifiedContractual).toBe(false);
    expect(errors.some(e => e.error.includes('Estructura inválida'))).toBe(true);
  });

  test('14. Contrato offline: fallo de red en GET /delegados captura excepción y registra errores sin acreditar', async () => {
    const inv: InviteRecord = { id: 'inv-offline-5', status: 'creada' };
    const del: DelegationRecord = { id: 'del-offline-5', status: 'activa' };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/delegados')) {
        throw new Error('TypeError: fetch failed (ECONNRESET)');
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [inv],
      [del],
      mockFetch
    );

    expect(errors.length).toBe(2);
    expect(inv.verifiedContractual).toBe(false);
    expect(del.verifiedContractual).toBe(false);
    expect(errors.some(e => e.error.includes('Fallo de red'))).toBe(true);
  });

  test('15. Regresión FP1: Invitación aceptada sin delegacionId válido o sin historial comprobable nunca acredita verifiedContractual=true', async () => {
    // 15a: Sin delegacionId vinculado
    const invSinDelegacion: InviteRecord = {
      id: 'inv-fp1-no-del',
      status: 'aceptada',
      // delegacionId ausente
    };

    const mockFetchA: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/delegados') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            invitaciones: [{ id: 'inv-fp1-no-del', estado: 'aceptada' }],
            delegaciones: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errorsA = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [invSinDelegacion],
      [],
      mockFetchA
    );

    expect(errorsA.length).toBeGreaterThan(0);
    expect(invSinDelegacion.verifiedContractual).toBe(false);
    expect(errorsA.some(e => e.error.includes('no posee delegacionId válido'))).toBe(true);

    // 15b: Con delegacionId pero ausente en historial GET /delegados
    const invSinHistorial: InviteRecord = {
      id: 'inv-fp1-missing',
      status: 'aceptada',
      delegacionId: 'del-fp1-valid',
    };

    const mockFetchB: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/delegados') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            invitaciones: [], // No figura la invitación en el historial
            delegaciones: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errorsB = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [invSinHistorial],
      [],
      mockFetchB
    );

    expect(errorsB.length).toBeGreaterThan(0);
    expect(invSinHistorial.verifiedContractual).toBe(false);
    expect(errorsB.some(e => e.error.includes('no figura en historial comprobable'))).toBe(true);
  });

  test('16. Regresión FP2: Elementos malformados (delegaciones:[{}]) fallan de forma cerrada y no acreditan falsamente ausencia', async () => {
    // Validar helper de contrato
    expect(isValidContractItem({})).toBe(false);
    expect(isValidContractItem({ id: 'solo-id' })).toBe(false);
    expect(isValidContractItem({ estado: 'solo-estado' })).toBe(false);
    expect(isValidContractItem({ id: 'del-1', estado: 'activa' })).toBe(true);

    const delTarget: DelegationRecord = { id: 'del-target-1', status: 'activa' };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (url.endsWith('/delegados')) {
        // Objeto sin id/estado que antes daba falso positivo por !some()
        return new Response(
          JSON.stringify({
            invitaciones: [],
            delegaciones: [{}],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [],
      [delTarget],
      mockFetch
    );

    // Debe fallar de forma cerrada sin acreditar ausencia
    expect(errors.length).toBeGreaterThan(0);
    expect(delTarget.verifiedContractual).toBe(false);
    expect(errors.some(e => e.error.includes('Estructura inválida en GET /delegados'))).toBe(true);
  });

  test('17. Regresión FP3: Invitación aceptada con delegación asociada aún activa reporta error y no acredita limpieza', async () => {
    const inv: InviteRecord = {
      id: 'inv-fp3-1',
      status: 'aceptada',
      delegacionId: 'del-still-active',
    };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/delegados') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            invitaciones: [{ id: 'inv-fp3-1', estado: 'aceptada' }],
            delegaciones: [{ id: 'del-still-active', estado: 'activa' }], // Sigue activa
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyInvitacionesYDelegaciones(
      'http://api.local',
      'token-valid',
      [inv],
      [],
      mockFetch
    );

    expect(errors.length).toBe(1);
    expect(inv.verifiedContractual).toBe(false);
    expect(errors[0].error).toContain('Delegación asociada del-still-active a invitación aceptada sigue activa/presente');
  });

  test('18. Continuación y persistencia ante fallo de red de un recurso individual en grupos y unidades', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracking-resilience-'));
    const tempFile = path.join(tmpDir, 'test-resilience.json');

    const u1: UnitRecord = { id: 'u-fail-net', titulo: 'Unidad Fallo Red', status: 'activo', owner: 'GA' };
    const u2: UnitRecord = { id: 'u-success-net', titulo: 'Unidad Exitosa', status: 'activo', owner: 'GA' };
    const g1: GroupRecord = { id: 'g-fail-net', nombre: 'Grupo Fallo Red', status: 'activo', owner: 'GA' };
    const g2: GroupRecord = { id: 'g-success-net', nombre: 'Grupo Exitoso', status: 'activo', owner: 'GA' };

    const attempt: RemoteAttempt = {
      attempt: 'attempt-net-fail',
      testFile: 'resilience.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: {
        grupos: [g1, g2],
        unidades: [u1, u2],
        invitaciones: [],
        delegaciones: [],
      },
      cleaned: false,
      cleanupStatus: 'IN_PROGRESS',
    };

    // Mock fetch que falla por red exclusivamente en u1 y g1, pero completa u2 y g2
    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/unidades/u-fail-net') && init?.method === 'DELETE') {
        throw new Error('ECONNRESET en DELETE u-fail-net');
      }
      if (url.includes('/grupos/g-fail-net') && init?.method === 'DELETE') {
        throw new Error('ETIMEDOUT en DELETE g-fail-net');
      }
      if (url.includes('/unidades/u-success-net') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.includes('/grupos/g-success-net') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.includes('/unidades/u-success-net') && (!init?.method || init.method === 'GET')) {
        return new Response('Not found', { status: 404 });
      }
      if (url.includes('/unidades/u-fail-net') && (!init?.method || init.method === 'GET')) {
        return new Response('OK', { status: 200 }); // Sigue respondiendo 200
      }
      if (url.endsWith('/grupos') && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify([{ id: 'g-fail-net' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    };

    // 1. Ejecutar unidades: u1 falla por red pero u2 continúa y se verifica
    const uniErrors = await cleanAndVerifyUnidades('http://api.local', 'token-test', [u1, u2], mockFetch);
    expect(uniErrors.some(e => e.id === 'u-fail-net' && e.error.includes('ECONNRESET'))).toBe(true);
    expect(u2.status).toBe('borrado_logico_api');
    expect(u2.inaccessibleContractual).toBe(true);
    expect(u2.verifiedAbsence).toBe(true);

    // 2. Ejecutar grupos: g1 falla por red pero g2 continúa y se verifica
    const grpErrors = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g1, g2], mockFetch);
    expect(grpErrors.some(e => e.id === 'g-fail-net' && e.error.includes('ETIMEDOUT'))).toBe(true);
    expect(g2.status).toBe('archivado_logico');
    expect(g2.verifiedArchived).toBe(true);

    // 3. Persistir CLEANUP_FAILED_WITH_ERRORS antes del finalizador
    const accumulatedErrors = [
      ...uniErrors.map(e => `[${e.resource}:${e.id}] ${e.error}`),
      ...grpErrors.map(e => `[${e.resource}:${e.id}] ${e.error}`),
    ];
    attempt.cleaned = false;
    if (accumulatedErrors.length > 0) {
      attempt.cleanupStatus = 'CLEANUP_FAILED_WITH_ERRORS';
    }

    let contextClosed = false;
    const mockContext: ClosableContext = {
      close: async () => {
        contextClosed = true;
      },
    };

    // Finalizador debe cerrar contextos, persistir el estado real y lanzar excepción
    await expect(
      finalizeRunAndCleanupContexts(tempFile, attempt, [mockContext], accumulatedErrors)
    ).rejects.toThrow(/FINALIZE_SUITE_RUN_FAILED/);

    expect(contextClosed).toBe(true);

    // Verificar en el archivo persistido
    const savedData = readTrackingFile(tempFile);
    expect(savedData.attempts).toHaveLength(1);
    expect(savedData.attempts[0].cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');
    expect(savedData.attempts[0].cleaned).toBe(false);
    expect(savedData.summary.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('19. Regresión: GET /grupos con elementos inválidos ([{}], [null], IDs inválidos) falla de forma cerrada, reinicia verifiedArchived y no acredita ausencia', async () => {
    // Validar helper de contrato
    expect(isValidGrupoItem({})).toBe(false);
    expect(isValidGrupoItem(null)).toBe(false);
    expect(isValidGrupoItem(undefined)).toBe(false);
    expect(isValidGrupoItem({ id: '' })).toBe(false);
    expect(isValidGrupoItem({ id: '   ' })).toBe(false);
    expect(isValidGrupoItem({ id: 123 })).toBe(false);
    expect(isValidGrupoItem({ id: 'g-valid' })).toBe(true);

    // Caso 19a: [{}] en respuesta de GET /grupos
    const g1: GroupRecord = {
      id: 'g-fp-obj-vacio',
      nombre: 'Grupo Test 1',
      status: 'archivado_logico',
      owner: 'GA',
      verifiedArchived: true, // Venía en true: debe ser reiniciado a false
    };

    const mockFetchA: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/grupos') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify([{}]), // Elemento malformado sin id
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errorsA = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g1], mockFetchA);
    expect(errorsA.length).toBeGreaterThan(0);
    expect(g1.verifiedArchived).toBe(false); // Reiniciado, no acredita ausencia
    expect(errorsA.some(e => e.error.includes('Estructura inválida en GET /grupos'))).toBe(true);

    // Caso 19b: [null] en respuesta de GET /grupos
    const g2: GroupRecord = {
      id: 'g-fp-null',
      nombre: 'Grupo Test 2',
      status: 'archivado_logico',
      owner: 'GA',
      verifiedArchived: true, // Debe reiniciarse a false
    };

    const mockFetchB: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/grupos') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify([null]),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errorsB = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g2], mockFetchB);
    expect(errorsB.length).toBeGreaterThan(0);
    expect(g2.verifiedArchived).toBe(false);
    expect(errorsB.some(e => e.error.includes('Estructura inválida en GET /grupos'))).toBe(true);

    // Caso 19c: Sin token reinicia verifiedArchived y reporta error
    const g3: GroupRecord = {
      id: 'g-no-token',
      nombre: 'Grupo Test 3',
      status: 'archivado_logico',
      owner: 'GA',
      verifiedArchived: true,
    };
    const errorsC = await cleanAndVerifyGrupos('http://api.local', '', [g3], mockFetchA);
    expect(errorsC.length).toBeGreaterThan(0);
    expect(g3.verifiedArchived).toBe(false);

    // Caso 19d: Fallo de red reinicia verifiedArchived y no conserva verificación previa
    const g4: GroupRecord = {
      id: 'g-net-err',
      nombre: 'Grupo Test 4',
      status: 'archivado_logico',
      owner: 'GA',
      verifiedArchived: true,
    };
    const mockFetchNetErr: FetchFunction = async () => {
      throw new Error('ECONNRESET');
    };
    const errorsD = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g4], mockFetchNetErr);
    expect(errorsD.length).toBeGreaterThan(0);
    expect(g4.verifiedArchived).toBe(false);
  });

  test('20. Array vacío válido ([]) en GET /grupos acredita ausencia lógica tras archivado', async () => {
    const g: GroupRecord = {
      id: 'g-empty-valid',
      nombre: 'Grupo Valido Vacio',
      status: 'activo',
      owner: 'GA',
    };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/grupos/g-empty-valid') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/grupos') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify([]), // Array vacío contractual válido
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g], mockFetch);
    expect(errors).toHaveLength(0);
    expect(g.status).toBe('archivado_logico');
    expect(g.verifiedArchived).toBe(true);
  });

  test('21. Grupo todavía presente en la lista de GET /grupos reporta error y reinicia verifiedArchived a false', async () => {
    const g: GroupRecord = {
      id: 'g-still-active',
      nombre: 'Grupo Activo',
      status: 'activo',
      owner: 'GA',
      verifiedArchived: true, // Debe reiniciarse
    };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/grupos/g-still-active') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/grupos') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify([{ id: 'g-still-active' }]), // Sigue presente
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g], mockFetch);
    expect(errors.length).toBe(1);
    expect(errors[0].error).toContain('Grupo g-still-active sigue activo en catálogo tras archivado');
    expect(g.verifiedArchived).toBe(false);
  });

  test('22. Continuación con los recursos restantes ante fallo o respuesta inválida en un grupo', async () => {
    const g1: GroupRecord = { id: 'g-fail-item', nombre: 'Grupo Invalido', status: 'activo', owner: 'GA' };
    const g2: GroupRecord = { id: 'g-ok-item', nombre: 'Grupo Valido', status: 'activo', owner: 'GA' };

    const mockFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (url.includes('/grupos/g-fail-item') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.includes('/grupos/g-ok-item') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/grupos') && (!init?.method || init.method === 'GET')) {
        // Primera consulta para g1 responde inválido ([{}]), segunda para g2 responde válido ([])
        if (g1.status === 'archivado_logico' && !g2.verifiedArchived) {
          return new Response(JSON.stringify([{}]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('Not found', { status: 404 });
    };

    let callCount = 0;
    const sequentialFetch: FetchFunction = async (input, init) => {
      const url = String(input);
      if (init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/grupos')) {
        callCount++;
        if (callCount === 1) {
          // Primera verificación (g1): lista malformada
          return new Response(JSON.stringify([{}]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        // Segunda verificación (g2): lista vacía válida
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('Not found', { status: 404 });
    };

    const errors = await cleanAndVerifyGrupos('http://api.local', 'token-test', [g1, g2], sequentialFetch);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.id === 'g-fail-item')).toBe(true);
    expect(g1.verifiedArchived).toBe(false);

    // g2 continúa procesándose y se verifica con éxito
    expect(g2.status).toBe('archivado_logico');
    expect(g2.verifiedArchived).toBe(true);

    // Reconciliación detecta que g1 no está verificado y marca CLEANUP_FAILED_WITH_ERRORS
    const attempt: RemoteAttempt = {
      attempt: 'partial-grp-attempt',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: { grupos: [g1, g2], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL',
    };
    const summary = reconcileTrackingSummary([attempt]);
    expect(summary.unverifiedDataResiduals).toBe(1);
    expect(summary.cleanupStatus).toBe('CLEANUP_FAILED_WITH_ERRORS');
  });

  test('18. finalizeRunAndCleanupContexts preserva tanto el fallo original del test como los errores de limpieza en un error combinado', async () => {
    let contextClosed = false;
    const mockContext = {
      close: async () => {
        contextClosed = true;
      },
    };

    const dummyAttempt: RemoteAttempt = {
      attempt: 'test-combined-errors',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'CLEANUP_FAILED_WITH_ERRORS',
    };

    const mockSaveFn = (_filePath: string, currentAttempt: RemoteAttempt): TrackingFile => ({
      trackingVersion: '1.0.0',
      attempts: [currentAttempt],
      summary: reconcileTrackingSummary([currentAttempt]),
    });

    const testError = new Error('Assertion failed: expected Depto A_3');
    const cleanupErrors = ['[unidades:u-1] DELETE retornó HTTP 404'];

    await expect(
      finalizeRunAndCleanupContexts(
        'dummy-path.json',
        dummyAttempt,
        [mockContext],
        cleanupErrors,
        mockSaveFn,
        testError
      )
    ).rejects.toThrow(/TEST_AND_CLEANUP_FAILED/);

    try {
      await finalizeRunAndCleanupContexts(
        'dummy-path.json',
        dummyAttempt,
        [mockContext],
        cleanupErrors,
        mockSaveFn,
        testError
      );
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('Assertion failed: expected Depto A_3');
      expect(msg).toContain('[unidades:u-1] DELETE retornó HTTP 404');
    }

    expect(contextClosed).toBe(true);
  });

  test('19. finalizeRunAndCleanupContexts propaga el error original intacto si no hubo errores de limpieza', async () => {
    let contextClosed = false;
    const mockContext = {
      close: async () => {
        contextClosed = true;
      },
    };

    const dummyAttempt: RemoteAttempt = {
      attempt: 'test-only-original-error',
      testFile: 'test.spec.ts',
      timestamp: new Date().toISOString(),
      accounts: {},
      dataRecords: { grupos: [], unidades: [], invitaciones: [], delegaciones: [] },
      cleaned: false,
      cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL',
    };

    const mockSaveFn = (_filePath: string, currentAttempt: RemoteAttempt): TrackingFile => ({
      trackingVersion: '1.0.0',
      attempts: [currentAttempt],
      summary: reconcileTrackingSummary([currentAttempt]),
    });

    const originalErr = new Error('Specific business assertion failure');

    await expect(
      finalizeRunAndCleanupContexts(
        'dummy-path.json',
        dummyAttempt,
        [mockContext],
        [],
        mockSaveFn,
        originalErr
      )
    ).rejects.toThrow('Specific business assertion failure');

    expect(contextClosed).toBe(true);
  });
});


