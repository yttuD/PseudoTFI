const http = require('http');
const path = require('path');
const fs = require('fs');
const next = require('next');

const authDir = path.resolve(__dirname, '..', '.auth');
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}
const pidFile = path.join(authDir, 'webserver.pid');
const stopFile = path.join(authDir, 'webserver.stop');

// Remove stale marker files at wrapper startup
try {
  if (fs.existsSync(stopFile)) {
    fs.unlinkSync(stopFile);
  }
} catch {}

// Write wrapper PID file
fs.writeFileSync(pidFile, `${process.pid}\n`, 'utf8');

const port = parseInt(process.env.PORT || '3000', 10);
const dir = path.resolve(__dirname, '..', '..');
const app = next({ dev: true, dir });
const handle = app.getRequestHandler();

let server = null;
let isShuttingDown = false;
let checkInterval = null;

function cleanupFiles() {
  try {
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch {}
  try {
    if (fs.existsSync(stopFile)) {
      fs.unlinkSync(stopFile);
    }
  } catch {}
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  try {
    if (server) {
      server.close();
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
    }
  } catch {}

  try {
    if (app && typeof app.close === 'function') {
      await Promise.race([
        app.close(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
  } catch {}

  cleanupFiles();
  process.exit(0);
}

// Watch / poll stop marker under e2e/.auth
checkInterval = setInterval(() => {
  if (fs.existsSync(stopFile)) {
    shutdown();
  }
}, 100);

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('exit', () => cleanupFiles());

app
  .prepare()
  .then(() => {
    if (isShuttingDown) return;
    server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, (err) => {
      if (err) {
        console.error('Failed to start Next HTTP server:', err);
        cleanupFiles();
        process.exit(1);
      }
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Error preparing Next app:', err);
    cleanupFiles();
    process.exit(1);
  });
