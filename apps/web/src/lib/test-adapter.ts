/**
 * Test Adapter security guard.
 *
 * Requirements:
 * - Strictly returns false if NODE_ENV === 'production' or VERCEL_ENV === 'production'.
 * - Requires explicitly AUTH_ALLOW_DEV_TOKENS === 'true' (or NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS === 'true').
 * - Denies unsigned/dev tokens when the flag is missing or environment is production.
 */
export function isTestAdapterEnabled(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv = process.env.VERCEL_ENV;

  if (nodeEnv === 'production' || vercelEnv === 'production' || process.env.RENDO_BETA_MODE === 'true') {
    return false;
  }

  const allowDevTokens =
    process.env.AUTH_ALLOW_DEV_TOKENS === 'true' ||
    process.env.NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS === 'true';

  return allowDevTokens;
}
