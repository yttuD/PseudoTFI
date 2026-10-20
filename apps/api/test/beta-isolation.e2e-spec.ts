import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { SupabaseService } from '../src/supabase/supabase.service.js';
import { AuthorizationService } from '../src/authorization/authorization.service.js';
import { ActionLogService } from '../src/authorization/action-log.service.js';
import { CupoService } from '../src/cupo/cupo.service.js';
import { TraduccionService } from '../src/common/services/traduccion/traduccion.service.js';
import { UnidadesService } from '../src/unidades/unidades.service.js';
import { UnidadesController } from '../src/unidades/unidades.controller.js';
import { GruposService } from '../src/grupos/grupos.service.js';
import { GruposController } from '../src/grupos/grupos.controller.js';
import { AlquileresService } from '../src/alquileres/alquileres.service.js';
import { AlquileresController } from '../src/alquileres/alquileres.controller.js';
import { MarketplaceService } from '../src/marketplace/marketplace.service.js';
import { MarketplaceController } from '../src/marketplace/marketplace.controller.js';
import { SupabaseAuthGuard, type AuthenticatedRequest } from '../src/auth/supabase-auth.guard.js';
import { UnidadEstado } from '../src/unidades/dto/cambiar-estado.dto.js';

interface LocalConfig {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

interface UnidadRow {
  id: string;
  gestor_id: string;
  grupo_id: string | null;
  titulo_es: string;
  estado: string;
  categoria: string;
  created_at: string;
  superficie?: number | null;
  deleted_at?: string | null;
}

interface GrupoRow {
  id: string;
  gestor_id: string;
  nombre: string;
  descripcion?: string | null;
  deleted_at?: string | null;
}

interface AlquilerRow {
  id: string;
  gestor_id: string;
  unidad_id: string;
  inquilino_id: string;
  modalidad: string;
  monto_total: number;
  observaciones?: string | null;
  deleted_at?: string | null;
}

interface ModalidadRow {
  id: string;
  unidad_id: string;
  unidad_tiempo: string;
  precio: number;
  deleted_at: string | null;
}

function getLocalConfig(): LocalConfig {
  const output = execSync('supabase status -o json', {
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf-8',
  });

  const parsed = JSON.parse(output) as Record<string, string>;
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

describe('B007a: Aislamiento API Real y Autorización Multi-Tenant (T005 / T001)', () => {
  let config: LocalConfig;
  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let clientGestorA: SupabaseClient;

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
  let grupoVacioId: string;
  let grupoBId: string;

  let unitA1Id: string;
  let unitA2Id: string;
  let unitA3Id: string;
  let unitABorradorId: string;
  let unitADeletedId: string;
  let unitB1Id: string;

  let modalidadA1Id: string;
  let inquilinoAId: string;
  let inquilinoBId: string;
  let alquilerA1Id: string;

  let invitacionId: string;
  let delegacionId: string;
  let fixtureMarker: string;

  const createdGrupoIds: string[] = [];
  const createdAlquilerIds: string[] = [];
  const createdModalidadIds: string[] = [];

  let unidadesController: UnidadesController;
  let gruposController: GruposController;
  let alquileresController: AlquileresController;
  let marketplaceController: MarketplaceController;
  let guard: SupabaseAuthGuard;

  beforeAll(async () => {
    config = getLocalConfig();
    adminClient = createClient(config.apiUrl, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anonClient = createClient(config.apiUrl, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const filesToHash = [
      'apps/api/test/beta-isolation.e2e-spec.ts',
      'apps/api/src/unidades/unidades.controller.ts',
      'apps/api/src/authorization/authorization.service.ts',
      'apps/api/src/grupos/grupos.controller.ts',
      'apps/api/src/alquileres/alquileres.controller.ts',
    ];
    for (const f of filesToHash) {
      try {
        const content = readFileSync(resolve(process.cwd(), f));
        const hash = createHash('sha256').update(content).digest('hex');
        console.log(`SHA256:${f}:${hash}`);
      } catch {
        // Continue
      }
    }

    const timestamp = Date.now();
    fixtureMarker = `mkt_${timestamp}`;
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

    // 2. Realizar Auth signIn para obtener JWT tokens reales mediante clientes dedicados
    // Se evita utilizar anonClient para que este conserve sesión nula en todo el ciclo
    const authClientA = createClient(config.apiUrl, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signInA = await authClientA.auth.signInWithPassword({
      email: gestorAEmail,
      password,
    });
    if (signInA.error || !signInA.data.session) {
      throw new Error(`SignIn Gestor A falló: ${signInA.error?.message}`);
    }
    tokenGestorA = signInA.data.session.access_token;

    const authClientB = createClient(config.apiUrl, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signInB = await authClientB.auth.signInWithPassword({
      email: gestorBEmail,
      password,
    });
    if (signInB.error || !signInB.data.session) {
      throw new Error(`SignIn Gestor B falló: ${signInB.error?.message}`);
    }
    tokenGestorB = signInB.data.session.access_token;

    const authClientDel = createClient(config.apiUrl, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signInDel = await authClientDel.auth.signInWithPassword({
      email: delegadoEmail,
      password,
    });
    if (signInDel.error || !signInDel.data.session) {
      throw new Error(`SignIn Delegado falló: ${signInDel.error?.message}`);
    }
    tokenDelegado = signInDel.data.session.access_token;

    clientGestorA = createClient(config.apiUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenGestorA}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3. Crear fixtures de Grupos
    const grupoARes = await adminClient
      .from('grupos')
      .insert({
        gestor_id: gestorAId,
        nombre: `Grupo A Test ${timestamp}`,
      })
      .select('id')
      .single();
    if (grupoARes.error || !grupoARes.data) {
      throw new Error(`Error creando grupo A: ${grupoARes.error?.message}`);
    }
    grupoAId = (grupoARes.data as { id: string }).id;
    createdGrupoIds.push(grupoAId);

    const grupoVacioRes = await adminClient
      .from('grupos')
      .insert({
        gestor_id: gestorAId,
        nombre: `Grupo Vacio Test ${timestamp}`,
      })
      .select('id')
      .single();
    if (grupoVacioRes.error || !grupoVacioRes.data) {
      throw new Error(`Error creando grupo vacio: ${grupoVacioRes.error?.message}`);
    }
    grupoVacioId = (grupoVacioRes.data as { id: string }).id;
    createdGrupoIds.push(grupoVacioId);

    const grupoBRes = await adminClient
      .from('grupos')
      .insert({
        gestor_id: gestorBId,
        nombre: `Grupo B Test ${timestamp}`,
      })
      .select('id')
      .single();
    if (grupoBRes.error || !grupoBRes.data) {
      throw new Error(`Error creando grupo B: ${grupoBRes.error?.message}`);
    }
    grupoBId = (grupoBRes.data as { id: string }).id;
    createdGrupoIds.push(grupoBId);

    // 4. Crear fixtures de Unidades (incluyendo privada borrador y soft-deleted)
    const sharedCreatedAt = new Date().toISOString();

    const uA1Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: grupoAId,
        titulo_es: `Depto A1 ${fixtureMarker}`,
        estado: 'publicada',
        categoria: 'departamento',
        created_at: sharedCreatedAt,
      })
      .select('id')
      .single();
    if (uA1Res.error || !uA1Res.data) throw new Error(`Error creando uA1: ${uA1Res.error?.message}`);
    unitA1Id = (uA1Res.data as { id: string }).id;

    const uA2Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: grupoAId,
        titulo_es: `Depto A2 ${fixtureMarker}`,
        estado: 'publicada',
        categoria: 'departamento',
        created_at: sharedCreatedAt,
      })
      .select('id')
      .single();
    if (uA2Res.error || !uA2Res.data) throw new Error(`Error creando uA2: ${uA2Res.error?.message}`);
    unitA2Id = (uA2Res.data as { id: string }).id;

    const uA3Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: null,
        titulo_es: `Cochera A3 Fuera De Grupo ${fixtureMarker}`,
        estado: 'publicada',
        categoria: 'cochera',
      })
      .select('id')
      .single();
    if (uA3Res.error || !uA3Res.data) throw new Error(`Error creando uA3: ${uA3Res.error?.message}`);
    unitA3Id = (uA3Res.data as { id: string }).id;

    const uBorradorRes = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: null,
        titulo_es: `Depto Borrador A ${fixtureMarker}`,
        estado: 'borrador',
        categoria: 'departamento',
      })
      .select('id')
      .single();
    if (uBorradorRes.error || !uBorradorRes.data) throw new Error(`Error creando uBorrador: ${uBorradorRes.error?.message}`);
    unitABorradorId = (uBorradorRes.data as { id: string }).id;

    const uDeletedRes = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorAId,
        grupo_id: grupoAId,
        titulo_es: `Depto Deleted A ${fixtureMarker}`,
        estado: 'publicada',
        categoria: 'departamento',
        deleted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (uDeletedRes.error || !uDeletedRes.data) throw new Error(`Error creando uDeleted: ${uDeletedRes.error?.message}`);
    unitADeletedId = (uDeletedRes.data as { id: string }).id;

    const uB1Res = await adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorBId,
        grupo_id: grupoBId,
        titulo_es: `Local B1 Gestor B Publicado ${timestamp}`,
        estado: 'publicada',
        categoria: 'comercial',
      })
      .select('id')
      .single();
    if (uB1Res.error || !uB1Res.data) throw new Error(`Error creando uB1: ${uB1Res.error?.message}`);
    unitB1Id = (uB1Res.data as { id: string }).id;

