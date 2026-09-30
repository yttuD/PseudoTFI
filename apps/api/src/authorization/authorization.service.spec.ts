import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorizationService } from './authorization.service.js';
import { AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import { ForbiddenException } from '@nestjs/common';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let mockSupabaseService: any;
  let mockClient: any;

  const gestorUser: AuthenticatedUser = {
    id: 'gestor-uuid-1',
    rol: 'gestor',
    workspace_id: 'gestor-uuid-1',
  };

  const delegadoUser: AuthenticatedUser = {
    id: 'delegado-uuid-1',
    rol: 'delegado',
    workspace_id: 'gestor-uuid-1',
  };

  beforeEach(() => {
    mockClient = {
      from: vi.fn(),
    };
    mockSupabaseService = {
      getAdminClient: vi.fn().mockReturnValue(mockClient),
    };
    service = new AuthorizationService(mockSupabaseService);
  });

  describe('assertOwnerOnly', () => {
    it('allows the gestor owner of the target workspace', () => {
      expect(() =>
        service.assertOwnerOnly(gestorUser, 'gestor-uuid-1'),
      ).not.toThrow();
    });

    it('rejects a Delegado even within the same workspace', () => {
      expect(() =>
        service.assertOwnerOnly(delegadoUser, 'gestor-uuid-1'),
      ).toThrow(ForbiddenException);
    });

    it('rejects a Gestor attempting to access another workspace', () => {
      expect(() =>
        service.assertOwnerOnly(gestorUser, 'other-gestor-uuid'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('resolveAccessContext', () => {
    it('resolves owner context for Gestor', async () => {
      const context = await service.resolveAccessContext(gestorUser);
      expect(context.actor).toBe('gestor');
      expect(context.ownerOnly).toBe(true);
      expect(context.capabilities).toContain('manage_delegados');
      expect(context.capabilities).toContain('view_cupo');
      expect(context.capabilities).toContain('manage_afip');
    });

    it('resolves pending configuration when no active delegation row exists', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      const context = await service.resolveAccessContext(delegadoUser);
      expect(context.actor).toBe('delegado');
      expect(context.ownerOnly).toBe(false);
      expect((context as any).state).toBe('pendiente_configuracion');
      expect(context.capabilities).toHaveLength(0);
    });

    it('resolves active delegation context for Ver in a Grupo', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'del-rel-1',
            invitacion_id: 'inv-1',
            gestor_id: 'gestor-uuid-1',
            delegado_id: 'delegado-uuid-1',
            estado: 'activa',
            permiso: 'ver',
            alcance_tipo: 'grupo',
            grupo_id: 'grupo-uuid-1',
          },
          error: null,
        }),
      });

      const context = await service.resolveAccessContext(delegadoUser);
      expect(context.actor).toBe('delegado');
      expect((context as any).state).toBe('activo');
      expect((context as any).permiso).toBe('ver');
      expect((context as any).scope.alcanceTipo).toBe('grupo');
      expect(context.capabilities).toContain('read_unidad');
      expect(context.capabilities).not.toContain('manage_unidad');
      expect(context.capabilities).not.toContain('create_unidad');
    });

    it('resolves active delegation context for Gestionar in selected Unidades', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'delegaciones') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'del-rel-1',
                invitacion_id: 'inv-1',
                gestor_id: 'gestor-uuid-1',
                delegado_id: 'delegado-uuid-1',
                estado: 'activa',
                permiso: 'gestionar',
                alcance_tipo: 'unidades',
              },
              error: null,
            }),
          };
        }
        if (table === 'delegacion_unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ unidad_id: 'unit-1' }, { unidad_id: 'unit-2' }],
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const context = await service.resolveAccessContext(delegadoUser);
      expect(context.actor).toBe('delegado');
      expect((context as any).state).toBe('activo');
      expect((context as any).permiso).toBe('gestionar');
      expect((context as any).scope.alcanceTipo).toBe('unidades');
      expect((context as any).scope.unidadIds).toEqual(['unit-1', 'unit-2']);
      expect(context.capabilities).toContain('manage_unidad');
      // Selected unidad cannot create new units or manage group membership!
      expect(context.capabilities).not.toContain('create_unidad');
      expect(context.capabilities).not.toContain('manage_grupo_membership');
    });
  });

  describe('Unidad & Grupo authorization', () => {
    it('verifies canReadUnidad with selected Unidades', async () => {
      // Mock delegation
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'gestor-uuid-1',
        delegado_id: 'delegado-uuid-1',
        estado: 'activa',
        permiso: 'ver',
        alcance_tipo: 'unidades',
        grupo_id: null,
        unidad_ids: ['unit-1'],
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'unit-1',
            gestor_id: 'gestor-uuid-1',
            grupo_id: null,
            deleted_at: null,
          },
        }),
      });

      const canReadInScope = await service.canReadUnidad(delegadoUser, 'unit-1');
      expect(canReadInScope).toBe(true);

      const canReadOutOfScope = await service.canReadUnidad(delegadoUser, 'unit-2');
      expect(canReadOutOfScope).toBe(false);
    });

    it('denies canManageUnidad when Delegado has only Ver permission', async () => {
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'gestor-uuid-1',
        delegado_id: 'delegado-uuid-1',
        estado: 'activa',
        permiso: 'ver',
        alcance_tipo: 'cuenta',
        grupo_id: null,
      });

      const canManage = await service.canManageUnidad(delegadoUser, 'unit-1');
      expect(canManage).toBe(false);
    });

    it('denies canManageGrupoMembership when scope is Grupo instead of Cuenta', async () => {
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'gestor-uuid-1',
        delegado_id: 'delegado-uuid-1',
        estado: 'activa',
        permiso: 'gestionar',
        alcance_tipo: 'grupo',
        grupo_id: 'group-1',
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'group-1', gestor_id: 'gestor-uuid-1', deleted_at: null },
        }),
      });

      const canManageMembership = await service.canManageGrupoMembership(delegadoUser, 'group-1');
      expect(canManageMembership).toBe(false);
    });
  });
});
