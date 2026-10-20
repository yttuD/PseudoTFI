/**
 * B007b — Driver Runner Seguro y Aislado para Runtime Real Navegador
 *
 * Características de Seguridad y Arquitectura:
 * - Sin npx: usa ejecutables node y scripts locales directos.
 * - Captura supabase status -o json en memoria con sanitización estricta vía powershell/cli local.
 * - Environment OS mínimo (PATH, SYSTEMROOT, TEMP, COMSPEC, PATHEXT) sin secretos externos.
 * - Compila API con tsconfig.build.json a apps/api/.dist-beta-real.
 * - Seam test loopback: genera main.local.js sustituyendo app.listen por enlace a '127.0.0.1'.
 * - Cwd API aislado (.tmp/ownruntime-api) sin herencia de archivos .env.
 * - Flags exactos requeridos (AUTH_ALLOW_DEV_TOKENS=false, RENDO_BETA_MODE=false, etc.).
 * - Proxy local in-memory en puerto 3202 para control de fallos en SSR sin mock ni fuga de credenciales.
 * - API_ORIGIN y NEXT_PUBLIC_API_URL configurados a http://127.0.0.1:3202 para frontend SSR/cliente.
 * - Next.js dev ligado explícitamente a -H 127.0.0.1 en puerto 3200.
 * - Readiness estricto: API contra /health/ready (HTTP 200 + { status: 'ok' }); Web contra login (HTTP 200).
 * - Ejecución Playwright ASÍNCRONA con spawn para no bloquear el event loop del proxy.
 * - Limpieza de procesos árbol (taskkill en Windows) y verificación obligatoria de liberación de puertos.
 */

import { spawn, execFileSync, execSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const API_PORT = 3201;
const PROXY_PORT = 3202;
const WEB_PORT = 3200;
const runArgs = process.argv.slice(2);
const onlyEmpty = runArgs.length === 2 && runArgs[0] === '--suite' && runArgs[1] === 'empty';
const onlyAuth = runArgs.length === 2 && runArgs[0] === '--suite' && runArgs[1] === 'auth';
if (runArgs.length !== 0 && !onlyEmpty && !onlyAuth) {
  throw new Error('Allowed suites: default inventory matrix, --suite empty, or --suite auth');
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

function getSupabaseConfig() {
  let stdout;
  try {
    if (process.platform === 'win32') {
      stdout = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', 'supabase status -o json'],
        {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        }
      );
    } else {
      stdout = execFileSync('supabase', ['status', '-o', 'json'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
  } catch {
    throw new Error('[b007b-runner] No se pudo capturar status de Supabase CLI local.');
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error('[b007b-runner] Formato JSON inválido desde Supabase CLI.');
  }

  const apiUrl = parsed.API_URL || parsed.api_url;
  const anonKey = parsed.ANON_KEY || parsed.anon_key;
  const serviceRoleKey = parsed.SERVICE_ROLE_KEY || parsed.service_role_key;

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error('[b007b-runner] Supabase status incompleto.');
  }

  const parsedUrl = new URL(apiUrl);
  if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
    throw new Error(`[b007b-runner] Seguridad: host Supabase no es loopback: ${parsedUrl.hostname}`);
  }

  return { apiUrl, anonKey, serviceRoleKey };
}

function startFaultProxy(upstreamPort, listenPort) {
  let faultConfig = null; // null | { path: string, status: number }

  const server = http.createServer((req, res) => {
    // Endpoint de control local in-memory
    if (req.url === '/__control/fault' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (parsed.path && parsed.status) {
            faultConfig = { path: parsed.path, status: parsed.status };
          } else {
            faultConfig = null; // Limpiar fallo
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, fault: faultConfig }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'INVALID_JSON' }));
        }
      });
      return;
    }

    // Inyección de fallo si coincide con la ruta configurada
    if (faultConfig && req.url && req.url.startsWith(faultConfig.path)) {
      res.writeHead(faultConfig.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Fault injected by runner proxy' }));
      return;
    }

    // Proxy normal transparente hacia el backend real en upstreamPort
    const options = {
      hostname: '127.0.0.1',
      port: upstreamPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const upstreamReq = http.request(options, (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 500, upstreamRes.headers);
      upstreamRes.pipe(res);
    });

    upstreamReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'UPSTREAM_UNAVAILABLE' }));
      }
    });

    req.pipe(upstreamReq);
  });

  return new Promise((resolve) => {
    server.listen(listenPort, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function waitForApiReadiness(url, timeoutMs = 35000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200) {
        const body = await res.json();
        if (body?.status === 'ok') {
          return true;
        }
      }
    } catch {
      // Reintentar
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`[b007b-runner] Timeout esperando readiness 200 { status: 'ok' } en ${url}`);
}

async function waitForWebReadiness(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200) {
        return true;
      }
    } catch {
      // Reintentar
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error(`[b007b-runner] Timeout esperando login HTTP 200 en ${url}`);
}

