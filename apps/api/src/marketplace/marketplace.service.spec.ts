import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceService } from './marketplace.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { resetExchangeRatesCacheForTests } from './exchange-rates.js';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetExchangeRatesCacheForTests(); });

describe('release catalog failure behavior', () => {
  it('does not return synthetic units or zones during a beta database outage', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const db = { isOnline: vi.fn().mockResolvedValue(false), getClient: vi.fn() };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    await expect(service.findAll({})).rejects.toMatchObject({ status: 503 });
    await expect(service.findOne('sample-id', false)).rejects.toMatchObject({ status: 503 });
    await expect(service.getZonas()).rejects.toMatchObject({ status: 503 });
    expect(db.getClient).not.toHaveBeenCalled();
  });

  it('keeps a genuinely empty persisted catalog empty', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const result = { data: [], count: 0, error: null };
    const query = { is: () => query, range: () => ({ order: async () => result }) };
    const db = {
      isOnline: vi.fn().mockResolvedValue(true),
      getAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ is: () => query }) }) }) }),
    };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    await expect(service.findAll({})).resolves.toMatchObject({ data: [], count: 0 });
  });

  it('projects only public listing columns even when privileged rows contain secrets', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const row = {
      id: 'unit-1', titulo_es: 'Casa real', categoria: 'casa', zona_id: 1,
      fotos: [], ubicacion_aprox: { lat: -29, lng: -59 }, created_at: '2026-09-29',
      gestor_id: 'private-owner', whatsapp: '+5490000000', ubicacion_exacta: { lat: 1, lng: 2 },
      modalidades_precio: [{ id: 'price-1', unidad_tiempo: 'hora', cantidad_tiempo: 1, precio: 10000, deleted_at: null }],
    };
    const query = {
      eq: () => query, is: () => query, range: () => query,
      order: async () => ({ data: [row], count: 1, error: null }),
    };
    const db = {
      isOnline: vi.fn().mockResolvedValue(true),
      getAdminClient: () => ({ from: () => ({ select: () => query }) }),
      getClient: vi.fn(),
    };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    const result = await service.findAll({});
    expect(result.data[0]).toMatchObject({ id: 'unit-1', titulo: 'Casa real' });
    expect(result.data[0]).not.toHaveProperty('whatsapp');
    expect(result.data[0]).not.toHaveProperty('ubicacion_exacta');
    expect(result.data[0]).not.toHaveProperty('gestor_id');
    expect(db.getClient).not.toHaveBeenCalled();
  });

  it('projects detail contact and address only for a verified actor and never returns owner ID', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const row = {
      id: 'unit-1', titulo_es: 'Casa real', descripcion_es: 'Descripción', categoria: 'casa',
      gestor_id: 'private-owner', whatsapp: '+5490000000', ubicacion_exacta: { lat: 1, lng: 2 },
      direccion_texto: 'Av. Rolón 850, Goya, Corrientes',
      modalidades_precio: [],
    };
    const query = { eq: () => query, is: () => query, single: async () => ({ data: row, error: null }) };
    const db = {
      isOnline: vi.fn().mockResolvedValue(true),
      getAdminClient: () => ({ from: () => ({ select: () => query }) }),
    };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    const publicResult = await service.findOne('unit-1', false);
    expect(publicResult).toMatchObject({ whatsapp: null, ubicacion_exacta: null, direccion_texto: null });
    expect(publicResult).not.toHaveProperty('gestor_id');
    const signedInResult = await service.findOne('unit-1', true);
    expect(signedInResult).toMatchObject({
      whatsapp: '+5490000000',
      ubicacion_exacta: { lat: 1, lng: 2 },
      direccion_texto: 'Av. Rolón 850, Goya, Corrientes',
    });
  });

  it('busca por título y descripción sin exponer columnas privadas', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const query: any = { eq: () => query, is: () => query, range: () => query, or: vi.fn() };
    query.or.mockReturnValue(query);
    query.order = async () => ({ data: [], count: 0, error: null });
    const db = { isOnline: vi.fn().mockResolvedValue(true), getAdminClient: () => ({ from: () => ({ select: () => query }) }) };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    await service.findAll({ locale: 'es', q: 'jardín' });
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('titulo_es.ilike.%jardín%,descripcion_es.ilike.%jardín%'));
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('titulo_en.ilike.%jardín%'));
  });

  it('filtra USD manuales y conversiones desde ARS con la misma cotización', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      results: { fecha: '2026-10-01', detalle: [
        { codigoMoneda: 'USD', tipoCotizacion: 1500 },
        { codigoMoneda: 'BRL', tipoCotizacion: 300 },
      ] },
    }) }));
    const priceQuery: any = { is: () => priceQuery, or: vi.fn(), then: (resolve: any) => Promise.resolve({ data: [{ unidad_id: 'unit-1' }], error: null }).then(resolve) };
    priceQuery.or.mockReturnValue(priceQuery);
    const unitQuery: any = { eq: () => unitQuery, is: () => unitQuery, in: vi.fn(), range: () => unitQuery };
    unitQuery.in.mockReturnValue(unitQuery);
    unitQuery.order = async () => ({ data: [], count: 0, error: null });
    const db = {
      isOnline: vi.fn().mockResolvedValue(true),
      getAdminClient: () => ({ from: (table: string) => ({ select: () => table === 'modalidades_precio' ? priceQuery : unitQuery }) }),
    };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    await service.findAll({ locale: 'en', precio_min: 100 });
    expect(priceQuery.or).toHaveBeenCalledWith('and(precio_usd.is.null,precio.gte.150000),and(precio_usd.not.is.null,precio_usd.gte.100)');
    expect(unitQuery.in).toHaveBeenCalledWith('id', ['unit-1']);
  });
});
