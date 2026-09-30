import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DelegadosService } from './delegados.service.js';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/supabase-auth.guard.js';

describe('DelegadosService', () => {
  let service: DelegadosService;
  let mockSupabase: any;
  let mockClient: any;
  let mockAuthzService: any;
  let mockNotificationService: any;

  const gestorUser: AuthenticatedUser = {
    id: 'gestor-uuid-1',
    rol: 'gestor',
    workspace_id: 'gestor-uuid-1',
  };

  const inviteeUser: AuthenticatedUser = {
    id: 'target-uuid-1',
    rol: 'gestor',
    workspace_id: 'target-uuid-1',
  };

  beforeEach(() => {
    mockClient = {
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
        },
      },
    };
    mockSupabase = {
      getAdminClient: vi.fn().mockReturnValue(mockClient),
      getClient: vi.fn().mockReturnValue(mockClient),
    };
    mockAuthzService = {
      assertOwnerOnly: vi.fn(),
    };
    mockNotificationService = {
      notifyInvitationCreated: vi.fn().mockResolvedValue({ inApp: 'created', email: 'sent' }),
    };
    const mockActionLogService: any = {
      logAction: vi.fn().mockResolvedValue(undefined),
      getLogs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    service = new DelegadosService(mockSupabase, mockAuthzService, mockNotificationService, mockActionLogService);
  });

  describe('createInvitation', () => {
    it('throws BadRequestException if target user is not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        service.createInvitation(gestorUser, 'unknown@test.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if gestor invites self', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: gestorUser.id, rol: 'gestor' },
          error: null,
        }),
      });

      await expect(
        service.createInvitation(gestorUser, 'myownemail@test.com'),
      ).rejects.toThrow('No puedes invitar a tu propia cuenta');
    });

    it('throws BadRequestException if target user already belongs to another workspace', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'other-id', full_name: 'Other', rol: 'delegado', workspace_id: 'other-ws' },
          error: null,
        }),
      });

      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'El usuario ya colabora como delegado en otro espacio de trabajo' },
      });

      await expect(
        service.createInvitation(gestorUser, 'collaborator@test.com'),
      ).rejects.toThrow('El usuario ya colabora como delegado en otro espacio de trabajo');
    });

    it('creates invitation atomically via create_delegado_invitation RPC with actor token attribution', async () => {
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'target-id', full_name: 'Target Name', rol: 'gestor', workspace_id: null },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      mockClient.rpc.mockResolvedValueOnce({
        data: {
          id: 'inv-created-1',
          gestor_id: gestorUser.id,
          delegado_id: 'target-id',
          email_snapshot: 'valid@test.com',
          estado: 'pendiente',
          expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const userWithToken: AuthenticatedUser = {
        ...gestorUser,
        token: 'caller-jwt-token-123',
      };

      const result = await service.createInvitation(userWithToken, 'valid@test.com');
      expect(result.id).toBe('inv-created-1');
      expect(result.estado).toBe('pendiente');
      expect(mockSupabase.getClient).toHaveBeenCalledWith('caller-jwt-token-123');
      expect(mockClient.rpc).toHaveBeenCalledWith('create_delegado_invitation', {
        p_delegado_id: 'target-id',
      });
    });

    it('rolls back and propagates ConflictException on pending invitation collision', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'target-id', full_name: 'Target Name', rol: 'gestor', workspace_id: null },
          error: null,
        }),
      });

      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Ya existe una invitación pendiente para este usuario' },
      });

      await expect(
        service.createInvitation(gestorUser, 'duplicate@test.com'),
      ).rejects.toThrow(ConflictException);
    });

    it('rolls back and propagates BadRequestException on database RPC failure without leaving partial state', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'target-id', full_name: 'Target Name', rol: 'gestor', workspace_id: null },
          error: null,
        }),
      });

      mockClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database transactional constraint violation' },
      });

      await expect(
        service.createInvitation(gestorUser, 'error@test.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    it('throws NotFoundException if invitation does not exist or belongs to another user', async () => {
      mockClient.rpc.mockResolvedValueOnce({ error: { message: 'Invitación no encontrada' } });

      await expect(
        service.acceptInvitation('non-existent-inv', inviteeUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if invitation is expired', async () => {
      mockClient.rpc.mockResolvedValueOnce({ error: { message: 'La invitación ha expirado' } });

      await expect(
        service.acceptInvitation('inv-1', inviteeUser),
      ).rejects.toThrow(ConflictException);
    });

    it('accepts pending invitation and creates unconfigured delegation', async () => {
      mockClient.rpc.mockResolvedValueOnce({ error: null });

      const res = await service.acceptInvitation('inv-1', inviteeUser);
      expect(res.actor).toBe('delegado');
      expect((res as any).state).toBe('pendiente_configuracion');
      expect(res.capabilities).toHaveLength(0);
    });
  });

  describe('configureDelegado', () => {
    it('throws NotFoundException if delegation does not exist or is revoked', async () => {
      mockClient.rpc.mockResolvedValueOnce({ error: { message: 'Delegación no encontrada' } });

      await expect(
        service.configureDelegado('non-existent-del', gestorUser, {
          permiso: 'ver',
          alcanceTipo: 'cuenta',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('atomically configures and replaces selected Unidades', async () => {
      mockClient.rpc.mockResolvedValueOnce({ error: null });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'delegaciones') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'del-1',
                    delegado_id: 'del-uid',
                    estado: 'activa',
                    permiso: 'gestionar',
                    alcance_tipo: 'unidades',
                    updated_at: new Date().toISOString(),
                    delegado: { id: 'del-uid', full_name: 'Delegado Test', email: 'del@test.com' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'delegacion_unidades') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ unidad: { id: 'u-1', titulo_es: 'Unidad 1' } }],
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      const res = await service.configureDelegado('del-1', gestorUser, {
        permiso: 'gestionar',
        alcanceTipo: 'unidades',
        unidadIds: ['u-1'],
      });

      expect(res.estado).toBe('activa');
      expect(res.permiso).toBe('gestionar');
      expect(res.alcanceTipo).toBe('unidades');
    });
  });

  describe('revokeDelegado', () => {
    it('revokes delegation and reverts user profile to standalone gestor', async () => {
      mockClient.rpc.mockResolvedValueOnce({ error: null });

      await service.revokeDelegado('del-1', gestorUser);
      expect(mockClient.rpc).toHaveBeenCalledWith('revoke_delegacion', {
        p_delegacion_id: 'del-1',
      });
    });
  });
});
