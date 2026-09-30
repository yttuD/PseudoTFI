import { Test, TestingModule } from '@nestjs/testing';
import { GruposController } from './grupos.controller.js';
import { GruposService } from './grupos.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { ActionLogService } from '../authorization/action-log.service.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('GruposController', () => {
  let controller: GruposController;
  let service: any;
  let authzService: any;

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockResolvedValue([{ id: 'g-1', nombre: 'Grupo 1' }]),
      create: vi.fn().mockResolvedValue({ id: 'g-2', nombre: 'Grupo 2' }),
      update: vi.fn().mockResolvedValue({ id: 'g-1', nombre: 'Grupo Actualizado' }),
      remove: vi.fn().mockResolvedValue({ success: true }),
    };

    authzService = {
      resolveAccessContext: vi.fn(),
      canReadGrupo: vi.fn().mockResolvedValue(true),
      canManageGrupo: vi.fn().mockResolvedValue(true),
      canManageGrupoMembership: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GruposController],
      providers: [
        {
          provide: GruposService,
          useValue: service,
        },
        {
          provide: AuthorizationService,
          useValue: authzService,
        },
        {
          provide: ActionLogService,
          useValue: { logAction: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GruposController>(GruposController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should extract token and call service.findAll with workspace_id', async () => {
    const req = {
      user: { id: 'ws-123', rol: 'gestor', workspace_id: 'ws-123' },
      headers: { authorization: 'Bearer tok-123' },
    } as any;

    const result = await controller.findAll(req);
    expect(service.findAll).toHaveBeenCalledWith('ws-123', 'tok-123');
    expect(result).toEqual([{ id: 'g-1', nombre: 'Grupo 1' }]);
  });

  it('create should call service.create with body and workspace_id', async () => {
    const req = {
      user: { id: 'ws-123', rol: 'gestor', workspace_id: 'ws-123' },
      headers: { authorization: 'Bearer tok-123' },
    } as any;

    const result = await controller.create({ nombre: 'Nuevo Grupo' }, req);
    expect(service.create).toHaveBeenCalledWith({ nombre: 'Nuevo Grupo' }, 'ws-123', 'tok-123');
    expect(result).toEqual({ id: 'g-2', nombre: 'Grupo 2' });
  });
});
