import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InquilinosController } from './inquilinos.controller.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

describe('Inquilinos Authorization & Privacy Projections', () => {
  let controller: InquilinosController;
  let mockInquilinosService: any;
  let mockAuthzService: any;

  const delegadoReq: AuthenticatedRequest = {
    user: {
      id: 'delegado-1',
      rol: 'delegado',
      workspace_id: 'gestor-1',
    },
    headers: { authorization: 'Bearer tok-1' },
  } as any;

  beforeEach(() => {
    mockInquilinosService = {
      findAll: vi.fn().mockResolvedValue({
        data: [
          { id: 'inq-in-scope', nombre_completo: 'Inquilino Con Alquiler En Alcance' },
          { id: 'inq-out-scope', nombre_completo: 'Inquilino Con Alquiler Fuera' },
          { id: 'inq-orphan', nombre_completo: 'Inquilino Sin Alquiler' },
        ],
        total: 3,
        limit: 10,
        offset: 0,
      }),
      findOne: vi.fn().mockImplementation((id: string) => {
        return Promise.resolve({ id, nombre_completo: 'Inquilino' });
      }),
      remove: vi.fn(),
    };

    mockAuthzService = {
      canReadInquilino: vi.fn().mockImplementation(async (_user, id) => id === 'inq-in-scope'),
      canManageInquilino: vi.fn().mockImplementation(async (_user, id) => id === 'inq-in-scope'),
      resolveAccessContext: vi.fn().mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        permiso: 'ver',
        scope: { alcanceTipo: 'cuenta' },
        capabilities: ['read_inquilino'],
      }),
    };

    const mockActionLogService: any = {
      logAction: vi.fn().mockResolvedValue(undefined),
    };
    controller = new InquilinosController(mockInquilinosService, mockAuthzService, mockActionLogService);
  });

  it('filters inquilino list so only those linked to an in-scope Alquiler are returned', async () => {
    const res = await controller.findAll(delegadoReq);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('inq-in-scope');
    expect(res.total).toBe(1);
  });

  it('conceals out-of-scope Inquilino on direct id lookup', async () => {
    await expect(controller.findOne('inq-out-scope', delegadoReq)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('denies deletion of Inquilino to any Delegado actor', async () => {
    await expect(controller.remove('inq-in-scope', delegadoReq)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
