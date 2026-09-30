import { describe, expect, it, vi } from 'vitest';
import { UnidadesController } from '../unidades/unidades.controller.js';
import { AlquileresController } from '../alquileres/alquileres.controller.js';
import type { UnidadesService } from '../unidades/unidades.service.js';
import type { AlquileresService } from '../alquileres/alquileres.service.js';
import type { AuthorizationService } from './authorization.service.js';
import type { ActionLogService } from './action-log.service.js';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

const request = {
  user: { id: 'delegate-id', rol: 'delegado', workspace_id: 'owner-id' },
  headers: { authorization: 'Bearer test-token' },
} as unknown as AuthenticatedRequest;

describe('direct operational IDs conceal out-of-scope resources', () => {
  it('returns 404 before reading a unit payload', async () => {
    const unitService = { findOne: vi.fn() };
    const authz = { canReadUnidad: vi.fn().mockResolvedValue(false) };
    const controller = new UnidadesController(
      unitService as unknown as UnidadesService,
      authz as unknown as AuthorizationService,
      {} as ActionLogService,
    );
    await expect(controller.findOne('out-of-scope-unit', request)).rejects.toMatchObject({ status: 404 });
    expect(unitService.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 before reading a lease payload', async () => {
    const leaseService = { findOne: vi.fn() };
    const authz = { canReadAlquiler: vi.fn().mockResolvedValue(false) };
    const controller = new AlquileresController(
      leaseService as unknown as AlquileresService,
      authz as unknown as AuthorizationService,
      {} as ActionLogService,
    );
    await expect(controller.findOne('out-of-scope-lease', request)).rejects.toMatchObject({ status: 404 });
    expect(leaseService.findOne).not.toHaveBeenCalled();
  });
});
