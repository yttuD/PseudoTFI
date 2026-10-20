import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

function loadLocalEnv() {
  const envCandidates = [
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
      break;
    }
  }
}

loadLocalEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// Exigir entorno válido sin claves literales ni alternativas ||
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error('ENTORNO_INVALIDO: Se requieren SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_JWT_SECRET en el entorno.');
}

// Exigir destino local estrictamente
const parsedUrl = new URL(SUPABASE_URL);
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname);
if (!isLocal) {
  throw new Error(`DESTINO_NO_LOCAL_RECHAZADO: SUPABASE_URL (${SUPABASE_URL}) no es un destino local permitido.`);
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${b64Header}.${b64Payload}`).digest('base64url');
  return `${b64Header}.${b64Payload}.${sig}`;
}

function getAuthClient(userId) {
  const token = signJwt(
    {
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET
  );
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Ejecución transaccional con ON_ERROR_STOP=1
function runPsqlTransactional(sql) {
  return execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_TFI', 'psql', '-v', 'ON_ERROR_STOP=1', '-1', '-U', 'postgres', '-d', 'postgres'],
    {
      input: sql,
      encoding: 'utf8',
    }
  );
}

function capturePolicy() {
  const sql = `SELECT row_to_json(p)::text FROM (SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'unidades' AND policyname = 'Unidades authenticated select policy') p;`;
  const out = execFileSync(
    'docker',
    ['exec', '-i', 'supabase_db_TFI', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-t', '-A'],
    { input: sql, encoding: 'utf8' }
  ).trim();
  if (!out) return null;
  return JSON.parse(out);
}

const EXPECTED_BASELINE = {
  policyname: 'Unidades authenticated select policy',
  permissive: 'PERMISSIVE',
  roles: ['authenticated'],
  cmd: 'SELECT',
  qual: "(can_read_unidad(id) OR ((estado = 'publicada'::unidad_estado) AND (deleted_at IS NULL)))",
  with_check: null,
};

async function runComprehensiveMatrix(options = {}) {
  const batchId = `rls_val_${Date.now()}`;
  console.log(`[START] Iniciando validación exhaustiva RLS unidades (${batchId})...`);

  // Registro de IDs ANTES de insertar
  const trackedUsers = [];
  const trackedGrupos = [];
  const trackedInvitaciones = [];
  const trackedDelegaciones = [];
  const trackedDelegacionUnidades = [];
  const trackedUnidades = [];

  let gestorAId = null;
  let gestorBId = null;
  let delCuentaId = null;
  let delGrupoId = null;
  let delUnidadId = null;
  let delReadOnlyId = null;
  let delPendienteId = null;
  let delRevocadaId = null;

  let grupoA1Id = null;
  let grupoA2Id = null;

  let invCuentaId = null;
  let invGrupoId = null;
  let invUnidadId = null;
  let invReadOnlyId = null;
  let invPendienteId = null;
  let invRevocadaId = null;

  let delegCuentaId = null;
  let delegGrupoId = null;
  let delegUnidadId = null;
  let delegReadOnlyId = null;
  let delegPendienteId = null;
  let delegRevocadaId = null;

  let initialPolicyCaptured = null;
  let migrationApplied = false;

  try {
    // -------------------------------------------------------------
    // FASE 0: CAPTURA Y VALIDACIÓN ESTRICTA DE LA BASELINE POR IGUALDAD COMPLETA
    // -------------------------------------------------------------
    console.log('[FASE 0] Capturando política inicial completa desde pg_policies...');
    initialPolicyCaptured = capturePolicy();
    assert.ok(initialPolicyCaptured, 'No se pudo capturar la política inicial de unidades desde pg_policies');

    if (options.failBaselineMismatch) {
      console.log('[BASELINE_CHECK] Simulando baseline inesperado para comprobar rechazo sin modificaciones...');
      // Simulamos discrepancia en comando y roles
      assert.deepStrictEqual(
        initialPolicyCaptured,
        { ...EXPECTED_BASELINE, cmd: 'INSERT', roles: ['anon'] },
        'Discrepancia forzada de baseline: roles y comando no coinciden'
      );
    }

    // Validación por igualdad estricta de objeto completo (policyname, permissive, roles, cmd, qual, with_check)
    assert.deepStrictEqual(
      initialPolicyCaptured,
      EXPECTED_BASELINE,
      `La política inicial no coincide por igualdad completa con el baseline esperado.`
    );
    console.log('[FASE 0 OK] Baseline validado por igualdad completa:', JSON.stringify(initialPolicyCaptured));

    // -------------------------------------------------------------
    // FASE 1: CREAR FIXTURES DEDICADOS (Registrando IDs antes de usar)
    // -------------------------------------------------------------
    const createFixtureUser = async (slug, role, fullName) => {
      const email = `${slug}_${batchId}@test.local`;
      const password = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, rol: role, full_name: fullName },
      });
      assert.strictEqual(error, null, `Error creando usuario de auth ${email}: ${error?.message}`);
      assert.ok(data?.user?.id, `Usuario ${email} no tiene id`);
      const userId = data.user.id;
      trackedUsers.push(userId);
      return userId;
    };

    gestorAId = await createFixtureUser('ga', 'gestor', `Gestor A ${batchId}`);
    gestorBId = await createFixtureUser('gb', 'gestor', `Gestor B ${batchId}`);
    delCuentaId = await createFixtureUser('d_cuenta', 'delegado', `Delegado Cuenta ${batchId}`);
    delGrupoId = await createFixtureUser('d_grupo', 'delegado', `Delegado Grupo ${batchId}`);
    delUnidadId = await createFixtureUser('d_unidad', 'delegado', `Delegado Unidad ${batchId}`);
    delReadOnlyId = await createFixtureUser('d_ro', 'delegado', `Delegado ReadOnly ${batchId}`);
    delPendienteId = await createFixtureUser('d_pend', 'delegado', `Delegado Pendiente ${batchId}`);
    delRevocadaId = await createFixtureUser('d_rev', 'delegado', `Delegado Revocada ${batchId}`);

    // Grupos: registrar IDs antes de insertar
    grupoA1Id = crypto.randomUUID();
    grupoA2Id = crypto.randomUUID();
    trackedGrupos.push(grupoA1Id, grupoA2Id);

    const { error: gErr } = await adminClient.from('grupos').insert([
      { id: grupoA1Id, gestor_id: gestorAId, nombre: `Grupo A1 ${batchId}` },
      { id: grupoA2Id, gestor_id: gestorAId, nombre: `Grupo A2 ${batchId}` },
    ]);
    assert.strictEqual(gErr, null, `Error creando grupos: ${gErr?.message}`);

    // Invitaciones: registrar IDs antes de insertar
    invCuentaId = crypto.randomUUID();
    invGrupoId = crypto.randomUUID();
    invUnidadId = crypto.randomUUID();
    invReadOnlyId = crypto.randomUUID();
    invPendienteId = crypto.randomUUID();
    invRevocadaId = crypto.randomUUID();
    trackedInvitaciones.push(invCuentaId, invGrupoId, invUnidadId, invReadOnlyId, invPendienteId, invRevocadaId);

    const { error: invErr } = await adminClient.from('invitaciones_delegados').insert([
      { id: invCuentaId, gestor_id: gestorAId, delegado_id: delCuentaId, email_snapshot: `d_cuenta_${batchId}@test.local`, estado: 'aceptada', expires_at: new Date(Date.now() + 86400000).toISOString(), usada: true },
      { id: invGrupoId, gestor_id: gestorAId, delegado_id: delGrupoId, email_snapshot: `d_grupo_${batchId}@test.local`, estado: 'aceptada', expires_at: new Date(Date.now() + 86400000).toISOString(), usada: true },
      { id: invUnidadId, gestor_id: gestorAId, delegado_id: delUnidadId, email_snapshot: `d_unidad_${batchId}@test.local`, estado: 'aceptada', expires_at: new Date(Date.now() + 86400000).toISOString(), usada: true },
      { id: invReadOnlyId, gestor_id: gestorAId, delegado_id: delReadOnlyId, email_snapshot: `d_ro_${batchId}@test.local`, estado: 'aceptada', expires_at: new Date(Date.now() + 86400000).toISOString(), usada: true },
      { id: invPendienteId, gestor_id: gestorAId, delegado_id: delPendienteId, email_snapshot: `d_pend_${batchId}@test.local`, estado: 'pendiente', expires_at: new Date(Date.now() + 86400000).toISOString(), usada: false },
      { id: invRevocadaId, gestor_id: gestorAId, delegado_id: delRevocadaId, email_snapshot: `d_rev_${batchId}@test.local`, estado: 'aceptada', expires_at: new Date(Date.now() + 86400000).toISOString(), usada: true },
    ]);
    assert.strictEqual(invErr, null, `Error creando invitaciones: ${invErr?.message}`);

    // Delegaciones: registrar IDs antes de insertar
    delegCuentaId = crypto.randomUUID();
    delegGrupoId = crypto.randomUUID();
    delegUnidadId = crypto.randomUUID();
    delegReadOnlyId = crypto.randomUUID();
    delegPendienteId = crypto.randomUUID();
    delegRevocadaId = crypto.randomUUID();
    trackedDelegaciones.push(delegCuentaId, delegGrupoId, delegUnidadId, delegReadOnlyId, delegPendienteId, delegRevocadaId);

    const { error: delegErr } = await adminClient.from('delegaciones').insert([
      { id: delegCuentaId, invitacion_id: invCuentaId, gestor_id: gestorAId, delegado_id: delCuentaId, estado: 'activa', permiso: 'gestionar', alcance_tipo: 'cuenta' },
      { id: delegGrupoId, invitacion_id: invGrupoId, gestor_id: gestorAId, delegado_id: delGrupoId, estado: 'activa', permiso: 'gestionar', alcance_tipo: 'grupo', grupo_id: grupoA1Id },
      { id: delegUnidadId, invitacion_id: invUnidadId, gestor_id: gestorAId, delegado_id: delUnidadId, estado: 'activa', permiso: 'gestionar', alcance_tipo: 'unidades' },
      { id: delegReadOnlyId, invitacion_id: invReadOnlyId, gestor_id: gestorAId, delegado_id: delReadOnlyId, estado: 'activa', permiso: 'ver', alcance_tipo: 'grupo', grupo_id: grupoA1Id },
      { id: delegPendienteId, invitacion_id: invPendienteId, gestor_id: gestorAId, delegado_id: delPendienteId, estado: 'aceptada_sin_configurar', permiso: null, alcance_tipo: null, grupo_id: null },
      { id: delegRevocadaId, invitacion_id: invRevocadaId, gestor_id: gestorAId, delegado_id: delRevocadaId, estado: 'revocada', permiso: 'gestionar', alcance_tipo: 'grupo', grupo_id: grupoA1Id, revoked_at: new Date().toISOString() },
    ]);
    assert.strictEqual(delegErr, null, `Error creando delegaciones: ${delegErr?.message}`);

    // Clientes autenticados
    const clientA = getAuthClient(gestorAId);
    const clientB = getAuthClient(gestorBId);
    const clientCuenta = getAuthClient(delCuentaId);
    const clientGrupo = getAuthClient(delGrupoId);
    const clientUnidad = getAuthClient(delUnidadId);
    const clientReadOnly = getAuthClient(delReadOnlyId);
    const clientPendiente = getAuthClient(delPendienteId);
    const clientRevocada = getAuthClient(delRevocadaId);
    const clientAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

    // -------------------------------------------------------------
    // FASE 2: VERIFICAR RECHAZO CONTRACTUAL BAJO BASELINE
    // -------------------------------------------------------------
    console.log('[FASE 2] Verificando rechazo contractual en baseline...');
    const baseTestUnitId = crypto.randomUUID();
    trackedUnidades.push(baseTestUnitId);

    const baseRes = await clientA
      .from('unidades')
      .insert({
        id: baseTestUnitId,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Base Test Draft ${batchId}`,
        fotos: [],
      })
      .select()
      .single();

    assert.strictEqual(baseRes.status, 403, 'Baseline status debe ser 403 Forbidden');
    assert.strictEqual(baseRes.data, null, 'Baseline insert no debe retornar data');
    assert.ok(
      baseRes.error.message.includes('row-level security policy') || baseRes.error.code === '42501',
      `Error en baseline debe ser contractual de RLS: [${baseRes.error.code}] ${baseRes.error.message}`
    );

    // Comprobar ausencia contractual de cambios persistidos
    const checkBaseRead = await adminClient.from('unidades').select('id').eq('id', baseTestUnitId);
    assert.strictEqual(checkBaseRead.status, 200);
    assert.strictEqual(checkBaseRead.error, null);
    assert.strictEqual(checkBaseRead.data.length, 0, 'La unidad baseline rechazada no debió persistir');
    console.log('[FASE 2 OK] Acreditado: INSERT con RETURNING falla bajo baseline con 403 y RLS 42501.');

    // -------------------------------------------------------------
    // FASE 3: APLICAR ARCHIVO REAL DE MIGRACIÓN PROPUESTA
    // -------------------------------------------------------------
    console.log('[FASE 3] Aplicando archivo real 20261008030000_unidades_select_returning.sql...');
    const migrationPath = path.resolve('supabase/migrations/20261008030000_unidades_select_returning.sql');
    assert.ok(fs.existsSync(migrationPath), `El archivo de migración no existe: ${migrationPath}`);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecución transaccional con ON_ERROR_STOP=1
    runPsqlTransactional(migrationSql);
    migrationApplied = true;

    const proposedPolicy = capturePolicy();
    assert.ok(proposedPolicy, 'No se pudo leer la política migrada');
    assert.ok(
      proposedPolicy.qual.includes('is_gestor_owner'),
      `La política migrada debe incluir is_gestor_owner: ${proposedPolicy.qual}`
    );
    console.log('[FASE 3 OK] Migración real aplicada de forma transaccional.');

    // -------------------------------------------------------------
    // FASE 4: MATRIZ DE CASOS CON COMPROBACIONES DE LECTURA VACÍA Y DENEGACIONES CONTRACTUALES
    // -------------------------------------------------------------

    // CASO 1: Propietario (Gestor A)
    console.log(' - Validando Caso 1: Propietario (Gestor A)...');
    const u1Id = crypto.randomUUID();
    trackedUnidades.push(u1Id);

    const c1Insert = await clientA
      .from('unidades')
      .insert({
        id: u1Id,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Depto Gestor A Original ${batchId}`,
        descripcion_es: 'Descripcion original A',
        fotos: [],
      })
      .select()
      .single();

    assert.strictEqual(c1Insert.error, null);
    assert.strictEqual(c1Insert.status, 201);
    assert.strictEqual(c1Insert.data.id, u1Id);

    const c1Read = await clientA.from('unidades').select('id, titulo_es, descripcion_es').eq('id', u1Id);
    assert.strictEqual(c1Read.status, 200);
    assert.strictEqual(c1Read.error, null);
    assert.strictEqual(c1Read.data.length, 1);
    assert.strictEqual(c1Read.data[0].titulo_es, `Depto Gestor A Original ${batchId}`);

    const c1Update = await clientA
      .from('unidades')
      .update({
        titulo_es: `Depto Gestor A Modificado ${batchId}`,
        descripcion_es: 'Descripcion modificada por owner',
      })
      .eq('id', u1Id)
      .select()
      .single();
    assert.strictEqual(c1Update.error, null);
    assert.strictEqual(c1Update.status, 200);

    // Confirmar persistencia de escritura autorizada
    const c1Verify = await clientA.from('unidades').select('titulo_es, descripcion_es').eq('id', u1Id).single();
    assert.strictEqual(c1Verify.status, 200);
    assert.strictEqual(c1Verify.data.titulo_es, `Depto Gestor A Modificado ${batchId}`);
    assert.strictEqual(c1Verify.data.descripcion_es, 'Descripcion modificada por owner');

    // Inyección de fallo controlado si se ejecuta con flag CLI
    if (options.failControlled) {
      console.log('[CONTROLLED_FAIL] Inyectando fallo de aserción controlado para verificar salida no cero...');
      assert.strictEqual('valor_actual', 'valor_esperado_discrepante', 'Fallo controlado inyectado en ejecución');
    }

    // CASO 2: Cross-Tenant Isolation (Gestor B)
    console.log(' - Validando Caso 2: Cross-Tenant Isolation (Gestor B)...');
    const uFakeBId = crypto.randomUUID();
    trackedUnidades.push(uFakeBId);

    const c2CrossInsert = await clientB
      .from('unidades')
      .insert({
        id: uFakeBId,
        gestor_id: gestorAId, // Spoofing de workspace ajeno
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: 'Ataque Inyeccion Workspace',
        fotos: [],
      })
      .select()
      .single();

    assert.strictEqual(c2CrossInsert.status, 403, 'Insercion con gestor_id ajeno debe responder HTTP 403');
    assert.strictEqual(c2CrossInsert.data, null);
    assert.ok(
      c2CrossInsert.error.message.includes('row-level security policy') || c2CrossInsert.error.code === '42501',
      `Error debe ser contractual de RLS: ${c2CrossInsert.error.message}`
    );

    // Lectura vacía contractual (HTTP 200, error: null, 0 filas)
    const c2CrossRead = await clientB.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(c2CrossRead.status, 200, 'Lectura vacía debe responder HTTP 200');
    assert.strictEqual(c2CrossRead.error, null, 'Lectura vacía no debe tener error');
    assert.ok(Array.isArray(c2CrossRead.data));
    assert.strictEqual(c2CrossRead.data.length, 0, 'Gestor B no debe ver unidad de Gestor A (0 filas)');

    // Escritura denegada contractual
    const c2CrossUpdate = await clientB
      .from('unidades')
      .update({
        titulo_es: 'Hacked by Gestor B',
      })
      .eq('id', u1Id)
      .select();
    assert.strictEqual(c2CrossUpdate.status, 200);
    assert.strictEqual(c2CrossUpdate.error, null);
    assert.ok(Array.isArray(c2CrossUpdate.data));
    assert.strictEqual(c2CrossUpdate.data.length, 0, 'UPDATE cruzado debe afectar 0 filas');

    // Confirmar ausencia de cambios persistidos
    const afterCrossUpdate = await clientA.from('unidades').select('titulo_es, descripcion_es').eq('id', u1Id).single();
    assert.strictEqual(afterCrossUpdate.status, 200);
    assert.strictEqual(afterCrossUpdate.data.titulo_es, `Depto Gestor A Modificado ${batchId}`);
    assert.strictEqual(afterCrossUpdate.data.descripcion_es, 'Descripcion modificada por owner');

    // CASO 3: Delegado Alcance Cuenta
    console.log(' - Validando Caso 3: Delegado Alcance Cuenta...');
    const uCuentaId = crypto.randomUUID();
    trackedUnidades.push(uCuentaId);

    const c3Insert = await clientCuenta
      .from('unidades')
      .insert({
        id: uCuentaId,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Unidad Delegado Cuenta ${batchId}`,
        descripcion_es: 'Creada por delegado cuenta',
        fotos: [],
      })
      .select()
      .single();

    assert.strictEqual(c3Insert.error, null);
    assert.strictEqual(c3Insert.status, 201);

    const c3Read = await clientCuenta.from('unidades').select('id, titulo_es').eq('id', uCuentaId);
    assert.strictEqual(c3Read.status, 200);
    assert.strictEqual(c3Read.error, null);
    assert.strictEqual(c3Read.data.length, 1);

    const c3Update = await clientCuenta
      .from('unidades')
      .update({
        descripcion_es: 'Actualizada por delegado cuenta',
      })
      .eq('id', uCuentaId)
      .select()
      .single();
    assert.strictEqual(c3Update.status, 200);

    // Confirmar persistencia
    const c3Verify = await clientA.from('unidades').select('descripcion_es').eq('id', uCuentaId).single();
    assert.strictEqual(c3Verify.data.descripcion_es, 'Actualizada por delegado cuenta');

    // CASO 4: Delegado Alcance Grupo (en Grupo A1 vs fuera de grupo A2)
    console.log(' - Validando Caso 4: Delegado Alcance Grupo...');
    const uGrupo1Id = crypto.randomUUID();
    trackedUnidades.push(uGrupo1Id);

    const c4Insert = await clientGrupo
      .from('unidades')
      .insert({
        id: uGrupo1Id,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Unidad Grupo A1 ${batchId}`,
        descripcion_es: 'En grupo asignado',
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c4Insert.status, 201);

    const c4Read = await clientGrupo.from('unidades').select('id').eq('id', uGrupo1Id);
    assert.strictEqual(c4Read.status, 200);
    assert.strictEqual(c4Read.error, null);
    assert.strictEqual(c4Read.data.length, 1);

    // Fuera de grupo asignado (Grupo A2)
    const uGrupo2Id = crypto.randomUUID();
    trackedUnidades.push(uGrupo2Id);

    const c4InsertOutside = await clientGrupo
      .from('unidades')
      .insert({
        id: uGrupo2Id,
        gestor_id: gestorAId,
        grupo_id: grupoA2Id, // No asignado
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: 'Intento Fuera de Grupo',
        fotos: [],
      })
      .select()
      .single();

    assert.strictEqual(c4InsertOutside.status, 403);
    assert.strictEqual(c4InsertOutside.data, null);
    assert.ok(c4InsertOutside.error.message.includes('row-level security policy') || c4InsertOutside.error.code === '42501');

    // Unidad existente en Grupo A2
    const uInA2Id = crypto.randomUUID();
    trackedUnidades.push(uInA2Id);
    const c4SetupA2 = await clientA
      .from('unidades')
      .insert({
        id: uInA2Id,
        gestor_id: gestorAId,
        grupo_id: grupoA2Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Unidad en A2 ${batchId}`,
        descripcion_es: 'Original en A2',
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c4SetupA2.status, 201);

    // Lectura vacía contractual fuera de alcance
    const c4ReadOutside = await clientGrupo.from('unidades').select('id, titulo_es').eq('id', uInA2Id);
    assert.strictEqual(c4ReadOutside.status, 200);
    assert.strictEqual(c4ReadOutside.error, null);
    assert.strictEqual(c4ReadOutside.data.length, 0, 'No debe ver unidad fuera de su grupo');

    // UPDATE denegado contractual
    const c4UpdateOutside = await clientGrupo
      .from('unidades')
      .update({
        descripcion_es: 'Ataque grupo ajeno',
      })
      .eq('id', uInA2Id)
      .select();
    assert.strictEqual(c4UpdateOutside.status, 200);
    assert.strictEqual(c4UpdateOutside.error, null);
    assert.strictEqual(c4UpdateOutside.data.length, 0);

    // Confirmar que no cambió
    const c4VerifyOutside = await clientA.from('unidades').select('descripcion_es').eq('id', uInA2Id).single();
    assert.strictEqual(c4VerifyOutside.data.descripcion_es, 'Original en A2');

    // CASO 5: Delegado Alcance Unidad (en delegacion_unidades)
    console.log(' - Validando Caso 5: Delegado Alcance Unidad (delegacion_unidades)...');
    trackedDelegacionUnidades.push({ delegacion_id: delegUnidadId, unidad_id: u1Id });
    const { error: pivErr } = await adminClient.from('delegacion_unidades').insert({
      delegacion_id: delegUnidadId,
      unidad_id: u1Id,
    });
    assert.strictEqual(pivErr, null);

    // Lectura permitida de unidad asignada
    const c5ReadAssigned = await clientUnidad.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(c5ReadAssigned.status, 200);
    assert.strictEqual(c5ReadAssigned.error, null);
    assert.strictEqual(c5ReadAssigned.data.length, 1);

    // Lectura vacía contractual de unidad NO asignada
    const c5ReadUnassigned = await clientUnidad.from('unidades').select('id, titulo_es').eq('id', uInA2Id);
    assert.strictEqual(c5ReadUnassigned.status, 200);
    assert.strictEqual(c5ReadUnassigned.error, null);
    assert.strictEqual(c5ReadUnassigned.data.length, 0);

    // Inserción denegada contractual (alcance unidad no puede crear unidades)
    const uFakeUnitScope = crypto.randomUUID();
    trackedUnidades.push(uFakeUnitScope);
    const c5InsertDenied = await clientUnidad
      .from('unidades')
      .insert({
        id: uFakeUnitScope,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: 'Intento Creacion Delegado Unidad',
        fotos: [],
      })
      .select()
      .single();

    assert.strictEqual(c5InsertDenied.status, 403);
    assert.strictEqual(c5InsertDenied.data, null);
    assert.ok(c5InsertDenied.error.message.includes('row-level security policy') || c5InsertDenied.error.code === '42501');

    // UPDATE permitido con permiso 'gestionar'
    const c5UpdateAssigned = await clientUnidad
      .from('unidades')
      .update({
        descripcion_es: 'Actualizado por delegado con alcance de unidad',
      })
      .eq('id', u1Id)
      .select()
      .single();
    assert.strictEqual(c5UpdateAssigned.status, 200);

    // Confirmar persistencia
    const c5Verify = await clientA.from('unidades').select('descripcion_es').eq('id', u1Id).single();
    assert.strictEqual(c5Verify.data.descripcion_es, 'Actualizado por delegado con alcance de unidad');

    // UPDATE denegado en unidad no asignada
    const c5UpdateUnassigned = await clientUnidad
      .from('unidades')
      .update({
        descripcion_es: 'Intento no asignado',
      })
      .eq('id', uInA2Id)
      .select();
    assert.strictEqual(c5UpdateUnassigned.status, 200);
    assert.strictEqual(c5UpdateUnassigned.error, null);
    assert.strictEqual(c5UpdateUnassigned.data.length, 0);

    // CASO 6: Delegado Solo Lectura (permiso: 'ver')
    console.log(' - Validando Caso 6: Delegado Solo Lectura (permiso: ver)...');
    const c6Read = await clientReadOnly.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(c6Read.status, 200);
    assert.strictEqual(c6Read.error, null);
    assert.strictEqual(c6Read.data.length, 1);

    const uFakeRO = crypto.randomUUID();
    trackedUnidades.push(uFakeRO);
    const c6InsertDenied = await clientReadOnly
      .from('unidades')
      .insert({
        id: uFakeRO,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: 'Intento Creacion Solo Lectura',
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c6InsertDenied.status, 403);
    assert.strictEqual(c6InsertDenied.data, null);
    assert.ok(c6InsertDenied.error.message.includes('row-level security policy') || c6InsertDenied.error.code === '42501');

    // UPDATE denegado contractual por RLS WITH CHECK (can_manage_unidad exige gestionar)
    const c6UpdateDenied = await clientReadOnly
      .from('unidades')
      .update({
        descripcion_es: 'Ataque por solo lectura',
      })
      .eq('id', u1Id)
      .select();
    assert.strictEqual(c6UpdateDenied.status, 403, 'UPDATE en solo lectura debe responder HTTP 403 por WITH CHECK');
    assert.strictEqual(c6UpdateDenied.data, null);
    assert.ok(
      c6UpdateDenied.error.message.includes('row-level security policy') || c6UpdateDenied.error.code === '42501',
      `Error debe ser contractual de RLS: ${c6UpdateDenied.error.message}`
    );

    // Confirmar no alteración
    const afterRO = await clientA.from('unidades').select('descripcion_es').eq('id', u1Id).single();
    assert.strictEqual(afterRO.data.descripcion_es, 'Actualizado por delegado con alcance de unidad');

    // CASO 7: Delegación Pendiente
    console.log(' - Validando Caso 7: Delegacion Pendiente...');
    const c7ReadDenied = await clientPendiente.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(c7ReadDenied.status, 200);
    assert.strictEqual(c7ReadDenied.error, null);
    assert.strictEqual(c7ReadDenied.data.length, 0);

    const uFakePend = crypto.randomUUID();
    trackedUnidades.push(uFakePend);
    const c7InsertDenied = await clientPendiente
      .from('unidades')
      .insert({
        id: uFakePend,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: 'Intento Creacion Delegado Pendiente',
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c7InsertDenied.status, 403);
    assert.strictEqual(c7InsertDenied.data, null);

    const c7UpdateDenied = await clientPendiente
      .from('unidades')
      .update({
        descripcion_es: 'Ataque delegado pendiente',
      })
      .eq('id', u1Id)
      .select();
    assert.strictEqual(c7UpdateDenied.status, 200);
    assert.strictEqual(c7UpdateDenied.error, null);
    assert.strictEqual(c7UpdateDenied.data.length, 0);

    // CASO 8: Delegación Revocada
    console.log(' - Validando Caso 8: Delegacion Revocada...');
    const c8ReadDenied = await clientRevocada.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(c8ReadDenied.status, 200);
    assert.strictEqual(c8ReadDenied.error, null);
    assert.strictEqual(c8ReadDenied.data.length, 0);

    const uFakeRev = crypto.randomUUID();
    trackedUnidades.push(uFakeRev);
    const c8InsertDenied = await clientRevocada
      .from('unidades')
      .insert({
        id: uFakeRev,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: 'Intento Creacion Delegado Revocado',
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c8InsertDenied.status, 403);
    assert.strictEqual(c8InsertDenied.data, null);

    const c8UpdateDenied = await clientRevocada
      .from('unidades')
      .update({
        descripcion_es: 'Ataque delegado revocado',
      })
      .eq('id', u1Id)
      .select();
    assert.strictEqual(c8UpdateDenied.status, 200);
    assert.strictEqual(c8UpdateDenied.error, null);
    assert.strictEqual(c8UpdateDenied.data.length, 0);

    // CASO 9: Registros Eliminados (Soft-deleted: deleted_at IS NOT NULL)
    console.log(' - Validando Caso 9: Registros Eliminados (Soft-deleted)...');
    const uSoftDelId = crypto.randomUUID();
    trackedUnidades.push(uSoftDelId);

    const c9Create = await adminClient
      .from('unidades')
      .insert({
        id: uSoftDelId,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Unidad Soft-Deleted ${batchId}`,
        deleted_at: new Date().toISOString(),
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c9Create.status, 201);

    // Lectura vacía contractual para propietario y delegado
    const c9ReadOwner = await clientA.from('unidades').select('id, titulo_es').eq('id', uSoftDelId);
    assert.strictEqual(c9ReadOwner.status, 200);
    assert.strictEqual(c9ReadOwner.error, null);
    assert.strictEqual(c9ReadOwner.data.length, 0);

    const c9ReadDelegate = await clientCuenta.from('unidades').select('id, titulo_es').eq('id', uSoftDelId);
    assert.strictEqual(c9ReadDelegate.status, 200);
    assert.strictEqual(c9ReadDelegate.error, null);
    assert.strictEqual(c9ReadDelegate.data.length, 0);

    // CASO 10: Lectura Pública y Comprobación Anónima
    console.log(' - Validando Caso 10: Lectura Publica y Comprobacion Anonima...');
    const uPublicId = crypto.randomUUID();
    trackedUnidades.push(uPublicId);

    const c10Create = await clientA
      .from('unidades')
      .insert({
        id: uPublicId,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'publicada',
        titulo_es: `Unidad Publicada ${batchId}`,
        descripcion_es: 'Unidad publica visible por todos',
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c10Create.status, 201);

    // Unidad publica soft-deleted
    const uSoftDelPubId = crypto.randomUUID();
    trackedUnidades.push(uSoftDelPubId);
    const c10SoftDelPub = await adminClient
      .from('unidades')
      .insert({
        id: uSoftDelPubId,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'publicada',
        titulo_es: `Unidad Publicada Soft-Deleted ${batchId}`,
        deleted_at: new Date().toISOString(),
        fotos: [],
      })
      .select()
      .single();
    assert.strictEqual(c10SoftDelPub.status, 201);

    // 10.1 Usuario autenticado ajeno (Gestor B) lee unidad publicada
    const c10ReadPublicByB = await clientB.from('unidades').select('id, titulo_es, estado').eq('id', uPublicId);
    assert.strictEqual(c10ReadPublicByB.status, 200);
    assert.strictEqual(c10ReadPublicByB.error, null);
    assert.strictEqual(c10ReadPublicByB.data.length, 1);
    assert.strictEqual(c10ReadPublicByB.data[0].id, uPublicId);

    // Gestor B no ve la publicada soft-deleted (0 filas)
    const c10ReadSoftPubByB = await clientB.from('unidades').select('id, titulo_es').eq('id', uSoftDelPubId);
    assert.strictEqual(c10ReadSoftPubByB.status, 200);
    assert.strictEqual(c10ReadSoftPubByB.error, null);
    assert.strictEqual(c10ReadSoftPubByB.data.length, 0);

    // UPDATE denegado para usuario ajeno sobre unidad pública (en USING por ser publica, pero rechazada por WITH CHECK)
    const c10UpdateByB = await clientB
      .from('unidades')
      .update({
        titulo_es: 'Hacked public unit',
      })
      .eq('id', uPublicId)
      .select();
    assert.strictEqual(c10UpdateByB.status, 403, 'UPDATE de unidad publica por usuario ajeno debe responder HTTP 403 por WITH CHECK');
    assert.strictEqual(c10UpdateByB.data, null);
    assert.ok(
      c10UpdateByB.error.message.includes('row-level security policy') || c10UpdateByB.error.code === '42501',
      `Error debe ser contractual de RLS: ${c10UpdateByB.error.message}`
    );

    // 10.2 COMPROBACION DE LECTURA ANONIMA (clientAnon sin sesion)
    console.log(' - Validando lectura anonima contractual...');
    // A) Lectura de unidad publicada activa -> debe retornar 1 fila (columnas permitidas: id, estado)
    const resAnonPub = await clientAnon.from('unidades').select('id, estado').eq('id', uPublicId);
    assert.strictEqual(resAnonPub.status, 200, 'Lectura anonima de publicada debe retornar HTTP 200');
    assert.strictEqual(resAnonPub.error, null);
    assert.strictEqual(resAnonPub.data.length, 1, 'Anonimo debe ver 1 unidad publicada');
    assert.strictEqual(resAnonPub.data[0].id, uPublicId);
    assert.strictEqual(resAnonPub.data[0].estado, 'publicada');

    // B) Lectura anonima de unidad en borrador -> debe ser vacia (0 filas)
    const resAnonDraft = await clientAnon.from('unidades').select('id, estado').eq('id', u1Id);
    assert.strictEqual(resAnonDraft.status, 200);
    assert.strictEqual(resAnonDraft.error, null);
    assert.strictEqual(resAnonDraft.data.length, 0, 'Anonimo no debe ver unidades en borrador (0 filas)');

    // C) Lectura anonima de unidad publicada soft-deleted -> debe ser vacia (0 filas)
    const resAnonSoftPub = await clientAnon.from('unidades').select('id, estado').eq('id', uSoftDelPubId);
    assert.strictEqual(resAnonSoftPub.status, 200);
    assert.strictEqual(resAnonSoftPub.error, null);
    assert.strictEqual(resAnonSoftPub.data.length, 0, 'Anonimo no debe ver unidades eliminadas (0 filas)');

    // D) Verificacion de privacidad de columnas: anon no debe acceder a columnas privadas (titulo_es)
    const resAnonPriv = await clientAnon.from('unidades').select('id, titulo_es').eq('id', uPublicId);
    assert.ok(resAnonPriv.status === 401 || resAnonPriv.status === 403, 'Anon no debe tener acceso a columnas privadas');

    // E) Intento de insercion anonima -> denegado contractual
    const uAnonFake = crypto.randomUUID();
    trackedUnidades.push(uAnonFake);
    const resAnonInsert = await clientAnon
      .from('unidades')
      .insert({
        id: uAnonFake,
        gestor_id: gestorAId,
        grupo_id: grupoA1Id,
        categoria: 'departamento',
        estado: 'publicada',
        titulo_es: 'Anon insert attempt',
        fotos: [],
      })
      .select();
    assert.ok(resAnonInsert.status === 401 || resAnonInsert.status === 403, 'Insercion anonima debe ser denegada (401/403)');
    assert.ok(resAnonInsert.error !== null);

    console.log('[FASE 4 OK] Matriz exhaustiva completa validada con éxito (10/10 casos + lectura anónima).');
  } finally {
    console.log('\n[TEARDOWN] Iniciando restauración garantizada y limpieza de fixtures...');
    const cleanupErrors = [];

    // Inyección de error simulado de limpieza si se invoca con flag CLI
    if (options.failCleanup) {
      console.log('[CLEANUP_INJECTION] Inyectando error de limpieza detectado para verificar salida no cero...');
      cleanupErrors.push({ stage: 'simulated_cleanup_injection', error: 'Fallo forzado en detección de limpieza' });
    }

    // 1. RESTAURAR LA POLÍTICA ORIGINAL ÚNICAMENTE SI EL HARNESS APLICÓ CAMBIOS
    if (migrationApplied && initialPolicyCaptured) {
      try {
        console.log('[TEARDOWN] Restaurando política capturada original...');
        const restoreSql = `
DROP POLICY IF EXISTS "${initialPolicyCaptured.policyname}" ON public.unidades;
CREATE POLICY "${initialPolicyCaptured.policyname}" ON public.unidades
  AS ${initialPolicyCaptured.permissive}
  FOR ${initialPolicyCaptured.cmd}
  TO ${Array.isArray(initialPolicyCaptured.roles) ? initialPolicyCaptured.roles.join(', ') : initialPolicyCaptured.roles}
  USING (${initialPolicyCaptured.qual})${initialPolicyCaptured.with_check ? ` WITH CHECK (${initialPolicyCaptured.with_check})` : ''};
`;
        runPsqlTransactional(restoreSql);
        const restoredPolicy = capturePolicy();
        assert.ok(restoredPolicy, 'No se pudo leer la política restaurada desde pg_policies');

        // Comprobar igualdad completa posterior con la capturada originalmente
        assert.deepStrictEqual(
          restoredPolicy,
          initialPolicyCaptured,
          `La política restaurada no es idéntica por igualdad completa a la capturada inicialmente`
        );
        console.log('[TEARDOWN] Política baseline original restaurada y acreditada por igualdad completa posterior.');

        // Acreditar restauración con prueba determinista de fallo (INSERT RETURNING denegado 403/42501)
        if (gestorAId && grupoA1Id) {
          const clientRestored = getAuthClient(gestorAId);
          const testRestoredId = crypto.randomUUID();
          trackedUnidades.push(testRestoredId);

          const testRes = await clientRestored
            .from('unidades')
            .insert({
              id: testRestoredId,
              gestor_id: gestorAId,
              grupo_id: grupoA1Id,
              categoria: 'departamento',
              estado: 'borrador',
              titulo_es: 'Restored baseline test',
              fotos: [],
            })
            .select()
            .single();

          assert.strictEqual(testRes.status, 403, 'Tras restauracion, status debe ser 403 Forbidden');
          assert.ok(
            testRes.error.message.includes('row-level security policy') || testRes.error.code === '42501',
            'Tras restauracion, el fallo debe ser violacion RLS 42501'
          );
          console.log('[TEARDOWN] Acreditado: La política baseline restaurada rechaza nuevamente INSERT RETURNING con 403/RLS 42501.');
        }
      } catch (restoreErr) {
        console.error('[TEARDOWN_ERROR] Fallo al restaurar política baseline:', restoreErr.message);
        cleanupErrors.push({ stage: 'policy_restore', error: restoreErr.message });
      }
    } else {
      console.log('[TEARDOWN] El harness no aplicó cambios de política; no se modifica la base de datos.');
    }

    // 2. LIMPIEZA RESILIENTE DE TODOS LOS FIXTURES REGISTRADOS
    // 2.1 Delegacion_unidades
    for (const item of trackedDelegacionUnidades) {
      try {
        const { error } = await adminClient.from('delegacion_unidades').delete().match(item);
        if (error) {
          cleanupErrors.push({ stage: 'delegacion_unidades_delete', target: item, error: error.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'delegacion_unidades_delete_infra', target: item, error: err.message });
      }
    }

    // 2.2 Unidades
    for (const uid of trackedUnidades) {
      try {
        const { error } = await adminClient.from('unidades').delete().eq('id', uid);
        if (error) {
          cleanupErrors.push({ stage: 'unidades_delete', id: uid, error: error.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'unidades_delete_infra', id: uid, error: err.message });
      }
    }

    // 2.3 Delegaciones
    for (const did of trackedDelegaciones) {
      try {
        const { error } = await adminClient.from('delegaciones').delete().eq('id', did);
        if (error) {
          cleanupErrors.push({ stage: 'delegaciones_delete', id: did, error: error.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'delegaciones_delete_infra', id: did, error: err.message });
      }
    }

    // 2.4 Invitaciones
    for (const iid of trackedInvitaciones) {
      try {
        const { error } = await adminClient.from('invitaciones_delegados').delete().eq('id', iid);
        if (error) {
          cleanupErrors.push({ stage: 'invitaciones_delete', id: iid, error: error.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'invitaciones_delete_infra', id: iid, error: err.message });
      }
    }

    // 2.5 Grupos
    for (const gid of trackedGrupos) {
      try {
        const { error } = await adminClient.from('grupos').delete().eq('id', gid);
        if (error) {
          cleanupErrors.push({ stage: 'grupos_delete', id: gid, error: error.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'grupos_delete_infra', id: gid, error: err.message });
      }
    }

    // 2.6 Users (public y auth)
    for (const uid of trackedUsers) {
      try {
        const { error: pubErr } = await adminClient.from('users').delete().eq('id', uid);
        if (pubErr) {
          cleanupErrors.push({ stage: 'users_public_delete', id: uid, error: pubErr.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'users_public_delete_infra', id: uid, error: err.message });
      }

      try {
        const { error: authErr } = await adminClient.auth.admin.deleteUser(uid);
        if (authErr) {
          cleanupErrors.push({ stage: 'users_auth_delete', id: uid, error: authErr.message });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'users_auth_delete_infra', id: uid, error: err.message });
      }
    }

    // 3. VERIFICACIÓN ESTRICTA DE AUSENCIA CONTRACTUAL (Aceptando únicamente ausencia contractual)
    // 3.1 Delegacion_unidades
    for (const item of trackedDelegacionUnidades) {
      try {
        const resDU = await adminClient.from('delegacion_unidades').select('delegacion_id, unidad_id').match(item);
        if (resDU.error || resDU.status !== 200) {
          cleanupErrors.push({ stage: 'absence_check_delegacion_unidades_infra', error: resDU.error?.message || `HTTP ${resDU.status}` });
        } else if (resDU.data && resDU.data.length > 0) {
          cleanupErrors.push({ stage: 'absence_check_delegacion_unidades_residual', error: 'Residuo en delegacion_unidades no eliminado' });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'absence_check_delegacion_unidades_infra', error: err.message });
      }
    }

    // 3.2 Unidades
    if (trackedUnidades.length > 0) {
      try {
        const resU = await adminClient.from('unidades').select('id').in('id', trackedUnidades);
        if (resU.error || resU.status !== 200) {
          cleanupErrors.push({ stage: 'absence_check_unidades_infra', error: resU.error?.message || `HTTP ${resU.status}` });
        } else if (resU.data && resU.data.length > 0) {
          cleanupErrors.push({ stage: 'absence_check_unidades_residual', error: `Unidades residuales: ${resU.data.map(u => u.id).join(', ')}` });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'absence_check_unidades_infra', error: err.message });
      }
    }

    // 3.3 Delegaciones
    if (trackedDelegaciones.length > 0) {
      try {
        const resD = await adminClient.from('delegaciones').select('id').in('id', trackedDelegaciones);
        if (resD.error || resD.status !== 200) {
          cleanupErrors.push({ stage: 'absence_check_delegaciones_infra', error: resD.error?.message || `HTTP ${resD.status}` });
        } else if (resD.data && resD.data.length > 0) {
          cleanupErrors.push({ stage: 'absence_check_delegaciones_residual', error: `Delegaciones residuales: ${resD.data.map(d => d.id).join(', ')}` });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'absence_check_delegaciones_infra', error: err.message });
      }
    }

    // 3.4 Invitaciones
    if (trackedInvitaciones.length > 0) {
      try {
        const resI = await adminClient.from('invitaciones_delegados').select('id').in('id', trackedInvitaciones);
        if (resI.error || resI.status !== 200) {
          cleanupErrors.push({ stage: 'absence_check_invitaciones_infra', error: resI.error?.message || `HTTP ${resI.status}` });
        } else if (resI.data && resI.data.length > 0) {
          cleanupErrors.push({ stage: 'absence_check_invitaciones_residual', error: `Invitaciones residuales: ${resI.data.map(i => i.id).join(', ')}` });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'absence_check_invitaciones_infra', error: err.message });
      }
    }

    // 3.5 Grupos
    if (trackedGrupos.length > 0) {
      try {
        const resG = await adminClient.from('grupos').select('id').in('id', trackedGrupos);
        if (resG.error || resG.status !== 200) {
          cleanupErrors.push({ stage: 'absence_check_grupos_infra', error: resG.error?.message || `HTTP ${resG.status}` });
        } else if (resG.data && resG.data.length > 0) {
          cleanupErrors.push({ stage: 'absence_check_grupos_residual', error: `Grupos residuales: ${resG.data.map(g => g.id).join(', ')}` });
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'absence_check_grupos_infra', error: err.message });
      }
    }

    // 3.6 Users (public y auth)
    if (trackedUsers.length > 0) {
      try {
        const resUsr = await adminClient.from('users').select('id').in('id', trackedUsers);
        if (resUsr.error || resUsr.status !== 200) {
          cleanupErrors.push({ stage: 'absence_check_users_infra', error: resUsr.error?.message || `HTTP ${resUsr.status}` });
        } else if (resUsr.data && resUsr.data.length > 0) {
          cleanupErrors.push({ stage: 'absence_check_users_residual', error: `Usuarios residuales: ${resUsr.data.map(u => u.id).join(', ')}` });
        }

        for (const uid of trackedUsers) {
          const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(uid);
          const isContractualAbsent =
            (authData?.user === null && !authErr) ||
            (authErr && authErr.status === 404) ||
            (authErr && authErr.message && authErr.message.toLowerCase().includes('not found'));
          if (!isContractualAbsent) {
            cleanupErrors.push({ stage: 'absence_check_auth_users', id: uid, error: authErr?.message || 'Usuario aún presente en auth' });
          }
        }
      } catch (err) {
        cleanupErrors.push({ stage: 'absence_check_users_infra', error: err.message });
      }
    }

    if (cleanupErrors.length > 0) {
      console.error('[TEARDOWN_FAILURES]', cleanupErrors);
      throw new Error(`Teardown acumuló errores de limpieza o verificación de ausencia: ${JSON.stringify(cleanupErrors)}`);
    }
    console.log('[TEARDOWN] Verificación de ausencia completada: 0 residuos en base de datos local (asociaciones, unidades, delegaciones, invitaciones, grupos, usuarios).');
  }
}

// Ejecutar según argumentos CLI
const isFailControlledMode = process.argv.includes('--fail-controlled');
const isFailCleanupMode = process.argv.includes('--fail-cleanup');
const isFailBaselineMismatchMode = process.argv.includes('--fail-baseline-mismatch');

runComprehensiveMatrix({
  failControlled: isFailControlledMode,
  failCleanup: isFailCleanupMode,
  failBaselineMismatch: isFailBaselineMismatchMode,
}).catch(err => {
  console.error('[PROCESS_EXIT_ERROR]', err.message);
  process.exitCode = 1;
});
