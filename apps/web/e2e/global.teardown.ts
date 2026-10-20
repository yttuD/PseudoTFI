import path from 'path';
import fs from 'fs';

async function globalTeardown() {
  const authDir = path.resolve(__dirname, '.auth');
  const pidFile = path.join(authDir, 'webserver.pid');
  const stopFile = path.join(authDir, 'webserver.stop');

  // Write exact stop marker to signal graceful server exit
  try {
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    fs.writeFileSync(stopFile, `${process.pid}\n`, 'utf8');
  } catch {}

  // Wait boundedly for the run-owned PID file to disappear
  const maxWaitMs = 15000;
  const pollIntervalMs = 100;
  const startTime = Date.now();

  while (fs.existsSync(pidFile) && Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

export default globalTeardown;
