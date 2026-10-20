import { Test, TestingModule } from '@nestjs/testing';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { SupabasePublicAuthGuard } from '../auth/supabase-public-auth.guard.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ReportesController', () => {
  let controller: ReportesController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        {
          provide: ReportesService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(SupabasePublicAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportesController>(ReportesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to service.create', async () => {
    const req = { headers: { authorization: 'Bearer token-report' } } as any;
    await controller.create({ unidad_id: 'u-1', motivo: 'Fraude' }, req);
    expect(service.create).toHaveBeenCalledWith(
      { unidad_id: 'u-1', motivo: 'Fraude' },
      'Bearer token-report',
    );
  });
});
