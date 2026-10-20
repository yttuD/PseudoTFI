import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const apiDirectory = fileURLToPath(new URL('../../apps/api/', import.meta.url));
const listener = createServer();
await new Promise((resolve, reject) => listener.listen(0, '127.0.0.1', resolve).once('error', reject));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));

const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: apiDirectory,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'production',
    RENDO_BETA_MODE: 'true',
    SUPABASE_URL: 'https://beta-data.example.test',
    SUPABASE_ANON_KEY: 'public-smoke-placeholder',
    SUPABASE_SERVICE_ROLE_KEY: 'private-smoke-placeholder',
    WEB_ORIGINS: 'https://beta.rendo.example',
    WEB_PUBLIC_URL: 'https://beta.rendo.example',
    AUTH_ALLOW_DEV_TOKENS: 'false',
    PAYMENTS_ENABLED: 'false',
    FISCAL_ENABLED: 'false',
    PORT: String(port),
  },
});

let output = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => { output += chunk.toString(); });
}

try {
  let response;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`API exited during startup: ${output}`);
    try {
      response = await fetch(`http://127.0.0.1:${port}/health/live`, {
        headers: { Origin: 'https://beta.rendo.example' },
        signal: AbortSignal.timeout(500),
      });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  assert.ok(response, `API did not start: ${output}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://beta.rendo.example');

  const denied = await fetch(`http://127.0.0.1:${port}/health/live`, {
    headers: { Origin: 'https://unrelated.example' },
  });
  assert.equal(denied.status, 200);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  console.log('PASS: compiled API boots in beta mode; liveness and exact-origin CORS work.');
} finally {
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}
