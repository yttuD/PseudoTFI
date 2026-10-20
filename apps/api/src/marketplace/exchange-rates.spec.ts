import { afterEach, describe, expect, it, vi } from 'vitest';
import { getExchangeRates, resetExchangeRatesCacheForTests } from './exchange-rates.js';

afterEach(() => {
  vi.unstubAllGlobals();
  resetExchangeRatesCacheForTests();
});

describe('cotización para precios regionales', () => {
  it('usa las cotizaciones USD y BRL fechadas del BCRA', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      results: { fecha: '2026-10-01', detalle: [
        { codigoMoneda: 'USD', tipoCotizacion: 1524.5 },
        { codigoMoneda: 'BRL', tipoCotizacion: 291.547141 },
      ] },
    }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(getExchangeRates()).resolves.toEqual({
      asOf: '2026-10-01', arsPerUsd: 1524.5, arsPerBrl: 291.547141, source: 'BCRA',
    });
    await getExchangeRates();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no publica una conversión si falta BRL o USD', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: { fecha: '2026-10-01', detalle: [] } }) }));
    await expect(getExchangeRates()).rejects.toMatchObject({ status: 503 });
  });
});
