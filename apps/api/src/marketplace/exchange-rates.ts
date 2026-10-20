import { ServiceUnavailableException } from '@nestjs/common';

export interface ExchangeRates {
  asOf: string;
  arsPerUsd: number;
  arsPerBrl: number;
  source: 'BCRA';
}

const BCRA_QUOTES_URL = 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones';
let cached: { value: ExchangeRates; fetchedAt: number } | null = null;
let inFlight: Promise<ExchangeRates> | null = null;

function parseQuotes(payload: unknown): ExchangeRates {
  const result = (payload as { results?: { fecha?: string; detalle?: { codigoMoneda: string; tipoCotizacion: number }[] } })?.results;
  const usd = result?.detalle?.find((item) => item.codigoMoneda === 'USD')?.tipoCotizacion;
  const brl = result?.detalle?.find((item) => item.codigoMoneda === 'BRL')?.tipoCotizacion;
  if (!result?.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(result.fecha) ||
      !Number.isFinite(usd) || !Number.isFinite(brl) ||
      Number(usd) <= 0 || Number(brl) <= 0) {
    throw new ServiceUnavailableException('No hay cotizaciones válidas para USD y BRL');
  }
  return { asOf: result.fecha, arsPerUsd: Number(usd), arsPerBrl: Number(brl), source: 'BCRA' };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < 60 * 60 * 1000) return cached.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const response = await fetch(BCRA_QUOTES_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`BCRA HTTP ${response.status}`);
      const value = parseQuotes(await response.json());
      cached = { value, fetchedAt: Date.now() };
      return value;
    } catch {
      // A recent known quote is safer than inventing a rate during a brief outage.
      if (cached && Date.now() - cached.fetchedAt < 48 * 60 * 60 * 1000) return cached.value;
      throw new ServiceUnavailableException('Cotización temporalmente no disponible');
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function resetExchangeRatesCacheForTests(): void {
  cached = null;
  inFlight = null;
}