    // 5. Fixture modalidad de precio en unitA1
    const modRes = await adminClient
      .from('modalidades_precio')
      .insert({
        unidad_id: unitA1Id,
        unidad_tiempo: 'mes',
        cantidad_tiempo: 1,
        precio: 50000,
      })
      .select('id')
      .single();
    if (modRes.error || !modRes.data) throw new Error(`Error creando modalidad en uA1: ${modRes.error?.message}`);
    modalidadA1Id = (modRes.data as { id: string }).id;
    createdModalidadIds.push(modalidadA1Id);

    // 6. Fixtures inquilinos y alquiler en Gestor A
    const inqARes = await adminClient
      .from('inquilinos')
      .insert({
        gestor_id: gestorAId,
        nombre_completo: `Inquilino Gestor A ${timestamp}`,
        email: `inquilino-a-${timestamp}@local.test`,
      })
      .select('id')
      .single();
    if (inqARes.error || !inqARes.data) throw new Error(`Error creando inquilino A: ${inqARes.error?.message}`);
    inquilinoAId = (inqARes.data as { id: string }).id;

    const inqBRes = await adminClient
      .from('inquilinos')
      .insert({
        gestor_id: gestorBId,
        nombre_completo: `Inquilino Gestor B ${timestamp}`,
        email: `inquilino-b-${timestamp}@local.test`,
      })
      .select('id')
      .single();
    if (inqBRes.error || !inqBRes.data) throw new Error(`Error creando inquilino B: ${inqBRes.error?.message}`);
    inquilinoBId = (inqBRes.data as { id: string }).id;

    const alqARes = await adminClient
      .from('alquileres')
      .insert({
        gestor_id: gestorAId,
        unidad_id: unitA1Id,
        inquilino_id: inquilinoAId,
        modalidad: 'mensual',
        inicio_at: '2027-01-01T10:00:00.000Z',
        fin_at: '2027-02-01T10:00:00.000Z',
        fecha_inicio: '2027-01-01',
        fecha_fin: '2027-02-01',
        monto_total: 50000,
        sena_eleccion: 'sin_sena',
        monto_sena: 0,
        estado_pago: 'pendiente',
        monto_cobrado: 0,
      })
      .select('id')
      .single();
    if (alqARes.error || !alqARes.data) throw new Error(`Error creando alquiler A1: ${alqARes.error?.message}`);
    alquilerA1Id = (alqARes.data as { id: string }).id;
    createdAlquilerIds.push(alquilerA1Id);

    // 7. Invitación directa y aceptación de Delegado (queda en estado aceptada_sin_configurar)
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
    invitacionId = (invRes.data as { id: string }).id;

    const clientDelegado = createClient(config.apiUrl, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenDelegado}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const acceptRes = await clientDelegado.rpc('accept_delegado_invitation', {
      p_invitation_id: invitacionId,
    });
    const acceptData = acceptRes.data as { delegacion_id?: string } | null;
    if (acceptRes.error || !acceptData?.delegacion_id) {
      throw new Error(`accept_delegado_invitation falló: ${acceptRes.error?.message || 'sin id'}`);
    }
    delegacionId = acceptData.delegacion_id;

    // 8. Inicializar servicios y controllers
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
    unidadesController = new UnidadesController(unidadesService, authzService, actionLogService);

    const gruposService = new GruposService(supabaseService);
    gruposController = new GruposController(gruposService, authzService, actionLogService);

    const alquileresService = new AlquileresService(supabaseService);
    alquileresController = new AlquileresController(alquileresService, authzService, actionLogService);

    const marketplaceService = new MarketplaceService(supabaseService);
    marketplaceController = new MarketplaceController(marketplaceService, supabaseService);

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

    // 1. Eliminar alquileres
    const alqIdsToDelete = [...createdAlquilerIds].filter(Boolean);
    if (alqIdsToDelete.length > 0) {
      try {
        const { error } = await adminClient.from('alquileres').delete().in('id', alqIdsToDelete);
        safeRecordError('alquileres delete', error);
      } catch {
        cleanupErrors.push('alquileres delete threw');
      }
    }

