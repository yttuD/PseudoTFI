import { describe, expect, it, vi } from 'vitest';
import { UnidadesService } from './unidades.service.js';

describe('B009: UnidadesService.remove vía RPC archive_unidad', () => {
  it('archiva la unidad exitosamente cuando la RPC responde success', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        id: 'unit-123',
        deleted_at: '2026-10-09T04:00:00.000Z',
      },
      error: null,
    });
    const db = {
      getClient: () => ({
        rpc: mockRpc,
      }),
    };
    const service = new UnidadesService(db as any, {} as any, {} as any);

    const result = await service.remove('unit-123', 'mock-token');

    expect(mockRpc).toHaveBeenCalledWith('archive_unidad', {
      p_unidad_id: 'unit-123',
    });
    expect(result).toEqual({
      success: true,
      id: 'unit-123',
      deleted_at: '2026-10-09T04:00:00.000Z',
    });
  });

  it('lanza UnprocessableEntityException (422) cuando la unidad tiene alquileres activos', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'La unidad tiene alquileres activos y no se puede eliminar',
        code: 'P0001',
      },
    });
    const db = {
      getClient: () => ({
        rpc: mockRpc,
      }),
    };
    const service = new UnidadesService(db as any, {} as any, {} as any);

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 422,
      message: 'La unidad tiene alquileres activos y no se puede eliminar',
    });
    expect(mockRpc).toHaveBeenCalledWith('archive_unidad', {
      p_unidad_id: 'unit-123',
    });
  });

  it('lanza NotFoundException (404) cuando la unidad no existe o el actor no tiene permisos', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'Unidad no encontrada',
        code: 'P0001',
      },
    });
    const db = {
      getClient: () => ({
        rpc: mockRpc,
      }),
    };
    const service = new UnidadesService(db as any, {} as any, {} as any);

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 404,
      message: 'Unidad no encontrada',
    });
    expect(mockRpc).toHaveBeenCalledWith('archive_unidad', {
      p_unidad_id: 'unit-123',
    });
  });

  it('lanza NotFoundException (404) cuando el payload devuelto es incompleto o no coincide el id', async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: false, id: 'unit-other' },
      error: null,
    });
    const db = {
      getClient: () => ({
        rpc: mockRpc,
      }),
    };
    const service = new UnidadesService(db as any, {} as any, {} as any);

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 404,
      message: 'Unidad no encontrada',
    });
  });
});
