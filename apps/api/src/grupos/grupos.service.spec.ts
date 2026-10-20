import { Test, TestingModule } from '@nestjs/testing';
import { GruposService } from './grupos.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UnprocessableEntityException } from '@nestjs/common';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('GruposService', () => {
  let service: GruposService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  beforeEach(async () => {
    mockSupabaseClient = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GruposService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<GruposService>(GruposService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll should query grupos by gestor_id and return data', async () => {
    const expected = [{ id: 'g-1', nombre: 'Edificio Centro' }];
    const orderMock = vi.fn().mockResolvedValue({ data: expected, error: null });
    const isMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqMock = vi.fn().mockReturnValue({ is: isMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    mockSupabaseClient.from.mockReturnValue({ select: selectMock });

    const result = await service.findAll('gestor-1', 'token-123');

    expect(mockSupabaseService.getClient).toHaveBeenCalledWith('token-123');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('grupos');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqMock).toHaveBeenCalledWith('gestor_id', 'gestor-1');
    expect(isMock).toHaveBeenCalledWith('deleted_at', null);
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(expected);
  });

  it('create should insert new grupo and return single data', async () => {
    const expected = { id: 'g-2', nombre: 'Complejo Norte' };
    const singleMock = vi.fn().mockResolvedValue({ data: expected, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    mockSupabaseClient.from.mockReturnValue({ insert: insertMock });

    const result = await service.create('Complejo Norte', 'gestor-1', 'token-123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('grupos');
    expect(insertMock).toHaveBeenCalledWith({ nombre: 'Complejo Norte', gestor_id: 'gestor-1' });
    expect(result).toEqual(expected);
  });

  it('create should fail closed (throw UnprocessableEntityException) on db error', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    mockSupabaseClient.from.mockReturnValue({ insert: insertMock });

    await expect(service.create('Invalido', 'gestor-1', 'token-123')).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  describe('Seña Integrity and Active-Zero Rejection', () => {
    it('rejects create with active seña and zero or negative value', async () => {
      await expect(
        service.create(
          {
            nombre: 'Grupo Zero',
            sena_default_activa: true,
            sena_default_tipo: 'porcentaje',
            sena_default_valor: 0,
          },
          'gestor-1',
          'token-123',
        ),
      ).rejects.toThrow(/El valor de la seña por defecto debe ser mayor a 0 cuando está activa/);
    });

    it('rejects create with percentage seña greater than 100', async () => {
      await expect(
        service.create(
          {
            nombre: 'Grupo Overflow',
            sena_default_activa: true,
            sena_default_tipo: 'porcentaje',
            sena_default_valor: 120,
          },
          'gestor-1',
          'token-123',
        ),
      ).rejects.toThrow(/El porcentaje de seña por defecto no puede superar el 100%/);
    });

    it('allows inactive seña with zero value', async () => {
      const expected = { id: 'g-inactive', nombre: 'Grupo Inactivo', sena_default_activa: false, sena_default_valor: 0 };
      const singleMock = vi.fn().mockResolvedValue({ data: expected, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      mockSupabaseClient.from.mockReturnValue({ insert: insertMock });

      const result = await service.create(
        {
          nombre: 'Grupo Inactivo',
          sena_default_activa: false,
          sena_default_tipo: 'porcentaje',
          sena_default_valor: 0,
        },
        'gestor-1',
        'token-123',
      );

      expect(result).toEqual(expected);
    });

    it('rejects update with active seña and zero value', async () => {
      const currentGrupo = { id: 'g-1', nombre: 'Edificio Libertador', sena_default_activa: false, sena_default_valor: 0 };
      const singleMock = vi.fn().mockResolvedValue({ data: currentGrupo, error: null });
      const isMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqMock = vi.fn().mockReturnValue({ is: isMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      mockSupabaseClient.from.mockReturnValue({ select: selectMock });

      await expect(
        service.update(
          'g-1',
          {
            sena_default_activa: true,
            sena_default_valor: 0,
          },
          'token-123',
        ),
      ).rejects.toThrow(/El valor de la seña por defecto debe ser mayor a 0 cuando está activa/);
    });
  });

  describe('remove', () => {
    it('calls archive_grupo RPC and returns success: true when payload is valid', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: true, id: 'g-1' },
        error: null,
      });

      const result = await service.remove('g-1', 'token-123');

      expect(mockSupabaseService.getClient).toHaveBeenCalledWith('token-123');
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('archive_grupo', {
        p_grupo_id: 'g-1',
      });
      expect(result).toEqual({ success: true });
    });

    it('throws UnprocessableEntityException when archive_grupo RPC returns error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Grupo no encontrado' },
      });

      await expect(service.remove('g-invalid', 'token-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when RPC returns null data without error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.remove('g-1', 'token-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when RPC returns success: false', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: false, id: 'g-1' },
        error: null,
      });

      await expect(service.remove('g-1', 'token-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when RPC returns wrong group id', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { success: true, id: 'g-different' },
        error: null,
      });

      await expect(service.remove('g-1', 'token-123')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
