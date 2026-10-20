import { describe, expect, it } from 'vitest';
import { assertApiReleaseConfiguration, parseAllowedWebOrigins } from './release-readiness.js';

const betaEnv = {
  NODE_ENV: 'production',
  RENDO_BETA_MODE: 'true',
  SUPABASE_URL: 'https://beta-data.example.test',
  SUPABASE_ANON_KEY: 'public-beta-key',
  SUPABASE_SERVICE_ROLE_KEY: 'private-beta-key',
  WEB_ORIGINS: 'https://beta.rendo.example',
  PAYMENTS_ENABLED: 'false',
  FISCAL_ENABLED: 'false',
};

describe('closed beta API release configuration', () => {
  it('accepts explicit non-local beta settings', () => {
    expect(() => assertApiReleaseConfiguration(betaEnv)).not.toThrow();
    expect(parseAllowedWebOrigins(betaEnv)).toEqual(['https://beta.rendo.example']);
  });

  it('rejects missing required values without echoing secret contents', () => {
    const env = { ...betaEnv, SUPABASE_SERVICE_ROLE_KEY: '' };
    expect(() => assertApiReleaseConfiguration(env)).toThrow('SUPABASE_SERVICE_ROLE_KEY');
    expect(() => assertApiReleaseConfiguration(env)).not.toThrow('private-beta-key');
  });

  it.each([
    ['SUPABASE_URL', 'http://127.0.0.1:54321'],
    ['SUPABASE_URL', 'http://localhost:54321'],
    ['WEB_ORIGINS', 'http://localhost:3000'],
    ['WEB_ORIGINS', '*'],
  ])('rejects unsafe %s in beta', (key, value) => {
    expect(() => assertApiReleaseConfiguration({ ...betaEnv, [key]: value })).toThrow(key);
  });

  it('rejects demo auth and enabled commerce in beta', () => {
    expect(() => assertApiReleaseConfiguration({ ...betaEnv, AUTH_ALLOW_DEV_TOKENS: 'true' })).toThrow('AUTH_ALLOW_DEV_TOKENS');
    expect(() => assertApiReleaseConfiguration({ ...betaEnv, PAYMENTS_ENABLED: 'true' })).toThrow('PAYMENTS_ENABLED');
    expect(() => assertApiReleaseConfiguration({ ...betaEnv, FISCAL_ENABLED: 'true' })).toThrow('FISCAL_ENABLED');
  });

  it('keeps local development origins bounded', () => {
    expect(parseAllowedWebOrigins({ NODE_ENV: 'development' })).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });
});
