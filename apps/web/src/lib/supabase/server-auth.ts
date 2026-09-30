import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { SupabaseClient } from '@supabase/supabase-js';
import { isTestAdapterEnabled } from '../test-adapter';

export interface ServerAuthResult {
  user: { id: string; email?: string; user_metadata?: { role?: string; rol?: string } } | null;
  accessToken: string | null;
}

export async function getServerAuth(
  cookieStore: ReadonlyRequestCookies,
  supabase: SupabaseClient
): Promise<ServerAuthResult> {
  // 1. Only parse test/dev cookie token when explicitly allowed in non-production environments
  if (isTestAdapterEnabled()) {
    const authCookie =
      cookieStore.get('sb-localhost-auth-token')?.value ||
      cookieStore.get('sb-127-auth-token')?.value ||
      cookieStore.get('sb-auth-token')?.value;

    if (authCookie) {
      try {
        const raw = authCookie.startsWith('base64-') ? authCookie.slice(7) : authCookie;
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        if (parsed.user && parsed.access_token) {
          return {
            user: parsed.user,
            accessToken: parsed.access_token,
          };
        }
      } catch {
        // continue to Supabase
      }
    }
  }

  // 2. Query authoritative Supabase session
  let user = null;
  let accessToken = null;

  try {
    const sessionPromise = supabase.auth.getSession();
    const releaseMode = process.env.NODE_ENV === 'production' || process.env.RENDO_BETA_MODE === 'true';
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), releaseMode ? 5000 : 800));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await Promise.race([sessionPromise, timeoutPromise]);
    if (result?.data?.session) {
      user = result.data.session.user;
      accessToken = result.data.session.access_token;
    }
  } catch {
    // ignore
  }

  return { user, accessToken };
}
