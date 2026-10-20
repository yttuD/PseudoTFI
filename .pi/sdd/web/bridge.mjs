import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import WebSocket, { WebSocketServer } from '../../runtime/node_modules/ws/wrapper.mjs';
import { ensure, jsonRead, LOCAL, save } from '../core.mjs';

export const PROVIDERS = { architect: 'chatgpt', executor: 'gemini' };
export function connection(root) {
  const path = resolve(root, LOCAL, 'web/connection.json');
  if (!existsSync(path)) save(path, { port: 8789, token: randomBytes(32).toString('hex') });
  const value = jsonRead(path);
  ensure(Number.isInteger(value.port) && value.port > 1024 && value.port < 65536 && /^[a-f0-9]{64}$/.test(value.token), 'Conexión web local inválida.');
  return value;
}
function authorized(actual, expected) {
  return typeof actual === 'string' && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
function respond(socket, packet) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(packet)); }
function validateRequest(packet) {
  ensure(['open', 'exchange', 'close', 'status'].includes(packet.operation), 'Operación de navegador no permitida.');
  ensure(['chatgpt', 'gemini'].includes(packet.provider), 'Chat no permitido.');
  ensure(typeof packet.sessionId === 'string' && /^[a-z0-9-]{1,100}$/i.test(packet.sessionId), 'Sesión web inválida.');
  ensure(!packet.prompt || (typeof packet.prompt === 'string' && packet.prompt.length <= 180000), 'Mensaje web demasiado grande.');
  if (packet.images) ensure(Array.isArray(packet.images) && packet.images.length <= 4 && packet.images.every(image => /^image\/(png|jpeg|webp)$/.test(image.mimeType) && typeof image.data === 'string' && image.data.length <= 7000000), 'Capturas web inválidas.');
}
export async function startBridge({ root, port, token } = {}) {
  const settings = token ? { port: port ?? 0, token } : connection(root);
  let extension;
  const pending = new Map(), peers = new Set();
  const http = createServer((_request, response) => { response.writeHead(403); response.end('Rendo: usar la extensión vinculada.'); });
  const server = new WebSocketServer({ noServer: true, maxPayload: 30000000 });
  http.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    const host = request.headers.host ?? '';
    if (request.url !== '/rendo' || !/^127\.0\.0\.1:\d+$/.test(host) || (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin))) return socket.destroy();
    server.handleUpgrade(request, socket, head, client => server.emit('connection', client));
  });
  server.on('connection', socket => {
    peers.add(socket);
    const deadline = setTimeout(() => socket.close(1008, 'Vinculación requerida'), 5000);
    socket.on('message', bytes => handle(socket, bytes, deadline));
    socket.on('close', () => {
      clearTimeout(deadline); peers.delete(socket);
      if (extension === socket) { extension = undefined; for (const [id, request] of pending) { respond(request.peer, { type: 'result', id: request.clientId, error: 'La extensión se desconectó; no se reenvía un mensaje ambiguo.' }); pending.delete(id); } }
      for (const [id, request] of pending) if (request.peer === socket) { respond(extension ?? socket, { type: 'cancel', id, sessionId: request.sessionId }); pending.delete(id); }
    });
  });
  function handle(socket, bytes, deadline) {
    try {
      const packet = JSON.parse(bytes.toString());
      if (!socket.kind) {
        ensure(packet.type === 'hello' && ['pi', 'extension'].includes(packet.kind) && authorized(packet.token, settings.token), 'Vinculación rechazada.');
        if (packet.kind === 'extension') { ensure(!extension, 'Otra extensión ya está conectada.'); extension = socket; }
        socket.kind = packet.kind; clearTimeout(deadline); return respond(socket, { type: 'ready' });
      }
      if (packet.type === 'ping') return respond(socket, { type: 'pong' });
      if (socket.kind === 'extension') return receiveExtension(packet);
      ensure(packet.type === 'request', 'Solicitud inválida.'); validateRequest(packet);
      ensure(extension, 'La extensión de Rendo no está conectada. Abrí su ventana y vinculala.');
      ensure(!pending.size, 'El navegador ya atiende otra intervención de Rendo.');
      const id = randomUUID(); pending.set(id, { peer: socket, clientId: packet.id, sessionId: packet.sessionId });
      respond(extension, { ...packet, id });
    } catch (error) { respond(socket, { type: 'error', error: error.message }); if (!socket.kind) socket.close(1008); }
  }
  function receiveExtension(packet) {
    const request = pending.get(packet.id);
    if (!request || !['result', 'progress'].includes(packet.type)) return;
    respond(request.peer, { ...packet, id: request.clientId });
    if (packet.type === 'result') pending.delete(packet.id);
  }
  await new Promise((resolveReady, reject) => { http.once('error', reject); http.listen(settings.port, '127.0.0.1', resolveReady); });
  return { port: http.address().port, close: async () => { for (const peer of peers) peer.terminate(); await new Promise(done => server.close(done)); await new Promise(done => http.close(done)); } };
}

export async function connectBridge(root, { settings = connection(root), onProgress = () => {}, timeoutMs = 180000 } = {}) {
  const socket = new WebSocket(`ws://127.0.0.1:${settings.port}/rendo`);
  const pending = new Map();
  await new Promise((ready, reject) => {
    const timer = setTimeout(() => { socket.terminate(); reject(new Error('Puente web sin respuesta; ejecutar web serve.')); }, 5000);
    socket.once('error', error => { clearTimeout(timer); reject(new Error(`Puente web no disponible: ${error.message}`)); });
    socket.on('open', () => respond(socket, { type: 'hello', kind: 'pi', token: settings.token }));
    socket.on('message', bytes => {
      const packet = JSON.parse(bytes.toString());
      if (packet.type === 'ready') { clearTimeout(timer); ready(); }
      else if (packet.type === 'progress') onProgress(packet);
      else if (packet.type === 'error') { clearTimeout(timer); for (const request of pending.values()) request.reject(new Error(packet.error)); pending.clear(); reject(new Error(packet.error)); }
      else if (packet.type === 'result') { const request = pending.get(packet.id); if (!request) return; pending.delete(packet.id); clearTimeout(request.timer); packet.error ? request.reject(new Error(packet.error)) : request.resolve(packet.value); }
    });
    socket.on('close', () => { clearTimeout(timer); reject(new Error('Conexión web cerrada durante la vinculación.')); for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Conexión web cerrada; revisar el chat antes de retomar.')); } pending.clear(); });
  });
  return {
    request: (packet, options = {}) => new Promise((resolveResult, reject) => {
      if (socket.readyState !== WebSocket.OPEN) { reject(new Error('Conexión web cerrada; no se reenvía el mensaje.')); return; }
      const id = randomUUID();
      const timer = setTimeout(() => { pending.delete(id); socket.terminate(); reject(new Error('Tiempo de chat web agotado; revisar el chat antes de retomar.')); }, options.timeoutMs ?? timeoutMs);
      pending.set(id, { resolve: resolveResult, reject: error => { clearTimeout(timer); reject(error); }, timer });
      respond(socket, { type: 'request', ...packet, id });
    }),
    close: () => socket.close(),
  };
}
