export type RentalModality = 'mensual' | 'diaria' | 'por_hora';
export type RentalSeñaChoice = 'sin_sena' | 'heredar_grupo' | 'personalizada';
export type SeñaTipo = 'porcentaje' | 'monto_fijo';

export interface RentalInterval {
  inicio_at: string; // ISO 8601 UTC timestamp
  fin_at: string;    // ISO 8601 UTC timestamp
}

export interface RentalCalculationSummary {
  modalidad: RentalModality;
  unidadesTiempo: number;
  tarifaBase: number;
  montoTotal: number;
  senaEleccion: RentalSeñaChoice;
  senaTipo?: SeñaTipo;
  senaValor?: number;
  montoSenaCalculado: number;
  senaOrigenGrupoId?: string | null;
  senaOrigenGrupoNombre?: string | null;
  saldoPendiente: number;
}

/**
 * Normalizes documented aliases to canonical RentalModality.
 * Returns null for any unknown/unsupported values (never silently normalizes to mensual).
 */
export function normalizeModality(raw?: string | null): RentalModality | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === 'mensual' || s === 'mes') return 'mensual';
  if (s === 'diaria' || s === 'diario' || s === 'día' || s === 'dia') return 'diaria';
  if (s === 'por_hora' || s === 'hora' || s === 'horario') return 'por_hora';
  return null;
}

/**
 * Returns the calendar date YYYY-MM-DD in America/Argentina/Buenos_Aires timezone.
 */
export function getBuenosAiresCalendarDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Converts legacy date-only rows (fecha_inicio, fecha_fin) into half-open intervals [start, end)
 * in America/Argentina/Buenos_Aires timezone.
 * Inclusive fecha_fin is interpreted as the next Buenos Aires midnight so that the last occupied day is never truncated.
 */
export function parseBuenosAiresLegacyInterval(
  fechaInicio: string | Date,
  fechaFin: string | Date,
): { start: Date; end: Date } {
  const startStr = typeof fechaInicio === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)
    ? fechaInicio
    : getBuenosAiresCalendarDate(fechaInicio);
  const endStr = typeof fechaFin === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaFin)
    ? fechaFin
    : getBuenosAiresCalendarDate(fechaFin);

  const [sy, sm, sd] = startStr.split('-').map(Number);
  // 00:00:00 in ART (UTC-3) -> 03:00:00 UTC
  const start = new Date(Date.UTC(sy, sm - 1, sd, 3, 0, 0, 0));

  const [ey, em, ed] = endStr.split('-').map(Number);
  // Next midnight in ART: (day + 1) at 00:00:00 ART -> 03:00:00 UTC
  const end = new Date(Date.UTC(ey, em - 1, ed + 1, 3, 0, 0, 0));

  return { start, end };
}

/**
 * Checks if a candidate half-open interval [startA, endA) strictly overlaps [startB, endB).
 * Adjacency (startA == endB or endA == startB) is non-overlapping.
 */
export function intervalsOverlap(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();
  return sA < eB && eA > sB;
}
