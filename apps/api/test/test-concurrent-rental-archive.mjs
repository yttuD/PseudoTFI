import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('ENTORNO_INVALIDO: Variables locales incompletas');
}

// 1. RECHAZAR DESTINOS NO LOCALES
const parsedUrl = new URL(SUPABASE_URL);
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedUrl.hostname)) {
  throw new Error(`DESTINO_NO_LOCAL_RECHAZADO: Se prohíbe ejecutar pruebas sobre ${SUPABASE_URL}`);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// PARSER NUMÉRICO EXACTO Y RECHAZO DE ERRORES SQL EN PREFLIGHT
export function parseCountScalar(output) {
  if (!output || typeof output !== 'string') {
    throw new Error('Salida SQL vacía o indefinida');
  }
  if (/ERROR:/i.test(output)) {
    throw new Error(`Error SQL detectado en respuesta: ${output.trim()}`);
  }
  const lines = output
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('(') && !l.startsWith('count') && !l.startsWith('-'));

  if (lines.length === 0) {
    throw new Error(`No se encontró valor escalar numérico en la salida SQL: ${output}`);
  }
  const parsed = parseInt(lines[0], 10);
  if (isNaN(parsed)) {
    throw new Error(`El valor extraído no es un número entero válido: "${lines[0]}" de "${output}"`);
  }
  return parsed;
}

