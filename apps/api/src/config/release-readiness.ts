type Environment = Record<string, string | undefined>;

const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export function isReleaseRuntime(env: Environment = process.env): boolean {
  return env.NODE_ENV === 'production' || env.RENDO_BETA_MODE === 'true';
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost') ||
    host === '127.0.0.1' || host.startsWith('127.') ||
    host === '0.0.0.0' || host === '::1' || host === '[::1]';
}

function validateHostedOrigin(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required release setting: ${name}`);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || isLoopback(parsed.hostname) ||
        parsed.username || parsed.password || parsed.pathname !== '/' ||
        parsed.search || parsed.hash || parsed.origin !== value.replace(/\/$/, '')) {
      throw new Error(name);
    }
    return parsed.origin;
  } catch {
    throw new Error(`Invalid release origin: ${name}`);
  }
}

export function parseAllowedWebOrigins(env: Environment = process.env): string[] {
  const configured = env.WEB_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!configured?.length) {
    if (isReleaseRuntime(env)) throw new Error('Missing required release setting: WEB_ORIGINS');
    return localOrigins;
  }
  if (isReleaseRuntime(env)) {
    return configured.map((origin) => validateHostedOrigin(origin, 'WEB_ORIGINS'));
  }
  return configured;
}

export function assertApiReleaseConfiguration(env: Environment = process.env): void {
  if (!isReleaseRuntime(env)) return;

  validateHostedOrigin(env.SUPABASE_URL, 'SUPABASE_URL');
  for (const name of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!env[name]?.trim()) throw new Error(`Missing required release setting: ${name}`);
  }
  if (env.SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Release keys must be distinct: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  }
  parseAllowedWebOrigins(env);

  for (const name of ['AUTH_ALLOW_DEV_TOKENS', 'NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS']) {
    if (env[name] === 'true') throw new Error(`Forbidden release setting: ${name}`);
  }
  if (env.RENDO_BETA_MODE === 'true') {
    for (const name of ['PAYMENTS_ENABLED', 'FISCAL_ENABLED']) {
      if (env[name] === 'true') throw new Error(`Forbidden beta setting: ${name}`);
    }
  }
}
