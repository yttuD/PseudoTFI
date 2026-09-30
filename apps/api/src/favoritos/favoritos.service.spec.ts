import { Test, TestingModule } from '@nestjs/testing';
import { FavoritosService } from './favoritos.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ConflictException } from '@nestjs/common';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

describe('FavoritosService', () => {
  let service: FavoritosService;
  let mockSupabaseClient: any;
  let mockSupabaseService: any;

  beforeEach(async () => {
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockResolvedValue({ data: [{ id: 'fav-1', unidad_id: 'u-1' }], error: null }),
        delete: vi.fn().mockReturnValue({
          match: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockSupabaseClient),
      getAdminClient: vi.fn().mockReturnValue(mockSupabaseClient),
      isOnline: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritosService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<FavoritosService>(FavoritosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should insert into favoritos with usuario_id from auth', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseClient.from.mockReturnValue({ insert: insertMock });

    await service.create({ unidad_id: 'u-100' }, 'Bearer fake-token');

    expect(mockSupabaseService.getClient).toHaveBeenCalledWith('fake-token');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('favoritos');
    expect(insertMock).toHaveBeenCalledWith({
      unidad_id: 'u-100',
      usuario_id: 'user-123',
    });
  });

  it('create should return ok: true idempotently on duplicate code 23505', async () => {
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } }),
    });

    const result = await service.create({ unidad_id: 'u-100' }, 'fake-token');
    expect(result).toEqual({ ok: true, alreadyExists: true });
  });

  it('findAll should return favorites from supabase', async () => {
    const expected = [{ id: 'fav-1', unidad_id: 'u-1' }];
    const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
    const eqMock = vi.fn().mockResolvedValue({ data: expected, error: null });
    selectMock.mockReturnValue({ eq: eqMock });
    mockSupabaseClient.from.mockReturnValue({ select: selectMock });

    const result = await service.findAll('Bearer fake-token');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('favoritos');
    expect(selectMock).toHaveBeenCalledWith('unidad_id, unidades(*)');
    expect(eqMock).toHaveBeenCalledWith('usuario_id', 'user-123');
    expect(result).toEqual(expected);
  });

  it('remove should call delete with match on unidad_id and usuario_id', async () => {
    const matchMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ match: matchMock });
    mockSupabaseClient.from.mockReturnValue({ delete: deleteMock });

    await service.remove('u-100', 'Bearer fake-token');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('favoritos');
    expect(deleteMock).toHaveBeenCalled();
    expect(matchMock).toHaveBeenCalledWith({
      unidad_id: 'u-100',
      usuario_id: 'user-123',
    });
  });

  it('beta rejects offline writes and does not save a memory-only favorite', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    mockSupabaseService.isOnline.mockResolvedValue(false);
    await expect(service.create({ unidad_id: 'u-100' }, 'Bearer valid-token', 'user-123'))
      .rejects.toMatchObject({ status: 503 });
  });

  it('beta refuses a missing authenticated identity instead of using a demo user', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    await expect(service.findAll()).rejects.toMatchObject({ status: 401 });
  });
});
