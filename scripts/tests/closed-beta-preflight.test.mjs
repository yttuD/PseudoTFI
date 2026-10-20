import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../closed-beta-preflight.ps1', import.meta.url));
const beta = {
  NODE_ENV: 'production', RENDO_BETA_MODE: 'true',
  API_ORIGIN: 'https://api.beta.example.test',
  NEXT_PUBLIC_API_URL: 'https://api.beta.example.test',
  WEB_PUBLIC_URL: 'https://beta.example.test',
  WEB_ORIGINS: 'https://beta.example.test',
  SUPABASE_URL: 'https://data.beta.example.test',
  NEXT_PUBLIC_SUPABASE_URL: 'https://data.beta.example.test',
  SUPABASE_ANON_KEY: 'public-test-only',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-only',
  SUPABASE_SERVICE_ROLE_KEY: 'private-test-only',
  PAYMENTS_ENABLED: 'false', FISCAL_ENABLED: 'false',
  AUTH_ALLOW_DEV_TOKENS: 'false', NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS: 'false',
};

function run(values) {
  return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
    env: { ...process.env, ...beta, ...values }, encoding: 'utf8', timeout: 10000,
  });
}

test('preflight passes complete isolated HTTPS beta configuration', () => {
  const result = run({});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS:/);
  assert.doesNotMatch(result.stdout, /private-test-only/);
});

test('preflight blocks a local API and an enabled payment gate without leaking keys', () => {
  const result = run({ API_ORIGIN: 'http://127.0.0.1:3001', PAYMENTS_ENABLED: 'true' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /API_ORIGIN/);
  assert.match(result.stdout, /PAYMENTS_ENABLED/);
  assert.doesNotMatch(result.stdout, /private-test-only/);
});