    // 2. Eliminar inquilinos
    const inqIdsToDelete = [inquilinoAId, inquilinoBId].filter(Boolean);
    if (inqIdsToDelete.length > 0) {
      try {
        const { error } = await adminClient.from('inquilinos').delete().in('id', inqIdsToDelete);
        safeRecordError('inquilinos delete', error);
      } catch {
        cleanupErrors.push('inquilinos delete threw');
      }
    }

    // 3. Eliminar modalidades_precio
    const modIdsToDelete = [...createdModalidadIds].filter(Boolean);
    if (modIdsToDelete.length > 0) {
      try {
        const { error } = await adminClient.from('modalidades_precio').delete().in('id', modIdsToDelete);
        safeRecordError('modalidades_precio delete', error);
      } catch {
        cleanupErrors.push('modalidades_precio delete threw');
      }
    }

    // 4. Eliminar delegacion_unidades y delegaciones
    if (delegacionId) {
      try {
        const { error: delUnitsErr } = await adminClient
          .from('delegacion_unidades')
          .delete()
          .eq('delegacion_id', delegacionId);
        safeRecordError('delegacion_unidades delete', delUnitsErr);
      } catch {
        cleanupErrors.push('delegacion_unidades delete threw');
      }

      try {
        const { error } = await adminClient.from('delegaciones').delete().eq('id', delegacionId);
        safeRecordError('delegaciones delete', error);
      } catch {
        cleanupErrors.push('delegaciones delete threw');
      }
    }

    // 5. Eliminar invitaciones_delegados
    if (invitacionId) {
      try {
        const { error } = await adminClient.from('invitaciones_delegados').delete().eq('id', invitacionId);
        safeRecordError('invitaciones delete', error);
      } catch {
        cleanupErrors.push('invitaciones delete threw');
      }
    }

    // 6. Eliminar unidades
    const unitIdsToDelete = [unitA1Id, unitA2Id, unitA3Id, unitABorradorId, unitADeletedId, unitB1Id].filter(Boolean);
    if (unitIdsToDelete.length > 0) {
      try {
        const { error } = await adminClient.from('unidades').delete().in('id', unitIdsToDelete);
        safeRecordError('unidades delete', error);
      } catch {
        cleanupErrors.push('unidades delete threw');
      }
    }

    // 7. Eliminar grupos
    const grupoIdsToDelete = [...createdGrupoIds].filter(Boolean);
    if (grupoIdsToDelete.length > 0) {
      try {
        const { error } = await adminClient.from('grupos').delete().in('id', grupoIdsToDelete);
        safeRecordError('grupos delete', error);
      } catch {
        cleanupErrors.push('grupos delete threw');
      }
    }

    // 8. Eliminar log_acciones generados por los gestores de test
    const logGestorIds = [gestorAId, gestorBId].filter(Boolean);
    if (logGestorIds.length > 0) {
      try {
        const { error } = await adminClient.from('log_acciones').delete().in('gestor_id', logGestorIds);
        safeRecordError('log_acciones delete', error);
      } catch {
        cleanupErrors.push('log_acciones delete threw');
      }
    }

    // 9. Eliminar usuarios (Delegado PRIMERO para respetar FK users_workspace_id_fkey)
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

    // 10. Verificación exhaustiva de ausencia para TODAS las tablas propias
    if (alqIdsToDelete.length > 0) {
      try {
        const { data: remAlqs, error: chkAlqsErr } = await adminClient.from('alquileres').select('id').in('id', alqIdsToDelete);
        if (chkAlqsErr) cleanupErrors.push(`check alquileres: ${chkAlqsErr.code || 'ERR_SELECT'}`);
        else if (remAlqs && remAlqs.length > 0) cleanupErrors.push(`residuo alquileres: ${remAlqs.length}`);
      } catch {
        cleanupErrors.push('check alquileres threw');
      }
    }

    if (inqIdsToDelete.length > 0) {
      try {
        const { data: remInqs, error: chkInqsErr } = await adminClient.from('inquilinos').select('id').in('id', inqIdsToDelete);
        if (chkInqsErr) cleanupErrors.push(`check inquilinos: ${chkInqsErr.code || 'ERR_SELECT'}`);
        else if (remInqs && remInqs.length > 0) cleanupErrors.push(`residuo inquilinos: ${remInqs.length}`);
      } catch {
        cleanupErrors.push('check inquilinos threw');
      }
    }

    if (modIdsToDelete.length > 0) {
      try {
        const { data: remMods, error: chkModsErr } = await adminClient.from('modalidades_precio').select('id').in('id', modIdsToDelete);
        if (chkModsErr) cleanupErrors.push(`check modalidades_precio: ${chkModsErr.code || 'ERR_SELECT'}`);
        else if (remMods && remMods.length > 0) cleanupErrors.push(`residuo modalidades_precio: ${remMods.length}`);
      } catch {
        cleanupErrors.push('check modalidades_precio threw');
      }
    }

    if (delegacionId) {
      try {
        const { data: remDelUnits, error: chkDelUnitsErr } = await adminClient.from('delegacion_unidades').select('delegacion_id').eq('delegacion_id', delegacionId);
        if (chkDelUnitsErr) cleanupErrors.push(`check delegacion_unidades: ${chkDelUnitsErr.code || 'ERR_SELECT'}`);
        else if (remDelUnits && remDelUnits.length > 0) cleanupErrors.push(`residuo delegacion_unidades: ${remDelUnits.length}`);
      } catch {
        cleanupErrors.push('check delegacion_unidades threw');
      }

      try {
        const { data: remDel, error: chkDelErr } = await adminClient.from('delegaciones').select('id').eq('id', delegacionId);
        if (chkDelErr) cleanupErrors.push(`check delegaciones: ${chkDelErr.code || 'ERR_SELECT'}`);
        else if (remDel && remDel.length > 0) cleanupErrors.push('residuo delegaciones');
      } catch {
        cleanupErrors.push('check delegaciones threw');
      }
    }

    if (invitacionId) {
      try {
        const { data: remInv, error: chkInvErr } = await adminClient.from('invitaciones_delegados').select('id').eq('id', invitacionId);
        if (chkInvErr) cleanupErrors.push(`check invitaciones: ${chkInvErr.code || 'ERR_SELECT'}`);
        else if (remInv && remInv.length > 0) cleanupErrors.push('residuo invitaciones');
      } catch {
        cleanupErrors.push('check invitaciones threw');
      }
    }

