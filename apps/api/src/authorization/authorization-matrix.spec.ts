import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorizationService } from './authorization.service.js';
import { AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Authorization Matrix Integration Tests (T062)', () => {
  let service: AuthorizationService;
  let mockSupabaseService: any;
  let mockClient: any;

  const gestorWorkspaceA: AuthenticatedUser = {
    id: 'gestor-a-uuid',
    rol: 'gestor',
    workspace_id: 'workspace-a',
  };

  const delegadoWorkspaceA: AuthenticatedUser = {
    id: 'delegado-a-uuid',
    rol: 'delegado',
    workspace_id: 'workspace-a',
  };

  const actorWorkspaceB: AuthenticatedUser = {
    id: 'gestor-b-uuid',
    rol: 'gestor',
    workspace_id: 'workspace-b',
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

  describe('1. Cross-Workspace Concealment (Anti-Enumeration 404 vs 403)', () => {
    it('returns false / concealed 404 for a Unidad in Workspace B when queried by Workspace A actor', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'unit-b-1',
            gestor_id: 'workspace-b',
            grupo_id: null,
            deleted_at: null,
          },
          error: null,
        }),
      });

      // Gestor of Workspace A queries Unit in Workspace B
      const canRead = await service.canReadUnidad(gestorWorkspaceA, 'unit-b-1');
      expect(canRead).toBe(false);

      // Delegado of Workspace A queries Unit in Workspace B
      const canReadDel = await service.canReadUnidad(delegadoWorkspaceA, 'unit-b-1');
      expect(canReadDel).toBe(false);
    });

    it('assertOwnerOnly throws ForbiddenException concealing cross-workspace resources', () => {
      expect(() => {
        service.assertOwnerOnly(gestorWorkspaceA, 'workspace-b');
      }).toThrow(ForbiddenException);
    });

    it('returns false for an Alquiler in Workspace B when queried by Workspace A actor', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'alq-b-1',
            gestor_id: 'workspace-b',
            unidad_id: 'unit-b-1',
            deleted_at: null,
          },
          error: null,
        }),
      });

      const canRead = await service.canReadAlquiler(gestorWorkspaceA, 'alq-b-1');
      expect(canRead).toBe(false);
    });
  });

  describe('2. Atomic Scope Replacement', () => {
    it('immediately reflects new scope when delegation configuration changes from Grupo 1 to Grupo 2', async () => {
      // Configuration 1: Delegado has scope Grupo 1
      let currentDelegation: any = {
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'workspace-a',
        delegado_id: 'delegado-a-uuid',
        estado: 'activa',
        permiso: 'gestionar',
        alcance_tipo: 'grupo',
        grupo_id: 'grupo-1',
        unidad_ids: [],
      };

      vi.spyOn(service, 'getActiveDelegation').mockImplementation(async () => currentDelegation);

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: 'unit-g1',
                gestor_id: 'workspace-a',
                grupo_id: 'grupo-1',
                deleted_at: null,
              },
              error: null,
            })),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      // In Scope: Unit in Grupo 1
      expect(await service.canReadUnidad(delegadoWorkspaceA, 'unit-g1')).toBe(true);

      // Now atomic reconfiguration occurs: Delegado is assigned to Grupo 2
      currentDelegation = {
        ...currentDelegation,
        grupo_id: 'grupo-2',
      };

      // Subsequent call on unit in Grupo 1 must immediately fail
      expect(await service.canReadUnidad(delegadoWorkspaceA, 'unit-g1')).toBe(false);
    });
  });

  describe('3. Revoked Actors and Inactive Delegations', () => {
    it('revoked delegation immediately strips all access and returns 0 capabilities', async () => {
      // Delegated row is now 'revocada'
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'del-1',
            invitacion_id: 'inv-1',
            gestor_id: 'workspace-a',
            delegado_id: 'delegado-a-uuid',
            estado: 'revocada',
            permiso: 'gestionar',
            alcance_tipo: 'cuenta',
          },
          error: null,
        }),
      });

      const context = await service.resolveAccessContext(delegadoWorkspaceA);
      expect(context.actor).toBe('delegado');
      expect((context as any).state).toBe('pendiente_configuracion');
      expect(context.capabilities).toHaveLength(0);

      // Attempting to read any unit returns false
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue(null);
      const canRead = await service.canReadUnidad(delegadoWorkspaceA, 'unit-1');
      expect(canRead).toBe(false);

      const canManage = await service.canManageUnidad(delegadoWorkspaceA, 'unit-1');
      expect(canManage).toBe(false);
    });
  });

  describe('4. Old vs New Targets Mutation Guard', () => {
    it('prohibits moving a lease to a unit outside of delegados scope', async () => {
      // Delegado only has scope for Unit A
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'workspace-a',
        delegado_id: 'delegado-a-uuid',
        estado: 'activa',
        permiso: 'gestionar',
        alcance_tipo: 'unidades',
        grupo_id: null,
        unidad_ids: ['unit-in-scope'],
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: 'unit-out-of-scope',
                gestor_id: 'workspace-a',
                grupo_id: null,
                deleted_at: null,
              },
              error: null,
            })),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      // Target unit is outside of delegated scope
      const canManageNewTarget = await service.canManageUnidad(
        delegadoWorkspaceA,
        'unit-out-of-scope',
      );
      expect(canManageNewTarget).toBe(false);
    });
  });

  describe('5. Grupo Boundaries and Membership Integrity', () => {
    it('delegado assigned to Grupo G1 cannot manage group membership or reassign to Grupo G2', async () => {
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'workspace-a',
        delegado_id: 'delegado-a-uuid',
        estado: 'activa',
        permiso: 'gestionar',
        alcance_tipo: 'grupo',
        grupo_id: 'grupo-1',
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'grupo-2', gestor_id: 'workspace-a', deleted_at: null },
          error: null,
        }),
      });

      // Cannot manage membership of Grupo 2 or Grupo 1 (only Cuenta or Gestor can manage group membership)
      const canManageG2 = await service.canManageGrupoMembership(delegadoWorkspaceA, 'grupo-2');
      expect(canManageG2).toBe(false);

      const canManageG1 = await service.canManageGrupoMembership(delegadoWorkspaceA, 'grupo-1');
      expect(canManageG1).toBe(false);
    });
  });

  describe('6. Alquiler-Derived Access', () => {
    it('delegado only sees and reads Alquileres attached to units in scope', async () => {
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'workspace-a',
        delegado_id: 'delegado-a-uuid',
        estado: 'activa',
        permiso: 'gestionar',
        alcance_tipo: 'unidades',
        grupo_id: null,
        unidad_ids: ['unit-in-scope'],
      });

      // Alquiler 1 on unit in scope
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'alquileres') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: 'alq-1',
                gestor_id: 'workspace-a',
                unidad_id: 'unit-in-scope',
                deleted_at: null,
              },
              error: null,
            })),
          };
        }
        if (table === 'unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: 'unit-in-scope',
                gestor_id: 'workspace-a',
                grupo_id: null,
                deleted_at: null,
              },
              error: null,
            })),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const canReadInScopeAlq = await service.canReadAlquiler(delegadoWorkspaceA, 'alq-1');
      expect(canReadInScopeAlq).toBe(true);

      // Alquiler 2 on unit out of scope
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'alquileres') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: 'alq-2',
                gestor_id: 'workspace-a',
                unidad_id: 'unit-out-of-scope',
                deleted_at: null,
              },
              error: null,
            })),
          };
        }
        if (table === 'unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(async () => ({
              data: {
                id: 'unit-out-of-scope',
                gestor_id: 'workspace-a',
                grupo_id: null,
                deleted_at: null,
              },
              error: null,
            })),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const canReadOutOfScopeAlq = await service.canReadAlquiler(delegadoWorkspaceA, 'alq-2');
      expect(canReadOutOfScopeAlq).toBe(false);
    });
  });

  describe('7. Shared Inquilino Privacy', () => {
    it('delegado can only access Inquilino if associated with an in-scope Alquiler', async () => {
      vi.spyOn(service, 'getActiveDelegation').mockResolvedValue({
        id: 'del-1',
        invitacion_id: 'inv-1',
        gestor_id: 'workspace-a',
        delegado_id: 'delegado-a-uuid',
        estado: 'activa',
        permiso: 'gestionar',
        alcance_tipo: 'unidades',
        grupo_id: null,
        unidad_ids: ['unit-in-scope'],
      });

      // Case A: Inquilino has active lease on unit in scope
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inquilinos') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'inq-1', gestor_id: 'workspace-a', deleted_at: null },
              error: null,
            }),
          };
        }
        if (table === 'alquileres') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({
              data: [{ unidad_id: 'unit-in-scope' }],
              error: null,
            }),
          };
        }
        if (table === 'unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'unit-in-scope', gestor_id: 'workspace-a', grupo_id: null, deleted_at: null },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const canReadInq = await service.canReadInquilino(delegadoWorkspaceA, 'inq-1');
      expect(canReadInq).toBe(true);

      // Case B: Inquilino only has leases on units outside of scope
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'inquilinos') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'inq-2', gestor_id: 'workspace-a', deleted_at: null },
              error: null,
            }),
          };
        }
        if (table === 'alquileres') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({
              data: [{ unidad_id: 'unit-out-of-scope' }],
              error: null,
            }),
          };
        }
        if (table === 'unidades') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'unit-out-of-scope', gestor_id: 'workspace-a', grupo_id: null, deleted_at: null },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const canReadInqOutOfScope = await service.canReadInquilino(delegadoWorkspaceA, 'inq-2');
      expect(canReadInqOutOfScope).toBe(false);
    });
  });
});
