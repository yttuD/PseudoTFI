import type { UnidadItem, GrupoItem } from '@/components/gestor/BentoGruposGrid';

export interface UnidadesFetchResult {
  ok: boolean;
  data: UnidadItem[];
  count: number;
  page: number;
  limit: number;
  error?: string;
}

export interface GruposFetchResult {
  ok: boolean;
  data: GrupoItem[];
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 8000;

function parseStrictInt(value: unknown, fallback: number, min = 1, max = 1000000): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const num = Number(value.trim());
    if (Number.isSafeInteger(num) && num >= min && num <= max) {
      return num;
    }
  }
  return fallback;
}

export async function fetchMisUnidades(
  accessToken: string | null,
  pageParam: unknown = 1,
  limitParam: unknown = 12
): Promise<UnidadesFetchResult> {
  const safePage = parseStrictInt(pageParam, 1, 1, 1000000);
  const safeLimit = parseStrictInt(limitParam, 12, 1, 100);

  if (!accessToken) {
    return { ok: false, data: [], count: 0, page: safePage, limit: safeLimit, error: 'NO_TOKEN' };
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://127.0.0.1:3001';
    const url = new URL(`${apiUrl}/unidades`);
    url.searchParams.set('page', String(safePage));
    url.searchParams.set('limit', String(safeLimit));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        ok: false,
        data: [],
        count: 0,
        page: safePage,
        limit: safeLimit,
        error: `HTTP_${res.status}`,
      };
    }

    const payload = await res.json();
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray(payload.data) &&
      Number.isSafeInteger(payload.count) &&
      payload.count >= 0 &&
      Number.isSafeInteger(payload.page) &&
      payload.page >= 1 &&
      Number.isSafeInteger(payload.limit) &&
      payload.limit >= 1
    ) {
      return {
        ok: true,
        data: payload.data,
        count: payload.count,
        page: payload.page,
        limit: payload.limit,
      };
    }

    return {
      ok: false,
      data: [],
      count: 0,
      page: safePage,
      limit: safeLimit,
      error: 'INVALID_PAYLOAD',
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    return {
      ok: false,
      data: [],
      count: 0,
      page: safePage,
      limit: safeLimit,
      error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

export async function fetchMisGrupos(
  accessToken: string | null
): Promise<GruposFetchResult> {
  if (!accessToken) {
    return { ok: false, data: [], error: 'NO_TOKEN' };
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://127.0.0.1:3001';
    const res = await fetch(`${apiUrl}/grupos`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        ok: false,
        data: [],
        error: `HTTP_${res.status}`,
      };
    }

    const payload = await res.json();
    if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
      return {
        ok: true,
        data: payload.data,
      };
    }

    if (Array.isArray(payload)) {
      return {
        ok: true,
        data: payload,
      };
    }

    return {
      ok: false,
      data: [],
      error: 'INVALID_PAYLOAD',
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
    return {
      ok: false,
      data: [],
      error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}
