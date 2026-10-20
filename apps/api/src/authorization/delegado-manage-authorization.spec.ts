import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UnidadesController } from '../unidades/unidades.controller.js';
import { GruposController } from '../grupos/grupos.controller.js';
import { AuthorizationService } from './authorization.service.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth/supabase-auth.guard.js';

describe('Delegado Manage Authorization (T032 / US3)', () => {
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

  const delegadoGestionarGrupoUser: AuthenticatedUser = {
    id: 'del-gest-grupo',
    rol: 'delegado',
    workspace_id: 'gestor-1',
  };

  const delegadoGestionarUnidadesUser: AuthenticatedUser = {
    id: 'del-gest-unidades',
    rol: 'delegado',
    workspace_id: 'gestor-1',
  };

  const delegadoGestionarCuentaUser: AuthenticatedUser = {
    id: 'del-gest-cuenta',
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

  describe('Unidades Mutations', () => {
    let mockUnidadesService: any;
    let unidadesController: UnidadesController;

    beforeEach(() => {
      mockUnidadesService = {
        create: vi.fn().mockResolvedValue({ id: 'u-created' }),
        update: vi.fn().mockResolvedValue({ id: 'u-1' }),
        cambiarEstado: vi.fn().mockResolvedValue({ id: 'u-1', estado: 'pausada' }),
        remove: vi.fn().mockResolvedValue({ ok: true }),
        createModalidad: vi.fn().mockResolvedValue({ id: 'mod-1' }),
        updateModalidad: vi.fn().mockResolvedValue({ id: 'mod-1' }),
        removeModalidad: vi.fn().mockResolvedValue({ ok: true }),
      };
      const mockActionLogService: any = {
        logAction: vi.fn().mockResolvedValue(undefined),
      };
      unidadesController = new UnidadesController(mockUnidadesService, authzService, mockActionLogService);
    });

    it('denies Delegado Ver from creating a Unidad', async () => {
      vi.spyOn(authzService, 'canCreateUnidad').mockResolvedValue(false);
      const req = {
        user: delegadoVerUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        unidadesController.create({ categoria: 'residencial', titulo_es: 'Test' } as any, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Delegado Gestionar (cuenta scope) to create a Unidad', async () => {
      vi.spyOn(authzService, 'canCreateUnidad').mockResolvedValue(true);
      const req = {
        user: delegadoGestionarCuentaUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await unidadesController.create(
        { categoria: 'residencial', titulo_es: 'Nueva' } as any,
        req,
      );
      expect(res).toEqual({ id: 'u-created' });
    });

    it('allows Delegado Gestionar (grupo scope) to create a Unidad inside assigned Grupo', async () => {
      vi.spyOn(authzService, 'canCreateUnidad').mockImplementation(async (user, ws, grupoId) => {
        return grupoId === 'grupo-assigned';
      });
      const req = {
        user: delegadoGestionarGrupoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      // Inside assigned grupo
      const res = await unidadesController.create(
        { categoria: 'residencial', titulo_es: 'Nueva', grupo_id: 'grupo-assigned' } as any,
        req,
      );
      expect(res).toEqual({ id: 'u-created' });

      // Outside assigned grupo
      await expect(
        unidadesController.create(
          { categoria: 'residencial', titulo_es: 'Nueva', grupo_id: 'grupo-other' } as any,
          req,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies Delegado Gestionar (unidades scope) from creating any Unidad', async () => {
      vi.spyOn(authzService, 'canCreateUnidad').mockResolvedValue(false);
      const req = {
        user: delegadoGestionarUnidadesUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        unidadesController.create({ categoria: 'residencial', titulo_es: 'Test' } as any, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('denies mutation on out-of-scope Unidad (concealed not-found)', async () => {
      vi.spyOn(authzService, 'canManageUnidad').mockResolvedValue(false);
      const req = {
        user: delegadoGestionarUnidadesUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(
        unidadesController.update('u-out-of-scope', { titulo_es: 'Hacked' } as any, req),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.cambiarEstado('u-out-of-scope', { estado: 'pausada' as any }, req),
      ).rejects.toThrow(NotFoundException);

      await expect(
        unidadesController.remove('u-out-of-scope', req),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows mutation on in-scope Unidad for Delegado Gestionar', async () => {
      vi.spyOn(authzService, 'canManageUnidad').mockResolvedValue(true);
      const req = {
        user: delegadoGestionarUnidadesUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const updateRes = await unidadesController.update('u-in-scope', { titulo_es: 'Updated' } as any, req);
      expect(updateRes).toEqual({ id: 'u-1' });

      const stateRes = await unidadesController.cambiarEstado('u-in-scope', { estado: 'pausada' as any }, req);
      expect(stateRes).toEqual({ id: 'u-1', estado: 'pausada' });
    });

    it('allows Modalidad CRUD on in-scope Unidad and denies on out-of-scope Unidad', async () => {
      vi.spyOn(authzService, 'canManageUnidad').mockImplementation(async (u, unitId) => unitId === 'u-in-scope');
      const req = {
        user: delegadoGestionarUnidadesUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const createMod = await unidadesController.createModalidad('u-in-scope', { modalidad: 'mensual', precio: 500 } as any, req);
      expect(createMod).toEqual({ id: 'mod-1' });

      await expect(
        unidadesController.createModalidad('u-out-of-scope', { modalidad: 'mensual', precio: 500 } as any, req),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Grupos Mutations', () => {
    let mockGruposService: any;
    let gruposController: GruposController;

    beforeEach(() => {
      mockGruposService = {
        findAll: vi.fn().mockResolvedValue([{ id: 'g-1', nombre: 'Grupo 1' }]),
        create: vi.fn().mockResolvedValue({ id: 'g-created', nombre: 'Nuevo' }),
        update: vi.fn().mockResolvedValue({ id: 'g-1', nombre: 'Renombrado' }),
        remove: vi.fn().mockResolvedValue({ ok: true }),
      };
      const mockActionLogService: any = {
        logAction: vi.fn().mockResolvedValue(undefined),
      };
      gruposController = new GruposController(mockGruposService, authzService, mockActionLogService);
    });

    it('denies Delegado with Grupo scope from creating new Grupos', async () => {
      vi.spyOn(authzService, 'resolveAccessContext').mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'gestionar',
        scope: { permiso: 'gestionar', alcanceTipo: 'grupo', grupoId: 'g-1' },
        capabilities: ['read_grupo', 'manage_grupo', 'create_unidad_in_grupo'],
      });

      const req = {
        user: delegadoGestionarGrupoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(gruposController.create({ nombre: 'Forbidden Grupo' }, req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows Delegado with Cuenta scope to create new Grupos', async () => {
      vi.spyOn(authzService, 'resolveAccessContext').mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'gestionar',
        scope: { permiso: 'gestionar', alcanceTipo: 'cuenta' },
        capabilities: ['read_grupo', 'manage_grupo', 'create_unidad', 'manage_grupo_membership'],
      });

      const req = {
        user: delegadoGestionarCuentaUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await gruposController.create({ nombre: 'Nuevo Edificio' }, req);
      expect(res).toEqual({ id: 'g-created', nombre: 'Nuevo' });
    });

    it('denies Delegado with Grupo scope from deleting a Grupo', async () => {
      vi.spyOn(authzService, 'canManageGrupoMembership').mockResolvedValue(false);
      const req = {
        user: delegadoGestionarGrupoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(gruposController.remove('g-1', req)).rejects.toThrow(ForbiddenException);
    });

    it('allows Delegado with Grupo scope to rename/update their assigned Grupo', async () => {
      vi.spyOn(authzService, 'canManageGrupo').mockResolvedValue(true);
      const req = {
        user: delegadoGestionarGrupoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await gruposController.update('g-1', { nombre: 'Torre Actualizada' }, req);
      expect(res).toEqual({ id: 'g-1', nombre: 'Renombrado' });
    });
  });
});
