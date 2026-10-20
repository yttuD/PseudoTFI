import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DelegadosController } from './delegados.controller.js';
import { AuthenticatedRequest } from '../auth/supabase-auth.guard.js';

describe('DelegadosController', () => {
  let controller: DelegadosController;
  let mockDelegadosService: any;
  let mockAuthzService: any;

  const mockGestorReq: AuthenticatedRequest = {
    user: {
      id: 'gestor-1',
      rol: 'gestor',
      workspace_id: 'gestor-1',
    },
  } as any;

  const mockDelegadoReq: AuthenticatedRequest = {
    user: {
      id: 'delegado-1',
      rol: 'delegado',
      workspace_id: 'gestor-1',
    },
  } as any;

  beforeEach(() => {
    mockDelegadosService = {
      createInvitation: vi.fn().mockResolvedValue({ id: 'inv-1', estado: 'pendiente' }),
      listDelegados: vi.fn().mockResolvedValue({ invitaciones: [], delegaciones: [] }),
      listReceivedInvitations: vi.fn().mockResolvedValue([]),
      acceptInvitation: vi.fn().mockResolvedValue({ actor: 'delegado', state: 'pendiente_configuracion' }),
      rejectInvitation: vi.fn().mockResolvedValue(undefined),
      cancelInvitation: vi.fn().mockResolvedValue(undefined),
      configureDelegado: vi.fn().mockResolvedValue({ id: 'del-1', estado: 'activa' }),
      revokeDelegado: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthzService = {
      resolveAccessContext: vi.fn().mockResolvedValue({ actor: 'gestor', ownerOnly: true }),
    };

    controller = new DelegadosController(mockDelegadosService, mockAuthzService);
  });

  it('GET /delegados/contexto resolves access context', async () => {
    const res = await controller.getAccessContext(mockGestorReq);
    expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledWith(mockGestorReq.user);
    expect(res).toEqual({ actor: 'gestor', ownerOnly: true });
  });

  it('GET /delegados lists delegados for Gestor owner', async () => {
    const res = await controller.listDelegados(mockGestorReq);
    expect(mockDelegadosService.listDelegados).toHaveBeenCalledWith(mockGestorReq.user);
    expect(res).toEqual({ invitaciones: [], delegaciones: [] });
  });

  it('POST /delegados/invitaciones creates invitation', async () => {
    const res = await controller.createInvitation(
      { email: 'colaborador@test.com' },
      mockGestorReq,
    );
    expect(mockDelegadosService.createInvitation).toHaveBeenCalledWith(
      mockGestorReq.user,
      'colaborador@test.com',
    );
    expect(res).toEqual({ id: 'inv-1', estado: 'pendiente' });
  });

  it('GET /delegados/invitaciones/recibidas lists received invitations for target account', async () => {
    const res = await controller.listReceivedInvitations(mockDelegadoReq);
    expect(mockDelegadosService.listReceivedInvitations).toHaveBeenCalledWith(mockDelegadoReq.user);
    expect(res).toEqual([]);
  });

  it('POST /delegados/invitaciones/:id/aceptar accepts invitation', async () => {
    const res = await controller.acceptInvitation('inv-1', mockDelegadoReq);
    expect(mockDelegadosService.acceptInvitation).toHaveBeenCalledWith('inv-1', mockDelegadoReq.user);
    expect(res).toEqual({ actor: 'delegado', state: 'pendiente_configuracion' });
  });

  it('POST /delegados/invitaciones/:id/rechazar rejects invitation', async () => {
    await controller.rejectInvitation('inv-1', mockDelegadoReq);
    expect(mockDelegadosService.rejectInvitation).toHaveBeenCalledWith('inv-1', mockDelegadoReq.user);
  });

  it('DELETE /delegados/invitaciones/:id cancels invitation as Gestor', async () => {
    await controller.cancelInvitation('inv-1', mockGestorReq);
    expect(mockDelegadosService.cancelInvitation).toHaveBeenCalledWith('inv-1', mockGestorReq.user);
  });

  it('PUT /delegados/:id/configuracion configures delegado scope & permission', async () => {
    const dto: any = { permiso: 'ver', alcanceTipo: 'cuenta' };
    const res = await controller.configureDelegado('del-1', dto, mockGestorReq);
    expect(mockDelegadosService.configureDelegado).toHaveBeenCalledWith(
      'del-1',
      mockGestorReq.user,
      dto,
    );
    expect(res).toEqual({ id: 'del-1', estado: 'activa' });
  });

  it('DELETE /delegados/:id revokes delegado as Gestor', async () => {
    await controller.revokeDelegado('del-1', mockGestorReq);
    expect(mockDelegadosService.revokeDelegado).toHaveBeenCalledWith('del-1', mockGestorReq.user);
  });
});
