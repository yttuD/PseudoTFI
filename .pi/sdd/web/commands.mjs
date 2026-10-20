import { resolve } from 'node:path';
import { ensure, save, LOCAL } from '../core.mjs';
import { connectBridge, connection, PROVIDERS, startBridge } from './bridge.mjs';
import { runWeb } from './protocol.mjs';

export async function webCommand(words, root, config) {
  const [command = 'status', role, model, effort] = words;
  if (command === 'serve') {
    const settings = connection(root), server = await startBridge({ root });
    process.stdout.write(`Rendo: puente activo en 127.0.0.1:${server.port}. Mantené esta terminal abierta. Usá web pair para obtener el código de vinculación.\n`);
    await new Promise(done => { for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, done); });
    await server.close(); return 'Puente web de Rendo cerrado.';
  }
  if (command === 'pair') return { port: connection(root).port, token: connection(root).token, message: 'Pegá estos datos únicamente en la extensión local Rendo. No en los chats.' };
  if (command === 'mode') {
    ensure(['web', 'cli'].includes(role), 'Usar web mode web|cli.');
    config.webChats.mode = role; save(resolve(root, '.pi/sdd/config.json'), config);
    return { mode: role, message: role === 'web' ? 'Próximos /rendo y fases usarán ChatGPT/Gemini web. Comprobar web status y los dos web smoke antes de trabajar.' : 'Próximos /rendo y fases usarán los CLI; fallback según configuración.' };
  }
  if (command === 'fallback') {
    ensure(['on', 'off'].includes(role), 'Usar web fallback on|off.');
    config.webChats.fallback = role === 'on'; save(resolve(root, '.pi/sdd/config.json'), config); return { fallback: config.webChats.fallback };
  }
  if (command === 'model') {
    ensure(PROVIDERS[role] && model?.trim() && effort?.trim(), 'Usar web model architect|executor "nombre visible" "nivel visible".');
    config.webChats[role] = { model, effort }; save(resolve(root, '.pi/sdd/config.json'), config); return config.webChats[role];
  }
  if (command === 'smoke') {
    ensure(PROVIDERS[role], 'Usar web smoke architect|executor.');
    const runDir = resolve(root, LOCAL, 'runs', `${Date.now()}-web-smoke-${role}`);
    const result = await runWeb({ root, role, runDir, noTools: true, config }, 'Prueba de conexión. No leer archivos ni usar herramientas. Respondé únicamente {"type":"final","text":"RENDO_WEB_OK"}.');
    ensure(result.final === 'RENDO_WEB_OK', 'El chat no devolvió RENDO_WEB_OK.'); return { status: 'PASS', role, runDir };
  }
  ensure(command === 'status', 'Usar web serve|pair|status|mode|fallback|model|smoke.');
  const client = await connectBridge(root, { timeoutMs: 5000 });
  try { return { ...(await client.request({ provider: PROVIDERS.architect, sessionId: 'status', operation: 'status' })), mode: config.webChats.mode, fallback: config.webChats.fallback, models: { architect: config.webChats.architect, executor: config.webChats.executor } }; }
  finally { client.close(); }
}
