import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Never accept database arguments or production credentials from users.
// Local CLI status is the sole origin; strict port/host check precedes all SQL.
const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
}));
const raw = status.DB_URL || status.db_url;
if (!raw) throw new Error('Supabase CLI local DB_URL unavailable');
const u = new URL(raw);
if (!['localhost', '127.0.0.1'].includes(u.hostname) || u.port !== '54322') {
  throw new Error('Refusing SQL on non-loopback / unexpected database port');
}
if (!u.username || !u.pathname || u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') {
  throw new Error('Unexpected local PostgreSQL connection string');
}
const directory = dirname(fileURLToPath(import.meta.url));
const connection = ['-X', '-h', u.hostname, '-p', u.port,
  '-U', decodeURIComponent(u.username), '-d', decodeURIComponent(u.pathname.slice(1)),
  '-v', 'ON_ERROR_STOP=1'];
// The CLI applies the versioned migration during supabase start; only verify it.
for (const name of ['rendo-rpc-hardening-check.sql']) {
  const result = spawnSync('psql', [...connection, '-f', resolve(directory, name)], {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  });
  if (result.error || result.status !== 0) {
    // Logs must not expose local URL, JWTs, service keys or passwords.
    const msg = String(result.stderr || result.error?.message || 'psql failed')
      .split('\n').filter(line => /ERROR:|FATAL:|not found|No such file/i.test(line))
      .slice(0, 4).join('; ').replace(/(password|token|secret|key)\s*[:=].+/ig, '[redacted]');
    throw new Error(`Local SQL ${name} failed: ${msg || 'unspecified error'}`);
  }
}
process.stdout.write('PASS: versioned local migration RPC grants, search paths and signup trigger checks\n');
