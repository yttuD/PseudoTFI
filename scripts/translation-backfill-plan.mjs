// Pure catalog planner. No network or database imports; safe to unit-test.
export const SUPPORTED_LOCALES = ['en', 'pt'];

export function needsTranslation(source, current, locale) {
  if (typeof source !== 'string' || !source.trim()) return false;
  if (current == null || (typeof current === 'string' && !current.trim())) return true;
  if (typeof current !== 'string') return false;
  // Only replace an exact legacy placeholder. A manually edited string such
  // as "[en] My own copy" is not proof of disposable generated text.
  return current.trim() === `[${locale}] ${source.trim()}`;
}

export function planMissingTranslations(units) {
  if (!Array.isArray(units) || units.length > 25) {
    throw new Error('Volumen de unidades inesperado: revisión manual requerida.');
  }
  const candidates = [];
  const seenIds = new Set();
  for (const unit of units) {
    if (typeof unit?.id !== 'string' || !unit.id.trim()) {
      throw new Error('El catálogo tiene una unidad sin identificador válido');
    }
    if (seenIds.has(unit.id)) {
      throw new Error('El catálogo contiene identificadores de unidad duplicados');
    }
    seenIds.add(unit.id);
    for (const locale of SUPPORTED_LOCALES) {
      const fields = [];
      for (const base of ['titulo', 'descripcion']) {
        const source = unit[`${base}_es`];
        const current = unit[`${base}_${locale}`];
        if (needsTranslation(source, current, locale)) {
          fields.push([base, source, current]);
        }
      }
      if (fields.length) candidates.push({ unit, lang: locale, fields });
    }
  }
  return candidates;
}

export function summarizeTranslationPlan(units, candidates) {
  return {
    unidadesPublicadas: units.length,
    paresPendientes: candidates.length,
    camposPendientes: candidates.reduce((sum, item) => sum + item.fields.length, 0),
  };
}
