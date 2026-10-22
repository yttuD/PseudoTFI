// Read-only diagnostic for one PUBLIC Rendo listing; no auth, writes or private fields.
// Output has amounts / duration only. Never output UUIDs, contact details or full API responses.
const endpoint = new URL('https://rendo-beta-api.vercel.app/marketplace/unidades');
endpoint.searchParams.set('q', 'CASA Zona norte');
endpoint.searchParams.set('locale','es');
endpoint.searchParams.set('limit','50');

const get = async (url) => {
  const res = await fetch(url, { method:'GET', cache:'no-store', headers:{ Accept:'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('PUBLIC_HTTP_' + res.status);
  return res.json();
};
const list = await get(endpoint);
const rows = Array.isArray(list.data) ? list.data : Array.isArray(list) ? list : [];
const matches = rows.filter(x => String(x.titulo || '').trim().toLocaleLowerCase('es') === 'casa zona norte');
console.log('PUBLIC_TITLE_EXACT_MATCHES=' + matches.length);
if (matches.length !== 1) throw new Error('Expected one exact matching published unit');
const unit = matches[0];
const detail = await get(new URL('https://rendo-beta-api.vercel.app/marketplace/unidades/' + encodeURIComponent(unit.id)));
const tariffs = detail.modalidades_precio;
if (!Array.isArray(tariffs)) throw new Error('Detail missing tariffs');
if (tariffs.length > 30) throw new Error('Unexpected number of public tariffs');
console.log('PUBLIC_ACTIVE_TARIFFS=' + tariffs.length);
const groups = new Map();
for (const m of tariffs) {
  const values = [
    String(m.unidad_tiempo ?? ''), String(m.cantidad_tiempo ?? ''),
    String(m.precio ?? ''), String(m.precio_usd ?? ''), String(m.precio_brl ?? ''),
  ];
  const key = JSON.stringify(values);
  groups.set(key, (groups.get(key) || 0) + 1);
}
for (const [key, count] of groups) {
  const [period,minDuration,ars,usd,brl] = JSON.parse(key);
  console.log('TARIFF_GROUP=' + JSON.stringify({period,minDuration,ars,usd,brl,count,extraRows:Math.max(0,count-1)}));
}
console.log('IDENTICAL_EXTRA_ROWS=' + [...groups.values()].reduce((s,n)=>s + Math.max(0,n-1),0));
