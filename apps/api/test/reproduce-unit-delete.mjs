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

async function runDiagnosis() {
  const runId = `diag_del_${Date.now()}`;
  let gestorId = null;
  const trackedUnits = [];
  const results = {};

  try {
    // 1. Crear Gestor
    const password = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: `${runId}@test.local`,
      password,
      email_confirm: true,
      user_metadata: { role: 'gestor', rol: 'gestor', full_name: `Gestor Diag ${runId}` },
    });
    assert.strictEqual(authErr, null, authErr?.message);
    gestorId = authData.user.id;

    await adminClient.from('users').update({ rol: 'gestor', full_name: `Gestor Diag ${runId}` }).eq('id', gestorId);

    const token = signJwt(
      { sub: gestorId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
      JWT_SECRET
    );

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // 2. Crear Unidad 1 para probar UPDATE sin .select()
    const u1Id = crypto.randomUUID();
    trackedUnits.push(u1Id);
    const { error: ins1Err } = await adminClient.from('unidades').insert({
      id: u1Id,
      gestor_id: gestorId,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Diag U1 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(ins1Err, null, ins1Err?.message);

    // TEST A: UPDATE sin .select() (Solo UPDATE)
    console.log('--- TEST A: UPDATE sin .select() ---');
    const isoDateA = new Date().toISOString();
    const resUpdateOnly = await client
      .from('unidades')
      .update({ deleted_at: isoDateA })
      .eq('id', u1Id);

    results.testA = {
      status: resUpdateOnly.status,
      error: resUpdateOnly.error,
      count: resUpdateOnly.count,
    };
    console.log('Test A resUpdateOnly:', JSON.stringify(results.testA, null, 2));

    // Verificar en BD si se persistió deleted_at
    const { data: checkU1 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u1Id).single();
    results.testA_persisted = checkU1;
    console.log('Test A checkU1 in DB:', JSON.stringify(checkU1, null, 2));

    // 3. Crear Unidad 2 para probar UPDATE con .select().single() (como hace unidades.service.ts actual)
    const u2Id = crypto.randomUUID();
    trackedUnits.push(u2Id);
    const { error: ins2Err } = await adminClient.from('unidades').insert({
      id: u2Id,
      gestor_id: gestorId,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Diag U2 ${runId}`,
      fotos: [],
    });
    assert.strictEqual(ins2Err, null, ins2Err?.message);

    // TEST B: UPDATE con .select().single()
    console.log('--- TEST B: UPDATE con .select().single() ---');
    const isoDateB = new Date().toISOString();
    const resUpdateSelectSingle = await client
      .from('unidades')
      .update({ deleted_at: isoDateB })
      .eq('id', u2Id)
      .select()
      .single();

    results.testB = {
      status: resUpdateSelectSingle.status,
      data: resUpdateSelectSingle.data,
      error: resUpdateSelectSingle.error,
    };
    console.log('Test B resUpdateSelectSingle:', JSON.stringify(results.testB, null, 2));

    // Verificar en BD si se persistió deleted_at para u2
    const { data: checkU2 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u2Id).single();
    results.testB_persisted = checkU2;
    console.log('Test B checkU2 in DB:', JSON.stringify(checkU2, null, 2));

    // 4. Crear Unidad 3 para probar UPDATE con .select() sin .single()
    const u3Id = crypto.randomUUID();
    trackedUnits.push(u3Id);
    await adminClient.from('unidades').insert({
      id: u3Id,
      gestor_id: gestorId,
      categoria: 'departamento',
      estado: 'borrador',
      titulo_es: `Diag U3 ${runId}`,
      fotos: [],
    });

    console.log('--- TEST C: UPDATE con .select() array ---');
    const isoDateC = new Date().toISOString();
    const resUpdateSelectArray = await client
      .from('unidades')
      .update({ deleted_at: isoDateC })
      .eq('id', u3Id)
      .select();

    results.testC = {
      status: resUpdateSelectArray.status,
      data: resUpdateSelectArray.data,
      error: resUpdateSelectArray.error,
    };
    console.log('Test C resUpdateSelectArray:', JSON.stringify(results.testC, null, 2));

    const { data: checkU3 } = await adminClient.from('unidades').select('id, deleted_at').eq('id', u3Id).single();
    results.testC_persisted = checkU3;
    console.log('Test C checkU3 in DB:', JSON.stringify(checkU3, null, 2));

    console.log('--- RESUMEN DIAGNÓSTICO ---');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    for (const uid of trackedUnits) {
      await adminClient.from('unidades').delete().eq('id', uid);
    }
    if (gestorId) {
      await adminClient.from('users').delete().eq('id', gestorId);
      await adminClient.auth.admin.deleteUser(gestorId);
    }
  }
}

runDiagnosis().catch(e => {
  console.error('FATAL:', e);
  process.exitCode = 1;
});
