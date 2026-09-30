import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceService } from './marketplace.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';

afterEach(() => vi.unstubAllEnvs());

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

  it('projects detail contact only for a verified actor and never returns owner ID', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    const row = {
      id: 'unit-1', titulo_es: 'Casa real', descripcion_es: 'Descripción', categoria: 'casa',
      gestor_id: 'private-owner', whatsapp: '+5490000000', ubicacion_exacta: { lat: 1, lng: 2 },
      modalidades_precio: [],
    };
    const query = { eq: () => query, is: () => query, single: async () => ({ data: row, error: null }) };
    const db = {
      isOnline: vi.fn().mockResolvedValue(true),
      getAdminClient: () => ({ from: () => ({ select: () => query }) }),
    };
    const service = new MarketplaceService(db as unknown as SupabaseService);
    const publicResult = await service.findOne('unit-1', false);
    expect(publicResult).toMatchObject({ whatsapp: null, ubicacion_exacta: null });
    expect(publicResult).not.toHaveProperty('gestor_id');
    const signedInResult = await service.findOne('unit-1', true);
    expect(signedInResult).toMatchObject({ whatsapp: '+5490000000', ubicacion_exacta: { lat: 1, lng: 2 } });
  });
});
