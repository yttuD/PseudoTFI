import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlquileresController } from './alquileres.controller.js';
import { InquilinosController } from '../inquilinos/inquilinos.controller.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth/supabase-auth.guard.js';

describe('Alquileres and Inquilinos Authorization (T033 / US3)', () => {
  let authzService: AuthorizationService;
  let mockSupabase: any;

  const gestorUser: AuthenticatedUser = {
    id: 'gestor-1',
    rol: 'gestor',
    workspace_id: 'gestor-1',
  };

  const delegadoVerUser: AuthenticatedUser = {
    id: 'del-ver',
    rol: 'delegado',
    workspace_id: 'gestor-1',
  };

  const delegadoGestionarUser: AuthenticatedUser = {
    id: 'del-gest',
    rol: 'delegado',
    workspace_id: 'gestor-1',
  };

  beforeEach(() => {
    mockSupabase = {
      getAdminClient: vi.fn(),
      getClient: vi.fn(),
    };
    authzService = new AuthorizationService(mockSupabase);
  });

  describe('Alquileres Mutations', () => {
    let mockAlquileresService: any;
    let controller: AlquileresController;

    beforeEach(() => {
      mockAlquileresService = {
        create: vi.fn().mockResolvedValue({ id: 'alq-created' }),
        update: vi.fn().mockResolvedValue({ id: 'alq-1' }),
        remove: vi.fn().mockResolvedValue({ ok: true }),
      };
      const mockActionLogService: any = {
        logAction: vi.fn().mockResolvedValue(undefined),
      };
      controller = new AlquileresController(mockAlquileresService, authzService, mockActionLogService);
    });

    it('denies Alquiler creation if target Unidad is out of scope', async () => {
      vi.spyOn(authzService, 'canManageUnidad').mockResolvedValue(false);
      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        controller.create({ unidad_id: 'u-out-of-scope', inquilino_id: 'inq-1' } as any, req),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAlquileresService.create).not.toHaveBeenCalled();
    });

    it('allows in-scope Alquiler creation', async () => {
      vi.spyOn(authzService, 'canManageUnidad').mockResolvedValue(true);
      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await controller.create({ unidad_id: 'u-in-scope', inquilino_id: 'inq-1' } as any, req);
      expect(res).toEqual({ id: 'alq-created' });
      expect(mockAlquileresService.create).toHaveBeenCalled();
    });

    it('denies Alquiler update when existing Alquiler is out of scope (concealed not-found)', async () => {
      vi.spyOn(authzService, 'canManageAlquiler').mockResolvedValue(false);
      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        controller.update('alq-out', { monto_mensual: 100000 } as any, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('denies Alquiler update moving to an out-of-scope Unidad', async () => {
      vi.spyOn(authzService, 'canManageAlquiler').mockResolvedValue(true);
      vi.spyOn(authzService, 'canManageUnidad').mockImplementation(async (u, unitId) => unitId === 'u-allowed');

      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        controller.update('alq-1', { unidad_id: 'u-forbidden' } as any, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies Alquiler removal when out of scope', async () => {
      vi.spyOn(authzService, 'canManageAlquiler').mockResolvedValue(false);
      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.remove('alq-out', req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Inquilinos Mutations & Shared Soft-Delete Denial', () => {
    let mockInquilinosService: any;
    let controller: InquilinosController;

    beforeEach(() => {
      mockInquilinosService = {
        create: vi.fn().mockResolvedValue({ id: 'inq-created' }),
        update: vi.fn().mockResolvedValue({ id: 'inq-1' }),
        remove: vi.fn().mockResolvedValue({ ok: true }),
      };
      const mockActionLogService: any = {
        logAction: vi.fn().mockResolvedValue(undefined),
      };
      controller = new InquilinosController(mockInquilinosService, authzService, mockActionLogService);
    });

    it('denies Delegado Ver from creating Inquilinos', async () => {
      vi.spyOn(authzService, 'resolveAccessContext').mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'ver',
        scope: { permiso: 'ver', alcanceTipo: 'cuenta' },
        capabilities: ['read_unidad', 'read_inquilino'],
      });

      const req = {
        user: delegadoVerUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        controller.create({ nombre_completo: 'Juan Test' } as any, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Delegado Gestionar to create Inquilino', async () => {
      vi.spyOn(authzService, 'resolveAccessContext').mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'gestionar',
        scope: { permiso: 'gestionar', alcanceTipo: 'cuenta' },
        capabilities: ['read_unidad', 'manage_unidad', 'manage_inquilino'],
      });

      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await controller.create({ nombre_completo: 'Juan Test' } as any, req);
      expect(res).toEqual({ id: 'inq-created' });
    });

    it('denies Delegado Gestionar from soft-deleting an Inquilino (shared resource reserved to Gestor)', async () => {
      const req = {
        user: delegadoGestionarUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.remove('inq-1', req)).rejects.toThrow(ForbiddenException);
      expect(mockInquilinosService.remove).not.toHaveBeenCalled();
    });

    it('allows Gestor owner to soft-delete an Inquilino', async () => {
      const req = {
        user: gestorUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await controller.remove('inq-1', req);
      expect(res).toEqual({ ok: true });
      expect(mockInquilinosService.remove).toHaveBeenCalled();
    });
  });
});
