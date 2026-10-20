import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensure, save } from '../core.mjs';
import { publishProgress } from '../progress.mjs';
import { runWeb } from './protocol.mjs';

export class ProviderUnavailable extends Error {
  constructor(message) { super(message); this.name = 'ProviderUnavailable'; }
}
export function transportFailure(message) {
  return /fetch failed|ECONN|ENOTFOUND|ETIMEDOUT|\b(?:401|403|429|502|503|504)\b|rate.?limit|quota|capacity|overloaded|unauthenticated|authentication|token.{0,30}(expired|invalid)|invalid.?grant|no api key|usage limit|not logged in|login required/i.test(message);
}
export function selectedBackend(config, role) { return config.webChats?.mode === 'web' || config.roles[role].backend === 'web-chat' ? 'web' : 'cli'; }
export async function routeBackend(context, prompt, primary, { web = runWeb, emit = publishProgress } = {}) {
  if (selectedBackend(context.config, context.role) === 'web') return web(context, prompt);
  try { return await primary(); }
  catch (error) {
    if (!context.config.webChats?.fallback || !(error instanceof ProviderUnavailable)) throw error;
    const committed = ['actions.json', 'handoff.json', 'skill-request.json', 'decision.json', 'result-proposal.json', 'commands.json'].some(file => existsSync(resolve(context.runDir, file)));
    ensure(!committed, 'El proveedor falló después de ejecutar acciones; no se repite automáticamente en otro chat. Revisar el lote y retomar con un contexto nuevo.');
    save(resolve(context.runDir, 'fallback.json'), { role: context.role, previousBackend: context.config.roles[context.role].backend, reason: error.message });
    emit({ phase: 'Fallback web', kind: 'phase', message: 'Proveedor no disponible; preparando un chat nuevo con contexto separado.' });
    return web(context, prompt);
  }
}