// VALIDACIÓN DE AUSENCIA EN AUTH CON ACEPTACIÓN EXCLUSIVA DE 404 DOCUMENTADO
export function checkAuthAbsenceStrict(authRes, userId) {
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

class PsqlSession {
  constructor(name) {
    this.name = name;
    this.pid = null;
    this.closed = false;
    this.proc = spawn('docker', ['exec', '-i', 'supabase_db_TFI', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=0', '-q'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.exitPromise = new Promise(resolve => {
      this.proc.on('close', (code, signal) => resolve({ code, signal }));
    });
    this.buffer = '';
    this.proc.stdout.on('data', d => { this.buffer += d.toString(); });
    this.proc.stderr.on('data', d => { this.buffer += d.toString(); });
  }

  async initPid() {
    const out = await this.query('SELECT pg_backend_pid();');
    const match = out.match(/\b\d+\b/);
    if (!match) {
      throw new Error(`No se pudo obtener pg_backend_pid para la sesión ${this.name}: ${out}`);
    }
    this.pid = parseInt(match[0], 10);
    return this.pid;
  }

  async execAsync(sql) {
    if (this.closed) throw new Error(`Sesión ${this.name} ya cerrada`);
    const marker = `__END_${Math.random().toString(36).substring(2)}__`;
    this.buffer = '';
    this.proc.stdin.write(`${sql};\n\\echo '${marker}'\n`);

    return {
      waitResult: async (timeoutMs = 10000) => {
        const start = Date.now();
        while (!this.buffer.includes(marker)) {
          if (Date.now() - start > timeoutMs) {
            throw new Error(`Timeout (${timeoutMs}ms) esperando respuesta en sesión ${this.name}. Buffer actual: ${this.buffer}`);
          }
          await new Promise(r => setTimeout(r, 40));
        }
        // Permitir que el pipe de stderr termine de vaciar chunks concurrentes
        await new Promise(r => setTimeout(r, 100));
        const output = this.buffer.slice(0, this.buffer.indexOf(marker)).trim();
        this.buffer = this.buffer.slice(this.buffer.indexOf(marker) + marker.length);
        return output;
      },
    };
  }

  async query(sql, timeoutMs = 10000) {
    const exec = await this.execAsync(sql);
    return exec.waitResult(timeoutMs);
  }

  async close(timeoutMs = 4000) {
    if (this.closed) return;
    this.closed = true;
    try {
      this.proc.stdin.write('\\q\n');
      this.proc.stdin.end();
    } catch {}

    const exited = await Promise.race([
      this.exitPromise.then(() => true),
      new Promise(r => setTimeout(() => r(false), timeoutMs)),
    ]);

    if (!exited) {
      try { this.proc.kill('SIGKILL'); } catch {}
      await this.exitPromise;
    }
  }
}

// VERIFICACIÓN DE CIERRE DEL BACKEND EN POSTGRESQL (pg_stat_activity)
async function verifyBackendClosed(pid, timeoutMs = 4000) {
  if (!pid) return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const checkProc = spawn('docker', [
      'exec', '-i', 'supabase_db_TFI', 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-c',
      `SELECT count(*) FROM pg_stat_activity WHERE pid = ${pid};`
    ]);
    let out = '';
    checkProc.stdout.on('data', d => { out += d.toString(); });
    await new Promise(r => checkProc.on('close', r));
    const count = parseInt(out.trim(), 10);
    if (count === 0) {
      return true; // El backend PostgreSQL ya no existe
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`BACKEND_LEAK: El backend de PostgreSQL con PID ${pid} sigue activo tras el cierre de la sesión`);
}

// 2. VERIFICACIÓN DE BLOQUEOS REALES EN POSTGRESQL (pg_locks)
async function verifyLockWait(controlSession, blockedPid, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const lockCheckSql = `SELECT count(*) FROM pg_locks WHERE NOT granted AND pid = ${blockedPid};`;
    const lockOut = await controlSession.query(lockCheckSql);
    const countMatch = lockOut.match(/\b\d+\b/);
    const lockCount = countMatch ? parseInt(countMatch[0], 10) : 0;
    if (lockCount > 0) {
      return true;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error(`CRITERIO_FALLIDO: No se detectó espera de bloqueo en pg_locks para el PID ${blockedPid} tras ${timeoutMs}ms`);
}

async function runNegativeChecks() {
  console.log('[COMPROBACIONES NEGATIVAS DETERMINISTAS - CONCURRENCIA & PREFLIGHT]');

  // Negativa 1: Demostrar que parseCountScalar rechaza falso positivo de (1 row) cuando count es 0
  const mockCountZero = ' count \n-------\n     0\n(1 row)\n';
  const val0 = parseCountScalar(mockCountZero);
  assert.strictEqual(val0, 0, 'parseCountScalar debe extraer el número 0 exacto');
  assert.notStrictEqual(val0, 1, 'COUNT=0 no debe ser evaluado como 1 a pesar de que el texto contenga "(1 row)"');
  assert.strictEqual(mockCountZero.includes('1'), true, 'El texto crudo sí contiene "1", probando la necesidad del parser exacto');
  console.log(' -> PASÓ Negativa 1: COUNT=0 con "(1 row)" no genera falso positivo.');

  // Negativa 2: Demostrar que errores SQL en preflight son detectados y rechazados
  const mockSqlError = 'ERROR:  relation "auth.inexistent" does not exist\nLINE 1: SELECT count(*) FROM auth.inexistent;\n';
  assert.throws(
    () => parseCountScalar(mockSqlError),
    /Error SQL detectado/i,
    'Errores SQL deben ser rechazados inmediatamente'
  );
  console.log(' -> PASÓ Negativa 2: Errores SQL en preflight rechazados estrictamente.');

  // Negativa 3: Demostrar que errores de servidor, respuestas sin error y respuestas incompletas en Auth impiden declarar limpieza
  // 3a. Error 500
  const mock500 = { data: { user: null }, error: { status: 500, message: 'Internal Server Error' } };
  const res500 = checkAuthAbsenceStrict(mock500, 'mock-u1');
  assert.strictEqual(res500.ok, false);
  assert.ok(res500.error.includes('auth_check_error'), 'Error 500 debe impedir declarar limpieza');

  // 3b. Usuario presente (residuo activo)
  const mockUserPresent = { data: { user: { id: 'mock-u1' } }, error: null };
  const resPresent = checkAuthAbsenceStrict(mockUserPresent, 'mock-u1');
  assert.strictEqual(resPresent.ok, false);
  assert.ok(resPresent.error.includes('residual:auth_users'), 'Usuario presente debe reportarse como residuo');

  // 3c. Falso positivo { data: { user: null }, error: null } (DEBE RECHAZARSE)
  const mockNullError = { data: { user: null }, error: null };
  const resNullError = checkAuthAbsenceStrict(mockNullError, 'mock-u1');
  assert.strictEqual(resNullError.ok, false, '{data:{user:null},error:null} debe ser rechazado');
  assert.ok(resNullError.error.includes('auth_check_error'), 'Respuesta con error:null no debe acreditar ausencia');

  // 3d. Respuestas incompletas o malformadas ({}, {data:null,error:null}, null)
  assert.strictEqual(checkAuthAbsenceStrict({}, 'mock-u1').ok, false, 'Objeto vacío debe ser rechazado');
  assert.strictEqual(checkAuthAbsenceStrict({ data: null, error: null }, 'mock-u1').ok, false, 'data:null con error:null debe ser rechazado');
  assert.strictEqual(checkAuthAbsenceStrict(null, 'mock-u1').ok, false, 'null debe ser rechazado');

  // 3e. Únicamente el 404 documentado debe acreditar ausencia
  const mockDocumented404 = { data: { user: null }, error: { status: 404, code: 'user_not_found', message: 'User not found' } };
  const res404 = checkAuthAbsenceStrict(mockDocumented404, 'mock-u1');
  assert.strictEqual(res404.ok, true, 'Únicamente el 404 documentado debe acreditar ausencia');
  console.log(' -> PASÓ Negativa 3: Verificación de Auth rechaza 500, error:null, respuestas incompletas y acredita solo 404 documentado.');

  // Negativa 4: Demostrar que verifyBackendClosed detecta leaks si un PID persiste,
  // con el ciclo de vida completo de dummySession envuelto en try/finally y preservación de errores.
  const dummySession = new PsqlSession('SesionPruebaNegativa');
  let dummyTestError = null;
  try {
    await dummySession.initPid();
    let leakDetected = false;
    try {
      // Si consultamos con timeout ultracorto mientras la sesión sigue abierta, debe lanzar BACKEND_LEAK
      await verifyBackendClosed(dummySession.pid, 200);
    } catch (err) {
      if (err.message.includes('BACKEND_LEAK')) {
        leakDetected = true;
      }
    }
    assert.strictEqual(leakDetected, true, 'verifyBackendClosed debe detectar cuando un backend sigue vivo');
  } catch (err) {
    dummyTestError = err;
  } finally {
    const dummyCleanupErrors = [];
    try {
      await dummySession.close();
      if (dummySession.pid) {
        await verifyBackendClosed(dummySession.pid);
      }
    } catch (cleanErr) {
      dummyCleanupErrors.push(cleanErr.message);
    }

    if (dummyCleanupErrors.length > 0) {
      const compErr = dummyTestError
        ? new Error(`DUMMY_FAILED: ${dummyTestError.message} | CLEANUP_FAILED: ${dummyCleanupErrors.join(' ; ')}`)
        : new Error(`DUMMY_CLEANUP_FAILED: ${dummyCleanupErrors.join(' ; ')}`);
      throw compErr;
    }

    if (dummyTestError) {
      throw dummyTestError;
    }
  }
  console.log(' -> PASÓ Negativa 4: dummySession envuelta en try/finally con verificación de desaparición de backend y detección de leaks.');
}

async function runConcurrencyProof() {
  const runId = `conc_${Date.now()}`;
  console.log(`\n[START] Demostración de serialización concurrente y protocolo común de bloqueo: ${runId}`);

  await runNegativeChecks();

  let testError = null;
  const trackedUsers = [];
  const trackedGroups = [];
  const trackedUnits = [];
  const trackedRentals = [];
  const trackedInquilinos = [];

  const sessionPids = [];
  let sControl = null;
  let s1 = null;
  let s2 = null;

  try {
    // 3. CONFIRMAR QUE POSTGREST Y SESIÓN SQL CORRESPONDEN AL MISMO ENTORNO FÍSICO
    console.log('\n[PREFLIGHT] Comprobando correspondencia de entorno entre PostgREST y PostgreSQL...');
    sControl = new PsqlSession('SesionControl');
    await sControl.initPid();
    sessionPids.push({ name: 'SesionControl', session: sControl });

    const probeEmail = `probe_${runId}@test.local`;
    const { data: probeAuth, error: probeErr } = await adminClient.auth.admin.createUser({
      email: probeEmail,
      password: `${crypto.randomBytes(16).toString('hex')}!Aa1`,
      email_confirm: true,
      user_metadata: { role: 'gestor', rol: 'gestor' },
    });
    assert.strictEqual(probeErr, null, `Error creando usuario testigo PostgREST: ${probeErr?.message}`);
    const probeId = probeAuth.user.id;

    // REGISTRO INMEDIATO: para asegurar que si el preflight falla a continuación, el cleanup lo purgue
    trackedUsers.push(probeId);

    // Verificar presencia inmediata en la sesión SQL directa mediante parser numérico exacto
    const sqlProbeOut = await sControl.query(`SELECT count(*) FROM auth.users WHERE id = '${probeId}';`);
    const countPresente = parseCountScalar(sqlProbeOut);
    assert.strictEqual(countPresente, 1, `Discrepancia de entorno: PostgREST insertó en una BD distinta a psql (count=${countPresente}, out=${sqlProbeOut})`);

    // Limpiar usuario testigo de inmediato
    await adminClient.from('users').delete().eq('id', probeId);
    const { error: delProbeErr } = await adminClient.auth.admin.deleteUser(probeId);
    assert.strictEqual(delProbeErr, null, `Error eliminando testigo: ${delProbeErr?.message}`);

    // Verificar ausencia inmediata en la sesión SQL directa mediante parser numérico exacto
    const sqlProbeDeleted = await sControl.query(`SELECT count(*) FROM auth.users WHERE id = '${probeId}';`);
    const countAusente = parseCountScalar(sqlProbeDeleted);
    assert.strictEqual(countAusente, 0, `Discrepancia de entorno en purga de testigo (count=${countAusente}, out=${sqlProbeDeleted})`);

    // Retirar del array ya que fue limpiado exitosamente en el preflight
    const pIdx = trackedUsers.indexOf(probeId);
    if (pIdx !== -1) trackedUsers.splice(pIdx, 1);

    console.log(' -> PASÓ: PostgREST y psql corresponden exactamente al mismo entorno local con comprobación numérica exacta.');

    // 4. FIXTURES BASE: Gestor A, Grupo e Inquilino
    const { data: authA, error: errAuthA } = await adminClient.auth.admin.createUser({
      email: `${runId}_ga@test.local`,
      password: `${crypto.randomBytes(16).toString('hex')}!Aa1`,
      email_confirm: true,
      user_metadata: { role: 'gestor', rol: 'gestor', full_name: `Gestor A ${runId}` },
    });
    assert.strictEqual(errAuthA, null, `Error creando Gestor A: ${errAuthA?.message}`);
    const idA = authA.user.id;
    trackedUsers.push(idA);

    const g1Id = crypto.randomUUID();
    trackedGroups.push(g1Id);
    const { error: gErr } = await adminClient.from('grupos').insert({ id: g1Id, gestor_id: idA, nombre: `Grupo ${runId}` });
    assert.strictEqual(gErr, null, `Error creando grupo: ${gErr?.message}`);

    const inqId = crypto.randomUUID();
    trackedInquilinos.push(inqId);
    const { error: inqErr } = await adminClient.from('inquilinos').insert({
      id: inqId,
      gestor_id: idA,
      nombre_completo: `Inquilino ${runId}`,
      telefono: '+5491112345678',
    });
    assert.strictEqual(inqErr, null, `Error creando inquilino: ${inqErr?.message}`);

    s1 = new PsqlSession('Sesion1');
    s2 = new PsqlSession('Sesion2');
    await s1.initPid();
    await s2.initPid();
    sessionPids.push({ name: 'Sesion1', session: s1 });
    sessionPids.push({ name: 'Sesion2', session: s2 });

    const sqlAuthClaimsA = `
      SET LOCAL ROLE authenticated;
      SET LOCAL "request.jwt.claim.sub" = '${idA}';
      SET LOCAL "request.jwt.claim.role" = 'authenticated';
      SET LOCAL "request.jwt.claims" = '{"sub": "${idA}", "role": "authenticated"}';
    `;

    // =========================================================================
    // ESCENARIO 1A: archive_unidad real inicia primero; INSERT de alquiler activo entra en lock wait y falla.
    // =========================================================================
    console.log('\n[ESCENARIO 1A] archive_unidad real inicia primero; INSERT de alquiler activo entra en lock wait y falla.');

    const u1aId = crypto.randomUUID();
    trackedUnits.push(u1aId);
    const { error: insU1aErr } = await adminClient.from('unidades').insert({
      id: u1aId,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad Concurrente 1A ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU1aErr, null, `Error creando U1A: ${insU1aErr?.message}`);

    // Sesión 1: Inicia transacción y ejecuta public.archive_unidad real con identidad autenticada
    await s1.query('BEGIN;');
    await s1.query(sqlAuthClaimsA);
    const archive1aOut = await s1.query(`SELECT public.archive_unidad('${u1aId}'::uuid);`);
    assert.ok(archive1aOut.includes(u1aId), `archive_unidad debió procesar u1a: ${archive1aOut}`);
    console.log(' -> Sesión 1: archive_unidad ejecutada en transacción abierta (FOR UPDATE adquirido).');

    // Sesión 2: Intenta concurrentemente INSERT de alquiler activo
    const alq1aId = crypto.randomUUID();
    trackedRentals.push(alq1aId);
    const insertAlq1aSql = `
      BEGIN;
      ${sqlAuthClaimsA}
      INSERT INTO public.alquileres (
        id, gestor_id, unidad_id, inquilino_id, modalidad, monto_total, estado,
        fecha_inicio, fecha_fin, inicio_at, fin_at
      ) VALUES (
        '${alq1aId}', '${idA}', '${u1aId}', '${inqId}', 'mensual', 100000, 'activo',
        '2026-10-01', '2027-10-01', '2026-10-01T00:00:00Z', '2027-10-01T00:00:00Z'
      );
      COMMIT;
    `;
    console.log(' -> Sesión 2: Enviando INSERT de alquiler activo...');
    const execInsert1a = await s2.execAsync(insertAlq1aSql);

    // Verificar bloqueo en pg_locks
    await verifyLockWait(sControl, s2.pid);
    console.log(' -> PASÓ: Sesión 2 acreditada en espera de bloqueo (pg_locks: NOT granted).');

    // Sesión 1 confirma (COMMIT)
    await s1.query('COMMIT;');
    console.log(' -> Sesión 1: Transacción confirmada (COMMIT).');

    // Sesión 2 se desbloquea: debe fallar con el error exacto esperado
    const resInsert1a = await execInsert1a.waitResult(5000);
    console.log(` -> Sesión 2 desbloqueada: ${resInsert1a.replace(/\n/g, ' ')}`);
    assert.ok(
      resInsert1a.includes('No se puede crear ni activar un alquiler en una unidad eliminada o archivada'),
      `Sesión 2 no falló con el error esperado. Salida: ${resInsert1a}`
    );
    await s2.query('ROLLBACK;');

    // Verificación en BD
    const { data: dbU1a, error: chkU1aErr } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u1aId).single();
    assert.strictEqual(chkU1aErr, null, chkU1aErr?.message);
    assert.ok(dbU1a?.deleted_at, 'U1A debe tener deleted_at no nulo');
    const { data: dbAlq1a, error: chkAlq1aErr } = await adminClient.from('alquileres').select('id').eq('id', alq1aId).maybeSingle();
    assert.strictEqual(chkAlq1aErr, null, chkAlq1aErr?.message);
    assert.strictEqual(dbAlq1a, null, 'Alquiler 1A NO debe persistir');
    console.log(' -> PASÓ: Escenario 1A verificado (unidad archivada, inserción rechazada y no persistida).');

    // =========================================================================
    // ESCENARIO 1B: archive_unidad real inicia primero; UPDATE de activación espera y falla.
    // =========================================================================
    console.log('\n[ESCENARIO 1B] archive_unidad real inicia primero; UPDATE de activación de alquiler entra en lock wait y falla.');

    const u1bId = crypto.randomUUID();
    trackedUnits.push(u1bId);
    const { error: insU1bErr } = await adminClient.from('unidades').insert({
      id: u1bId,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad Concurrente 1B ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU1bErr, null, `Error creando U1B: ${insU1bErr?.message}`);

    const alq1bId = crypto.randomUUID();
    trackedRentals.push(alq1bId);
    const { error: insAlq1bErr } = await adminClient.from('alquileres').insert({
      id: alq1bId,
      gestor_id: idA,
      unidad_id: u1bId,
      inquilino_id: inqId,
      modalidad: 'mensual',
      monto_total: 100000,
      estado: 'finalizado',
      fecha_inicio: '2026-10-01',
      fecha_fin: '2027-10-01',
      inicio_at: '2026-10-01T00:00:00Z',
      fin_at: '2027-10-01T00:00:00Z',
    });
    assert.strictEqual(insAlq1bErr, null, `Error creando Alquiler 1B en finalizado: ${insAlq1bErr?.message}`);

    // Sesión 1: Inicia transacción y ejecuta public.archive_unidad real
    await s1.query('BEGIN;');
    await s1.query(sqlAuthClaimsA);
    const archive1bOut = await s1.query(`SELECT public.archive_unidad('${u1bId}'::uuid);`);
    assert.ok(archive1bOut.includes(u1bId), `archive_unidad debió procesar u1b: ${archive1bOut}`);
    console.log(' -> Sesión 1: archive_unidad ejecutada en transacción abierta.');

    // Sesión 2: Intenta UPDATE para activar el alquiler
    const updateAlq1bSql = `
      BEGIN;
      ${sqlAuthClaimsA}
      UPDATE public.alquileres SET estado = 'activo' WHERE id = '${alq1bId}';
      COMMIT;
    `;
    console.log(' -> Sesión 2: Enviando UPDATE de activación de alquiler...');
    const execUpdate1b = await s2.execAsync(updateAlq1bSql);

    // Verificar bloqueo en pg_locks
    await verifyLockWait(sControl, s2.pid);
    console.log(' -> PASÓ: Sesión 2 acreditada en espera de bloqueo (pg_locks: NOT granted).');

    // Sesión 1 confirma (COMMIT)
    await s1.query('COMMIT;');
    console.log(' -> Sesión 1: Transacción confirmada (COMMIT).');

    // Sesión 2 se desbloquea: debe fallar con el error exacto esperado
    const resUpdate1b = await execUpdate1b.waitResult(5000);
    console.log(` -> Sesión 2 desbloqueada: ${resUpdate1b.replace(/\n/g, ' ')}`);
    assert.ok(
      resUpdate1b.includes('No se puede crear ni activar un alquiler en una unidad eliminada o archivada'),
      `Sesión 2 no falló con el error esperado. Salida: ${resUpdate1b}`
    );
    await s2.query('ROLLBACK;');

    // Verificación en BD
    const { data: dbU1b, error: chkU1bErr } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u1bId).single();
    assert.strictEqual(chkU1bErr, null, chkU1bErr?.message);
    assert.ok(dbU1b?.deleted_at, 'U1B debe tener deleted_at no nulo');
    const { data: dbAlq1b, error: chkAlq1bErr } = await adminClient.from('alquileres').select('id, estado').eq('id', alq1bId).single();
    assert.strictEqual(chkAlq1bErr, null, chkAlq1bErr?.message);
    assert.strictEqual(dbAlq1b?.estado, 'finalizado', 'Alquiler 1B debe haber conservado estado finalizado');
    console.log(' -> PASÓ: Escenario 1B verificado (unidad archivada, activación rechazada y estado intacto).');

    // =========================================================================
    // ESCENARIO 2A: INSERT de alquiler activo inicia primero; archive_unidad real espera y falla.
    // =========================================================================
    console.log('\n[ESCENARIO 2A] INSERT de alquiler activo inicia primero; archive_unidad real entra en lock wait y falla.');

    const u2aId = crypto.randomUUID();
    trackedUnits.push(u2aId);
    const { error: insU2aErr } = await adminClient.from('unidades').insert({
      id: u2aId,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad Concurrente 2A ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU2aErr, null, `Error creando U2A: ${insU2aErr?.message}`);

    const alq2aId = crypto.randomUUID();
    trackedRentals.push(alq2aId);

    // Sesión 1: Inicia transacción e inserta alquiler activo (toma FOR SHARE vía trigger)
    await s1.query('BEGIN;');
    await s1.query(sqlAuthClaimsA);
    const insAlq2aSql = `
      INSERT INTO public.alquileres (
        id, gestor_id, unidad_id, inquilino_id, modalidad, monto_total, estado,
        fecha_inicio, fecha_fin, inicio_at, fin_at
      ) VALUES (
        '${alq2aId}', '${idA}', '${u2aId}', '${inqId}', 'mensual', 100000, 'activo',
        '2026-10-01', '2027-10-01', '2026-10-01T00:00:00Z', '2027-10-01T00:00:00Z'
      );
    `;
    await s1.query(insAlq2aSql);
    console.log(' -> Sesión 1: Alquiler activo insertado en transacción abierta (FOR SHARE activo).');

    // Sesión 2: Intenta ejecutar public.archive_unidad real (intenta FOR UPDATE)
    const archive2aSql = `
      BEGIN;
      ${sqlAuthClaimsA}
      SELECT public.archive_unidad('${u2aId}'::uuid);
      COMMIT;
    `;
    console.log(' -> Sesión 2: Enviando public.archive_unidad...');
    const execArchive2a = await s2.execAsync(archive2aSql);

    // Verificar bloqueo en pg_locks
    await verifyLockWait(sControl, s2.pid);
    console.log(' -> PASÓ: Sesión 2 (archive_unidad) acreditada en espera de bloqueo (pg_locks: NOT granted).');

    // Sesión 1 confirma el alquiler (COMMIT)
    await s1.query('COMMIT;');
    console.log(' -> Sesión 1: Transacción de alquiler confirmada (COMMIT).');

    // Sesión 2 se desbloquea: debe fallar con el error exacto de alquileres activos
    const resArchive2a = await execArchive2a.waitResult(5000);
    console.log(` -> Sesión 2 desbloqueada: ${resArchive2a.replace(/\n/g, ' ')}`);
    assert.ok(
      resArchive2a.includes('La unidad tiene alquileres activos y no se puede eliminar'),
      `Sesión 2 no falló con el error esperado. Salida: ${resArchive2a}`
    );
    await s2.query('ROLLBACK;');

    // Verificación en BD
    const { data: dbU2a, error: chkU2aErr } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u2aId).single();
    assert.strictEqual(chkU2aErr, null, chkU2aErr?.message);
    assert.strictEqual(dbU2a?.deleted_at, null, 'U2A NO debe haberse eliminado (deleted_at debe ser null)');
    const { data: dbAlq2a, error: chkAlq2aErr } = await adminClient.from('alquileres').select('id, estado').eq('id', alq2aId).single();
    assert.strictEqual(chkAlq2aErr, null, chkAlq2aErr?.message);
    assert.strictEqual(dbAlq2a?.estado, 'activo', 'Alquiler 2A debe persistir con estado activo');
    console.log(' -> PASÓ: Escenario 2A verificado (unidad intacta, alquiler activo persistido).');

    // =========================================================================
    // ESCENARIO 2B: UPDATE de activación inicia primero; archive_unidad real espera y falla.
    // =========================================================================
    console.log('\n[ESCENARIO 2B] UPDATE de activación de alquiler inicia primero; archive_unidad real entra en lock wait y falla.');

    const u2bId = crypto.randomUUID();
    trackedUnits.push(u2bId);
    const { error: insU2bErr } = await adminClient.from('unidades').insert({
      id: u2bId,
      gestor_id: idA,
      grupo_id: g1Id,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad Concurrente 2B ${runId}`,
      fotos: [],
    });
    assert.strictEqual(insU2bErr, null, `Error creando U2B: ${insU2bErr?.message}`);

    const alq2bId = crypto.randomUUID();
    trackedRentals.push(alq2bId);
    const { error: insAlq2bErr } = await adminClient.from('alquileres').insert({
      id: alq2bId,
      gestor_id: idA,
      unidad_id: u2bId,
      inquilino_id: inqId,
      modalidad: 'mensual',
      monto_total: 100000,
      estado: 'finalizado',
      fecha_inicio: '2026-10-01',
      fecha_fin: '2027-10-01',
      inicio_at: '2026-10-01T00:00:00Z',
      fin_at: '2027-10-01T00:00:00Z',
    });
    assert.strictEqual(insAlq2bErr, null, `Error creando Alquiler 2B en finalizado: ${insAlq2bErr?.message}`);

    // Sesión 1: Inicia transacción y ejecuta UPDATE a 'activo' (toma FOR SHARE vía trigger)
    await s1.query('BEGIN;');
    await s1.query(sqlAuthClaimsA);
    await s1.query(`UPDATE public.alquileres SET estado = 'activo' WHERE id = '${alq2bId}';`);
    console.log(' -> Sesión 1: Alquiler actualizado a activo en transacción abierta (FOR SHARE activo).');

    // Sesión 2: Intenta ejecutar public.archive_unidad real
    const archive2bSql = `
      BEGIN;
      ${sqlAuthClaimsA}
      SELECT public.archive_unidad('${u2bId}'::uuid);
      COMMIT;
    `;
    console.log(' -> Sesión 2: Enviando public.archive_unidad...');
    const execArchive2b = await s2.execAsync(archive2bSql);

    // Verificar bloqueo en pg_locks
    await verifyLockWait(sControl, s2.pid);
    console.log(' -> PASÓ: Sesión 2 (archive_unidad) acreditada en espera de bloqueo (pg_locks: NOT granted).');

    // Sesión 1 confirma el alquiler (COMMIT)
    await s1.query('COMMIT;');
    console.log(' -> Sesión 1: Transacción de activación confirmada (COMMIT).');

    // Sesión 2 se desbloquea: debe fallar con el error exacto de alquileres activos
    const resArchive2b = await execArchive2b.waitResult(5000);
    console.log(` -> Sesión 2 desbloqueada: ${resArchive2b.replace(/\n/g, ' ')}`);
    assert.ok(
      resArchive2b.includes('La unidad tiene alquileres activos y no se puede eliminar'),
      `Sesión 2 no falló con el error esperado. Salida: ${resArchive2b}`
    );
    await s2.query('ROLLBACK;');

    // Verificación en BD
    const { data: dbU2b, error: chkU2bErr } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u2bId).single();
    assert.strictEqual(chkU2bErr, null, chkU2bErr?.message);
    assert.strictEqual(dbU2b?.deleted_at, null, 'U2B NO debe haberse eliminado (deleted_at debe ser null)');
    const { data: dbAlq2b, error: chkAlq2bErr } = await adminClient.from('alquileres').select('id, estado').eq('id', alq2bId).single();
    assert.strictEqual(chkAlq2bErr, null, chkAlq2bErr?.message);
    assert.strictEqual(dbAlq2b?.estado, 'activo', 'Alquiler 2B debe persistir con estado activo');
    console.log(' -> PASÓ: Escenario 2B verificado (unidad intacta, alquiler activado persistido).');

    console.log('\n[CONCURRENCIA OK] Los 4 escenarios concurrentes de bloqueo verificados con éxito mediante pg_locks y public.archive_unidad real.');
  } catch (err) {
    testError = err;
    console.error('[TEST ERROR]', err);
  } finally {
    console.log('\n[CLEANUP] Cerrando sesiones, acreditando desaparición de PIDs y verificando ausencia física por IDs...');
    const cleanupErrors = [];

    // 1. CERRAR SESIONES Y COMPROBAR QUE SUS BACKENDS DESAPARECEN DE POSTGRESQL ANTES DE LIMPIAR FIXTURES
    for (const item of sessionPids) {
      try {
        await item.session.close();
        await verifyBackendClosed(item.session.pid);
      } catch (err) {
        cleanupErrors.push(`session_close_failure:${item.name}:${item.session.pid}:${err.message}`);
      }
    }

    // 2. Limpieza de Alquileres
    for (const alqId of trackedRentals) {
      const { error: delErr } = await adminClient.from('alquileres').delete().eq('id', alqId);
      if (delErr) cleanupErrors.push(`delete:alquileres:${alqId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('alquileres').select('id').eq('id', alqId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:alquileres:${alqId}:${chkErr.message}`);
      if (chk !== null) cleanupErrors.push(`residual:alquileres:${alqId}`);
    }

    // 3. Limpieza de Inquilinos
    for (const inqId of trackedInquilinos) {
      const { error: delErr } = await adminClient.from('inquilinos').delete().eq('id', inqId);
      if (delErr) cleanupErrors.push(`delete:inquilinos:${inqId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('inquilinos').select('id').eq('id', inqId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:inquilinos:${inqId}:${chkErr.message}`);
      if (chk !== null) cleanupErrors.push(`residual:inquilinos:${inqId}`);
    }

    // 4. Limpieza de Unidades
    for (const uId of trackedUnits) {
      const { error: delErr } = await adminClient.from('unidades').delete().eq('id', uId);
      if (delErr) cleanupErrors.push(`delete:unidades:${uId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('unidades').select('id').eq('id', uId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:unidades:${uId}:${chkErr.message}`);
      if (chk !== null) cleanupErrors.push(`residual:unidades:${uId}`);
    }

    // 5. Limpieza de Grupos
    for (const gId of trackedGroups) {
      const { error: delErr } = await adminClient.from('grupos').delete().eq('id', gId);
      if (delErr) cleanupErrors.push(`delete:grupos:${gId}:${delErr.message}`);
      const { data: chk, error: chkErr } = await adminClient.from('grupos').select('id').eq('id', gId).maybeSingle();
      if (chkErr) cleanupErrors.push(`check:grupos:${gId}:${chkErr.message}`);
      if (chk !== null) cleanupErrors.push(`residual:grupos:${gId}`);
    }

    // 6. Limpieza de Usuarios (public.users y auth.users) con validación estricta de ausencia en Auth
    for (const uId of [...trackedUsers].reverse()) {
      const { error: delErr } = await adminClient.from('users').delete().eq('id', uId);
      if (delErr) cleanupErrors.push(`delete:users:${uId}:${delErr.message}`);
      const { error: authErr } = await adminClient.auth.admin.deleteUser(uId);
      if (authErr) cleanupErrors.push(`delete:auth_users:${uId}:${authErr.message}`);

      const { data: chkUser, error: chkUserErr } = await adminClient.from('users').select('id').eq('id', uId).maybeSingle();
      if (chkUserErr) cleanupErrors.push(`check:users:${uId}:${chkUserErr.message}`);
      if (chkUser !== null) cleanupErrors.push(`residual:users:${uId}`);

      // VALIDACIÓN ESTRICTA DE AUSENCIA EN AUTH: aceptar únicamente 404 documentado
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

    console.log('[CLEANUP OK] Todos los backends cerrados, fixtures eliminados y ausencia física verificada por IDs exactos.');
  }
}

runConcurrencyProof().catch(err => {
  console.error('[FATAL]', err);
  process.exitCode = 1;
});