    if (unitIdsToDelete.length > 0) {
      try {
        const { data: remUnits, error: chkUnitsErr } = await adminClient.from('unidades').select('id').in('id', unitIdsToDelete);
        if (chkUnitsErr) cleanupErrors.push(`check unidades: ${chkUnitsErr.code || 'ERR_SELECT'}`);
        else if (remUnits && remUnits.length > 0) cleanupErrors.push(`residuo unidades: ${remUnits.length}`);
      } catch {
        cleanupErrors.push('check unidades threw');
      }
    }

    if (grupoIdsToDelete.length > 0) {
      try {
        const { data: remGrps, error: chkGrpsErr } = await adminClient.from('grupos').select('id').in('id', grupoIdsToDelete);
        if (chkGrpsErr) cleanupErrors.push(`check grupos: ${chkGrpsErr.code || 'ERR_SELECT'}`);
        else if (remGrps && remGrps.length > 0) cleanupErrors.push(`residuo grupos: ${remGrps.length}`);
      } catch {
        cleanupErrors.push('check grupos threw');
      }
    }

    if (logGestorIds.length > 0) {
      try {
        const { data: remLogs, error: chkLogsErr } = await adminClient.from('log_acciones').select('id').in('gestor_id', logGestorIds);
        if (chkLogsErr) cleanupErrors.push(`check log_acciones: ${chkLogsErr.code || 'ERR_SELECT'}`);
        else if (remLogs && remLogs.length > 0) cleanupErrors.push(`residuo log_acciones: ${remLogs.length}`);
      } catch {
        cleanupErrors.push('check log_acciones threw');
      }
    }

    if (userIdsToDelete.length > 0) {
      try {
        const { data: remUsers, error: chkUsersErr } = await adminClient.from('users').select('id').in('id', userIdsToDelete);
        if (chkUsersErr) cleanupErrors.push(`check users: ${chkUsersErr.code || 'ERR_SELECT'}`);
        else if (remUsers && remUsers.length > 0) cleanupErrors.push(`residuo users: ${remUsers.length}`);
      } catch {
        cleanupErrors.push('check users threw');
      }
    }

    for (const uid of userIdsToDelete) {
      try {
        const { data: authUserData, error: authChkErr } = await adminClient.auth.admin.getUserById(uid);
        if (authUserData?.user) {
          cleanupErrors.push(`residuo auth user: ${uid}`);
        } else if (authChkErr) {
          const status = (authChkErr as { status?: number }).status;
          const msg = (authChkErr.message || '').toLowerCase();
          const isExpectedAbsence = status === 404 || msg.includes('not found') || msg.includes('user_not_found');
          if (!isExpectedAbsence) {
            cleanupErrors.push(`check auth user unexpected failure: ${authChkErr.code || 'ERR_AUTH'}`);
          }
        }
      } catch {
        cleanupErrors.push(`check auth user threw for ${uid}`);
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
      executionContext: executionContext as unknown as ExecutionContext,
      request,
    };
  }

  describe('1. Listado paginado Gestor A/B y aislamiento multi-tenant', () => {
    it('Gestor A ve exactamente sus 4 unidades operativas (3 publicadas + 1 borrador) y recuento total constante de 4', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorA);
      await guard.canActivate(executionContext);

      expect(request.user.rol).toBe('gestor');
      expect(request.user.workspace_id).toBe(gestorAId);

      const p1 = await unidadesController.findAll({ page: 1, limit: 2 }, request);
      expect(p1.count).toBe(4);
      expect(p1.data).toHaveLength(2);

      const p2 = await unidadesController.findAll({ page: 2, limit: 2 }, request);
      expect(p2.count).toBe(4);
      expect(p2.data).toHaveLength(2);

      const allIds = [...p1.data, ...p2.data].map((u) => (u as UnidadRow).id);
      expect(allIds).toContain(unitA1Id);
      expect(allIds).toContain(unitA2Id);
      expect(allIds).toContain(unitA3Id);
      expect(allIds).toContain(unitABorradorId);
      expect(allIds).not.toContain(unitADeletedId);
      expect(allIds).not.toContain(unitB1Id);
    });

    it('Gestor B ve únicamente su unidad B1 (recurso ajeno excluido del espacio de Gestor A)', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorB);
      await guard.canActivate(executionContext);

      expect(request.user.rol).toBe('gestor');
      expect(request.user.workspace_id).toBe(gestorBId);

