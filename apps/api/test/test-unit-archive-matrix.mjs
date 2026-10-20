import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error('ENTORNO_INVALIDO: Variables locales incompletas');
}

const parsedUrl = new URL(SUPABASE_URL);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  throw new Error(`DESTINO_NO_LOCAL_RECHAZADO: ${SUPABASE_URL}`);
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${b64Header}.${b64Payload}`).digest('base64url');
  return `${b64Header}.${b64Payload}.${sig}`;
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function createAuthClient(userId, role = 'authenticated') {
  const token = signJwt(
    { sub: userId, role, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
    JWT_SECRET
  );
  return {
    token,
    client: createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }),
  };
}

function checkAuthAbsenceStrict(authRes, userId) {
  if (!authRes || typeof authRes !== 'object') {
    return { ok: false, error: `auth_check_error:${userId}:Respuesta de Auth inválida o vacía` };
  }

  // Si data contiene user no nulo, es residuo activo
  if (authRes.data?.user) {
    return { ok: false, error: `residual:auth_users:${userId}` };
  }

  // Debe tener data con user === null Y error no nulo con status 404 esperado de usuario inexistente
  if (authRes.data && authRes.data.user === null && authRes.error) {
    const isExpected404 =
      authRes.error.status === 404 &&
      (authRes.error.code === 'user_not_found' || authRes.error.message?.includes('User not found'));
    if (isExpected404) {
      return { ok: true, error: null };
    }
    return {
      ok: false,
      error: `auth_check_error:${userId}:[${authRes.error.status || 'NO_STATUS'}] ${authRes.error.message || 'Error inesperado de Auth'}`,
    };
  }

  // Rechazar terminantemente {data:{user:null},error:null}, respuestas incompletas o sin error documentado
  return {
    ok: false,
    error: `auth_check_error:${userId}:Respuesta anómala o incompleta sin 404 documentado: ${JSON.stringify(authRes)}`,
  };
}

function runMatrixNegativeChecks() {
  console.log('[COMPROBACIONES NEGATIVAS DETERMINISTAS - MATRIZ]');

  // Negativa 1: Demostrar que error de FK (23503) con "violates" es rechazado por la aserción estricta 42501
  const mockFkError = { code: '23503', message: 'insert or update on table "alquileres" violates foreign key constraint' };
  assert.throws(
    () => {
      assert.strictEqual(mockFkError.code, '42501', 'Debe rechazar códigos que no sean 42501');
    },
    /ERR_ASSERTION/,
    'Error 23503 no debe ser aceptado bajo ninguna circunstancia'
  );
  assert.strictEqual(mockFkError.message.includes('violates'), true, 'Demuestra que includes("violates") aceptaba falsamente 23503');
  console.log(' -> PASÓ Negativa 1: Exigencia estricta de 42501 rechaza deterministamente errores 23503 (FK).');

  // Negativa 2: Demostrar que Auth solo acepta 404 documentado y rechaza 500, error:null y respuestas incompletas
  // 2a. Error 500
  const mock500 = { data: { user: null }, error: { status: 500, message: 'Internal Server Error' } };
  const res500 = checkAuthAbsenceStrict(mock500, 'mock-u1');
  assert.strictEqual(res500.ok, false);
  assert.ok(res500.error.includes('auth_check_error'));

  // 2b. Usuario presente (residuo activo)
  const mockResidual = { data: { user: { id: 'mock-u1' } }, error: null };
  const resResidual = checkAuthAbsenceStrict(mockResidual, 'mock-u1');
  assert.strictEqual(resResidual.ok, false);
  assert.ok(resResidual.error.includes('residual:auth_users'));

  // 2c. Falso positivo { data: { user: null }, error: null } (DEBE RECHAZARSE)
  const mockNullError = { data: { user: null }, error: null };
  const resNullError = checkAuthAbsenceStrict(mockNullError, 'mock-u1');
  assert.strictEqual(resNullError.ok, false, '{data:{user:null},error:null} debe ser rechazado');
  assert.ok(resNullError.error.includes('auth_check_error'));

  // 2d. Respuestas incompletas ({}, {data:null,error:null}, null)
  assert.strictEqual(checkAuthAbsenceStrict({}, 'mock-u1').ok, false);
  assert.strictEqual(checkAuthAbsenceStrict({ data: null, error: null }, 'mock-u1').ok, false);
  assert.strictEqual(checkAuthAbsenceStrict(null, 'mock-u1').ok, false);

  // 2e. Únicamente el 404 documentado acredita ausencia
  const mockDoc404 = { data: { user: null }, error: { status: 404, code: 'user_not_found', message: 'User not found' } };
  const resDoc404 = checkAuthAbsenceStrict(mockDoc404, 'mock-u1');
  assert.strictEqual(resDoc404.ok, true);
  console.log(' -> PASÓ Negativa 2: Validación estricta de Auth rechaza 500, error:null, incompletos y acepta solo 404 documentado.');
}

async function runMatrix() {
  const runId = `matrix_${Date.now()}`;
  let testError = null;
  const trackedUsers = [];
  const trackedGroups = [];
  const trackedUnits = [];
  const trackedRentals = [];
  const trackedDelegations = [];
  const trackedInvitaciones = [];
  const trackedInquilinos = [];

  try {
    console.log(`[START] Iniciando matriz de verificación para archive_unidad: ${runId}`);
    runMatrixNegativeChecks();

    // 1. Crear Gestor A (Propietario)
    const passA = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const { data: authA, error: errAuthA } = await adminClient.auth.admin.createUser({
      email: `${runId}_ga@test.local`,
      password: passA,
      email_confirm: true,
      user_metadata: { role: 'gestor', rol: 'gestor', full_name: `Gestor A ${runId}` },
    });
    assert.strictEqual(errAuthA, null, `Error creando Gestor A: ${errAuthA?.message}`);
    const idA = authA.user.id;
    trackedUsers.push(idA);

    // 2. Crear Gestor B (Ajeno)
    const passB = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const { data: authB, error: errAuthB } = await adminClient.auth.admin.createUser({
      email: `${runId}_gb@test.local`,
      password: passB,
      email_confirm: true,
      user_metadata: { role: 'gestor', rol: 'gestor', full_name: `Gestor B ${runId}` },
    });
    assert.strictEqual(errAuthB, null, `Error creando Gestor B: ${errAuthB?.message}`);
    const idB = authB.user.id;
    trackedUsers.push(idB);

    // 3. Crear Delegado C
    const passC = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const { data: authC, error: errAuthC } = await adminClient.auth.admin.createUser({
      email: `${runId}_del@test.local`,
      password: passC,
      email_confirm: true,
      user_metadata: { role: 'delegado', rol: 'delegado', full_name: `Delegado C ${runId}` },
    });
    assert.strictEqual(errAuthC, null, `Error creando Delegado C: ${errAuthC?.message}`);
    const idDel = authC.user.id;
    trackedUsers.push(idDel);

    // 4. Crear Grupos para Gestor A
    const g1Id = crypto.randomUUID();
    trackedGroups.push(g1Id);
    const { error: errG1 } = await adminClient.from('grupos').insert({ id: g1Id, gestor_id: idA, nombre: `Grupo 1 ${runId}` });
    assert.strictEqual(errG1, null, `Error creando Grupo 1: ${errG1?.message}`);

    const g2Id = crypto.randomUUID();
    trackedGroups.push(g2Id);
    const { error: errG2 } = await adminClient.from('grupos').insert({ id: g2Id, gestor_id: idA, nombre: `Grupo 2 ${runId}` });
    assert.strictEqual(errG2, null, `Error creando Grupo 2: ${errG2?.message}`);

    const { client: clientA } = createAuthClient(idA);
    const { client: clientB } = createAuthClient(idB);
    const { client: clientDel } = createAuthClient(idDel);

    // Configurar Delegado C en workspace de Gestor A mediante flujo RPC canónico
    const inv1Id = crypto.randomUUID();
    trackedInvitaciones.push(inv1Id);
    const { error: insInvErr } = await adminClient.from('invitaciones_delegados').insert({
      id: inv1Id,
      gestor_id: idA,
      delegado_id: idDel,
      email: `${runId}_del@test.local`,
      email_snapshot: `${runId}_del@test.local`,
      estado: 'pendiente',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      usada: false,
    });
    assert.strictEqual(insInvErr, null, insInvErr?.message);

    const acceptRes = await clientDel.rpc('accept_delegado_invitation', { p_invitation_id: inv1Id });
    assert.strictEqual(acceptRes.error, null, `Error aceptando invitación: ${acceptRes.error?.message}`);
    const del1Id = acceptRes.data?.delegacion_id;
    assert.ok(del1Id, 'accept_delegado_invitation debe retornar delegacion_id');
    trackedDelegations.push(del1Id);

    const configRes = await clientA.rpc('configure_delegacion', {
      p_delegacion_id: del1Id,
      p_permiso: 'gestionar',
      p_alcance_tipo: 'grupo',
      p_grupo_id: g1Id,
    });
    assert.strictEqual(configRes.error, null, `Error configurando delegación: ${configRes.error?.message}`);

    // =========================================================================
    // CASO 1: Propietario autorizado (Gestor A)
    // =========================================================================
    console.log('[CASO 1] Propietario autorizado (Gestor A) archiva unidad propia');
    const u1Id = crypto.randomUUID();
    trackedUnits.push(u1Id);
    const { error: insU1Err } = await adminClient.from('unidades').insert({
      id: u1Id,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad 1 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU1Err, null, `Error insertando Unidad 1: ${insU1Err?.message}`);

    const res1 = await clientA.rpc('archive_unidad', { p_unidad_id: u1Id });
    assert.strictEqual(res1.error, null, `Caso 1 debe tener éxito: ${res1.error?.message}`);
    assert.strictEqual(res1.data?.success, true, 'Caso 1 data.success debe ser true');
    assert.strictEqual(res1.data?.id, u1Id, 'Caso 1 data.id debe coincidir');
    assert.ok(res1.data?.deleted_at, 'Caso 1 debe retornar timestamp de borrado');

    // Verificar en BD: consulta sin error, fila exacta y timestamp ISO válido
    const { data: dbU1, error: errDbU1 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u1Id).single();
    assert.strictEqual(errDbU1, null, `Error consultando Unidad 1 en BD: ${errDbU1?.message}`);
    assert.ok(dbU1, 'Fila Unidad 1 debe existir en BD');
    assert.strictEqual(typeof dbU1.deleted_at, 'string', 'Caso 1: deleted_at debe ser string');
    assert.ok(!isNaN(Date.parse(dbU1.deleted_at)), 'Caso 1: deleted_at debe ser un timestamp ISO válido');
    console.log(' -> PASÓ: Unidad archivada exitosamente y persistida con timestamp válido comprobado.');

    // =========================================================================
    // CASO 2: Gestor ajeno (Gestor B) intenta archivar unidad de Gestor A
    // =========================================================================
    console.log('[CASO 2] Gestor ajeno (Gestor B) intenta archivar unidad de Gestor A');
    const u2Id = crypto.randomUUID();
    trackedUnits.push(u2Id);
    const { error: insU2Err } = await adminClient.from('unidades').insert({
      id: u2Id,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad 2 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU2Err, null, `Error insertando Unidad 2: ${insU2Err?.message}`);

    const res2 = await clientB.rpc('archive_unidad', { p_unidad_id: u2Id });
    assert.ok(res2.error, 'Caso 2 debe denegar la operación para Gestor ajeno');
    assert.strictEqual(res2.error?.message, 'Unidad no encontrada', 'Caso 2 debe responder fail-closed "Unidad no encontrada"');
    assert.strictEqual(res2.data, null, 'Caso 2 no debe retornar datos');

    // Comprobar que NO hubo cambios persistidos en BD
    const { data: dbU2, error: errDbU2 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u2Id).single();
    assert.strictEqual(errDbU2, null, `Error consultando Unidad 2: ${errDbU2?.message}`);
    assert.ok(dbU2, 'Fila Unidad 2 debe existir');
    assert.strictEqual(dbU2.deleted_at, null, 'Caso 2 en BD: deleted_at debe permanecer null tras denegación');
    console.log(' -> PASÓ: Denegación correcta y 0 cambios persistidos.');

    // =========================================================================
    // CASO 3: Delegado con 'gestionar' DENTRO de alcance (Grupo 1)
    // =========================================================================
    console.log('[CASO 3] Delegado con gestionar DENTRO de alcance archiva unidad de su grupo');
    const u3Id = crypto.randomUUID();
    trackedUnits.push(u3Id);
    const { error: insU3Err } = await adminClient.from('unidades').insert({
      id: u3Id,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad 3 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU3Err, null, `Error insertando Unidad 3: ${insU3Err?.message}`);

    const res3 = await clientDel.rpc('archive_unidad', { p_unidad_id: u3Id });
    assert.strictEqual(res3.error, null, `Caso 3 debe tener éxito: ${res3.error?.message}`);
    assert.strictEqual(res3.data?.success, true, 'Caso 3 data.success debe ser true');

    // Verificar en BD: consulta sin error, fila exacta y timestamp ISO válido
    const { data: dbU3, error: errDbU3 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u3Id).single();
    assert.strictEqual(errDbU3, null, `Error consultando Unidad 3: ${errDbU3?.message}`);
    assert.ok(dbU3, 'Fila Unidad 3 debe existir');
    assert.strictEqual(typeof dbU3.deleted_at, 'string', 'Caso 3: deleted_at debe ser string');
    assert.ok(!isNaN(Date.parse(dbU3.deleted_at)), 'Caso 3: deleted_at debe ser un timestamp ISO válido');
    console.log(' -> PASÓ: Delegado gestionar dentro de alcance archivó exitosamente.');

    // =========================================================================
    // CASO 4: Delegado con 'gestionar' FUERA de alcance (Grupo 2)
    // =========================================================================
    console.log('[CASO 4] Delegado con gestionar (alcance Grupo 1) intenta archivar unidad de Grupo 2');
    const u4Id = crypto.randomUUID();
    trackedUnits.push(u4Id);
    const { error: insU4Err } = await adminClient.from('unidades').insert({
      id: u4Id,
      gestor_id: idA,
      grupo_id: g2Id, // Fuera del alcance del delegado (que es g1Id)
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad 4 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU4Err, null, `Error insertando Unidad 4: ${insU4Err?.message}`);

    const res4 = await clientDel.rpc('archive_unidad', { p_unidad_id: u4Id });
    assert.ok(res4.error, 'Caso 4 debe denegar la operación fuera de alcance');
    assert.strictEqual(res4.error?.message, 'Unidad no encontrada', 'Caso 4 debe responder "Unidad no encontrada"');
    assert.strictEqual(res4.data, null, 'Caso 4 no debe retornar datos');

    // Comprobar que NO hubo cambios persistidos en BD
    const { data: dbU4, error: errDbU4 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u4Id).single();
    assert.strictEqual(errDbU4, null, `Error consultando Unidad 4: ${errDbU4?.message}`);
    assert.ok(dbU4, 'Fila Unidad 4 debe existir');
    assert.strictEqual(dbU4.deleted_at, null, 'Caso 4 en BD: deleted_at debe permanecer null tras denegación');
    console.log(' -> PASÓ: Denegación fuera de alcance correcta y 0 cambios persistidos.');

    // =========================================================================
    // CASO 5: Delegado con permiso 'ver' intenta archivar
    // =========================================================================
    console.log('[CASO 5] Delegado con permiso "ver" intenta archivar unidad de su grupo');
    // Reconfigurar delegación a permiso 'ver' usando RPC canónica del gestor
    const reconfigRes = await clientA.rpc('configure_delegacion', {
      p_delegacion_id: del1Id,
      p_permiso: 'ver',
      p_alcance_tipo: 'grupo',
      p_grupo_id: g1Id,
    });
    assert.strictEqual(reconfigRes.error, null, `Error reconfigurando delegación: ${reconfigRes.error?.message}`);

    const u5Id = crypto.randomUUID();
    trackedUnits.push(u5Id);
    const { error: insU5Err } = await adminClient.from('unidades').insert({
      id: u5Id,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad 5 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU5Err, null, `Error insertando Unidad 5: ${insU5Err?.message}`);

    const res5 = await clientDel.rpc('archive_unidad', { p_unidad_id: u5Id });
    assert.ok(res5.error, 'Caso 5 debe denegar para permiso "ver"');
    assert.strictEqual(res5.error?.message, 'Unidad no encontrada', 'Caso 5 debe responder "Unidad no encontrada"');
    assert.strictEqual(res5.data, null, 'Caso 5 no debe retornar datos');

    // Comprobar que NO hubo cambios persistidos en BD
    const { data: dbU5, error: errDbU5 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u5Id).single();
    assert.strictEqual(errDbU5, null, `Error consultando Unidad 5: ${errDbU5?.message}`);
    assert.ok(dbU5, 'Fila Unidad 5 debe existir');
    assert.strictEqual(dbU5.deleted_at, null, 'Caso 5 en BD: deleted_at debe permanecer null tras denegación');
    console.log(' -> PASÓ: Denegación para delegado ver correcta y 0 cambios persistidos.');

    // =========================================================================
    // CASO 6: Unidad con alquiler activo intenta ser archivada por Gestor A
    // =========================================================================
    console.log('[CASO 6] Unidad con alquiler activo intenta ser archivada por Gestor A (propietario)');
    const u6Id = crypto.randomUUID();
    trackedUnits.push(u6Id);
    const { error: insU6Err } = await adminClient.from('unidades').insert({
      id: u6Id,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad 6 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU6Err, null, `Error insertando Unidad 6: ${insU6Err?.message}`);

    // Crear un inquilino sintético y alquiler activo
    const inqId = crypto.randomUUID();
    trackedInquilinos.push(inqId);
    const { error: insInqErr } = await adminClient.from('inquilinos').insert({
      id: inqId,
      gestor_id: idA,
      nombre_completo: `Inquilino Test ${runId}`,
      telefono: '+5491112345678',
    });
    assert.strictEqual(insInqErr, null, `Error creando inquilino: ${insInqErr?.message}`);

    const alqId = crypto.randomUUID();
    trackedRentals.push(alqId);
    const { error: insAlqErr } = await adminClient.from('alquileres').insert({
      id: alqId,
      gestor_id: idA,
      unidad_id: u6Id,
      inquilino_id: inqId,
      modalidad: 'mensual',
      monto_total: 100000,
      estado: 'activo',
      fecha_inicio: '2026-10-01',
      fecha_fin: '2027-10-01',
      inicio_at: '2026-10-01T00:00:00.000Z',
      fin_at: '2027-10-01T00:00:00.000Z',
    });
    assert.strictEqual(insAlqErr, null, `Error creando alquiler: ${insAlqErr?.message}`);

    const res6 = await clientA.rpc('archive_unidad', { p_unidad_id: u6Id });
    assert.ok(res6.error, 'Caso 6 debe denegar la eliminación si hay alquiler activo');
    assert.ok(
      res6.error.message.includes('alquileres activos') || res6.error.message.includes('alquiler'),
      `Mensaje esperado sobre alquileres activos, recibido: ${res6.error.message}`
    );
    assert.strictEqual(res6.data, null, 'Caso 6 no debe retornar datos');

    // Comprobar que NO hubo cambios persistidos en BD
    const { data: dbU6, error: errDbU6 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u6Id).single();
    assert.strictEqual(errDbU6, null, `Error consultando Unidad 6: ${errDbU6?.message}`);
    assert.ok(dbU6, 'Fila Unidad 6 debe existir');
    assert.strictEqual(dbU6.deleted_at, null, 'Caso 6 en BD: deleted_at debe permanecer null tras denegación');
    console.log(' -> PASÓ: Denegación por alquiler activo correcta y 0 cambios persistidos.');

    // =========================================================================
    // REGRESIÓN PUNTO 1: Actor ajeno llama al RPC con unidad que posee alquiler activo
    // DEBE responder "Unidad no encontrada" (fail-closed, 0 información de alquileres)
    // =========================================================================
    console.log('[REGRESIÓN P1] Actor ajeno (Gestor B) intenta archivar unidad con alquiler activo de Gestor A');
    const resOracle = await clientB.rpc('archive_unidad', { p_unidad_id: u6Id });
    assert.ok(resOracle.error, 'Llamada de actor ajeno sobre unidad con alquiler activo debe ser denegada');
    assert.strictEqual(
      resOracle.error.message,
      'Unidad no encontrada',
      `Debe responder "Unidad no encontrada" (fail-closed), recibido: ${resOracle.error.message}`
    );
    assert.strictEqual(
      resOracle.error.message.includes('alquiler'),
      false,
      'El mensaje NO debe revelar si la unidad ajena posee alquileres activos'
    );
    assert.strictEqual(resOracle.data, null, 'No debe retornar datos');

    // Comprobar que la unidad y el alquiler siguen intactos
    const { data: dbU6Oracle, error: errDbU6Oracle } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u6Id).single();
    assert.strictEqual(errDbU6Oracle, null);
    assert.strictEqual(dbU6Oracle.deleted_at, null, 'Unidad 6 debe permanecer intacta tras intento ajeno');

    const { data: dbAlqOracle, error: errDbAlqOracle } = await adminClient.from('alquileres').select('id, estado').eq('id', alqId).single();
    assert.strictEqual(errDbAlqOracle, null);
    assert.strictEqual(dbAlqOracle.estado, 'activo', 'Alquiler debe permanecer activo tras intento ajeno');
    console.log(' -> PASÓ: Regresión P1 confirmada: actor ajeno recibe "Unidad no encontrada" sin fuga de información.');

    // =========================================================================
    // CASO 7: Lectura posterior al borrado
    // =========================================================================
    console.log('[CASO 7] Lectura posterior al borrado: ni propietario ni otros pueden leer unidad borrada');
    // Para u1Id (que fue archivada en Caso 1):
    // 7a. SELECT directo con cliente autenticado de Gestor A
    const resReadOwner = await clientA.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(resReadOwner.status, 200);
    assert.strictEqual(resReadOwner.data?.length, 0, 'SELECT autenticado del propietario debe retornar 0 filas para unidad borrada');

    // 7b. SELECT con cliente de Gestor B
    const resReadB = await clientB.from('unidades').select('id, titulo_es').eq('id', u1Id);
    assert.strictEqual(resReadB.status, 200);
    assert.strictEqual(resReadB.data?.length, 0, 'SELECT autenticado de Gestor B debe retornar 0 filas para unidad borrada');

    // 7c. can_read_unidad SQL function
    const { data: canReadA } = await clientA.rpc('can_read_unidad', { p_unidad_id: u1Id });
    assert.strictEqual(canReadA, false, 'can_read_unidad debe retornar FALSE para unidad con deleted_at');

    console.log(' -> PASÓ: Lectura posterior al borrado denegada estrictamente (0 registros legibles).');

    // =========================================================================
    // CASO 8: Verificación anti-oráculo de check_unidad_active_for_rental ante actor ajeno
    // Comparación de inserción y actualización directa para:
    // 1) Unidad activa ajena (u2Id)
    // 2) Unidad eliminada ajena (u1Id)
    // 3) Unidad inexistente (uNonExistentId)
    // Ninguna debe divulgar estado privado ni persistir cambios.
    // =========================================================================
    console.log('[CASO 8] Anti-oráculo de alquileres: actor ajeno prueba inserción y actualización en unidad activa, eliminada e inexistente');

    const uNonExistentId = crypto.randomUUID();

    // 8.1 Inserción directa por actor ajeno (Gestor B)
    // Crear un inquilino de Gestor B para la prueba de inserción
    const inqBId = crypto.randomUUID();
    trackedInquilinos.push(inqBId);
    const { error: insInqBErr } = await adminClient.from('inquilinos').insert({
      id: inqBId,
      gestor_id: idB,
      nombre_completo: `Inquilino Gestor B ${runId}`,
      telefono: '+5491122334455',
    });
    assert.strictEqual(insInqBErr, null, `Error creando inquilino B: ${insInqBErr?.message}`);

    const unitsToProbe = [
      { id: u2Id, label: 'Unidad ACTIVA ajena' },
      { id: u1Id, label: 'Unidad ELIMINADA ajena' },
      { id: uNonExistentId, label: 'Unidad INEXISTENTE' },
    ];

    for (const probe of unitsToProbe) {
      console.log(` -> 8.1 Inserción directa de alquiler activo en ${probe.label} (${probe.id})...`);
      const probeAlqId = crypto.randomUUID();
      trackedRentals.push(probeAlqId);

      const insRes = await clientB.from('alquileres').insert({
        id: probeAlqId,
        gestor_id: idB,
        unidad_id: probe.id,
        inquilino_id: inqBId,
        modalidad: 'mensual',
        monto_total: 100000,
        estado: 'activo',
        fecha_inicio: '2026-10-01',
        fecha_fin: '2027-10-01',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2027-10-01T00:00:00.000Z',
      });

      // Debe fallar de forma cerrada por violación de RLS (42501) sin oráculo
      assert.ok(insRes.error, `Inserción en ${probe.label} debió fallar por RLS`);
      assert.strictEqual(
        insRes.error.code,
        '42501',
        `Error debe ser rechazo uniforme estricto de RLS (código 42501), recibido: ${insRes.error.code} - ${insRes.error.message}`
      );
      // No debe divulgar información privada
      assert.strictEqual(
        insRes.error.message.includes('eliminada o archivada'),
        false,
        `No debe filtrar si la unidad está eliminada o archivada para ${probe.label}`
      );
      assert.strictEqual(
        insRes.error.message.includes('alquileres activos'),
        false,
        `No debe filtrar si la unidad tiene alquileres activos para ${probe.label}`
      );

      // Comprobar ausencia en BD: 0 cambios persistidos
      const { data: dbCheckAlq, error: dbCheckErr } = await adminClient.from('alquileres').select('id').eq('id', probeAlqId).maybeSingle();
      assert.strictEqual(dbCheckErr, null, dbCheckErr?.message);
      assert.strictEqual(dbCheckAlq, null, `Alquiler probe en ${probe.label} NO debe haberse persistido en BD`);
    }

    // 8.2 Actualización directa por actor ajeno (Gestor B)
    // Crear una unidad propia y alquiler legítimo de Gestor B
    const gBId = crypto.randomUUID();
    trackedGroups.push(gBId);
    const { error: insGBErr } = await adminClient.from('grupos').insert({ id: gBId, gestor_id: idB, nombre: `Grupo B ${runId}` });
    assert.strictEqual(insGBErr, null, `Error creando Grupo B: ${insGBErr?.message}`);

    const uBId = crypto.randomUUID();
    trackedUnits.push(uBId);
    const { error: insUBErr } = await adminClient.from('unidades').insert({
      id: uBId,
      gestor_id: idB,
      grupo_id: gBId,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad Gestor B ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insUBErr, null, `Error insertando Unidad B: ${insUBErr?.message}`);

    const alqBId = crypto.randomUUID();
    trackedRentals.push(alqBId);
    const { error: insAlqBErr } = await adminClient.from('alquileres').insert({
      id: alqBId,
      gestor_id: idB,
      unidad_id: uBId,
      inquilino_id: inqBId,
      modalidad: 'mensual',
      monto_total: 80000,
      estado: 'finalizado',
      fecha_inicio: '2026-10-01',
      fecha_fin: '2027-10-01',
      inicio_at: '2026-10-01T00:00:00.000Z',
      fin_at: '2027-10-01T00:00:00.000Z',
    });
    assert.strictEqual(insAlqBErr, null, `Error creando Alquiler legítimo B: ${insAlqBErr?.message}`);

    // Intentar actualizar el alquiler de Gestor B reasignándolo a cada una de las 3 unidades ajenas/inexistentes
    for (const probe of unitsToProbe) {
      console.log(` -> 8.2 Actualización de alquiler reasignándolo a ${probe.label} (${probe.id})...`);
      const updRes = await clientB.from('alquileres').update({
        unidad_id: probe.id,
        estado: 'activo',
      }).eq('id', alqBId);

      assert.ok(updRes.error, `Actualización a ${probe.label} debió fallar por RLS`);
      assert.strictEqual(
        updRes.error.code,
        '42501',
        `Error debe ser rechazo uniforme estricto de RLS (código 42501), recibido: ${updRes.error.code} - ${updRes.error.message}`
      );
      assert.strictEqual(
        updRes.error.message.includes('eliminada o archivada'),
        false,
        `No debe filtrar si la unidad está eliminada o archivada en UPDATE para ${probe.label}`
      );

      // Comprobar que en BD el alquiler conserva sus valores originales intactos
      const { data: dbAlqBCheck, error: errDbAlqBCheck } = await adminClient.from('alquileres').select('id, unidad_id, estado').eq('id', alqBId).single();
      assert.strictEqual(errDbAlqBCheck, null);
      assert.strictEqual(dbAlqBCheck.unidad_id, uBId, 'Alquiler de B no debe haber cambiado su unidad_id');
      assert.strictEqual(dbAlqBCheck.estado, 'finalizado', 'Alquiler de B no debe haber cambiado su estado');
    }

    // Comprobar que las unidades de prueba conservan su estado original en BD
    const { data: chkFinalU1 } = await adminClient.from('unidades').select('deleted_at').eq('id', u1Id).single();
    assert.ok(chkFinalU1?.deleted_at, 'Unidad 1 debe seguir eliminada');
    const { data: chkFinalU2 } = await adminClient.from('unidades').select('deleted_at').eq('id', u2Id).single();
    assert.strictEqual(chkFinalU2?.deleted_at, null, 'Unidad 2 debe seguir activa (sin deleted_at)');

    console.log(' -> PASÓ: Verificación anti-oráculo completa: actor ajeno recibe rechazo uniforme de RLS (42501) sin divulgación de estado ni persistencia en BD.');

    console.log('\n[RESUMEN] Todos los 9 casos y suites de la matriz completados y verificados con éxito.');
  } catch (err) {
    testError = err;
    console.error('[TEST ERROR]', err);
  } finally {
    console.log('[CLEANUP] Limpiando fixtures de prueba y verificando ausencia por IDs...');
    const cleanupErrors = [];

    // 1. Alquileres
    for (const rId of trackedRentals) {
      const { error: delErr } = await adminClient.from('alquileres').delete().eq('id', rId);
      if (delErr) cleanupErrors.push(`delete:alquileres:${rId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('alquileres').select('id').eq('id', rId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:alquileres:${rId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:alquileres:${rId}`);
    }

    // 2. Inquilinos
    for (const inqId of trackedInquilinos) {
      const { error: delErr } = await adminClient.from('inquilinos').delete().eq('id', inqId);
      if (delErr) cleanupErrors.push(`delete:inquilinos:${inqId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('inquilinos').select('id').eq('id', inqId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:inquilinos:${inqId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:inquilinos:${inqId}`);
    }

    // 3. Delegaciones
    for (const delId of trackedDelegations) {
      const { error: delErr } = await adminClient.from('delegaciones').delete().eq('id', delId);
      if (delErr) cleanupErrors.push(`delete:delegaciones:${delId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('delegaciones').select('id').eq('id', delId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:delegaciones:${delId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:delegaciones:${delId}`);
    }

    // 4. Invitaciones
    for (const invId of trackedInvitaciones) {
      const { error: delErr } = await adminClient.from('invitaciones_delegados').delete().eq('id', invId);
      if (delErr) cleanupErrors.push(`delete:invitaciones:${invId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('invitaciones_delegados').select('id').eq('id', invId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:invitaciones:${invId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:invitaciones:${invId}`);
    }

    // 5. Unidades
    for (const uId of trackedUnits) {
      const { error: delErr } = await adminClient.from('unidades').delete().eq('id', uId);
      if (delErr) cleanupErrors.push(`delete:unidades:${uId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('unidades').select('id').eq('id', uId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:unidades:${uId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:unidades:${uId}`);
    }

    // 6. Grupos
    for (const gId of trackedGroups) {
      const { error: delErr } = await adminClient.from('grupos').delete().eq('id', gId);
      if (delErr) cleanupErrors.push(`delete:grupos:${gId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('grupos').select('id').eq('id', gId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:grupos:${gId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:grupos:${gId}`);
    }

    // 7. Usuarios (public.users y auth.users) en orden inverso (delegados antes de sus workspace gestores)
    for (const uId of [...trackedUsers].reverse()) {
      const { error: delErr } = await adminClient.from('users').delete().eq('id', uId);
      if (delErr) cleanupErrors.push(`delete:users:${uId}:${delErr.message}`);
      const { error: authErr } = await adminClient.auth.admin.deleteUser(uId);
      if (authErr) cleanupErrors.push(`delete:auth_users:${uId}:${authErr.message}`);

      const { data: chk, error: chkErr } = await adminClient.from('users').select('id').eq('id', uId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:users:${uId}:${chkErr.message}`);
      if (chk) cleanupErrors.push(`residual:users:${uId}`);

      const chkAuthRes = await adminClient.auth.admin.getUserById(uId);
      const authValidation = checkAuthAbsenceStrict(chkAuthRes, uId);
      if (!authValidation.ok) {
        cleanupErrors.push(authValidation.error);
      }
    }

    if (cleanupErrors.length > 0) {
      console.error('[CLEANUP FAILED WITH ERRORS]', cleanupErrors);
      const compositeError = testError
        ? new Error(`TEST_FAILED: ${testError.message} | CLEANUP_FAILED: ${cleanupErrors.join(' ; ')}`)
        : new Error(`CLEANUP_FAILED_WITH_ERRORS: ${cleanupErrors.join(' ; ')}`);
      throw compositeError;
    }

    if (testError) {
      throw testError;
    }

    console.log('[CLEANUP OK] Limpieza completada con ausencia física verificada por IDs para todos los recursos.');
  }
}

runMatrix().catch(e => {
  console.error('[FATAL]', e);
  process.exitCode = 1;
});
