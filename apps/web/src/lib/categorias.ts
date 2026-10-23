export const CATEGORIAS_UNIDAD = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'cabaña', label: 'Cabaña' },
  { value: 'casa', label: 'Casa' },
  { value: 'salón', label: 'Salón de Eventos' },
  { value: 'cancha', label: 'Cancha' },
  { value: 'local comercial', label: 'Local Comercial' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'lote', label: 'Lote / Terreno' },
] as const;

/**
 * Display-only category labels for the public catalog.
 * Persisted/API values remain unchanged, including accented IDs.
 */
const CATEGORY_LABELS: Record<string, Record<'es' | 'en' | 'pt', string>> = {
  departamento: { es: 'Departamento', en: 'Apartment', pt: 'Apartamento' },
  cabaña: { es: 'Cabaña', en: 'Cabin', pt: 'Cabana' },
  casa: { es: 'Casa', en: 'House', pt: 'Casa' },
  salón: { es: 'Salón de Eventos', en: 'Event venue', pt: 'Salão de eventos' },
  cancha: { es: 'Cancha', en: 'Sports court', pt: 'Quadra esportiva' },
  'local comercial': { es: 'Local Comercial', en: 'Commercial space', pt: 'Espaço comercial' },
  oficina: { es: 'Oficina', en: 'Office', pt: 'Escritório' },
  lote: { es: 'Lote / Terreno', en: 'Lot / Land', pt: 'Lote / Terreno' },
};

export function categoriaLabel(value: string | null | undefined, locale = 'es'): string {
  const language: 'es' | 'en' | 'pt' = locale === 'en' || locale === 'pt' ? locale : 'es';
  if (!value) return { es: 'Sin categoría', en: 'Uncategorized', pt: 'Sem categoria' }[language];
  return CATEGORY_LABELS[value.toLowerCase()]?.[language] || value;
}
