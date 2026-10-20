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

export function categoriaLabel(value: string | null | undefined): string {
  if (!value) return 'Sin categoría';
  return CATEGORIAS_UNIDAD.find((item) => item.value === value.toLowerCase())?.label || value;
}
