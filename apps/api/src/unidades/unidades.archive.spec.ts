import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UnidadesService } from './unidades.service.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import type { CupoService } from '../cupo/cupo.service.js';
import type { TraduccionService } from '../common/services/traduccion/traduccion.service.js';

interface RpcResult<T = unknown> {
  data: T;
  error: { message?: string; code?: string } | null;
}

interface RentalsQueryResult {
  data: Array<{ id: string }> | null;
  error: { message?: string; code?: string } | null;
}

interface TestServiceOptions {
  rpcImpl?: (fn: string, args: Record<string, unknown>) => Promise<RpcResult>;
  rentalsImpl?: () => Promise<RentalsQueryResult>;
}

function buildTestService(
  options: TestServiceOptions | ((fn: string, args: Record<string, unknown>) => Promise<RpcResult>),
) {
  const normalizedOptions: TestServiceOptions =
    typeof options === 'function' ? { rpcImpl: options } : options;

  const mockRpc = vi.fn().mockImplementation(
    normalizedOptions.rpcImpl ?? (async () => ({ data: null, error: null })),
  );

  const defaultRentalsImpl = async (): Promise<RentalsQueryResult> => ({
    data: [],
    error: null,
  });

  const rentalsHandler = normalizedOptions.rentalsImpl ?? defaultRentalsImpl;

  const createRentalsChain = () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(rentalsHandler),
    };
    return chain;
  };

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'alquileres') {
      return createRentalsChain();
    }
    throw new Error(`Tabla no mockeada: ${table}`);
  });

  const mockSupabaseClient = {
    rpc: mockRpc,
    from: mockFrom,
  } as unknown as SupabaseClient;

  const mockSupabaseService: Pick<SupabaseService, 'getClient'> = {
    getClient: vi.fn().mockReturnValue(mockSupabaseClient),
  };

  const mockCupoService: Pick<CupoService, 'validarCupo'> = {
    validarCupo: vi.fn().mockResolvedValue(undefined),
  };

  const mockTraduccionService: Pick<TraduccionService, 'traducir'> = {
    traducir: vi.fn().mockResolvedValue(''),
  };

  const service = new UnidadesService(
    mockSupabaseService as unknown as SupabaseService,
    mockCupoService as unknown as CupoService,
    mockTraduccionService as unknown as TraduccionService,
  );

  return { service, mockRpc, mockFrom };
}

describe('B009: UnidadesService.remove vía RPC archive_unidad', () => {
  it('archiva la unidad exitosamente cuando la RPC responde success', async () => {
    const { service, mockRpc } = buildTestService(async () => ({
      data: {
        success: true,
        id: 'unit-123',
        deleted_at: '2026-10-09T04:00:00.000Z',
      },
      error: null,
    }));

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

  it('lanza UnprocessableEntityException (422) cuando la unidad tiene alquileres activos en la RPC', async () => {
    const { service, mockRpc } = buildTestService(async () => ({
      data: null,
      error: {
        message: 'La unidad tiene alquileres activos y no se puede eliminar',
        code: 'P0001',
      },
    }));

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 422,
      message: 'La unidad tiene alquileres activos y no se puede eliminar',
    });
    expect(mockRpc).toHaveBeenCalledWith('archive_unidad', {
      p_unidad_id: 'unit-123',
    });
  });

  it('lanza NotFoundException (404) cuando la unidad no existe o el actor no tiene permisos', async () => {
    const { service, mockRpc } = buildTestService(async () => ({
      data: null,
      error: {
        message: 'Unidad no encontrada',
        code: 'P0001',
      },
    }));

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 404,
      message: 'Unidad no encontrada',
    });
    expect(mockRpc).toHaveBeenCalledWith('archive_unidad', {
      p_unidad_id: 'unit-123',
    });
  });

  it('lanza NotFoundException (404) cuando el payload devuelto es incompleto o no coincide el id', async () => {
    const { service } = buildTestService(async () => ({
      data: { success: false, id: 'unit-other' },
      error: null,
    }));

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 404,
      message: 'Unidad no encontrada',
    });
  });

  it('lanza UnprocessableEntityException (422) cuando la consulta previa detecta alquileres activos sin invocar la RPC', async () => {
    const { service, mockRpc } = buildTestService({
      rentalsImpl: async () => ({
        data: [{ id: 'rental-active-1' }],
        error: null,
      }),
    });

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 422,
      message: 'La unidad tiene alquileres activos y no se puede eliminar',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('lanza UnprocessableEntityException (422) cuando falla la consulta previa de alquileres sin invocar la RPC', async () => {
    const { service, mockRpc } = buildTestService({
      rentalsImpl: async () => ({
        data: null,
        error: { message: 'db error', code: '08006' },
      }),
    });

    await expect(service.remove('unit-123', 'mock-token')).rejects.toMatchObject({
      status: 422,
      message: 'No se pudo verificar si la unidad tiene alquileres activos',
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
