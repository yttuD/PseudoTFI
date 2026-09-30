import { AccessContext } from '@tfi/types';
import { isTestAdapterEnabled } from './test-adapter';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  'http://127.0.0.1:3001';

export async function getServerAccessContext(
  token?: string | null,
): Promise<AccessContext | null> {
  if (!token) {
    return null;
  }

  // Check test token payload if explicitly allowed in test environment
  if (isTestAdapterEnabled() && token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.simulateError === true || payload.email?.includes('service-error')) {
          return null;
        }
        if (payload.accessContext) {
          return payload.accessContext as AccessContext;
        }
      }
    } catch {}
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),
      process.env.NODE_ENV === 'production' || process.env.RENDO_BETA_MODE === 'true' ? 8000 : 2000);

    const res = await fetch(`${API_BASE_URL}/delegados/contexto`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as AccessContext;
    return data;
  } catch {
    // Fail closed: Never fabricate authorization context or grant default owner permissions on error
    return null;
  }
}

export async function getClientAccessContext(
  token?: string | null,
): Promise<AccessContext | null> {
  if (!token) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API_BASE_URL}/delegados/contexto`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as AccessContext;
  } catch {
    return null;
  }
}
