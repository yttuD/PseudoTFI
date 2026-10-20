import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWebReleaseConfig } from './release-config.mjs';

const release = {
  NODE_ENV: 'production', RENDO_BETA_MODE: 'true',
  API_ORIGIN: 'https://api.beta.example.test',
  NEXT_PUBLIC_API_URL: 'https://api.beta.example.test',
  WEB_PUBLIC_URL: 'https://beta.example.test',
  NEXT_PUBLIC_SUPABASE_URL: 'https://data.beta.example.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
};

test('hosted beta uses explicit API and Supabase origins', () => {
  assert.equal(resolveWebReleaseConfig(release).apiOrigin, release.API_ORIGIN);
});

test('beta refuses loopback, missing values and demo token flag', () => {
  for (const values of [
    { API_ORIGIN: 'http://localhost:3001' },
    { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001' },
    { NEXT_PUBLIC_SUPABASE_URL: '' },
    { NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
    { NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS: 'true' },
  ]) assert.throws(() => resolveWebReleaseConfig({ ...release, ...values }));
});

test('development can use its local API', () => {
  assert.equal(resolveWebReleaseConfig({ NODE_ENV: 'development' }).apiOrigin, 'http://127.0.0.1:3001');
});
