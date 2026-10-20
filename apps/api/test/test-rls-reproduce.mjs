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

// Exigir entorno válido sin claves literales ni alternativas ||
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !JWT_SECRET) {
  throw new Error('ENTORNO_INVALIDO: Se requieren SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_JWT_SECRET');
}

// Exigir destino local
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

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function reproduce() {
  const runId = `rls_reproduce_${Date.now()}`;
  let gestorId = null;
  const trackedUnits = [];

  try {
    // 1. Crear fixture de usuario gestor con contraseña aleatoria en memoria
    const randomPassword = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: `${runId}@test.local`,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { role: 'gestor', rol: 'gestor', full_name: `Gestor Reproduce ${runId}` },
    });
    assert.strictEqual(authError, null, `Error creando usuario de prueba: ${authError?.message}`);
    assert.ok(authData?.user?.id, 'authData.user.id debe existir');
    gestorId = authData.user.id;

    const { error: profileError } = await adminClient
      .from('users')
      .update({ rol: 'gestor', full_name: `Gestor Reproduce ${runId}`, cupo_maximo: 10 })
      .eq('id', gestorId);
    assert.strictEqual(profileError, null, `Error actualizando perfil: ${profileError?.message}`);

    const token = signJwt(
      {
        sub: gestorId,
        role: 'authenticated',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET
    );

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // 2. Test 1: INSERT sin .select() (INSERT ONLY) -> debe tener éxito
    // Tracking previo del ID antes del insert
    const unitId1 = crypto.randomUUID();
    trackedUnits.push(unitId1);

    const res1 = await client.from('unidades').insert({
      id: unitId1,
      gestor_id: gestorId,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Unidad Test Sin Returning ${runId}`,
      fotos: [],
    });

    assert.strictEqual(res1.error, null, `Test 1 no debe tener error en INSERT puro: ${res1.error?.message}`);
    assert.strictEqual(res1.status, 201, `Test 1 debe retornar HTTP 201 Created (recibido: ${res1.status})`);

    // 3. Test 2: INSERT con .select().single() (INSERT ... RETURNING *) bajo política original -> debe fallar por RLS SELECT
    // Tracking previo del ID antes del insert
    const unitId2 = crypto.randomUUID();
    trackedUnits.push(unitId2);

    const res2 = await client
      .from('unidades')
      .insert({
        id: unitId2,
        gestor_id: gestorId,
        categoria: 'departamento',
        estado: 'borrador',
        titulo_es: `Unidad Test Con Returning ${runId}`,
        fotos: [],
      })
      .select()
      .single();

    if (!res2.error) {
      assert.fail('Test 2 debio fallar por RLS SELECT pero la insercion tuvo exito');
    }

    // Comprobar que la denegacion es estrictamente por politica RLS y no error cualquiera
    assert.strictEqual(res2.status, 403, `Test 2 debe denegar con HTTP 403 Forbidden (recibido: ${res2.status})`);
    assert.strictEqual(res2.data, null, 'Test 2 no debe retornar datos al ser denegado');
    assert.ok(
      res2.error.message.includes('row-level security policy') || res2.error.code === '42501',
      `Test 2 error debe ser violacion de RLS (recibido: [${res2.error.code}] ${res2.error.message})`
    );

    // Comprobar no persistencia de unitId2 en BD tras fallo validando status, error y resultado vacío
    const checkUnit2Res = await adminClient.from('unidades').select('id').eq('id', unitId2);
    assert.strictEqual(checkUnit2Res.status, 200, 'La comprobación posterior debe responder HTTP 200');
    assert.strictEqual(checkUnit2Res.error, null, `La comprobación posterior no debe tener error: ${checkUnit2Res.error?.message}`);
    assert.ok(Array.isArray(checkUnit2Res.data), 'La comprobación posterior debe retornar un array');
    assert.strictEqual(checkUnit2Res.data.length, 0, 'unitId2 no debió persistir en BD tras la denegación de RLS en RETURNING (resultado vacío)');

    // 4. Test 3: SELECT de unitId1 creada en Test 1 -> la fila ya existe y can_read_unidad la encuentra
    const res3 = await client.from('unidades').select('id, titulo_es').eq('id', unitId1).single();
    assert.strictEqual(res3.error, null, `Test 3 no debe tener error al leer unidad existente: ${res3.error?.message}`);
    assert.strictEqual(res3.status, 200, `Test 3 debe retornar HTTP 200 OK (recibido: ${res3.status})`);
    assert.strictEqual(res3.data.id, unitId1, 'Test 3 debe devolver el id correcto');
    assert.strictEqual(res3.data.titulo_es, `Unidad Test Sin Returning ${runId}`);

    console.log('[REPRODUCE_OK] Aislamiento reproducido exitosamente: INSERT puro funciona (201), INSERT con RETURNING falla por RLS SELECT (403), SELECT posterior funciona (200).');
  } finally {
    // Limpieza resiliente acumulando fallos y verificando ausencia contractual
    const cleanupErrors = [];

    if (trackedUnits.length > 0) {
      for (const uid of trackedUnits) {
        const { error: delUnitsErr } = await adminClient.from('unidades').delete().eq('id', uid);
        if (delUnitsErr) {
          cleanupErrors.push({ stage: 'unit_delete', id: uid, error: delUnitsErr.message });
        }
      }

      // Comprobar ausencia contractual
      const { data: remainingUnits, error: checkUnitsErr, status: checkUnitsStatus } = await adminClient
        .from('unidades')
        .select('id')
        .in('id', trackedUnits);
      if (checkUnitsErr || checkUnitsStatus !== 200) {
        cleanupErrors.push({ stage: 'unit_absence_check_infrastructure_error', error: checkUnitsErr?.message || `HTTP ${checkUnitsStatus}` });
      } else if (remainingUnits && remainingUnits.length > 0) {
        cleanupErrors.push({ stage: 'unit_absence_residual', remaining: remainingUnits });
      }
    }

    if (gestorId) {
      const { error: delProfileErr } = await adminClient.from('users').delete().eq('id', gestorId);
      if (delProfileErr) {
        cleanupErrors.push({ stage: 'user_profile_delete', id: gestorId, error: delProfileErr.message });
      }

      const { error: delUserErr } = await adminClient.auth.admin.deleteUser(gestorId);
      if (delUserErr) {
        cleanupErrors.push({ stage: 'user_auth_delete', id: gestorId, error: delUserErr.message });
      }

      // Comprobar ausencia contractual del usuario
      const { data: checkUser, error: checkUserErr } = await adminClient.auth.admin.getUserById(gestorId);
      const isAbsent =
        (checkUser?.user === null && !checkUserErr) ||
        (checkUserErr && checkUserErr.status === 404) ||
        (checkUserErr && checkUserErr.message && checkUserErr.message.toLowerCase().includes('not found'));
      if (!isAbsent) {
        cleanupErrors.push({ stage: 'user_absence_residual', id: gestorId, error: checkUserErr?.message || 'Usuario aún presente' });
      }
    }

    if (cleanupErrors.length > 0) {
      console.error('[CLEANUP_FAILURES]', cleanupErrors);
      throw new Error(`Limpieza falló con errores: ${JSON.stringify(cleanupErrors)}`);
    }
  }
}

reproduce().catch(err => {
  console.error('[FATAL_ERROR]', err);
  process.exitCode = 1;
});
