import { createClient } from '@supabase/supabase-js';

const betaUrl = 'https://maeiuaketocznpogmtic.supabase.co';
const apply = process.argv.includes('--apply');
const env = process.env;

if (env.SUPABASE_URL !== betaUrl || env.RENDO_BETA_MODE !== 'true' ||
    !env.SUPABASE_SERVICE_ROLE_KEY || !env.DEEPL_AUTH_KEY?.endsWith(':fx')) {
  throw new Error('Backfill permitido solo para Supabase beta Rendo con DeepL API Free.');
}

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: units, error } = await db.from('unidades')
  .select('id,titulo_es,descripcion_es,titulo_en,descripcion_en,titulo_pt,descripcion_pt')
  .eq('estado', 'publicada').is('deleted_at', null).limit(100);
if (error) throw new Error(`No se pudo consultar el catálogo beta: ${error.code || 'unknown'}`);
if (!units || units.length > 25) throw new Error('Volumen inesperado; revisar manualmente antes del backfill.');

const needsTranslation = (value, lang) => value == null || value.trim() === '' || value.startsWith(`[${lang}] `);
const candidates = [];
for (const unit of units) {
  for (const lang of ['en', 'pt']) {
    const fields = [
      ['titulo', unit.titulo_es, unit[`titulo_${lang}`]],
      ['descripcion', unit.descripcion_es, unit[`descripcion_${lang}`]],
    ].filter(([, source, current]) => typeof source === 'string' && source.trim() && needsTranslation(current, lang));
    if (fields.length) candidates.push({ unit, lang, fields });
  }
}

console.log(`Catálogo beta: ${units.length} unidades; ${candidates.length} pares unidad/idioma pendientes; ${candidates.reduce((sum, c) => sum + c.fields.length, 0)} campos. Modo: ${apply ? 'APLICAR' : 'SIMULACRO'}.`);
if (!apply) process.exit(0);

let updated = 0;
let skipped = 0;
for (const { unit, lang, fields } of candidates) {
  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${env.DEEPL_AUTH_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: fields.map(([, source]) => source),
      source_lang: 'ES',
      target_lang: lang === 'pt' ? 'PT-BR' : 'EN-US',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`DeepL respondió HTTP ${response.status}; backfill interrumpido.`);
  const payload = await response.json();
  const translated = payload?.translations;
  if (!Array.isArray(translated) || translated.length !== fields.length ||
      translated.some((item) => typeof item.text !== 'string' || !item.text.trim())) {
    throw new Error('DeepL devolvió una respuesta incompleta; backfill interrumpido.');
  }

  const patch = Object.fromEntries(fields.map(([base], index) => [`${base}_${lang}`, translated[index].text]));
  let query = db.from('unidades').update(patch).eq('id', unit.id)
    .eq('estado', 'publicada').is('deleted_at', null);
  for (const [base, source, current] of fields) {
    query = query.eq(`${base}_es`, source);
    query = current == null ? query.is(`${base}_${lang}`, null) : query.eq(`${base}_${lang}`, current);
  }
  const result = await query.select('id');
  if (result.error) throw new Error(`Error al actualizar traducción: ${result.error.code || 'unknown'}`);
  if (result.data?.length === 1) updated += fields.length;
  else skipped += fields.length; // Concurrent edit or changed source: never overwrite it.
}

console.log(`Campos traducidos: ${updated}; omitidos por cambio concurrente: ${skipped}. No se modificaron textos manuales.`);
