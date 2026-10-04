import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../src/supabase/supabase.service.js';
import { AuthorizationService } from '../src/authorization/authorization.service.js';
import { ActionLogService } from '../src/authorization/action-log.service.js';
import { CupoService } from '../src/cupo/cupo.service.js';
import { TraduccionService } from '../src/common/services/traduccion/traduccion.service.js';
import { UnidadesService } from '../src/unidades/unidades.service.js';
import { UnidadesController } from '../src/unidades/unidades.controller.js';
import { SupabaseAuthGuard, type AuthenticatedRequest } from '../src/auth/supabase-auth.guard.js';

interface LocalConfig {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

function getLocalConfig(): LocalConfig {
  const output = execSync('supabase status -o json', {
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf-8',
  });

  const parsed = JSON.parse(output);
  const apiUrl: string = parsed.API_URL || parsed.api_url;
  const anonKey: string = parsed.ANON_KEY || parsed.anon_key;
  const serviceRoleKey: string = parsed.SERVICE_ROLE_KEY || parsed.service_role_key;

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase status retornó datos incompletos');
  }

  const parsedUrl = new URL(apiUrl);
  if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
    throw new Error(`Seguridad: host debe ser localhost o 127.0.0.1, recibido: ${parsedUrl.hostname}`);
  }

  return { apiUrl, anonKey, serviceRoleKey };
}

