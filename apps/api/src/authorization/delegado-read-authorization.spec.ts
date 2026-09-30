import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnidadesController } from '../unidades/unidades.controller.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

describe('Delegado Read Authorization (Ver Mode)', () => {
  let controller: UnidadesController;
  let mockUnidadesService: any;
  let mockAuthzService: any;

  const verDelegadoReq: AuthenticatedRequest = {
    user: {
      id: 'delegado-ver-1',
      rol: 'delegado',
      workspace_id: 'gestor-1',
    },
    headers: { authorization: 'Bearer token-123' },
  } as any;

  beforeEach(() => {
    mockUnidadesService = {
      findAll: vi.fn().mockResolvedValue({
        data: [
          { id: 'u-in-scope', titulo_es: 'Unidad Permitida' },
          { id: 'u-out-scope', titulo_es: 'Unidad Ajena' },
        ],
        count: 2,
      }),
      findOne: vi.fn().mockImplementation((id: string) => {
        if (id === 'u-in-scope') {
          return Promise.resolve({ id: 'u-in-scope', titulo_es: 'Unidad Permitida' });
        }
        return Promise.resolve({ id: 'u-out-scope', titulo_es: 'Unidad Ajena' });
      }),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockAuthzService = {
      canReadUnidad: vi.fn().mockImplementation(async (_user, id) => id === 'u-in-scope'),
      canManageUnidad: vi.fn().mockResolvedValue(false), // Ver mode cannot manage!
      canCreateUnidad: vi.fn().mockResolvedValue(false), // Ver mode cannot create!
      resolveAccessContext: vi.fn().mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        permiso: 'ver',
        scope: { alcanceTipo: 'unidades', unidadIds: ['u-in-scope'] },
        capabilities: ['read_unidad'],
      }),
    };

    const mockActionLogService: any = {
      logAction: vi.fn().mockResolvedValue(undefined),
    };
    controller = new UnidadesController(mockUnidadesService, mockAuthzService, mockActionLogService);
  });

  it('filters unit list to only records in Delegado readable scope', async () => {
    const res = await controller.findAll({}, verDelegadoReq);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('u-in-scope');
    expect(res.count).toBe(1);
  });

  it('conceals existence of out-of-scope Unidad (returns NotFoundException)', async () => {
    await expect(controller.findOne('u-out-scope', verDelegadoReq)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('denies create mutation for Delegado with Ver permission', async () => {
    await expect(
      controller.create({ titulo_es: 'Nueva' } as any, verDelegadoReq),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies update mutation for Delegado with Ver permission', async () => {
    await expect(
      controller.update('u-in-scope', { titulo_es: 'Editada' }, verDelegadoReq),
    ).rejects.toThrow(NotFoundException);
  });
});
