import { createClient } from '@supabase/supabase-js';
import { planMissingTranslations, summarizeTranslationPlan } from './translation-backfill-plan.mjs';

const betaUrl = 'https://maeiuaketocznpogmtic.supabase.co';
const apply = process.argv.includes('--apply');
const env = process.env;

// Even a dry run requires a read-only catalog query via service role, but
// never requires a paid translator API key or enables database mutation.
if (env.SUPABASE_URL !== betaUrl || env.RENDO_BETA_MODE !== 'true' ||
    !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Inventario permitido exclusivamente para Supabase beta Rendo.');
}
if (apply && (
  !env.DEEPL_AUTH_KEY?.endsWith(':fx') ||
  env.RENDO_TRANSLATION_BACKFILL_APPROVED !== 'true' ||
  !process.argv.includes('--confirm-published-data-write')
)) {
  throw new Error('Aplicar exige DeepL Free, aprobación explícita y confirmación de escritura publicada.');
}
if (process.argv.some(arg => arg.startsWith('--') &&
    !['--apply','--confirm-published-data-write'].includes(arg))) {
  throw new Error('Argumento no reconocido: no se ha ejecutado ninguna operación.');
}

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: units, error } = await db.from('unidades')
  .select('id,titulo_es,descripcion_es,titulo_en,descripcion_en,titulo_pt,descripcion_pt')
  .eq('estado', 'publicada').is('deleted_at', null).limit(100);
if (error) throw new Error(`No se pudo consultar el catálogo beta: ${error.code || 'unknown'}`);
if (!units || units.length > 25) throw new Error('Volumen inesperado; revisar manualmente antes del backfill.');

const candidates = planMissingTranslations(units);
const summary = summarizeTranslationPlan(units, candidates);
console.log(`Catálogo beta: ${summary.unidadesPublicadas} unidades; ${summary.paresPendientes} pares unidad/idioma pendientes; ${summary.camposPendientes} campos. Modo: ${apply ? 'APLICAR' : 'SIMULACRO SOLO LECTURA'}.`);
// Do not log unit IDs, source text, content or user information in shared CI.
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