      const result = await unidadesController.findAll({ page: 1, limit: 10 }, request);
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect((result.data[0] as UnidadRow).id).toBe(unitB1Id);
      expect((result.data[0] as UnidadRow).gestor_id).toBe(gestorBId);
    });

    it('Gestor A consulta page=9999 (fuera de rango): recupera count auténtico 4 y data vacía sin error PGRST103', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorA);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 9999, limit: 10 }, request);
      expect(result.count).toBe(4);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(9999);
      expect(result.limit).toBe(10);
    });

    it('Gestor B consulta page=9999 (fuera de rango): recupera count auténtico 1 y data vacía sin error PGRST103', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorB);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 9999, limit: 10 }, request);
      expect(result.count).toBe(1);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(9999);
      expect(result.limit).toBe(10);
    });
  });

  describe('2. Ciclo de vida y alcances del Delegado (pendiente, grupo, cuenta, unidades, vacío)', () => {
    it('Delegado antes de configurar (aceptada_sin_configurar) obtiene lista vacía y recuento 0', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 1, limit: 10 }, request);
      expect(result.count).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('Delegado con alcance grupo pagina con limit: 1 manteniendo count constante (2) y orden determinista ante empate', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'grupo',
        p_grupo_id: grupoAId,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const p1Run1 = await unidadesController.findAll({ page: 1, limit: 1 }, request);
      expect(p1Run1.count).toBe(2);
      expect(p1Run1.data).toHaveLength(1);
      expect((p1Run1.data[0] as UnidadRow).grupo_id).toBe(grupoAId);

      const p1Run2 = await unidadesController.findAll({ page: 1, limit: 1 }, request);
      expect((p1Run2.data[0] as UnidadRow).id).toBe((p1Run1.data[0] as UnidadRow).id);

      const p2Run1 = await unidadesController.findAll({ page: 2, limit: 1 }, request);
      expect(p2Run1.count).toBe(2);
      expect(p2Run1.data).toHaveLength(1);
      expect((p2Run1.data[0] as UnidadRow).grupo_id).toBe(grupoAId);

      const p2Run2 = await unidadesController.findAll({ page: 2, limit: 1 }, request);
      expect((p2Run2.data[0] as UnidadRow).id).toBe((p2Run1.data[0] as UnidadRow).id);

      const returnedSet = new Set([(p1Run1.data[0] as UnidadRow).id, (p2Run1.data[0] as UnidadRow).id]);
      expect(returnedSet).toEqual(new Set([unitA1Id, unitA2Id]));
      expect(returnedSet.has(unitA3Id)).toBe(false);
      expect(returnedSet.has(unitB1Id)).toBe(false);
    });

    it('Delegado con alcance grupo consulta page=9999 (fuera de rango): recupera count auténtico 2 y data vacía', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 9999, limit: 10 }, request);
      expect(result.count).toBe(2);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(9999);
      expect(result.limit).toBe(10);
    });

    it('Delegado con alcance cuenta ve las 4 unidades operativas del Gestor A y excluye unidad B1 y deleted', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'cuenta',
        p_grupo_id: null,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 1, limit: 10 }, request);
      expect(result.count).toBe(4);
      expect(result.data).toHaveLength(4);

      const ids = result.data.map((u) => (u as UnidadRow).id);
      expect(ids).toContain(unitA1Id);
      expect(ids).toContain(unitA2Id);
      expect(ids).toContain(unitA3Id);
      expect(ids).toContain(unitABorradorId);
      expect(ids).not.toContain(unitADeletedId);
      expect(ids).not.toContain(unitB1Id);
    });

    it('Delegado con alcance unidades explícitas ve exactamente unitA1', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'unidades',
        p_grupo_id: null,
        p_unidad_ids: [unitA1Id],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 1, limit: 10 }, request);
      expect(result.count).toBe(1);
      expect(result.data).toHaveLength(1);
      expect((result.data[0] as UnidadRow).id).toBe(unitA1Id);
    });

    it('Delegado con alcance unidades explícitas consulta page=9999 (fuera de rango): recupera count auténtico 1 y data vacía', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 9999, limit: 10 }, request);
      expect(result.count).toBe(1);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(9999);
      expect(result.limit).toBe(10);
    });

    it('Delegado con alcance grupo vacío devuelve count: 0 y data: []', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'grupo',
        p_grupo_id: grupoVacioId,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const result = await unidadesController.findAll({ page: 1, limit: 10 }, request);
      expect(result.count).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('3. Detalle directo (findOne) y getAlquileres en scope, fuera de scope y workspace', () => {
    it('Gestor A accede a unitA1 pero recibe 404 en unitB1 (otro workspace)', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorA);
      await guard.canActivate(executionContext);

      const uA1 = await unidadesController.findOne(unitA1Id, request);
      expect((uA1 as UnidadRow).id).toBe(unitA1Id);

      await expect(unidadesController.findOne(unitB1Id, request)).rejects.toThrow(NotFoundException);
    });

    it('Gestor B recibe 404 al intentar acceder a unitA1', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorB);
      await guard.canActivate(executionContext);

      await expect(unidadesController.findOne(unitA1Id, request)).rejects.toThrow(NotFoundException);
    });

    it('Delegado con alcance grupo accede a unitA1 pero recibe 404 en unitA3 (fuera de scope) y unitB1 (ajena)', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'grupo',
        p_grupo_id: grupoAId,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const uA1 = await unidadesController.findOne(unitA1Id, request);
      expect((uA1 as UnidadRow).id).toBe(unitA1Id);

      await expect(unidadesController.findOne(unitA3Id, request)).rejects.toThrow(NotFoundException);
      await expect(unidadesController.findOne(unitB1Id, request)).rejects.toThrow(NotFoundException);
    });

    it('getAlquileres de UnidadesController entrega alquileres en scope y rechaza fuera de scope y workspace', async () => {
      const { executionContext: ecGestorA, request: reqGestorA } = createExecutionContext(tokenGestorA);
      await guard.canActivate(ecGestorA);
      const alqsGestorA = await unidadesController.getAlquileres(unitA1Id, reqGestorA);
      expect(Array.isArray(alqsGestorA)).toBe(true);
      expect((alqsGestorA as AlquilerRow[])[0].id).toBe(alquilerA1Id);
      await expect(unidadesController.getAlquileres(unitB1Id, reqGestorA)).rejects.toThrow(NotFoundException);

      const { executionContext: ecGestorB, request: reqGestorB } = createExecutionContext(tokenGestorB);
      await guard.canActivate(ecGestorB);
      await expect(unidadesController.getAlquileres(unitA1Id, reqGestorB)).rejects.toThrow(NotFoundException);

      const { executionContext: ecDel, request: reqDel } = createExecutionContext(tokenDelegado);
      await guard.canActivate(ecDel);
      const alqsDel = await unidadesController.getAlquileres(unitA1Id, reqDel);
      expect(Array.isArray(alqsDel)).toBe(true);
      expect((alqsDel as AlquilerRow[])[0].id).toBe(alquilerA1Id);

      await expect(unidadesController.getAlquileres(unitA3Id, reqDel)).rejects.toThrow(NotFoundException);
      await expect(unidadesController.getAlquileres(unitB1Id, reqDel)).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Permiso "ver" rechaza escrituras incluso dentro de scope (con verificación DB exhaustiva)', () => {
    it('Delegado con permiso "ver" no puede actualizar datos de unidad en su scope y la DB permanece intacta', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      await expect(
        unidadesController.update(unitA1Id, { titulo_es: 'Titulo Ilegal Delegado' }, request),
      ).rejects.toThrow(NotFoundException);

      const { data: dbUnit, error: dbErr } = await adminClient
        .from('unidades')
        .select('titulo_es')
        .eq('id', unitA1Id)
        .single();
      expect(dbErr).toBeNull();
      expect((dbUnit as UnidadRow).titulo_es).not.toBe('Titulo Ilegal Delegado');
    });

    it('Delegado con permiso "ver" no puede cambiar estado de unidad y la DB permanece intacta', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      await expect(
        unidadesController.cambiarEstado(unitA1Id, { estado: UnidadEstado.Pausada }, request),
      ).rejects.toThrow(NotFoundException);

      const { data: dbUnit, error: dbErr } = await adminClient
        .from('unidades')
        .select('estado')
        .eq('id', unitA1Id)
        .single();
      expect(dbErr).toBeNull();
      expect((dbUnit as UnidadRow).estado).toBe('publicada');
    });

    it('Delegado con permiso "ver" no puede crear, modificar ni eliminar modalidades de precio', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      await expect(
        unidadesController.createModalidad(
          unitA1Id,
          { unidad_tiempo: 'dia', cantidad_tiempo: 1, precio: 1000 },
          request,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.updateModalidad(
          unitA1Id,
          modalidadA1Id,
          { precio: 99999 },
          request,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.removeModalidad(unitA1Id, modalidadA1Id, request),
      ).rejects.toThrow(NotFoundException);

      const { data: dbMods, error: modsErr } = await adminClient
        .from('modalidades_precio')
        .select('id, precio, deleted_at')
        .eq('unidad_id', unitA1Id);
      expect(modsErr).toBeNull();
      expect(dbMods).toHaveLength(1);
      const mod = (dbMods as ModalidadRow[])[0];
      expect(mod.id).toBe(modalidadA1Id);
      expect(mod.precio).toBe(50000);
      expect(mod.deleted_at).toBeNull();
    });

    it('Delegado con permiso "ver" no puede crear, modificar ni eliminar alquileres', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      await expect(
        alquileresController.create(
          {
            unidad_id: unitA1Id,
            inquilino_id: inquilinoAId,
            modalidad: 'mensual',
            monto_total: 60000,
            inicio_at: '2027-03-01T10:00:00.000Z',
            fin_at: '2027-04-01T10:00:00.000Z',
          },
          request,
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        alquileresController.update(
          alquilerA1Id,
          { observaciones: 'Ilegal observacion' },
          request,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        alquileresController.remove(alquilerA1Id, request),
      ).rejects.toThrow(NotFoundException);

      const { data: dbAlqs, error: alqsErr } = await adminClient
        .from('alquileres')
        .select('id, observaciones, deleted_at')
        .eq('unidad_id', unitA1Id);
      expect(alqsErr).toBeNull();
      expect(dbAlqs).toHaveLength(1);
      const alq = (dbAlqs as AlquilerRow[])[0];
      expect(alq.id).toBe(alquilerA1Id);
      expect(alq.observaciones).toBeNull();
      expect(alq.deleted_at).toBeNull();
    });

    it('Gestor B no puede modificar unidad A1 ni alquiler A1 (aislamiento entre workspaces)', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorB);
      await guard.canActivate(executionContext);

      await expect(
        unidadesController.update(unitA1Id, { titulo_es: 'Ataque Gestor B' }, request),
      ).rejects.toThrow(NotFoundException);

      await expect(
        alquileresController.update(alquilerA1Id, { observaciones: 'Ataque Gestor B' }, request),
      ).rejects.toThrow(NotFoundException);

      const { data: dbUnit, error: unitErr } = await adminClient
        .from('unidades')
        .select('titulo_es')
        .eq('id', unitA1Id)
        .single();
      expect(unitErr).toBeNull();
      expect((dbUnit as UnidadRow).titulo_es).not.toBe('Ataque Gestor B');
    });
  });

  describe('5. Prueba positiva y límites: Delegado "gestionar" escribe SOLO dentro de scope', () => {
    it('Delegado con "gestionar" sobre grupo A actualiza unitA1 exitosamente (positive test)', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'gestionar',
        p_alcance_tipo: 'grupo',
        p_grupo_id: grupoAId,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const updateRes = await unidadesController.update(
        unitA1Id,
        { titulo_es: `Depto A1 Modificado Autorizado ${fixtureMarker}`, auto_traducir: false },
        request,
      );
      expect((updateRes as UnidadRow).titulo_es).toBe(`Depto A1 Modificado Autorizado ${fixtureMarker}`);

      const { data: dbUnit, error: dbErr } = await adminClient
        .from('unidades')
        .select('titulo_es')
        .eq('id', unitA1Id)
        .single();
      expect(dbErr).toBeNull();
      expect((dbUnit as UnidadRow).titulo_es).toBe(`Depto A1 Modificado Autorizado ${fixtureMarker}`);
    });

    it('Delegado con "gestionar" sobre grupo A NO puede modificar unitA3 ni mutar estado/modalidades fuera de scope y workspace', async () => {
      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      await expect(
        unidadesController.update(unitA3Id, { titulo_es: 'Intento Fuera De Grupo' }, request),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.cambiarEstado(unitA3Id, { estado: UnidadEstado.Pausada }, request),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.createModalidad(
          unitA3Id,
          { unidad_tiempo: 'mes', cantidad_tiempo: 1, precio: 33000 },
          request,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.update(unitB1Id, { titulo_es: 'Intento Fuera De Workspace' }, request),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.cambiarEstado(unitB1Id, { estado: UnidadEstado.Pausada }, request),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.createModalidad(
          unitB1Id,
          { unidad_tiempo: 'mes', cantidad_tiempo: 1, precio: 44000 },
          request,
        ),
      ).rejects.toThrow(NotFoundException);

      const { data: dbA3, error: errA3 } = await adminClient
        .from('unidades')
        .select('titulo_es, estado')
        .eq('id', unitA3Id)
        .single();
      expect(errA3).toBeNull();
      expect((dbA3 as UnidadRow).titulo_es).not.toBe('Intento Fuera De Grupo');
      expect((dbA3 as UnidadRow).estado).toBe('publicada');

      const { data: dbB1, error: errB1 } = await adminClient
        .from('unidades')
        .select('titulo_es, estado')
        .eq('id', unitB1Id)
        .single();
      expect(errB1).toBeNull();
      expect((dbB1 as UnidadRow).titulo_es).not.toBe('Intento Fuera De Workspace');
      expect((dbB1 as UnidadRow).estado).toBe('publicada');
    });
  });

  describe('6. Aislamiento y permisos de Grupos para Gestor y Delegado (cuenta, grupo, IDs explícitos)', () => {
    it('Gestor A ve sus grupos y Gestor B ve el suyo; Gestor B no puede mutar grupos de Gestor A', async () => {
      const { executionContext: ecA, request: reqA } = createExecutionContext(tokenGestorA);
      await guard.canActivate(ecA);
      const gruposA = await gruposController.findAll(reqA);
      const idsA = (gruposA as GrupoRow[]).map((g) => g.id);
      expect(idsA).toContain(grupoAId);
      expect(idsA).toContain(grupoVacioId);
      expect(idsA).not.toContain(grupoBId);

      const { executionContext: ecB, request: reqB } = createExecutionContext(tokenGestorB);
      await guard.canActivate(ecB);
      const gruposB = await gruposController.findAll(reqB);
      const idsB = (gruposB as GrupoRow[]).map((g) => g.id);
      expect(idsB).toContain(grupoBId);
      expect(idsB).not.toContain(grupoAId);

      await expect(
        gruposController.update(grupoAId, { nombre: 'Nombre Hackeado' }, reqB),
      ).rejects.toThrow(NotFoundException);

      await expect(
        gruposController.remove(grupoAId, reqB),
      ).rejects.toThrow(ForbiddenException);

      const { data: dbGrupo, error: grpErr } = await adminClient
        .from('grupos')
        .select('nombre, deleted_at')
        .eq('id', grupoAId)
        .single();
      expect(grpErr).toBeNull();
      expect((dbGrupo as GrupoRow).nombre).not.toBe('Nombre Hackeado');
      expect((dbGrupo as GrupoRow).deleted_at).toBeNull();
    });

    it('Delegado con alcance cuenta: ver solo lee; gestionar permite create y update pero rechaza ajenos', async () => {
      // 1. Delegado cuenta con permiso 'ver'
      const confVer = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'cuenta',
        p_grupo_id: null,
        p_unidad_ids: [],
      });
      expect(confVer.error).toBeNull();

      const { executionContext: ecVer, request: reqVer } = createExecutionContext(tokenDelegado);
      await guard.canActivate(ecVer);

      const listVer = await gruposController.findAll(reqVer);
      const idsVer = (listVer as GrupoRow[]).map((g) => g.id);
      expect(idsVer).toContain(grupoAId);
      expect(idsVer).toContain(grupoVacioId);
      expect(idsVer).not.toContain(grupoBId);

      await expect(
        gruposController.create({ nombre: 'Intento Ver' }, reqVer),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        gruposController.update(grupoAId, { nombre: 'Intento Ver' }, reqVer),
      ).rejects.toThrow(NotFoundException);

      // 2. Delegado cuenta con permiso 'gestionar'
      const confGest = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'gestionar',
        p_alcance_tipo: 'cuenta',
        p_grupo_id: null,
        p_unidad_ids: [],
      });
      expect(confGest.error).toBeNull();

      const { executionContext: ecGest, request: reqGest } = createExecutionContext(tokenDelegado);
      await guard.canActivate(ecGest);

      // Positive test: crear grupo en alcance cuenta
      const timestamp = Date.now();
      const createdGrp = await gruposController.create(
        { nombre: `Grupo Creado Delegado ${timestamp}`, descripcion: 'Descripcion delegada' },
        reqGest,
      );
      const createdGrpId = (createdGrp as GrupoRow).id;
      expect(createdGrpId).toBeDefined();
      createdGrupoIds.push(createdGrpId);

      // Positive test: update grupo
      const updGrp = await gruposController.update(
        grupoAId,
        { descripcion: 'Descripcion actualizada por delegado' },
        reqGest,
      );
      expect((updGrp as GrupoRow).descripcion).toBe('Descripcion actualizada por delegado');

      // Negative test: grupo ajeno fuera de workspace
      await expect(
        gruposController.update(grupoBId, { nombre: 'Hack B' }, reqGest),
      ).rejects.toThrow(NotFoundException);
      await expect(
        gruposController.remove(grupoBId, reqGest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Delegado con alcance grupo: solo ve y gestiona su grupo asignado; no crea ni muta otros grupos', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'gestionar',
        p_alcance_tipo: 'grupo',
        p_grupo_id: grupoAId,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const listGrp = await gruposController.findAll(request);
      const idsGrp = (listGrp as GrupoRow[]).map((g) => g.id);
      expect(idsGrp).toEqual([grupoAId]);

      // No puede crear grupo (solo cuenta o gestor)
      await expect(
        gruposController.create({ nombre: 'Intento Scope Grupo' }, request),
      ).rejects.toThrow(ForbiddenException);

      // No puede mutar grupo fuera de su alcance
      await expect(
        gruposController.update(grupoVacioId, { nombre: 'Hack Vacio' }, request),
      ).rejects.toThrow(NotFoundException);

      // No puede eliminar grupo (requiere membership en cuenta)
      await expect(
        gruposController.remove(grupoAId, request),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Delegado con alcance unidades explícitas: solo ve el grupo que contiene sus unidades y no puede mutarlo', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'gestionar',
        p_alcance_tipo: 'unidades',
        p_grupo_id: null,
        p_unidad_ids: [unitA1Id],
      });
      expect(confRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const listGrp = await gruposController.findAll(request);
      const idsGrp = (listGrp as GrupoRow[]).map((g) => g.id);
      // unitA1Id pertenece a grupoAId, por tanto grupoAId es visible
      expect(idsGrp).toContain(grupoAId);
      // grupoVacioId no contiene unidades delegadas, no debe ser visible
      expect(idsGrp).not.toContain(grupoVacioId);

      await expect(
        gruposController.create({ nombre: 'Intento Scope Unidades' }, request),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        gruposController.update(grupoAId, { nombre: 'Intento Scope Unidades' }, request),
      ).rejects.toThrow(NotFoundException);
    });

    it('Gestor A elimina (archiva) grupo propio exitosamente via RPC archive_grupo con registro de auditoría', async () => {
      const res = await adminClient
        .from('grupos')
        .insert({ gestor_id: gestorAId, nombre: `Grupo Delete Owner ${fixtureMarker}` })
        .select('id')
        .single();
      expect(res.error).toBeNull();
      const grpId = (res.data as { id: string }).id;
      createdGrupoIds.push(grpId);

      const { executionContext, request } = createExecutionContext(tokenGestorA);
      await guard.canActivate(executionContext);

      const removeRes = await gruposController.remove(grpId, request);
      expect(removeRes).toEqual({ success: true });

      const { data: dbGrp, error: dbErr } = await adminClient
        .from('grupos')
        .select('deleted_at')
        .eq('id', grpId)
        .single();
      expect(dbErr).toBeNull();
      expect((dbGrp as GrupoRow).deleted_at).not.toBeNull();

      const { data: logs, error: logErr } = await adminClient
        .from('log_acciones')
        .select('accion, actor_rol, actor_id, gestor_id')
        .eq('recurso_id', grpId)
        .eq('accion', 'eliminar_grupos');
      expect(logErr).toBeNull();
      expect(logs).toHaveLength(1);
      expect(logs![0].actor_rol).toBe('gestor');
      expect(logs![0].actor_id).toBe(gestorAId);
    });

    it('Delegado con permiso gestionar y alcance cuenta archiva grupo de workspace exitosamente con atribución de auditoría', async () => {
      const confRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'gestionar',
        p_alcance_tipo: 'cuenta',
        p_grupo_id: null,
        p_unidad_ids: [],
      });
      expect(confRes.error).toBeNull();

      const res = await adminClient
        .from('grupos')
        .insert({ gestor_id: gestorAId, nombre: `Grupo Delete Del ${fixtureMarker}` })
        .select('id')
        .single();
      expect(res.error).toBeNull();
      const grpId = (res.data as { id: string }).id;
      createdGrupoIds.push(grpId);

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const removeRes = await gruposController.remove(grpId, request);
      expect(removeRes).toEqual({ success: true });

      const { data: dbGrp, error: dbErr } = await adminClient
        .from('grupos')
        .select('deleted_at')
        .eq('id', grpId)
        .single();
      expect(dbErr).toBeNull();
      expect((dbGrp as GrupoRow).deleted_at).not.toBeNull();

      const { data: logs, error: logErr } = await adminClient
        .from('log_acciones')
        .select('accion, actor_rol, actor_id, gestor_id')
        .eq('recurso_id', grpId)
        .eq('accion', 'eliminar_grupos');
      expect(logErr).toBeNull();
      expect(logs).toHaveLength(1);
      expect(logs![0].actor_rol).toBe('delegado');
      expect(logs![0].actor_id).toBe(delegadoId);
      expect(logs![0].gestor_id).toBe(gestorAId);
    });

    it('Negativas de eliminación de grupos: Delegado en ver/unidades y Gestor ajeno son rechazados y DB permanece intacta', async () => {
      // 1. Delegado con permiso ver en cuenta
      const confVerRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'ver',
        p_alcance_tipo: 'cuenta',
        p_grupo_id: null,
        p_unidad_ids: [],
      });
      expect(confVerRes.error).toBeNull();

      const { executionContext: ecVer, request: reqVer } = createExecutionContext(tokenDelegado);
      await guard.canActivate(ecVer);
      await expect(gruposController.remove(grupoAId, reqVer)).rejects.toThrow(ForbiddenException);

      // 2. Delegado con alcance unidades
      const confUnidRes = await clientGestorA.rpc('configure_delegacion', {
        p_delegacion_id: delegacionId,
        p_permiso: 'gestionar',
        p_alcance_tipo: 'unidades',
        p_grupo_id: null,
        p_unidad_ids: [unitA1Id],
      });
      expect(confUnidRes.error).toBeNull();

      const { executionContext: ecUnid, request: reqUnid } = createExecutionContext(tokenDelegado);
      await guard.canActivate(ecUnid);
      await expect(gruposController.remove(grupoAId, reqUnid)).rejects.toThrow(ForbiddenException);

      // 3. Gestor B sobre Grupo A
      const { executionContext: ecB, request: reqB } = createExecutionContext(tokenGestorB);
      await guard.canActivate(ecB);
      await expect(gruposController.remove(grupoAId, reqB)).rejects.toThrow(ForbiddenException);

      // Verificar que grupoAId permanece activo e intacto en base de datos
      const { data: dbGrp, error: dbErr } = await adminClient
        .from('grupos')
        .select('deleted_at')
        .eq('id', grupoAId)
        .single();
      expect(dbErr).toBeNull();
      expect((dbGrp as GrupoRow).deleted_at).toBeNull();
    });
  });

  describe('7. Aislamiento de Alquileres', () => {
    it('Gestor A consulta su alquiler y Gestor B recibe 404 al consultar alquiler ajeno', async () => {
      const { executionContext: ecA, request: reqA } = createExecutionContext(tokenGestorA);
      await guard.canActivate(ecA);
      const alq = await alquileresController.findOne(alquilerA1Id, reqA);
      expect((alq as AlquilerRow).id).toBe(alquilerA1Id);

      const { executionContext: ecB, request: reqB } = createExecutionContext(tokenGestorB);
      await guard.canActivate(ecB);
      await expect(alquileresController.findOne(alquilerA1Id, reqB)).rejects.toThrow(NotFoundException);
    });

    it('Gestor B en findAll no ve alquileres de Gestor A y no puede borrarlos', async () => {
      const { executionContext, request } = createExecutionContext(tokenGestorB);
      await guard.canActivate(executionContext);

      const listB = await alquileresController.findAll(request);
      const idsB = (listB.data as AlquilerRow[]).map((a) => a.id);
      expect(idsB).not.toContain(alquilerA1Id);

      await expect(alquileresController.remove(alquilerA1Id, request)).rejects.toThrow(NotFoundException);

      const { data: dbAlq, error: alqErr } = await adminClient
        .from('alquileres')
        .select('deleted_at')
        .eq('id', alquilerA1Id)
        .single();
      expect(alqErr).toBeNull();
      expect((dbAlq as AlquilerRow).deleted_at).toBeNull();
    });
  });

  describe('8. Marketplace público y PostgREST anónimo con unidades públicas, privadas y soft-deleted', () => {
    it('Marketplace retorna unidad pública sin proyectar columnas operativas privadas y no incluye borrador ni deleted', async () => {
      const result = await marketplaceController.findAll({ q: fixtureMarker, page: 1, limit: 50 });
      const foundA1 = result.data.find((u) => u.id === unitA1Id);
      expect(foundA1).toBeDefined();

      // Verificar que el payload público NO proyecta columnas operativas privadas
      expect((foundA1 as unknown as Record<string, unknown>).gestor_id).toBeUndefined();
      expect((foundA1 as unknown as Record<string, unknown>).alquileres).toBeUndefined();
      expect((foundA1 as unknown as Record<string, unknown>).inquilinos).toBeUndefined();
      expect((foundA1 as unknown as Record<string, unknown>).log_acciones).toBeUndefined();

      // Ni la unidad en borrador ni la unidad eliminada aparecen en marketplace
      const foundBorrador = result.data.find((u) => u.id === unitABorradorId);
      expect(foundBorrador).toBeUndefined();

      const foundDeleted = result.data.find((u) => u.id === unitADeletedId);
      expect(foundDeleted).toBeUndefined();
    });

    it('PostgREST anon directo sobre IDs propios entrega unidad publicada y excluye borrador y soft-deleted', async () => {
      const { data: sessionData, error: sessionError } = await anonClient.auth.getSession();
      expect(sessionError).toBeNull();
      expect(sessionData.session).toBeNull();

      const testIds = [unitA1Id, unitABorradorId, unitADeletedId];
      const { data: anonUnits, error } = await anonClient
        .from('unidades')
        .select('id, estado, deleted_at')
        .in('id', testIds);
      expect(error).toBeNull();
      expect(anonUnits).toBeDefined();

      const returnedIds = (anonUnits || []).map((u: { id: string }) => u.id);
      // unitA1Id es publicada activa: presente
      expect(returnedIds).toContain(unitA1Id);
      // unitABorradorId es borrador (privada): ausente
      expect(returnedIds).not.toContain(unitABorradorId);
      // unitADeletedId es soft-deleted: ausente
      expect(returnedIds).not.toContain(unitADeletedId);
    });
  });

  describe('9. Revocación de Delegado mediante RPC y efecto inmediato al final de la suite', () => {
    it('Delegado revocado mediante revoke_delegacion pierde acceso total de listado, detalle y grupos', async () => {
      const revRes = await clientGestorA.rpc('revoke_delegacion', {
        p_delegacion_id: delegacionId,
      });
      expect(revRes.error).toBeNull();

      const { executionContext, request } = createExecutionContext(tokenDelegado);
      await guard.canActivate(executionContext);

      const listResult = await unidadesController.findAll({ page: 1, limit: 10 }, request);
      expect(listResult.count).toBe(0);
      expect(listResult.data).toHaveLength(0);

      await expect(unidadesController.findOne(unitA1Id, request)).rejects.toThrow(NotFoundException);
      await expect(unidadesController.getAlquileres(unitA1Id, request)).rejects.toThrow(NotFoundException);

      const listGrupos = await gruposController.findAll(request);
      expect(listGrupos).toHaveLength(0);
    });
  });
});
