import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { CupoController } from '../cupo/cupo.controller.js';
import { PagosController } from '../pagos/pagos.controller.js';
import { AfipController } from '../afip/afip.controller.js';
import { DelegadosController } from '../delegados/delegados.controller.js';
import { LogsController } from './logs.controller.js';
import { AuthorizationService } from './authorization.service.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth/supabase-auth.guard.js';

describe('Owner-Only Authorization Boundaries (T039 / US4)', () => {
  let authzService: AuthorizationService;
  let mockSupabase: any;

  const gestorUser: AuthenticatedUser = {
    id: 'gestor-111',
    rol: 'gestor',
    workspace_id: 'gestor-111',
  };

  const delegadoUser: AuthenticatedUser = {
    id: 'delegado-222',
    rol: 'delegado',
    workspace_id: 'gestor-111',
  };

  beforeEach(() => {
    mockSupabase = {
      getAdminClient: vi.fn(),
      getClient: vi.fn(),
    };
    authzService = new AuthorizationService(mockSupabase);
  });

  describe('CupoController', () => {
    it('denies Delegado from viewing cupo', async () => {
      const mockCupoService = { getCupo: vi.fn() } as any;
      const controller = new CupoController(mockCupoService, authzService);

      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getCupo(req)).rejects.toThrow(ForbiddenException);
      expect(mockCupoService.getCupo).not.toHaveBeenCalled();
    });

    it('allows Gestor owner to view cupo', async () => {
      const mockCupoService = { getCupo: vi.fn().mockResolvedValue({ cupo_maximo: 10 }) } as any;
      const controller = new CupoController(mockCupoService, authzService);

      const req = {
        user: gestorUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await controller.getCupo(req);
      expect(res).toEqual({ cupo_maximo: 10 });
    });
  });

  describe('PagosController', () => {
    it('denies Delegado from creating payment preference', async () => {
      const mockPagosService = { crearPreferenciaMercadoPago: vi.fn() } as any;
      const controller = new PagosController(mockPagosService, authzService);

      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.crearPreferencia(req, 5)).rejects.toThrow(ForbiddenException);
      expect(mockPagosService.crearPreferenciaMercadoPago).not.toHaveBeenCalled();
    });

    it('denies Delegado from registering cash payment', async () => {
      const mockPagosService = { registrarPagoEfectivo: vi.fn() } as any;
      const controller = new PagosController(mockPagosService, authzService);

      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.registrarEfectivo(req, 5)).rejects.toThrow(ForbiddenException);
      expect(mockPagosService.registrarPagoEfectivo).not.toHaveBeenCalled();
    });

    it('allows Gestor owner to create payment preference', async () => {
      const mockPagosService = {
        crearPreferenciaMercadoPago: vi.fn().mockResolvedValue({ init_point: 'https://mp.com' }),
      } as any;
      const controller = new PagosController(mockPagosService, authzService);

      const req = {
        user: gestorUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await controller.crearPreferencia(req, 5);
      expect(res).toEqual({ init_point: 'https://mp.com' });
      expect(mockPagosService.crearPreferenciaMercadoPago).toHaveBeenCalledWith('tok', 'gestor-111', 5);
    });
  });

  describe('AfipController', () => {
    let mockAfipService: any;
    let controller: AfipController;

    beforeEach(() => {
      mockAfipService = {
        getConfig: vi.fn(),
        saveConfig: vi.fn(),
        emitirComprobante: vi.fn(),
        findAll: vi.fn(),
        getPdfBuffer: vi.fn(),
      };
      controller = new AfipController(mockAfipService, authzService);
    });

    it('denies Delegado from accessing AFIP config', async () => {
      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getConfig(req)).rejects.toThrow(ForbiddenException);
    });

    it('denies Delegado from downloading AFIP comprobante PDF', async () => {
      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;
      const res = { set: vi.fn(), end: vi.fn() } as any;

      await expect(controller.downloadPdf('comp-1', req, res)).rejects.toThrow(ForbiddenException);
      expect(mockAfipService.getPdfBuffer).not.toHaveBeenCalled();
    });

    it('allows Gestor owner to download AFIP PDF', async () => {
      const req = {
        user: gestorUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;
      const res = { set: vi.fn(), end: vi.fn() } as any;

      mockAfipService.getPdfBuffer.mockResolvedValue({
        buffer: Buffer.from('PDF_BYTES'),
        filename: 'factura.pdf',
      });

      await controller.downloadPdf('comp-1', req, res);
      expect(res.set).toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('LogsController & DelegadosController Logs', () => {
    it('denies Delegado from retrieving complete action logs via LogsController', async () => {
      const mockLogService = { getLogs: vi.fn() } as any;
      const controller = new LogsController(mockLogService, authzService);

      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getLogs(req)).rejects.toThrow(ForbiddenException);
      expect(mockLogService.getLogs).not.toHaveBeenCalled();
    });

    it('denies Delegado from retrieving logs via DelegadosController', async () => {
      const mockDelegadosService = {} as any;
      const mockLogService = { getLogs: vi.fn() } as any;
      const controller = new DelegadosController(mockDelegadosService, authzService, mockLogService);

      const req = {
        user: delegadoUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getLogs(req)).rejects.toThrow(ForbiddenException);
      expect(mockLogService.getLogs).not.toHaveBeenCalled();
    });

    it('allows Gestor owner to retrieve logs', async () => {
      const mockLogService = {
        getLogs: vi.fn().mockResolvedValue({ data: [{ id: 'log-1' }], total: 1 }),
      } as any;
      const controller = new LogsController(mockLogService, authzService);

      const req = {
        user: gestorUser,
        headers: { authorization: 'Bearer tok' },
      } as unknown as AuthenticatedRequest;

      const res = await controller.getLogs(req, '10', '0');
      expect(res.total).toBe(1);
      expect(mockLogService.getLogs).toHaveBeenCalledWith('gestor-111', 10, 0);
    });
  });

  describe('Delegados Administration', () => {
    it('denies Delegado from listing delegados', async () => {
      const mockDelegadosService = {
        listDelegados: vi.fn().mockImplementation((user) => {
          authzService.assertOwnerOnly(user);
        }),
      } as any;
      const mockLogService = {} as any;
      const controller = new DelegadosController(mockDelegadosService, authzService, mockLogService);

      const req = {
        user: delegadoUser,
      } as unknown as AuthenticatedRequest;

      await expect(controller.listDelegados(req)).rejects.toThrow(ForbiddenException);
    });
  });
});
