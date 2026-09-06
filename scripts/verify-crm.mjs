import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_URL = 'http://127.0.0.1:3005';

if (!SUPABASE_ANON_KEY) {
  console.error("Please run this with NEXT_PUBLIC_SUPABASE_ANON_KEY set in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchApi(path, method = 'GET', body = null, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return { status: res.status, data: json };
}

async function runTest() {
  console.log("\n=== Autenticando (Mock OTP) ===");
  const phone = '+541112345678';
  
  await supabase.auth.signInWithOtp({ phone, options: { data: { full_name: 'Gestor Test' } } });
  const { data: verifyData } = await supabase.auth.verifyOtp({ phone, token: '123456', type: 'sms' });
  const token = verifyData.session?.access_token;
  
  if (!token) {
    console.error("No se pudo obtener JWT");
    process.exit(1);
  }

  // Crear Unidad para el Alquiler
  console.log("\n=== 1. Obtener Unidad para el CRM ===");
  const resUnidades = await fetchApi('/unidades', 'GET', null, token);
  const unidadId = resUnidades.data.data[0].id;
  console.log(`Unidad ID: ${unidadId}`);

  console.log("\n=== 2. Crear Inquilino ===");
  const resInquilino = await fetchApi('/inquilinos', 'POST', {
    nombre_completo: 'Inquilino de Prueba',
    email: 'inquilino@prueba.com',
    telefono: '123456789'
  }, token);
  console.log(`Status: ${resInquilino.status}`);
  const inquilinoId = resInquilino.data.id;

  console.log("\n=== 3. Crear Alquiler ===");
  const resAlquiler = await fetchApi('/alquileres', 'POST', {
    unidad_id: unidadId,
    inquilino_id: inquilinoId,
    fecha_inicio: '2026-10-01',
    fecha_fin: '2027-10-01',
    monto_total: 1200000
  }, token);
  console.log(`Status: ${resAlquiler.status}`);

  console.log("\n=== 4. Test error: fecha_fin < fecha_inicio ===");
  const resAlquilerError = await fetchApi('/alquileres', 'POST', {
    unidad_id: unidadId,
    inquilino_id: inquilinoId,
    fecha_inicio: '2026-10-01',
    fecha_fin: '2025-10-01',
    monto_total: 1200000
  }, token);
  console.log(`Status: ${resAlquilerError.status}`);
  console.log(`Mensaje: ${resAlquilerError.data.message}`);

  console.log("\n=== 5. Test error: unidad_id inválido ===");
  const resAlquilerErrorUnidad = await fetchApi('/alquileres', 'POST', {
    unidad_id: '00000000-0000-0000-0000-000000000000',
    inquilino_id: inquilinoId,
    fecha_inicio: '2026-10-01',
    fecha_fin: '2027-10-01',
    monto_total: 1200000
  }, token);
  console.log(`Status: ${resAlquilerErrorUnidad.status}`);
  console.log(`Mensaje: ${resAlquilerErrorUnidad.data.message}`);

  console.log("\n=== 6. Listar Inquilinos ===");
  const resListInq = await fetchApi('/inquilinos', 'GET', null, token);
  console.log(`Status: ${resListInq.status}, Cantidad: ${resListInq.data.data.length}`);

  console.log("\n=== 7. Listar Alquileres Globales ===");
  const resListAlq = await fetchApi('/alquileres', 'GET', null, token);
  console.log(`Status: ${resListAlq.status}, Cantidad: ${resListAlq.data.data.length}`);

  console.log("\n=== 8. Listar Alquileres de Unidad ===");
  const resListAlqUnidad = await fetchApi(`/unidades/${unidadId}/alquileres`, 'GET', null, token);
  console.log(`Status: ${resListAlqUnidad.status}, Cantidad: ${resListAlqUnidad.data.length}`);
}

runTest();