function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore', windowsHide: true });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {
    // Proceso ya terminado
  }
}

async function main() {
  console.log('[b007b-runner] 1. Verificando puertos disponibles...');
  const [apiFree, proxyFree, webFree] = await Promise.all([
    checkPortFree(API_PORT),
    checkPortFree(PROXY_PORT),
    checkPortFree(WEB_PORT),
  ]);

  if (!apiFree || !proxyFree || !webFree) {
    throw new Error(`[b007b-runner] Puertos ocupados: API(${API_PORT}):${apiFree}, PROXY(${PROXY_PORT}):${proxyFree}, WEB(${WEB_PORT}):${webFree}. No se matarán procesos ajenos.`);
  }

  console.log('[b007b-runner] 2. Capturando credenciales de Supabase local en memoria...');
  const supabase = getSupabaseConfig();

  const baseOsEnv = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    COMSPEC: process.env.COMSPEC,
    PATHEXT: process.env.PATHEXT,
  };

  console.log('[b007b-runner] 3. Compilando API con tsconfig.build.json a outdir aislado...');
  const tscBin = path.join(REPO_ROOT, 'apps/web/node_modules/typescript/bin/tsc');
  const apiDistDir = path.join(REPO_ROOT, 'apps/api/.dist-beta-real');

  execFileSync(
    process.execPath,
    [
      tscBin,
      '--incremental',
      'false',
      '-p',
      path.join(REPO_ROOT, 'apps/api/tsconfig.build.json'),
      '--outDir',
      apiDistDir,
    ],
    {
      cwd: path.join(REPO_ROOT, 'apps/api'),
      stdio: 'inherit',
    }
  );

  // Seam test de loopback para main.js: generar main.local.js vinculando a 127.0.0.1
  const mainJsPath = path.join(apiDistDir, 'main.js');
  const mainSource = fs.readFileSync(mainJsPath, 'utf8');

  // Validar match exactamente 1 antes de escribir
  const listenPattern = /\.listen\(([^,\)]+)\);/g;
  const matches = [...mainSource.matchAll(listenPattern)];
  if (matches.length !== 1) {
    throw new Error(`[b007b-runner] Seam test falló: esperado exactamente 1 llamada a .listen(...), encontrado ${matches.length}`);
  }

  const localMainSource = mainSource.replace(listenPattern, ".listen($1, '127.0.0.1');");
  const localMainPath = path.join(apiDistDir, 'main.local.js');
  fs.writeFileSync(localMainPath, localMainSource, 'utf8');
  console.log('[b007b-runner] Seam test aplicado con éxito: main.local.js generado vinculando a 127.0.0.1.');

  // Directorio aislado para la API sin archivo .env
  const apiRuntimeCwd = path.join(REPO_ROOT, '.tmp/ownruntime-api');
  if (!fs.existsSync(apiRuntimeCwd)) {
    fs.mkdirSync(apiRuntimeCwd, { recursive: true });
  }

  console.log('[b007b-runner] 4. Iniciando proxy local para fault injection en puerto 3202...');
  const proxyServer = await startFaultProxy(API_PORT, PROXY_PORT);

  const childProcs = [];
  let cleanupPromise = null;

  const cleanup = () => {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
      console.log('[b007b-runner] Limpiando procesos hijos y proxy...');
      for (const p of childProcs) {
        killProcessTree(p);
      }
      proxyServer.close();

      await new Promise((r) => setTimeout(r, 1200));

      const [cApi, cProxy, cWeb] = await Promise.all([
        checkPortFree(API_PORT),
        checkPortFree(PROXY_PORT),
        checkPortFree(WEB_PORT),
      ]);
      if (!cApi || !cProxy || !cWeb) {
        throw new Error(`[b007b-runner] Error de cleanup: puertos no liberados: API:${!cApi}, PROXY:${!cProxy}, WEB:${!cWeb}`);
      } else {
        console.log('[b007b-runner] Todos los puertos quedaron verificados y libres.');
      }
    })();
    return cleanupPromise;
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(143);
  });

  try {
    console.log(`[b007b-runner] 5. Levantando API en puerto ${API_PORT} usando main.local.js (127.0.0.1)...`);
    const apiProc = spawn(
      process.execPath,
      ['--max-old-space-size=512', localMainPath],
      {
        cwd: apiRuntimeCwd,
        env: {
          ...baseOsEnv,
          PORT: String(API_PORT),
          WEB_ORIGINS: 'http://127.0.0.1:3200',
          AUTH_ALLOW_DEV_TOKENS: 'false',
          NEXT_PUBLIC: 'false',
          RENDO_BETA_MODE: 'false',
          PAYMENTS_ENABLED: 'false',
          FISCAL_ENABLED: 'false',
          DEEPL_AUTH_KEY: '',
          NODE_ENV: 'test',
          SUPABASE_URL: supabase.apiUrl,
          SUPABASE_INTERNAL_URL: supabase.apiUrl,
          SUPABASE_ANON_KEY: supabase.anonKey,
          SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
        },
        stdio: 'inherit',
      }
    );
    apiProc.on('error', (err) => {
      console.error('[b007b-runner] Error al iniciar proceso de API:', err.message);
    });
    childProcs.push(apiProc);

    console.log(`[b007b-runner] 6. Levantando Next.js dev en puerto ${WEB_PORT} (-H 127.0.0.1)...`);
    const nextBin = path.join(REPO_ROOT, 'apps/web/node_modules/next/dist/bin/next');
    const webProc = spawn(
      process.execPath,
      ['--max-old-space-size=1024', nextBin, 'dev', '-p', String(WEB_PORT), '-H', '127.0.0.1'],
      {
        cwd: path.join(REPO_ROOT, 'apps/web'),
        env: {
          ...baseOsEnv,
          PORT: String(WEB_PORT),
          API_ORIGIN: `http://127.0.0.1:${PROXY_PORT}`,
          NEXT_PUBLIC_API_URL: `http://127.0.0.1:${PROXY_PORT}`,
          WEB_PUBLIC_URL: `http://127.0.0.1:${WEB_PORT}`,
          NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
          RENDO_BUILD_DIR: '.next-beta-real',
          AUTH_ALLOW_DEV_TOKENS: 'false',
          NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS: 'false',
          NEXT_PUBLIC: 'false',
          RENDO_BETA_MODE: 'false',
          PAYMENTS_ENABLED: 'false',
          FISCAL_ENABLED: 'false',
          DEEPL_AUTH_KEY: '',
          NODE_ENV: 'development',
        },
        stdio: 'inherit',
      }
    );
    webProc.on('error', (err) => {
      console.error('[b007b-runner] Error al iniciar proceso de Next.js:', err.message);
    });
    childProcs.push(webProc);

    console.log('[b007b-runner] 7. Esperando readiness estricto de API (/health/ready)...');
    await waitForApiReadiness(`http://127.0.0.1:${API_PORT}/health/ready`, 35000);
    console.log('[b007b-runner] API lista y saludable.');

    console.log('[b007b-runner] 8. Esperando readiness estricto de Web (HTTP 200 en login)...');
    await waitForWebReadiness(`http://127.0.0.1:${WEB_PORT}/es/auth/login?portal=gestor&next=/mis-unidades`, 45000);
    console.log('[b007b-runner] Frontend listo con respuesta 200.');

    console.log('[b007b-runner] 9. Ejecutando Playwright CLI asíncronamente (sin bloquear proxy)...');
    const playwrightCli = path.join(REPO_ROOT, 'apps/web/node_modules/@playwright/test/cli.js');

    const playwrightArgs = [playwrightCli, 'test', '--config', 'playwright.beta-real.config.ts'];
    if (onlyEmpty) {
      playwrightArgs.push('--grep', '@empty');
    } else if (onlyAuth) {
      playwrightArgs.push('--project', 'auth-matrix-1440-light');
    }

    const authJsonPath = path.resolve(
      REPO_ROOT,
      'specs/008-beta-observaciones-2026-10-02/evidence/N01/playwright-auth-results.json'
    );

    const playwrightProc = spawn(
      process.execPath,
      playwrightArgs,
      {
        cwd: path.join(REPO_ROOT, 'apps/web'),
        env: {
          ...baseOsEnv,
          PLAYWRIGHT_TEST_BASE_URL: `http://127.0.0.1:${WEB_PORT}`,
          API_ORIGIN: `http://127.0.0.1:${API_PORT}`,
          SUPABASE_URL: supabase.apiUrl,
          SUPABASE_INTERNAL_URL: supabase.apiUrl,
          SUPABASE_ANON_KEY: supabase.anonKey,
          SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
          ...(onlyAuth ? { PLAYWRIGHT_JSON_OUTPUT: authJsonPath } : {}),
        },
        stdio: 'inherit',
      }
    );
    childProcs.push(playwrightProc);

    await new Promise((resolve, reject) => {
      playwrightProc.on('error', reject);
      playwrightProc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`[b007b-runner] Playwright terminó con código de salida ${code}`));
        }
      });
    });

    console.log('[b007b-runner] Suite ejecutada con ÉXITO.');
  } finally {
    await cleanup();
  }
}

main().catch(async (err) => {
  console.error('[b007b-runner] Error fatal durante la ejecución:', err.message);
  process.exit(1);
});
