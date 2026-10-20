const URLS = { chatgpt: 'https://chatgpt.com/', gemini: 'https://gemini.google.com/app?hl=es' };
const sessions = new Map(), cancelled = new Set();
let socket, heartbeat, connecting;
const send = packet => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(packet)); };

async function connect() {
  if (socket?.readyState === WebSocket.OPEN || connecting) return;
  const { connection } = await chrome.storage.local.get('connection');
  if (!connection || !/^\d+$/.test(String(connection.port)) || !/^[a-f0-9]{64}$/.test(connection.token)) return;
  connecting = true;
  socket = new WebSocket(`ws://127.0.0.1:${Number(connection.port)}/rendo`);
  const channel = socket;
  socket.onopen = () => { connecting = false; send({ type: 'hello', kind: 'extension', token: connection.token }); heartbeat = setInterval(() => send({ type: 'ping' }), 20000); };
  socket.onclose = () => { if (socket === channel) { connecting = false; clearInterval(heartbeat); chrome.action.setBadgeText({ text: '' }); } };
  socket.onerror = () => { if (socket === channel) connecting = false; };
  socket.onmessage = event => {
    const packet = JSON.parse(event.data);
    if (packet.type === 'ready') chrome.action.setBadgeText({ text: 'ON' });
    if (packet.type === 'error') chrome.storage.local.set({ lastError: packet.error });
    if (packet.type === 'cancel') { cancelled.add(packet.id); const session = sessions.get(packet.sessionId); if (session) { chrome.tabs.sendMessage(session.tabId, { type: 'rendo-cancel' }).catch(() => {}); sessions.delete(packet.sessionId); } }
    if (packet.type === 'request') handle(packet);
  };
}
function verifyTab(tab, provider) {
  if (!tab.url || new URL(tab.url).origin !== new URL(URLS[provider]).origin) throw new Error('La pestaña salió del chat autorizado; resolver login o verificación manualmente.');
}
async function content(tabId, message, timeout = 30000) {
  const until = Date.now() + timeout;
  let last;
  while (Date.now() < until) {
    try { return await chrome.tabs.sendMessage(tabId, message); }
    catch (error) { last = error; await new Promise(done => setTimeout(done, 300)); }
  }
  throw new Error(`No se pudo contactar la página del chat: ${last?.message ?? 'sin respuesta'}`);
}
async function handle(packet) {
  try {
    if (!Object.hasOwn(URLS, packet.provider)) throw new Error('Proveedor web no permitido.');
    let value;
    if (packet.operation === 'status') value = { connected: true, sessions: sessions.size };
    else if (packet.operation === 'open') {
      if (sessions.size) throw new Error('Otra intervención está activa; resolverla antes de abrir un contexto nuevo.');
      const tab = await chrome.tabs.create({ url: URLS[packet.provider], active: true });
      sessions.set(packet.sessionId, { tabId: tab.id, provider: packet.provider });
      await waitForPage(tab.id, packet.provider);
      const result = await content(tab.id, { type: 'rendo-open', model: packet.model, effort: packet.effort });
      if (result.error) throw new Error(result.error);
      value = { tabId: tab.id, provider: packet.provider, selected: result.selected, fresh: true };
    } else {
      const session = sessions.get(packet.sessionId);
      if (!session || session.provider !== packet.provider) throw new Error('La sesión del chat no corresponde a este rol.');
      if (packet.operation === 'close') { sessions.delete(packet.sessionId); await chrome.tabs.sendMessage(session.tabId, { type: 'rendo-cancel' }).catch(() => {}); value = { closed: true, tabId: session.tabId }; }
      else if (packet.operation === 'exchange') {
        const tab = await chrome.tabs.get(session.tabId); verifyTab(tab, packet.provider);
        // A failed reply channel is ambiguous: never resend a chat message.
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'rendo-exchange', requestId: packet.id, prompt: packet.prompt, images: packet.images ?? [] });
        if (result.error) throw new Error(result.error);
        value = result;
      } else throw new Error('Operación no permitida.');
    }
    if (!cancelled.has(packet.id)) send({ type: 'result', id: packet.id, value });
  } catch (error) { send({ type: 'result', id: packet.id, error: error.message }); }
  finally { cancelled.delete(packet.id); }
}
async function waitForPage(tabId, provider) {
  const until = Date.now() + 30000;
  while (Date.now() < until) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') { verifyTab(tab, provider); return; }
    await new Promise(done => setTimeout(done, 300));
  }
  throw new Error('El chat no terminó de cargar.');
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.tab) {
    const session = [...sessions.values()].find(item => item.tabId === sender.tab.id);
    if (session && message.type === 'rendo-progress') send({ type: 'progress', id: message.requestId, message: String(message.message ?? 'Esperando respuesta del chat.').slice(0, 160) });
    return;
  }
  if (message.type === 'connect') { socket?.close(); setTimeout(() => connect().then(() => respond({ started: true })), 300); return true; }
  if (message.type === 'status') { respond({ connected: socket?.readyState === WebSocket.OPEN, sessions: sessions.size }); return; }
});
chrome.alarms.create('rendo-reconnect', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'rendo-reconnect') connect(); });
connect();
