/**
 * Read-only presentation deduplication. Never deletes or changes persisted
 * modalities: rental history and the manager's editable rows remain intact.
 * A different minimum duration, currency price or period is a distinct offer.
 */
export type PublicTariff = {
  id: string;
  unidad_tiempo: string;
  cantidad_tiempo?: number | null;
  precio: number;
  precio_usd?: number | null;
  precio_brl?: number | null;
};

function numericKey(value: number | null | undefined): number | null {
  return value == null ? null : Number(value);
}

export function uniquePublicTariffs<T extends PublicTariff>(tariffs: readonly T[]): T[] {
  const seen = new Set<string>();
  return tariffs.filter((tariff) => {
    const key = JSON.stringify([
      String(tariff.unidad_tiempo ?? 'día').trim().toLowerCase(),
      numericKey(tariff.cantidad_tiempo ?? 1),
      numericKey(tariff.precio),
      numericKey(tariff.precio_usd),
      numericKey(tariff.precio_brl),
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type MinimumPeriod = 'minimumNights' | 'minimumMonths' | 'minimumHours';

export function minimumPeriodKey(period: string): MinimumPeriod {
  const normalized = String(period ?? 'día').trim().toLowerCase();
  if (normalized === 'mes' || normalized === 'mensual') return 'minimumMonths';
  if (normalized === 'hora') return 'minimumHours';
  return 'minimumNights';
}

export function minimumDuration(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? value
    : 1;
}
