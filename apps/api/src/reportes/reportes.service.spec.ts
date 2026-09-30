import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ReportesService', () => {
  let service: ReportesService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  beforeEach(async () => {
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-reportador' } },
          error: null,
        }),
      },
      from: vi.fn(),
    };

    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should successfully insert reporte if unidad is publicada', async () => {
    const singleUnidadMock = vi.fn().mockResolvedValue({ data: { estado: 'publicada' }, error: null });
    const eqUnidadMock = vi.fn().mockReturnValue({ single: singleUnidadMock });
    const selectUnidadMock = vi.fn().mockReturnValue({ eq: eqUnidadMock });

    const insertReporteMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'unidades') return { select: selectUnidadMock };
      if (table === 'reportes') return { insert: insertReporteMock };
      return {};
    });

    await service.create({ unidad_id: 'u-1', motivo: 'Información falsa' }, 'Bearer tok-1');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('unidades');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('reportes');
    expect(insertReporteMock).toHaveBeenCalledWith({
      unidad_id: 'u-1',
      usuario_id: 'user-reportador',
      motivo: 'Información falsa',
    });
  });

  it('create should throw BadRequestException if unidad is not publicada', async () => {
    const singleUnidadMock = vi.fn().mockResolvedValue({ data: { estado: 'borrador' }, error: null });
    const eqUnidadMock = vi.fn().mockReturnValue({ single: singleUnidadMock });
    const selectUnidadMock = vi.fn().mockReturnValue({ eq: eqUnidadMock });
    mockSupabaseClient.from.mockReturnValue({ select: selectUnidadMock });

    await expect(service.create({ unidad_id: 'u-1', motivo: 'Spam' }, 'tok-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('create should throw ConflictException if already reported (code 23505)', async () => {
    const singleUnidadMock = vi.fn().mockResolvedValue({ data: { estado: 'publicada' }, error: null });
    const eqUnidadMock = vi.fn().mockReturnValue({ single: singleUnidadMock });
    const selectUnidadMock = vi.fn().mockReturnValue({ eq: eqUnidadMock });

    const insertReporteMock = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'unidades') return { select: selectUnidadMock };
      if (table === 'reportes') return { insert: insertReporteMock };
      return {};
    });

    await expect(service.create({ unidad_id: 'u-1', motivo: 'Spam' }, 'tok-1')).rejects.toThrow(ConflictException);
  });
});
