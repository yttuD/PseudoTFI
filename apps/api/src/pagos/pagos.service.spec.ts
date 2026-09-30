import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PagosService } from './pagos.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { Preference } from 'mercadopago';

vi.spyOn(Preference.prototype, 'create').mockResolvedValue({
  init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123',
} as any);

afterEach(() => vi.unstubAllEnvs());

describe('PagosService - Cobro Incremental', () => {
  let service: PagosService;
  let mockSupabaseClient: any;
  let mockInsert: any;
  let mockSelect: any;

  beforeEach(async () => {
    mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'pago-uuid-123' },
          error: null,
        }),
      }),
    });

    mockSelect = vi.fn();

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: mockSelect,
              }),
            }),
          };
        }
        if (table === 'pagos') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      }),
    };

    const mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockSupabaseClient),
      getAdminClient: vi.fn().mockReturnValue(mockSupabaseClient),
    };

    const mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'MP_ACCESS_TOKEN') return 'TEST-ACCESS-TOKEN';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PagosService>(PagosService);
  });

  it('debe cobrar $39.600 en MP al pasar de 5 a 10 unidades (cruce de tramo)', async () => {
    // Gestor tiene cupo_maximo = 5
    mockSelect.mockResolvedValueOnce({
      data: { cupo_maximo: 5 },
      error: null,
    });

    const result = await service.crearPreferenciaMercadoPago('token-123', 'gestor-123', 5);

    expect(result).toHaveProperty('init_point');
    // Verificar que en la tabla pagos se insertó el monto delta: $84.150 - $44.550 = $39.600
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        gestor_id: 'gestor-123',
        metodo: 'mercadopago',
        cupo_adquirido: 5,
        monto: 39600,
        estado: 'pendiente',
      }),
    );
  });

  it('debe cobrar $17.820 en MP al pasar de 6 a 8 unidades (sin cruce de tramo)', async () => {
    // Gestor tiene cupo_maximo = 6
    mockSelect.mockResolvedValueOnce({
      data: { cupo_maximo: 6 },
      error: null,
    });

    const result = await service.crearPreferenciaMercadoPago('token-123', 'gestor-123', 2);

    expect(result).toHaveProperty('init_point');
    // Verificar que en la tabla pagos se insertó el monto delta: $71.280 - $53.460 = $17.820
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        gestor_id: 'gestor-123',
        metodo: 'mercadopago',
        cupo_adquirido: 2,
        monto: 17820,
        estado: 'pendiente',
      }),
    );
  });

  it('debe cobrar $17.820 en efectivo al pasar de 6 a 8 unidades', async () => {
    mockSelect.mockResolvedValueOnce({
      data: { cupo_maximo: 6 },
      error: null,
    });
    mockInsert.mockReturnValueOnce({
      select: vi.fn(),
      then: (resolve: any) => resolve({ error: null }),
    });

    const result = await service.registrarPagoEfectivo('token-123', 'gestor-123', 2);

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        gestor_id: 'gestor-123',
        metodo: 'efectivo',
        cupo_adquirido: 2,
        monto: 17820,
        estado: 'pendiente',
      }),
    );
  });

  it('beta blocks payment creation and webhook processing before database access', async () => {
    vi.stubEnv('RENDO_BETA_MODE', 'true');
    await expect(service.crearPreferenciaMercadoPago('token', 'gestor', 1)).rejects.toMatchObject({ status: 503 });
    await expect(service.registrarPagoEfectivo('token', 'gestor', 1)).rejects.toMatchObject({ status: 503 });
    await expect(service.procesarWebhookMercadoPago({ type: 'payment', data: { id: '123' } }))
      .rejects.toMatchObject({ status: 503 });
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });
});