describe('B006-N01a: Harness REAL Supabase Local (AC4 - Auth signIn, PostgREST & Isolation)', () => {
  let config: LocalConfig;
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;

  let gestorAId: string;
  let gestorBId: string;
  let delegadoId: string;

  let gestorAEmail: string;
  let gestorBEmail: string;
  let delegadoEmail: string;

  const password = 'TestPassword123!Secure';

  let tokenGestorA: string;
  let tokenGestorB: string;
  let tokenDelegado: string;

  let grupoAId: string;
  let unitA1Id: string;
  let unitA2Id: string;
  let unitA3Id: string;
  let unitB1Id: string;

  let invitacionId: string;
  let delegacionId: string;

  let controller: UnidadesController;
  let guard: SupabaseAuthGuard;

  beforeAll(async () => {
    config = getLocalConfig();
    adminClient = createClient(config.apiUrl, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anonClient = createClient(config.apiUrl, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const timestamp = Date.now();
    gestorAEmail = `gestor-a-${timestamp}@local.test`;
    gestorBEmail = `gestor-b-${timestamp}@local.test`;
    delegadoEmail = `delegado-${timestamp}@local.test`;

    // 1. Crear identidades en Auth admin (reteniendo IDs)
    const userA = await adminClient.auth.admin.createUser({
      email: gestorAEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'gestor', full_name: 'Gestor A Test' },
    });
    if (userA.error || !userA.data.user) {
      throw new Error(`Error al crear Gestor A: ${userA.error?.message}`);
    }
    gestorAId = userA.data.user.id;

    const userB = await adminClient.auth.admin.createUser({
      email: gestorBEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'gestor', full_name: 'Gestor B Test' },
    });
    if (userB.error || !userB.data.user) {
      throw new Error(`Error al crear Gestor B: ${userB.error?.message}`);
    }
    gestorBId = userB.data.user.id;

    const userDel = await adminClient.auth.admin.createUser({
      email: delegadoEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'gestor', full_name: 'Delegado Test' },
    });
    if (userDel.error || !userDel.data.user) {
      throw new Error(`Error al crear Delegado: ${userDel.error?.message}`);
    }
    delegadoId = userDel.data.user.id;

    // 2. Realizar Auth signIn para obtener JWT tokens reales
    const signInA = await anonClient.auth.signInWithPassword({
      email: gestorAEmail,
      password,
    });
    if (signInA.error || !signInA.data.session) {
      throw new Error(`SignIn Gestor A falló: ${signInA.error?.message}`);
    }
    tokenGestorA = signInA.data.session.access_token;

    const signInB = await anonClient.auth.signInWithPassword({
      email: gestorBEmail,
      password,
    });
    if (signInB.error || !signInB.data.session) {
      throw new Error(`SignIn Gestor B falló: ${signInB.error?.message}`);
    }
    tokenGestorB = signInB.data.session.access_token;

    const signInDel = await anonClient.auth.signInWithPassword({
      email: delegadoEmail,
      password,
    });
    if (signInDel.error || !signInDel.data.session) {
      throw new Error(`SignIn Delegado falló: ${signInDel.error?.message}`);
    }
    tokenDelegado = signInDel.data.session.access_token;

    // 3. Crear fixtures de Grupo y Unidades
    const grupoRes = await adminClient
      .from('grupos')
      .insert({
        gestor_id: gestorAId,
        nombre: `Grupo Test Local ${timestamp}`,
      })
      .select('id')
      .single();
    if (grupoRes.error || !grupoRes.data) {
      throw new Error(`Error creando grupo: ${grupoRes.error?.message}`);
    }
    grupoAId = grupoRes.data.id;

    // Crear empate explícito de created_at entre unitA1 y unitA2 para verificar orden determinista por id
    const sharedCreatedAt = new Date().toISOString();

    const uA1Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: grupoAId,
        titulo_es: `Depto A1 ${timestamp}`,
        estado: 'publicada',
        categoria: 'departamento',
        created_at: sharedCreatedAt,
      })
      .select('id')
      .single();
    if (uA1Res.error || !uA1Res.data) throw new Error(`Error creando uA1: ${uA1Res.error?.message}`);
    unitA1Id = uA1Res.data.id;

    const uA2Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: grupoAId,
        titulo_es: `Depto A2 ${timestamp}`,
        estado: 'publicada',
        categoria: 'departamento',
        created_at: sharedCreatedAt,
      })
      .select('id')
      .single();
    if (uA2Res.error || !uA2Res.data) throw new Error(`Error creando uA2: ${uA2Res.error?.message}`);
    unitA2Id = uA2Res.data.id;

    const uA3Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: null,
        titulo_es: `Cochera A3 Fuera De Grupo ${timestamp}`,
        estado: 'publicada',
        categoria: 'cochera',
      })
      .select('id')
      .single();
    if (uA3Res.error || !uA3Res.data) throw new Error(`Error creando uA3: ${uA3Res.error?.message}`);
    unitA3Id = uA3Res.data.id;

    const uB1Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorBId,
        grupo_id: null,
        titulo_es: `Local B1 Gestor B Publicado ${timestamp}`,
        estado: 'publicada',
        categoria: 'comercial',
      })
      .select('id')
      .single();
    if (uB1Res.error || !uB1Res.data) throw new Error(`Error creando uB1: ${uB1Res.error?.message}`);
    unitB1Id = uB1Res.data.id;

    // 4. Crear invitación pendiente y completar ciclo de delegación mediante RPCs de dominio
    const invRes = await adminClient
      .from('invitaciones_delegados')
      .insert({
        gestor_id: gestorAId,
        delegado_id: delegadoId,
        email: delegadoEmail,
        email_snapshot: delegadoEmail,
        estado: 'pendiente',
      })
      .select('id')
      .single();
    if (invRes.error || !invRes.data) throw new Error(`Error creando invitacion: ${invRes.error?.message}`);
    invitacionId = invRes.data.id;

    const clientDelegado = createClient(config.apiUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenDelegado}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const acceptRes = await clientDelegado.rpc('accept_delegado_invitation', {
      p_invitation_id: invitacionId,
    });
    if (acceptRes.error || !acceptRes.data?.delegacion_id) {
      throw new Error(`accept_delegado_invitation falló: ${acceptRes.error?.message || 'sin id'}`);
    }
    delegacionId = acceptRes.data.delegacion_id;

    const clientGestorA = createClient(config.apiUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenGestorA}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const confRes = await clientGestorA.rpc('configure_delegacion', {
      p_delegacion_id: delegacionId,
      p_permiso: 'ver',
      p_alcance_tipo: 'grupo',
      p_grupo_id: grupoAId,
    });
    if (confRes.error) {
      throw new Error(`configure_delegacion falló: ${confRes.error.message}`);
    }

    // 5. Inicializar servicios y controller directos de alcance
    const configService = new ConfigService({
      SUPABASE_URL: config.apiUrl,
      SUPABASE_ANON_KEY: config.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: config.serviceRoleKey,
      AUTH_ALLOW_DEV_TOKENS: 'false',
      NODE_ENV: 'test',
    });

    const supabaseService = new SupabaseService(configService);
    const authzService = new AuthorizationService(supabaseService);
    const actionLogService = new ActionLogService(supabaseService);
    const cupoService = new CupoService(supabaseService);
    const traduccionService = new TraduccionService();
    const unidadesService = new UnidadesService(supabaseService, cupoService, traduccionService);

    controller = new UnidadesController(unidadesService, authzService, actionLogService);
    guard = new SupabaseAuthGuard(supabaseService, configService);
  }, 60000);

  afterAll(async () => {
    if (!config || !adminClient) return;

    // Revalidar localhost antes de ejecutar cleanup
    const checkUrl = new URL(config.apiUrl);
    if (checkUrl.hostname !== 'localhost' && checkUrl.hostname !== '127.0.0.1') {
      throw new Error(`Seguridad: host no verificado antes de cleanup: ${checkUrl.hostname}`);
    }

    const cleanupErrors: string[] = [];
    const safeRecordError = (tag: string, err: { code?: string; message?: string } | null | undefined) => {
      if (err) {
        cleanupErrors.push(`${tag}: ${err.code || 'ERR_OP'}`);
      }
    };

    // 1. Eliminar delegaciones
    if (delegacionId) {
      try {
        const { error } = await adminClient.from('delegaciones').delete().eq('id', delegacionId);
        safeRecordError('delegaciones delete', error);
      } catch {
        cleanupErrors.push('delegaciones delete threw');
      }
    }

    // 2. Eliminar invitaciones_delegados
    if (invitacionId) {
      try {
        const { error } = await adminClient.from('invitaciones_delegados').delete().eq('id', invitacionId);
        safeRecordError('invitaciones delete', error);
      } catch {
        cleanupErrors.push('invitaciones delete threw');
      }
    }

    // 3. Eliminar unidades
    const unitIdsToDelete = [unitA1Id, unitA2Id, unitA3Id, unitB1Id].filter(Boolean);
    if (unitIdsToDelete.length > 0) {
      try {
        const { error } = await adminClient.from('unidades').delete().in('id', unitIdsToDelete);
        safeRecordError('unidades delete', error);
      } catch {
        cleanupErrors.push('unidades delete threw');
      }
    }

    // 4. Eliminar grupos
    if (grupoAId) {
      try {
        const { error } = await adminClient.from('grupos').delete().eq('id', grupoAId);
        safeRecordError('grupos delete', error);
      } catch {
        cleanupErrors.push('grupos delete threw');
      }
    }

    // 5. Eliminar log_acciones generados por el fixture
    const logGestorIds = [gestorAId, gestorBId].filter(Boolean);
    if (logGestorIds.length > 0) {
      try {
        const { error } = await adminClient.from('log_acciones').delete().in('gestor_id', logGestorIds);
        safeRecordError('log_acciones delete', error);
      } catch {
        cleanupErrors.push('log_acciones delete threw');
      }
    }

    // 6. Eliminar usuarios (Delegado PRIMERO para respetar FK users_workspace_id_fkey)
    const userIdsToDelete = [delegadoId, gestorAId, gestorBId].filter(Boolean);
    for (const uid of userIdsToDelete) {
      try {
        const { error: userError } = await adminClient.from('users').delete().eq('id', uid);
        safeRecordError(`user delete ${uid}`, userError);
      } catch {
        cleanupErrors.push(`user delete ${uid} threw`);
      }

      try {
        const { error: authError } = await adminClient.auth.admin.deleteUser(uid);
        safeRecordError(`auth delete ${uid}`, authError);
      } catch {
        cleanupErrors.push(`auth delete ${uid} threw`);
      }
    }

    // 7. Verificación exhaustiva de ausencia post-cleanup (sin ignorar errores de consulta)
    if (delegacionId) {
      try {
        const { data: remDel, error: chkDelErr } = await adminClient.from('delegaciones').select('id').eq('id', delegacionId);
        if (chkDelErr) {
          cleanupErrors.push(`check delegaciones: ${chkDelErr.code || 'ERR_SELECT'}`);
        } else if (remDel && remDel.length > 0) {
          cleanupErrors.push('residuo detectado en delegaciones');
        }
      } catch {
        cleanupErrors.push('check delegaciones threw');
      }
    }

    if (invitacionId) {
      try {
        const { data: remInv, error: chkInvErr } = await adminClient.from('invitaciones_delegados').select('id').eq('id', invitacionId);
        if (chkInvErr) {
          cleanupErrors.push(`check invitaciones: ${chkInvErr.code || 'ERR_SELECT'}`);
        } else if (remInv && remInv.length > 0) {
          cleanupErrors.push('residuo detectado en invitaciones');
        }
      } catch {
        cleanupErrors.push('check invitaciones threw');
      }
    }

    if (unitIdsToDelete.length > 0) {
      try {
        const { data: remUnits, error: chkUnitsErr } = await adminClient.from('unidades').select('id').in('id', unitIdsToDelete);
        if (chkUnitsErr) {
          cleanupErrors.push(`check unidades: ${chkUnitsErr.code || 'ERR_SELECT'}`);
        } else if (remUnits && remUnits.length > 0) {
          cleanupErrors.push(`residuo detectado en unidades: ${remUnits.length}`);
        }
      } catch {
        cleanupErrors.push('check unidades threw');
      }
    }

    if (grupoAId) {
      try {
        const { data: remGrp, error: chkGrpErr } = await adminClient.from('grupos').select('id').eq('id', grupoAId);
        if (chkGrpErr) {
          cleanupErrors.push(`check grupos: ${chkGrpErr.code || 'ERR_SELECT'}`);
        } else if (remGrp && remGrp.length > 0) {
          cleanupErrors.push('residuo detectado en grupos');
        }
      } catch {
        cleanupErrors.push('check grupos threw');
      }
    }

    if (logGestorIds.length > 0) {
      try {
        const { data: remLogs, error: chkLogsErr } = await adminClient.from('log_acciones').select('id').in('gestor_id', logGestorIds);
        if (chkLogsErr) {
          cleanupErrors.push(`check log_acciones: ${chkLogsErr.code || 'ERR_SELECT'}`);
        } else if (remLogs && remLogs.length > 0) {
          cleanupErrors.push(`residuo detectado en log_acciones: ${remLogs.length}`);
        }
      } catch {
        cleanupErrors.push('check log_acciones threw');
      }
    }

    if (userIdsToDelete.length > 0) {
      try {
        const { data: remUsers, error: chkUsersErr } = await adminClient.from('users').select('id').in('id', userIdsToDelete);
        if (chkUsersErr) {
          cleanupErrors.push(`check users: ${chkUsersErr.code || 'ERR_SELECT'}`);
        } else if (remUsers && remUsers.length > 0) {
          cleanupErrors.push(`residuo detectado en users: ${remUsers.length}`);
        }
      } catch {
        cleanupErrors.push('check users threw');
      }

      for (const uid of userIdsToDelete) {
        try {
          const { data: authUserData, error: authChkErr } = await adminClient.auth.admin.getUserById(uid);
          if (authUserData?.user) {
            cleanupErrors.push(`residuo detectado en auth user: ${uid}`);
          } else if (authChkErr) {
            const status = (authChkErr as { status?: number }).status;
            const msg = (authChkErr.message || '').toLowerCase();
            // Solo se acepta ausencia esperada (404 o not found)
            const isExpectedAbsence = status === 404 || msg.includes('not found') || msg.includes('user_not_found');
            if (!isExpectedAbsence) {
              cleanupErrors.push(`check auth user unexpected failure: ${authChkErr.code || 'ERR_AUTH'}`);
            }
          }
        } catch {
          cleanupErrors.push(`check auth user threw for ${uid}`);
        }
      }
    }

    if (cleanupErrors.length > 0) {
      throw new Error(`Cleanup failed: ${cleanupErrors.join('; ')}`);
    }
  }, 60000);

  function createExecutionContext(token: string) {
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as AuthenticatedRequest;
    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };
    return {
      executionContext: executionContext as unknown as import('@nestjs/common').ExecutionContext,
      request,
    };
  }

  it('Gestor A ve exactamente sus 3 unidades y recuento total constante de 3', async () => {
    const { executionContext, request } = createExecutionContext(tokenGestorA);
    const canActivate = await guard.canActivate(executionContext);
    expect(canActivate).toBe(true);

    expect(request.user.rol).toBe('gestor');
    expect(request.user.workspace_id).toBe(gestorAId);

    const result = await controller.findAll({ page: 1, limit: 10 }, request);
    expect(result.count).toBe(3);
    expect(result.data).toHaveLength(3);

    const ids = result.data.map((u: { id: string }) => u.id);
    expect(ids).toContain(unitA1Id);
    expect(ids).toContain(unitA2Id);
    expect(ids).toContain(unitA3Id);
    expect(ids).not.toContain(unitB1Id);
  });

  it('Gestor B ve únicamente su unidad B1 (recurso ajeno excluido del espacio de Gestor A)', async () => {
    const { executionContext, request } = createExecutionContext(tokenGestorB);
    const canActivate = await guard.canActivate(executionContext);
    expect(canActivate).toBe(true);

    expect(request.user.rol).toBe('gestor');
    expect(request.user.workspace_id).toBe(gestorBId);

    const result = await controller.findAll({ page: 1, limit: 10 }, request);
    expect(result.count).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(unitB1Id);
    expect((result.data[0] as { gestor_id: string }).gestor_id).toBe(gestorBId);
  });

  it('Delegado con alcance grupo pagina con limit: 1 manteniendo count constante (2) y orden determinista ante empate', async () => {
    const { executionContext, request } = createExecutionContext(tokenDelegado);
    const canActivate = await guard.canActivate(executionContext);
    expect(canActivate).toBe(true);

    expect(request.user.rol).toBe('delegado');
    expect(request.user.workspace_id).toBe(gestorAId);

    // Consulta inicial: página 1 con limit 1
    const p1Run1 = await controller.findAll({ page: 1, limit: 1 }, request);
    expect(p1Run1.count).toBe(2);
    expect(p1Run1.data).toHaveLength(1);
    expect(p1Run1.page).toBe(1);
    expect(p1Run1.limit).toBe(1);
    expect((p1Run1.data[0] as { grupo_id: string }).grupo_id).toBe(grupoAId);

    // Repetición de página 1: debe devolver exactamente la misma unidad (orden determinista ante empate)
    const p1Run2 = await controller.findAll({ page: 1, limit: 1 }, request);
    expect(p1Run2.data[0].id).toBe(p1Run1.data[0].id);

    // Consulta página 2 con limit 1
    const p2Run1 = await controller.findAll({ page: 2, limit: 1 }, request);
    expect(p2Run1.count).toBe(2);
    expect(p2Run1.data).toHaveLength(1);
    expect(p2Run1.page).toBe(2);
    expect(p2Run1.limit).toBe(1);
    expect((p2Run1.data[0] as { grupo_id: string }).grupo_id).toBe(grupoAId);

    // Repetición de página 2: debe devolver exactamente la misma unidad
    const p2Run2 = await controller.findAll({ page: 2, limit: 1 }, request);
    expect(p2Run2.data[0].id).toBe(p2Run1.data[0].id);

    // Las dos páginas devuelven unidades distintas y cubren exactamente el conjunto {unitA1Id, unitA2Id}
    expect(p1Run1.data[0].id).not.toBe(p2Run1.data[0].id);
    const returnedSet = new Set([p1Run1.data[0].id, p2Run1.data[0].id]);
    expect(returnedSet).toEqual(new Set([unitA1Id, unitA2Id]));

    // La unidad aislada A3 y la unidad de Gestor B nunca aparecen en ninguna página
    expect(returnedSet.has(unitA3Id)).toBe(false);
    expect(returnedSet.has(unitB1Id)).toBe(false);
  });
});
