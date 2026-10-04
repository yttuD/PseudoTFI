import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnidadesController } from './unidades.controller.js';
import { UnidadesService } from './unidades.service.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth/supabase-auth.guard.js';
import type { GetUnidadesDto } from './dto/get-unidades.dto.js';
import type { DelegationConfiguration, AccessContext } from '../authorization/authorization.types.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { ActionLogService } from '../authorization/action-log.service.js';
import type { CupoService } from '../cupo/cupo.service.js';
import type { TraduccionService } from '../common/services/traduccion/traduccion.service.js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface MockUnidadesService {
  findAll: ReturnType<typeof vi.fn>;
}

interface MockAuthzService {
  resolveAccessContext: ReturnType<typeof vi.fn>;
  canReadUnidad: ReturnType<typeof vi.fn>;
}

interface MockQueryResult {
  data: Array<{ id: string; gestor_id: string; grupo_id?: string }>;
  count: number;
  error: null;
}

interface MockPostgrestBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: <TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

function createMockRequest(
  user: AuthenticatedUser,
  token = 'valid-token',
): AuthenticatedRequest {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
    user,
  } as unknown as AuthenticatedRequest;
}

describe('B006-N01a: Aislamiento e inventario antes de paginación (Unit Regressions)', () => {
  describe('UnidadesController - findAll', () => {
    let controller: UnidadesController;
    let mockUnidadesService: MockUnidadesService;
    let mockAuthzService: MockAuthzService;

    beforeEach(() => {
      mockUnidadesService = {
        findAll: vi.fn(),
      };
      mockAuthzService = {
        resolveAccessContext: vi.fn(),
        canReadUnidad: vi.fn(),
      };
      controller = new UnidadesController(
        mockUnidadesService as unknown as UnidadesService,
        mockAuthzService as unknown as AuthorizationService,
        {} as unknown as ActionLogService,
      );
    });

    it('Gestor A consulta su panel: invoca findAll con exactamente 3 argumentos (sin cuarto undefined)', async () => {
      mockUnidadesService.findAll.mockResolvedValue({
        data: [{ id: 'u-gestor-a-1', gestor_id: 'gestor-a-id' }],
        count: 1,
        page: 1,
        limit: 20,
      });

      const userA: AuthenticatedUser = {
        id: 'gestor-a-id',
        rol: 'gestor',
        workspace_id: 'gestor-a-id',
      };
      const req = createMockRequest(userA, 'token-gestor-a');
      const query: GetUnidadesDto = { page: 1, limit: 20 };

      const result = await controller.findAll(query, req);

      expect(mockUnidadesService.findAll).toHaveBeenCalledTimes(1);
      // Debe seguir exactamente el contrato de 3 argumentos para Gestor
      expect(mockUnidadesService.findAll).toHaveBeenCalledWith(
        query,
        'token-gestor-a',
        'gestor-a-id',
      );
      expect(mockAuthzService.resolveAccessContext).not.toHaveBeenCalled();
      expect(mockAuthzService.canReadUnidad).not.toHaveBeenCalled();
      expect(result.count).toBe(1);
    });

    it('Gestor B consulta su panel: usa su propio workspace_id y no se cruza con Gestor A', async () => {
      mockUnidadesService.findAll.mockResolvedValue({
        data: [{ id: 'u-gestor-b-1', gestor_id: 'gestor-b-id' }],
        count: 1,
        page: 1,
        limit: 20,
      });

      const userB: AuthenticatedUser = {
        id: 'gestor-b-id',
        rol: 'gestor',
        workspace_id: 'gestor-b-id',
      };
      const req = createMockRequest(userB, 'token-gestor-b');
      const query: GetUnidadesDto = { page: 1, limit: 20 };

      const result = await controller.findAll(query, req);

      expect(mockUnidadesService.findAll).toHaveBeenCalledWith(
        query,
        'token-gestor-b',
        'gestor-b-id',
      );
      expect(result.data[0].gestor_id).toBe('gestor-b-id');
    });

    it('Delegado con scope grupo: resuelve contexto una sola vez, pasa scope interno y NO ejecuta canReadUnidad N+1', async () => {
      const scope: DelegationConfiguration = {
        permiso: 'ver',
        alcanceTipo: 'grupo',
        grupoId: 'grupo-alpha',
      };
      const accessContext: AccessContext = {
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'ver',
        scope,
        capabilities: ['read_unidad'],
      };

      mockAuthzService.resolveAccessContext.mockResolvedValue(accessContext);
      mockUnidadesService.findAll.mockResolvedValue({
        data: [{ id: 'u-g1', grupo_id: 'grupo-alpha' }],
        count: 5,
        page: 1,
        limit: 1,
      });

      const delegadoUser: AuthenticatedUser = {
        id: 'del-user-1',
        rol: 'delegado',
        workspace_id: 'gestor-a-id',
      };
      const req = createMockRequest(delegadoUser, 'token-delegado');
      const query: GetUnidadesDto = { page: 1, limit: 1 };

      const result = await controller.findAll(query, req);

      expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledTimes(1);
      expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledWith(delegadoUser);
      expect(mockAuthzService.canReadUnidad).not.toHaveBeenCalled();
      expect(mockUnidadesService.findAll).toHaveBeenCalledWith(
        query,
        'token-delegado',
        'gestor-a-id',
        scope,
      );
      expect(result.count).toBe(5);
    });

    it('Delegado con scope unidades explícitas: pasa scope con unidadIds al service', async () => {
      const scope: DelegationConfiguration = {
        permiso: 'ver',
        alcanceTipo: 'unidades',
        unidadIds: ['u-1', 'u-2'],
      };
      const accessContext: AccessContext = {
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'ver',
        scope,
        capabilities: ['read_unidad'],
      };

      mockAuthzService.resolveAccessContext.mockResolvedValue(accessContext);
      mockUnidadesService.findAll.mockResolvedValue({
        data: [{ id: 'u-1' }],
        count: 2,
        page: 1,
        limit: 1,
      });

      const delegadoUser: AuthenticatedUser = {
        id: 'del-user-1',
        rol: 'delegado',
        workspace_id: 'gestor-a-id',
      };
      const req = createMockRequest(delegadoUser, 'token-delegado');
      const query: GetUnidadesDto = { page: 1, limit: 1 };

      const result = await controller.findAll(query, req);

      expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledTimes(1);
      expect(mockUnidadesService.findAll).toHaveBeenCalledWith(
        query,
        'token-delegado',
        'gestor-a-id',
        scope,
      );
      expect(result.count).toBe(2);
    });

    it('Delegado con estado pendiente_configuracion o revocado: devuelve data [] count 0 sin consultar service', async () => {
      const accessContext: AccessContext = {
        actor: 'delegado',
        state: 'pendiente_configuracion',
        ownerOnly: false,
        capabilities: [],
      };

      mockAuthzService.resolveAccessContext.mockResolvedValue(accessContext);

      const delegadoUser: AuthenticatedUser = {
        id: 'del-user-1',
        rol: 'delegado',
        workspace_id: 'gestor-a-id',
      };
      const req = createMockRequest(delegadoUser, 'token-delegado');
      const query: GetUnidadesDto = { page: 2, limit: 10 };

      const result = await controller.findAll(query, req);

      expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledTimes(1);
      expect(mockUnidadesService.findAll).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        count: 0,
        page: 2,
        limit: 10,
      });
    });

    it('Delegado con actor anómalo o scope ausente: fail-closed, devuelve data [] count 0 sin llamar al service', async () => {
      mockAuthzService.resolveAccessContext.mockResolvedValue({
        actor: 'gestor',
        ownerOnly: true,
        capabilities: [],
      } as unknown as AccessContext);

      const delegadoUser: AuthenticatedUser = {
        id: 'del-user-1',
        rol: 'delegado',
        workspace_id: 'gestor-a-id',
      };
      const req = createMockRequest(delegadoUser, 'token-delegado');
      const query: GetUnidadesDto = { page: 1, limit: 10 };

      const result = await controller.findAll(query, req);

      expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledTimes(1);
      expect(mockUnidadesService.findAll).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        count: 0,
        page: 1,
        limit: 10,
      });
    });

    it('Delegado con state activo pero scope ausente: fail-closed, devuelve data [] count 0 sin llamar al service', async () => {
      mockAuthzService.resolveAccessContext.mockResolvedValue({
        actor: 'delegado',
        state: 'activo',
        ownerOnly: false,
        permiso: 'ver',
        scope: undefined as unknown as DelegationConfiguration,
        capabilities: ['read_unidad'],
      });

      const delegadoUser: AuthenticatedUser = {
        id: 'del-user-1',
        rol: 'delegado',
        workspace_id: 'gestor-a-id',
      };
      const req = createMockRequest(delegadoUser, 'token-delegado');
      const query: GetUnidadesDto = { page: 1, limit: 10 };

      const result = await controller.findAll(query, req);

      expect(mockAuthzService.resolveAccessContext).toHaveBeenCalledTimes(1);
      expect(mockUnidadesService.findAll).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        count: 0,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('UnidadesService - findAll query scoping and stable ordering', () => {
    let service: UnidadesService;
    let mockSupabaseClient: { from: ReturnType<typeof vi.fn> };
    let queryBuilder: MockPostgrestBuilder;
    let queryResult: MockQueryResult;

    beforeEach(() => {
      queryResult = {
        data: [{ id: 'u-1', gestor_id: 'gestor-w1' }],
        count: 1,
        error: null,
      };

      queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((onfulfilled) => {
          return Promise.resolve(onfulfilled ? onfulfilled(queryResult) : queryResult);
        }),
      };

      mockSupabaseClient = {
        from: vi.fn().mockReturnValue(queryBuilder),
      };

      const mockSupabaseService = {
        getClient: vi.fn().mockReturnValue(mockSupabaseClient as unknown as SupabaseClient),
      };

      service = new UnidadesService(
        mockSupabaseService as unknown as SupabaseService,
        {} as unknown as CupoService,
        {} as unknown as TraduccionService,
      );
    });

    it('Gestor: aplica eq gestor_id antes de range, y orden estable (created_at desc, id asc)', async () => {
      const result = await service.findAll({ page: 1, limit: 10 }, 'mock-token', 'gestor-w1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('unidades');
      expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(queryBuilder.eq).toHaveBeenCalledWith('gestor_id', 'gestor-w1');
      expect(queryBuilder.is).toHaveBeenCalledWith('deleted_at', null);
      expect(queryBuilder.in).not.toHaveBeenCalled();

      // Verificar orden de llamadas: eq debe ejecutarse ANTES de order y range
      const eqCallOrder = queryBuilder.eq.mock.invocationCallOrder[0];
      const rangeCallOrder = queryBuilder.range.mock.invocationCallOrder[0];
      const orderCallOrder = queryBuilder.order.mock.invocationCallOrder[0];
      expect(eqCallOrder).toBeLessThan(rangeCallOrder);
      expect(eqCallOrder).toBeLessThan(orderCallOrder);

      // Verificación de doble ordenamiento estable (desempate por id)
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(queryBuilder.order).toHaveBeenCalledWith('id', { ascending: true });
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 9);
      expect(result.count).toBe(1);
    });

    it('Delegado con scope grupo: aplica eq(grupo_id) ANTES de range y count', async () => {
      const scope: DelegationConfiguration = {
        permiso: 'ver',
        alcanceTipo: 'grupo',
        grupoId: 'grupo-abc',
      };

      await service.findAll({ page: 1, limit: 5 }, 'mock-token', 'gestor-w1', scope);

      expect(queryBuilder.eq).toHaveBeenCalledWith('gestor_id', 'gestor-w1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('grupo_id', 'grupo-abc');
      expect(queryBuilder.is).toHaveBeenCalledWith('deleted_at', null);

      // Ambos filtros deben ocurrir antes de range
      const eqGrupoOrder = queryBuilder.eq.mock.invocationCallOrder[1];
      const rangeOrder = queryBuilder.range.mock.invocationCallOrder[0];
      expect(eqGrupoOrder).toBeLessThan(rangeOrder);
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 4);
    });

    it('Delegado con scope unidades: aplica in(id, unidadIds) ANTES de range y count', async () => {
      const scope: DelegationConfiguration = {
        permiso: 'ver',
        alcanceTipo: 'unidades',
        unidadIds: ['u-10', 'u-20'],
      };

      await service.findAll({ page: 2, limit: 1 }, 'mock-token', 'gestor-w1', scope);

      expect(queryBuilder.eq).toHaveBeenCalledWith('gestor_id', 'gestor-w1');
      expect(queryBuilder.in).toHaveBeenCalledWith('id', ['u-10', 'u-20']);

      const inCallOrder = queryBuilder.in.mock.invocationCallOrder[0];
      const rangeOrder = queryBuilder.range.mock.invocationCallOrder[0];
      expect(inCallOrder).toBeLessThan(rangeOrder);
      expect(queryBuilder.range).toHaveBeenCalledWith(1, 1);
    });

    it('Delegado con alcanceTipo unidades y lista VACÍA: devuelve data [] count 0 inmediatamente sin consultar Supabase', async () => {
      const scope: DelegationConfiguration = {
        permiso: 'ver',
        alcanceTipo: 'unidades',
        unidadIds: [],
      };

      const result = await service.findAll({ page: 1, limit: 10 }, 'mock-token', 'gestor-w1', scope);

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        count: 0,
        page: 1,
        limit: 10,
      });
    });

    it('Delegado con alcanceTipo cuenta: mantiene eq(gestor_id) sin filtrar grupo ni unidades', async () => {
      const scope: DelegationConfiguration = {
        permiso: 'ver',
        alcanceTipo: 'cuenta',
      };

      await service.findAll({ page: 1, limit: 20 }, 'mock-token', 'gestor-w1', scope);

      expect(queryBuilder.eq).toHaveBeenCalledWith('gestor_id', 'gestor-w1');
      expect(queryBuilder.is).toHaveBeenCalledWith('deleted_at', null);
      expect(queryBuilder.in).not.toHaveBeenCalled();
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 19);
    });
  });
});
