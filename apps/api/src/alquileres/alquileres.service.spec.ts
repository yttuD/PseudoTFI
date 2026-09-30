import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { AlquileresService } from './alquileres.service.js';
import {
  normalizeModality,
  intervalsOverlap,
  getBuenosAiresCalendarDate,
} from '@tfi/types';
import * as fs from 'fs';
import * as path from 'path';

function createMockChain(resolvedData: any, resolvedError: any = null) {
  const result = { data: resolvedData, error: resolvedError };
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

const defaultModalidades = [
  { id: 'mp-1', unidad_tiempo: 'mensual', deleted_at: null, precio: 100000 },
  { id: 'mp-2', unidad_tiempo: 'por_hora', deleted_at: null, precio: 10000 },
  { id: 'mp-3', unidad_tiempo: 'diaria', deleted_at: null, precio: 25000 },
];

describe('AlquileresService Domain Logic (T033 & T034 - Correction Brief 09 & 10)', () => {
  let service: AlquileresService;
  let mockSupabaseService: any;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      from: vi.fn(),
    };
    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue(mockClient),
    };
    service = new AlquileresService(mockSupabaseService);
  });

  describe('Modalities and Canonical Normalization', () => {
    it('normalizes documented aliases properly and rejects unknown/unsupported values', () => {
      // Documented canonical & aliases
      expect(normalizeModality('mensual')).toBe('mensual');
      expect(normalizeModality('mes')).toBe('mensual');
      expect(normalizeModality('diaria')).toBe('diaria');
      expect(normalizeModality('diario')).toBe('diaria');
      expect(normalizeModality('día')).toBe('diaria');
      expect(normalizeModality('dia')).toBe('diaria');
      expect(normalizeModality('por_hora')).toBe('por_hora');
      expect(normalizeModality('hora')).toBe('por_hora');
      expect(normalizeModality('horario')).toBe('por_hora');

      // Unknown values must NEVER normalize to mensual
      expect(normalizeModality('semanal')).toBeNull();
      expect(normalizeModality('anual')).toBeNull();
      expect(normalizeModality('quincenal')).toBeNull();
      expect(normalizeModality('custom_value')).toBeNull();
      expect(normalizeModality('')).toBeNull();
      expect(normalizeModality(null)).toBeNull();
      expect(normalizeModality(undefined)).toBeNull();
    });

    it('rejects creation when Unidad offers only unsupported or non-matching modality', async () => {
      const mockUnidadQuery = createMockChain({
        id: 'u-unsupported',
        grupo_id: null,
        modalidades_precio: [{ unidad_tiempo: 'semanal', deleted_at: null }],
      });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-unsupported',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when requested modality string is unknown', async () => {
      const mockUnidadQuery = createMockChain({
        id: 'u-1',
        grupo_id: null,
        modalidades_precio: [{ unidad_tiempo: 'mes', deleted_at: null }],
      });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'anual' as any,
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Buenos Aires Calendar Dates and Cross-Midnight UTC Boundaries', () => {
    it('formats calendar dates accurately across the UTC boundary in America/Argentina/Buenos_Aires', () => {
      // 22:00 ART (UTC-3) on Oct 15 corresponds to 2026-10-16 01:00 UTC
      const oct15LateUtc = new Date('2026-10-16T01:00:00.000Z');
      expect(getBuenosAiresCalendarDate(oct15LateUtc)).toBe('2026-10-15');

      // 02:00 ART (UTC-3) on Oct 16 corresponds to 2026-10-16 05:00 UTC
      const oct16EarlyUtc = new Date('2026-10-16T05:00:00.000Z');
      expect(getBuenosAiresCalendarDate(oct16EarlyUtc)).toBe('2026-10-16');
    });

    it('derives compatibility fecha_inicio and fecha_fin using Buenos Aires calendar dates', async () => {
      const mockUnidadQuery = createMockChain({
        id: 'u-1',
        grupo_id: null,
        modalidades_precio: [{ unidad_tiempo: 'hora', deleted_at: null }],
      });
      const mockOverlapQuery = createMockChain([]);
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      let insertedPayload: any = null;
      const mockInsertQuery = {
        insert: vi.fn().mockImplementation((rows: any[]) => {
          insertedPayload = rows[0];
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'alq-created' }, error: null }),
            }),
          };
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') {
          const chain = createMockChain([]);
          chain.insert = mockInsertQuery.insert;
          return chain;
        }
        return createMockChain(null);
      });

      // Turno nocturno: Oct 15 22:00 ART -> Oct 16 02:00 ART
      // In UTC: 2026-10-16T01:00:00.000Z to 2026-10-16T05:00:00.000Z
      await service.create(
        {
          unidad_id: 'u-1',
          inquilino_id: 'inq-1',
          modalidad: 'por_hora',
          inicio_at: '2026-10-16T01:00:00.000Z',
          fin_at: '2026-10-16T05:00:00.000Z',
          monto_total: 20000,
        },
        'token-test',
        'workspace-1',
      );

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.fecha_inicio).toBe('2026-10-15');
      expect(insertedPayload.fecha_fin).toBe('2026-10-16');
    });
  });

  describe('Overlap Protection Fails Closed and Respects Boundaries', () => {
    it('throws UnprocessableEntityException on database query error during checkOverlap (fail closed on create)', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockOverlapQueryError = createMockChain(null, { message: 'Database connection timeout' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') return mockOverlapQueryError;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException on database query error during checkOverlap (fail closed on update)', async () => {
      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-1',
        unidad_id: 'u-1',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        modalidad: 'mensual',
      });

      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockOverlapQueryError = createMockChain(null, { message: 'Database query failure' });

      let rentalCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') {
          rentalCallCount++;
          if (rentalCallCount === 1) return mockCurrentRentalQuery;
          return mockOverlapQueryError;
        }
        return createMockChain(null);
      });

      await expect(
        service.update(
          'alq-1',
          {
            inicio_at: '2026-10-05T00:00:00.000Z',
            fin_at: '2026-10-25T00:00:00.000Z',
          },
          'token-test',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects rental overlapping the final occupied day of a legacy date-only row', async () => {
      // Legacy rental occupies 2026-10-01 to 2026-10-05 inclusive.
      // Next Buenos Aires midnight is 2026-10-06 00:00:00 ART (2026-10-06T03:00:00.000Z).
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockOverlapQuery = createMockChain([
        {
          id: 'legacy-rental-1',
          inicio_at: null,
          fin_at: null,
          fecha_inicio: '2026-10-01',
          fecha_fin: '2026-10-05',
        },
      ]);

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') return mockOverlapQuery;
        return createMockChain(null);
      });

      // Hourly rental on Oct 5 at 20:00 ART (23:00 UTC) to 23:00 ART (02:00 UTC Oct 6)
      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'por_hora',
            inicio_at: '2026-10-05T23:00:00.000Z',
            fin_at: '2026-10-06T02:00:00.000Z',
            monto_total: 15000,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('allows booking on exact boundary adjacency following a legacy date-only row', async () => {
      // Legacy rental: Oct 1 to Oct 5 inclusive (ends at Oct 6 00:00:00 ART -> 2026-10-06T03:00:00.000Z)
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockOverlapQuery = createMockChain([
        {
          id: 'legacy-rental-1',
          inicio_at: null,
          fin_at: null,
          fecha_inicio: '2026-10-01',
          fecha_fin: '2026-10-05',
        },
      ]);
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      const mockInsertQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'alq-adjacent' }, error: null }),
          }),
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') {
          const chain = createMockChain([
            {
              id: 'legacy-rental-1',
              inicio_at: null,
              fin_at: null,
              fecha_inicio: '2026-10-01',
              fecha_fin: '2026-10-05',
            },
          ]);
          chain.insert = mockInsertQuery.insert;
          return chain;
        }
        return createMockChain(null);
      });

      // New rental starting exactly at Oct 6 00:00:00 ART (2026-10-06T03:00:00.000Z)
      const created = await service.create(
        {
          unidad_id: 'u-1',
          inquilino_id: 'inq-1',
          modalidad: 'mensual',
          inicio_at: '2026-10-06T03:00:00.000Z',
          fin_at: '2026-11-06T03:00:00.000Z',
          monto_total: 300000,
        },
        'token-test',
        'workspace-1',
      );

      expect(created).toBeDefined();
      expect(created.id).toBe('alq-adjacent');
    });

    it('update excludes self from overlap query', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-self',
        unidad_id: 'u-1',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        modalidad: 'mensual',
        monto_total: 200000,
        sena_eleccion: 'sin_sena',
      });

      const mockUpdateQuery = {
        update: vi.fn().mockImplementation((payload: any) => ({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'alq-self', monto_total: 250000 }, error: null }),
          }),
        })),
      };

      let rentalCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') {
          rentalCallCount++;
          if (rentalCallCount === 1) return mockCurrentRentalQuery;
          const chain = createMockChain([]);
          chain.update = mockUpdateQuery.update;
          return chain;
        }
        return createMockChain(null);
      });

      const updated = await service.update(
        'alq-self',
        {
          monto_total: 250000,
        },
        'token-test',
      );

      expect(updated).toBeDefined();
      expect(updated.id).toBe('alq-self');
    });
  });

  describe('Authoritative Seña Invariants and Isolation', () => {
    it('rejects personalizada seña with value 0 or negative', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockOverlapQuery = createMockChain([]);
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') return mockOverlapQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 200000,
            sena_eleccion: 'personalizada',
            sena_tipo: 'monto_fijo',
            sena_valor: 0,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects heredar_grupo when Grupo has inactive or zero default seña', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: 'g-inactive', modalidades_precio: defaultModalidades });
      const mockGrupoQuery = createMockChain({
        id: 'g-inactive',
        sena_default_activa: false,
        sena_default_valor: 0,
      });
      const mockOverlapQuery = createMockChain([]);
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'grupos') return mockGrupoQuery;
        if (table === 'alquileres') return mockOverlapQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 200000,
            sena_eleccion: 'heredar_grupo',
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists inherited source Grupo ID and resolves amount server-side', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: 'g-1', modalidades_precio: defaultModalidades });
      const mockGrupoQuery = createMockChain({
        id: 'g-1',
        sena_default_activa: true,
        sena_default_tipo: 'porcentaje',
        sena_default_valor: 25,
      });
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      let insertedPayload: any = null;
      const mockInsertQuery = {
        insert: vi.fn().mockImplementation((rows: any[]) => {
          insertedPayload = rows[0];
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'alq-created' }, error: null }),
            }),
          };
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'grupos') return mockGrupoQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') {
          const chain = createMockChain([]);
          chain.insert = mockInsertQuery.insert;
          return chain;
        }
        return createMockChain(null);
      });

      await service.create(
        {
          unidad_id: 'u-1',
          inquilino_id: 'inq-1',
          modalidad: 'mensual',
          inicio_at: '2026-10-01T00:00:00.000Z',
          fin_at: '2026-10-31T00:00:00.000Z',
          monto_total: 400000,
          sena_eleccion: 'heredar_grupo',
        },
        'token-test',
        'workspace-1',
      );

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.sena_eleccion).toBe('heredar_grupo');
      expect(insertedPayload.sena_origen_grupo_id).toBe('g-1');
      expect(insertedPayload.sena_tipo).toBe('porcentaje');
      expect(insertedPayload.sena_valor).toBe(25);
      expect(insertedPayload.monto_sena).toBe(100000); // 25% of 400k
    });

    it('clears seña metadata completely when updating to sin_sena (opt-out)', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: 'g-1', modalidades_precio: defaultModalidades });
      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-with-sena',
        unidad_id: 'u-1',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        modalidad: 'mensual',
        monto_total: 300000,
        sena_eleccion: 'heredar_grupo',
        sena_tipo: 'porcentaje',
        sena_valor: 20,
        sena_origen_grupo_id: 'g-1',
        monto_sena: 60000,
      });

      let updatedPayload: any = null;
      const mockUpdateQuery = {
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload;
          return {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'alq-with-sena', ...payload }, error: null }),
            }),
          };
        }),
      };

      let rentalCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') {
          rentalCallCount++;
          if (rentalCallCount === 1) return mockCurrentRentalQuery;
          const chain = createMockChain([]);
          chain.update = mockUpdateQuery.update;
          return chain;
        }
        return createMockChain(null);
      });

      await service.update(
        'alq-with-sena',
        {
          sena_eleccion: 'sin_sena',
        },
        'token-test',
      );

      expect(updatedPayload).toBeDefined();
      expect(updatedPayload.sena_eleccion).toBe('sin_sena');
      expect(updatedPayload.monto_sena).toBe(0);
      expect(updatedPayload.sena_tipo).toBeNull();
      expect(updatedPayload.sena_valor).toBeNull();
      expect(updatedPayload.sena_origen_grupo_id).toBeNull();
    });

    it('authoritatively recomputes resolved seña on update when monto_total changes', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: 'g-1', modalidades_precio: defaultModalidades });
      const mockGrupoQuery = createMockChain({
        id: 'g-1',
        sena_default_activa: true,
        sena_default_tipo: 'porcentaje',
        sena_default_valor: 20,
      });

      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-inherited',
        unidad_id: 'u-1',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        modalidad: 'mensual',
        monto_total: 500000,
        sena_eleccion: 'heredar_grupo',
        sena_tipo: 'porcentaje',
        sena_valor: 20,
        sena_origen_grupo_id: 'g-1',
        monto_sena: 100000,
      });

      let updatedPayload: any = null;
      const mockUpdateQuery = {
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload;
          return {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'alq-inherited', ...payload }, error: null }),
            }),
          };
        }),
      };

      let rentalCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'grupos') return mockGrupoQuery;
        if (table === 'alquileres') {
          rentalCallCount++;
          if (rentalCallCount === 1) return mockCurrentRentalQuery;
          const chain = createMockChain([]);
          chain.update = mockUpdateQuery.update;
          return chain;
        }
        return createMockChain(null);
      });

      // Total increases to 800k; seña should recompute to 20% = 160k
      await service.update(
        'alq-inherited',
        {
          monto_total: 800000,
        },
        'token-test',
      );

      expect(updatedPayload).toBeDefined();
      expect(updatedPayload.monto_total).toBe(800000);
      expect(updatedPayload.monto_sena).toBe(160000);
      expect(updatedPayload.sena_origen_grupo_id).toBe('g-1');
    });
  });

  describe('Brief 10 Contract Invariants: Seña, Monto Total & Modality Validations', () => {
    it('rejects ambiguous personalizada seña when sena_tipo is missing', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') return createMockChain([]);
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
            sena_eleccion: 'personalizada',
            sena_valor: 15000,
          } as any,
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects ambiguous personalizada seña when sena_valor is missing or invalid', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') return createMockChain([]);
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
            sena_eleccion: 'personalizada',
            sena_tipo: 'monto_fijo',
          } as any,
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects personalizada seña when client-submitted monto_sena conflicts with computed value', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') return createMockChain([]);
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
            sena_eleccion: 'personalizada',
            sena_tipo: 'monto_fijo',
            sena_valor: 20000,
            monto_sena: 50000, // Conflict!
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when monto_total is zero or negative', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 0,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: -100,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update when monto_total is zero or negative', async () => {
      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-1',
        unidad_id: 'u-1',
        modalidad: 'mensual',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        monto_total: 100000,
      });
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') return mockCurrentRentalQuery;
        return createMockChain(null);
      });

      await expect(
        service.update('alq-1', { monto_total: 0 }, 'token-test'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.update('alq-1', { monto_total: -50 }, 'token-test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when modalidad is omitted', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-1',
            inquilino_id: 'inq-1',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
          } as any,
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when Unidad has empty active modalities list', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-empty', grupo_id: null, modalidades_precio: [] });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-empty',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when requested modality is not offered by the Unidad', async () => {
      const mockUnidadQuery = createMockChain({
        id: 'u-only-hourly',
        grupo_id: null,
        modalidades_precio: [{ id: 'mp-1', unidad_tiempo: 'por_hora', deleted_at: null, precio: 5000 }],
      });
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        return createMockChain(null);
      });

      await expect(
        service.create(
          {
            unidad_id: 'u-only-hourly',
            inquilino_id: 'inq-1',
            modalidad: 'mensual',
            inicio_at: '2026-10-01T00:00:00.000Z',
            fin_at: '2026-10-31T00:00:00.000Z',
            monto_total: 100000,
          },
          'token-test',
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update when current rental modality in database is corrupt or unknown', async () => {
      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-corrupt',
        unidad_id: 'u-1',
        modalidad: 'unsupported_modality',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        monto_total: 100000,
      });
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: null, modalidades_precio: defaultModalidades });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'alquileres') return mockCurrentRentalQuery;
        return createMockChain(null);
      });

      await expect(
        service.update('alq-corrupt', { monto_total: 120000 }, 'token-test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update moving rental to an incompatible Unidad that does not offer its modality', async () => {
      const mockCurrentRentalQuery = createMockChain({
        id: 'alq-1',
        unidad_id: 'u-1',
        modalidad: 'mensual',
        inicio_at: '2026-10-01T00:00:00.000Z',
        fin_at: '2026-10-31T00:00:00.000Z',
        monto_total: 100000,
      });
      const mockUnidadIncompatible = createMockChain({
        id: 'u-incompatible',
        grupo_id: null,
        modalidades_precio: [{ id: 'mp-1', unidad_tiempo: 'por_hora', deleted_at: null, precio: 5000 }],
      });

      let rentalCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadIncompatible;
        if (table === 'alquileres') {
          rentalCallCount++;
          if (rentalCallCount === 1) return mockCurrentRentalQuery;
          return createMockChain([]);
        }
        return createMockChain(null);
      });

      await expect(
        service.update('alq-1', { unidad_id: 'u-incompatible' }, 'token-test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists coherent personalizada fixed seña with sena_origen_grupo_id: null', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: 'g-1', modalidades_precio: defaultModalidades });
      const mockOverlapQuery = createMockChain([]);
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      let insertedPayload: any = null;
      const mockInsertQuery = {
        insert: vi.fn().mockImplementation((rows: any[]) => {
          insertedPayload = rows[0];
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'alq-fixed' }, error: null }),
            }),
          };
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') {
          const chain = createMockChain([]);
          chain.insert = mockInsertQuery.insert;
          return chain;
        }
        return createMockChain(null);
      });

      await service.create(
        {
          unidad_id: 'u-1',
          inquilino_id: 'inq-1',
          modalidad: 'mensual',
          inicio_at: '2026-10-01T00:00:00.000Z',
          fin_at: '2026-10-31T00:00:00.000Z',
          monto_total: 200000,
          sena_eleccion: 'personalizada',
          sena_tipo: 'monto_fijo',
          sena_valor: 65000,
          monto_sena: 65000,
        },
        'token-test',
        'workspace-1',
      );

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.sena_eleccion).toBe('personalizada');
      expect(insertedPayload.sena_tipo).toBe('monto_fijo');
      expect(insertedPayload.sena_valor).toBe(65000);
      expect(insertedPayload.monto_sena).toBe(65000);
      expect(insertedPayload.sena_origen_grupo_id).toBeNull();
    });

    it('persists coherent personalizada percentage seña with sena_origen_grupo_id: null', async () => {
      const mockUnidadQuery = createMockChain({ id: 'u-1', grupo_id: 'g-1', modalidades_precio: defaultModalidades });
      const mockOverlapQuery = createMockChain([]);
      const mockInquilinoQuery = createMockChain({ id: 'inq-1' });

      let insertedPayload: any = null;
      const mockInsertQuery = {
        insert: vi.fn().mockImplementation((rows: any[]) => {
          insertedPayload = rows[0];
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'alq-percentage' }, error: null }),
            }),
          };
        }),
      };

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'unidades') return mockUnidadQuery;
        if (table === 'inquilinos') return mockInquilinoQuery;
        if (table === 'alquileres') {
          const chain = createMockChain([]);
          chain.insert = mockInsertQuery.insert;
          return chain;
        }
        return createMockChain(null);
      });

      await service.create(
        {
          unidad_id: 'u-1',
          inquilino_id: 'inq-1',
          modalidad: 'mensual',
          inicio_at: '2026-10-01T00:00:00.000Z',
          fin_at: '2026-10-31T00:00:00.000Z',
          monto_total: 200000,
          sena_eleccion: 'personalizada',
          sena_tipo: 'porcentaje',
          sena_valor: 20,
          monto_sena: 40000, // 20% of 200,000
        },
        'token-test',
        'workspace-1',
      );

      expect(insertedPayload).toBeDefined();
      expect(insertedPayload.sena_eleccion).toBe('personalizada');
      expect(insertedPayload.sena_tipo).toBe('porcentaje');
      expect(insertedPayload.sena_valor).toBe(20);
      expect(insertedPayload.monto_sena).toBe(40000);
      expect(insertedPayload.sena_origen_grupo_id).toBeNull();
    });
  });

  describe('Static Migration Integrity Verification (Fail-Fast Concurrency & Brief 10 Invariants)', () => {
    it('proves migration contains mandatory btree_gist and exclusion constraint without notice catch-all', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        '../../supabase/migrations/20260927100000_alquileres_modalidades_senas_intervalos.sql',
      );
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sql = fs.readFileSync(migrationPath, 'utf8');

      // 1. Mandatory btree_gist without swallow
      expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS btree_gist;/);
      expect(sql).not.toMatch(/btree_gist extension could not be loaded/);

      // 2. Exclusion constraint exists and covers correct business set
      expect(sql).toMatch(/conname = 'exclude_alquileres_intervalo_overlap'/);
      expect(sql).toMatch(/EXCLUDE USING gist/);
      expect(sql).toMatch(/tstzrange\(inicio_at, fin_at, '\[\)'\)/);
      expect(sql).toMatch(/WHERE \(deleted_at IS NULL AND estado != 'cancelado'\)/);

      // 3. No catch-all exception swallowing around exclusion constraint
      expect(sql).not.toMatch(/RAISE NOTICE 'No se pudo aplicar exclusion constraint/);

      // 4. Historical rows backfilled and NOT NULL enforced
      expect(sql).toMatch(/ALTER COLUMN inicio_at SET NOT NULL/);
      expect(sql).toMatch(/ALTER COLUMN fin_at SET NOT NULL/);
      expect(sql).toMatch(/RAISE EXCEPTION 'Existen filas historicas de alquileres sin fechas validas para backfill de inicio_at\/fin_at'/);

      // 5. Coherent seña check constraint
      expect(sql).toMatch(/check_alquileres_sena_coherencia/);
      expect(sql).toMatch(/check_grupos_sena_default_valor/);

      // 6. Brief 10: sena_origen_grupo_id IS NULL for personalizada
      expect(sql).toMatch(/sena_eleccion = 'personalizada'[\s\S]*?sena_origen_grupo_id IS NULL/);

      // 7. Brief 10: check_alquileres_monto_total_positivo
      expect(sql).toMatch(/check_alquileres_monto_total_positivo/);
      expect(sql).toMatch(/monto_total > 0/);
    });
  });
});
