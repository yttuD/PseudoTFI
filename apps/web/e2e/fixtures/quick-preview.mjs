import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockApiServer, stopMockApiServer } from './mock-api-server.ts';

// Loopback-only, disposable visual preview with deterministic demo data.
process.env.AUTH_ALLOW_DEV_TOKENS = 'true';
process.env.NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS = 'true';
process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:3001';
process.env.API_URL = 'http://127.0.0.1:3001';
process.env.PLAYWRIGHT_TEST = '1';
process.env.RENDO_PREVIEW_VIDEO = '1';

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const next = (await import('next')).default;
const app = next({ dev: true, dir: webDir });
let webServer;

async function close() {
  if (webServer) {
    await new Promise((resolve) => webServer.close(resolve));
  }
  await stopMockApiServer();
  await app.close();
  process.exit(0);
}

process.once('SIGINT', close);
process.once('SIGTERM', close);

try {
  await startMockApiServer(3001);
  await app.prepare();
  const handle = app.getRequestHandler();
  webServer = http.createServer((req, res) => handle(req, res));
  await new Promise((resolve, reject) => {
    webServer.once('error', reject);
    webServer.listen(3000, '127.0.0.1', resolve);
  });
  console.log('RENDO_PREVIEW_READY http://127.0.0.1:3000');
} catch (error) {
  console.error(error);
  await close();
  process.exitCode = 1;
}
