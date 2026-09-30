const isRelease = (env) => env.NODE_ENV === 'production' || env.RENDO_BETA_MODE === 'true';

function hostedOrigin(value, name) {
  if (!value) throw new Error(`Missing release setting: ${name}`);
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || host === 'localhost' || host.endsWith('.localhost') ||
        host.startsWith('127.') || host === '0.0.0.0' || host === '[::1]' ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        url.origin !== value.replace(/\/$/, '')) throw new Error(name);
    return url.origin;
  } catch {
    throw new Error(`Invalid release origin: ${name}`);
  }
}

export function resolveWebReleaseConfig(env = process.env) {
  if (!isRelease(env)) {
    return { apiOrigin: env.API_ORIGIN || 'http://127.0.0.1:3001' };
  }
  const apiOrigin = hostedOrigin(env.API_ORIGIN, 'API_ORIGIN');
  const publicApiOrigin = hostedOrigin(env.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL');
  hostedOrigin(env.WEB_PUBLIC_URL, 'WEB_PUBLIC_URL');
  hostedOrigin(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    throw new Error('Missing release setting: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (env.NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS === 'true') {
    throw new Error('Forbidden release setting: NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS');
  }
  if (apiOrigin !== publicApiOrigin) {
    throw new Error('API_ORIGIN and NEXT_PUBLIC_API_URL must match for this deployment');
  }
  return { apiOrigin };
}
