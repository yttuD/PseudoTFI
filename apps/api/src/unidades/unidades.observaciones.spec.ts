import { describe, expect, it, vi } from 'vitest';
import { UnidadesService } from './unidades.service.js';
import { UnidadesController } from './unidades.controller.js';

describe('observaciones: ciclo de vida de unidades', () => {
  it('propaga el workspace autenticado al inventario del gestor', async () => {
    const findAll = vi.fn().mockResolvedValue({ data: [], count: 0, page: 1, limit: 20 });
    const controller = new UnidadesController({ findAll } as any, {} as any, {} as any);

    await controller.findAll({}, {
      headers: { authorization: 'Bearer token' },
      user: { id: 'owner-1', rol: 'gestor', workspace_id: 'owner-1' },
    } as any);

    expect(findAll).toHaveBeenCalledWith({}, 'token', 'owner-1');
  });

  it('crea una unidad como borrador hasta que el gestor la publique', async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: 'unit-1', estado: 'borrador' }, error: null }) }),
    });
    const db = { getClient: () => ({ from: () => ({ insert }) }) };
    const cupo = { validarCupo: vi.fn().mockResolvedValue(undefined) };
    const traduccion = { traducir: vi.fn() };
    const service = new UnidadesService(db as any, cupo as any, traduccion as any);

    await service.create({
      categoria: 'casa', auto_traducir: false,
      fotos: ['https://example.test/foto.jpg'],
      ubicacion_exacta: { lat: -29, lng: -59 },
      ubicacion_aprox: { lat: -29, lng: -59 },
      direccion_texto: 'Ruta 12, Goya',
    } as any, 'token', 'owner-1');

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'borrador',
      fotos: ['https://example.test/foto.jpg'],
      ubicacion_exacta: { lat: -29, lng: -59 },
      ubicacion_aprox: { lat: -29, lng: -59 },
      direccion_texto: 'Ruta 12, Goya',
    }));
  });

  it('conserva traducciones manuales aun con traducción automática habilitada', async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: 'unit-1' }, error: null }) }),
    });
    const db = { getClient: () => ({ from: () => ({ insert }) }) };
    const traducir = vi.fn().mockResolvedValue('Automatic translation');
    const service = new UnidadesService(db as any, { validarCupo: async () => undefined } as any, { traducir } as any);

    await service.create({
      categoria: 'casa', titulo_es: 'Casa', descripcion_es: 'Cerca del centro',
      titulo_en: 'My own title', auto_traducir: true,
    } as any, 'token', 'owner-1');

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ titulo_en: 'My own title' }));
    expect(traducir).not.toHaveBeenCalledWith('Casa', 'en');
    expect(traducir).toHaveBeenCalledTimes(3);
  });

  it('no escribe una unidad si falla la traducción solicitada', async () => {
    const insert = vi.fn();
    const db = { getClient: () => ({ from: () => ({ insert }) }) };
    const traducir = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    const service = new UnidadesService(db as any, { validarCupo: async () => undefined } as any, { traducir } as any);

    await expect(service.create({ categoria: 'casa', titulo_es: 'Casa', auto_traducir: true } as any,
      'token', 'owner-1')).rejects.toThrow('provider unavailable');
    expect(insert).not.toHaveBeenCalled();
  });

  it('no devuelve unidades eliminadas en el inventario del gestor', async () => {
    const query: any = {
      select: vi.fn(), eq: vi.fn(), is: vi.fn(), range: vi.fn(), order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.range.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.then = (onfulfilled?: (value: { data: never[]; count: number; error: null }) => unknown) => Promise.resolve({ data: [], count: 0, error: null }).then(onfulfilled);
    const db = { getClient: () => ({ from: () => query }) };
    const service = new UnidadesService(db as any, {} as any, {} as any);

    await service.findAll({}, 'token', 'owner-1');

    expect(query.eq).toHaveBeenCalledWith('gestor_id', 'owner-1');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('impide eliminar una unidad con alquileres activos', async () => {
    const rentalQuery: any = { select: () => rentalQuery, eq: () => rentalQuery, is: () => rentalQuery };
    rentalQuery.limit = async () => ({ data: [{ id: 'lease-1' }], error: null });
    const update = vi.fn();
    const db = { getClient: () => ({ from: (table: string) => table === 'alquileres' ? rentalQuery : { update } }) };
    const service = new UnidadesService(db as any, {} as any, {} as any);
    await expect(service.remove('unit-1', 'token')).rejects.toMatchObject({ status: 422 });
    expect(update).not.toHaveBeenCalled();
  });

  it('N02: actualiza la categoría de la unidad a cancha', async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: () => ({ single: async () => ({ data: { id: 'unit-1', categoria: 'cancha' }, error: null }) }),
        }),
      }),
    });
    const db = { getClient: () => ({ from: () => ({ update }) }) };
    const service = new UnidadesService(db as any, {} as any, { traducir: vi.fn() } as any);

    const result = await service.update('unit-1', { categoria: 'cancha', auto_traducir: false }, 'token', 'owner-1');
    expect(result).toMatchObject({ id: 'unit-1', categoria: 'cancha' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'cancha' }));
  });

  it('N03: findOne retorna solo modalidades de precio activas (excluye deleted_at)', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'unit-1',
        modalidades_precio: [
          { id: 'mod-1', unidad_tiempo: 'día', precio: 50000, deleted_at: null },
          { id: 'mod-2', unidad_tiempo: 'día', precio: 45000, deleted_at: '2026-10-01T00:00:00.000Z' },
          { id: 'mod-3', unidad_tiempo: 'mes', precio: 300000, deleted_at: null },
        ],
      },
      error: null,
    });
    const query: any = { select: () => query, eq: () => query, is: () => query, single };
    const db = { getClient: () => ({ from: () => query }) };
    const service = new UnidadesService(db as any, {} as any, {} as any);

    const result = await service.findOne('unit-1', 'token');
    expect(result.modalidades_precio).toHaveLength(2);
    expect(result.modalidades_precio.map((m: any) => m.id)).toEqual(['mod-1', 'mod-3']);
  });
});
