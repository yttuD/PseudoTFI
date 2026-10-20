import { Test, TestingModule } from '@nestjs/testing';
import { FavoritosController } from './favoritos.controller.js';
import { FavoritosService } from './favoritos.service.js';
import { SupabasePublicAuthGuard } from '../auth/supabase-public-auth.guard.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('FavoritosController', () => {
  let controller: FavoritosController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(undefined),
      findAll: vi.fn().mockResolvedValue([{ id: 'fav-1' }]),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritosController],
      providers: [
        {
          provide: FavoritosService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(SupabasePublicAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FavoritosController>(FavoritosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to service.create', async () => {
    const req = { headers: { authorization: 'Bearer token-123' } } as any;
    await controller.create({ unidad_id: 'u-1' }, req);
    expect(service.create).toHaveBeenCalledWith({ unidad_id: 'u-1' }, 'Bearer token-123', undefined);
  });

  it('findAll should delegate to service.findAll', async () => {
    const req = { headers: { authorization: 'Bearer token-123' } } as any;
    const result = await controller.findAll(req);
    expect(service.findAll).toHaveBeenCalledWith('Bearer token-123', undefined);
    expect(result).toEqual([{ id: 'fav-1' }]);
  });

  it('remove should delegate to service.remove', async () => {
    const req = { headers: { authorization: 'Bearer token-123' } } as any;
    await controller.remove('u-1', req);
    expect(service.remove).toHaveBeenCalledWith('u-1', 'Bearer token-123', undefined);
  });
});
