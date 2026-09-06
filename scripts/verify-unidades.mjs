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
  console.log("Header:", Buffer.from(token.split('.')[0], 'base64').toString());
  console.log("Payload:", Buffer.from(token.split('.')[1], 'base64').toString());

  console.log("\n=== 0. GET /cupo con JWT ===");
  const resCupo = await fetchApi('/cupo', 'GET', null, token);
  console.log(`Status: ${resCupo.status}`);
  if (resCupo.status === 200) {
    console.log(`-> Respuesta de servidor:`, JSON.stringify(resCupo.data));
  }

  console.log("\n=== 1. Crear 3 Unidades (Llenar Cupo) ===");
  let unidadIds = [];
  for (let i = 0; i < 3; i++) {
    const res = await fetchApi('/unidades', 'POST', {
      categoria: 'departamento',
      atributos: {}
    }, token);
    console.log(`Unidad ${i+1} Status: ${res.status}`);
    if (res.status === 201) {
      unidadIds.push(res.data.id);
    }
  }

  console.log("\n=== 2. Intentar crear 4ta Unidad (Exceder Cupo) ===");
  const resExtra = await fetchApi('/unidades', 'POST', {
    categoria: 'departamento',
    atributos: {}
  }, token);
  console.log(`Status: ${resExtra.status}`);
  console.log(`-> Mensaje: ${resExtra.data.message || resExtra.data.error}`);

  console.log("\n=== 3. Archivar una Unidad para liberar cupo ===");
  const resArchivar = await fetchApi(`/unidades/${unidadIds[0]}/estado`, 'PATCH', { estado: 'archivada' }, token);
  console.log(`Status: ${resArchivar.status}`);
  
  console.log("\n=== 4. Crear nueva Unidad con cupo liberado ===");
  const resLiberado = await fetchApi('/unidades', 'POST', {
    categoria: 'departamento',
    atributos: {}
  }, token);
  console.log(`Status: ${resLiberado.status}`);
  if (resLiberado.status === 201) {
    console.log("-> Unidad creada exitosamente");
  }

  console.log("\n=== 5. GET /unidades sin JWT ===");
  const resNoAuth = await fetchApi('/unidades', 'GET', null, null);
  console.log(`Status: ${resNoAuth.status}`);
  console.log(`-> Mensaje: ${resNoAuth.data.message}`);

  console.log("\n=== 6. GET /marketplace/unidades (sin auth, lista vacía) ===");
  const mkt1 = await fetchApi('/marketplace/unidades', 'GET', null, null);
  console.log(`Status: ${mkt1.status}, data.length: ${mkt1.data.data.length}`);

  console.log("\n=== 7. PATCH /unidades/:id (completar info marketplace) ===");
  const patchMkt = await fetchApi(`/unidades/${unidadIds[1]}`, 'PATCH', {
    titulo_es: 'Departamento de lujo',
    fotos: ['https://ejemplo.com/foto1.jpg', 'https://ejemplo.com/foto2.jpg'],
    ubicacion_aprox: { lat: -29.144, lng: -59.264 },
    ubicacion_exacta: { lat: -29.1445, lng: -59.2645 },
    whatsapp: '3777123456'
  }, token);
  console.log(`Status: ${patchMkt.status}`);
  
  console.log("\n=== 8. PATCH /unidades/:id/estado (publicada) ===");
  const patchPub = await fetchApi(`/unidades/${unidadIds[1]}/estado`, 'PATCH', { estado: 'publicada' }, token);
  console.log(`Status: ${patchPub.status}`);
  if (patchPub.status !== 200) {
    console.log(`-> Mensaje: ${patchPub.data.message || patchPub.data.error}`);
  }

  console.log("\n=== 9. GET /marketplace/unidades (publicada con ubicacion_exacta null) ===");
  const mkt2 = await fetchApi('/marketplace/unidades', 'GET', null, null);
  console.log(`Status: ${mkt2.status}`);
  if (mkt2.data.data.length > 0) {
    console.log(`-> ubicacion_exacta: ${mkt2.data.data[0].ubicacion_exacta}`);
  }
  
  console.log("\n=== 10. GET /marketplace/unidades/:id con JWT (incluye ubicacion_exacta) ===");
  const mkt3 = await fetchApi(`/marketplace/unidades/${unidadIds[1]}`, 'GET', null, token);
  console.log(`Status: ${mkt3.status}`);
  console.log(`-> ubicacion_exacta:`, mkt3.data.ubicacion_exacta);

  console.log("\n=== 11. GET /marketplace/unidades/:id sin JWT (ubicacion_exacta null) ===");
  const mkt4 = await fetchApi(`/marketplace/unidades/${unidadIds[1]}`, 'GET', null, null);
  console.log(`Status: ${mkt4.status}`);
  console.log(`-> ubicacion_exacta: ${mkt4.data.ubicacion_exacta}`);

  console.log("\n=== 13. POST /favoritos { unidad_id } con JWT ===");
  const fav1 = await fetchApi('/favoritos', 'POST', { unidad_id: unidadIds[1] }, token);
  console.log(`Status: ${fav1.status}`);

  console.log("\n=== 14. POST /favoritos { unidad_id } de nuevo ===");
  const fav2 = await fetchApi('/favoritos', 'POST', { unidad_id: unidadIds[1] }, token);
  console.log(`Status: ${fav2.status}`);

  console.log("\n=== 15. GET /favoritos ===");
  const favList = await fetchApi('/favoritos', 'GET', null, token);
  console.log(`Status: ${favList.status}, cantidad: ${favList.data.length}`);
  
  console.log("\n=== 16. DELETE /favoritos/:unidad_id ===");
  const delFav = await fetchApi(`/favoritos/${unidadIds[1]}`, 'DELETE', null, token);
  console.log(`Status: ${delFav.status}`);

  console.log("\n=== 17. GET /favoritos (vacío) ===");
  const favList2 = await fetchApi('/favoritos', 'GET', null, token);
  console.log(`Status: ${favList2.status}, cantidad: ${favList2.data.length}`);

  console.log("\n=== 18. POST /reportes { unidad_id } ===");
  const rep1 = await fetchApi('/reportes', 'POST', { unidad_id: unidadIds[1] }, token);
  console.log(`Status: ${rep1.status}`);

  console.log("\n=== 19. POST /reportes { unidad_id } de nuevo ===");
  const rep2 = await fetchApi('/reportes', 'POST', { unidad_id: unidadIds[1] }, token);
  console.log(`Status: ${rep2.status}`);
}

runTest();
