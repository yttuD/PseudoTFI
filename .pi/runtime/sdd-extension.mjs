import { Type } from 'typebox';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bounded, jsonRead, runProcess, safePath, SKILLS, STATE } from '../sdd/core.mjs';
import { createTools, toolResult } from '../sdd/tools.mjs';
import { jsonLines, PROGRESS_PREFIX, progressLines } from '../sdd/progress.mjs';

export default function (pi) {
  const context = jsonRead(process.env.RENDO_SDD_CONTEXT);
  const tools = createTools(context);
  if (context.ui) registerUiCommands(pi, context);
  for (const tool of tools) pi.registerTool({
    name: tool.name, label: tool.name, description: tool.description,
    parameters: Type.Unsafe(tool.inputSchema),
    async execute(_id, params) { return toolResult(await tool.execute(params)); },
  });
  pi.on('session_start', (_event, ctx) => {
    pi.setActiveTools(tools.map(tool => tool.name));
    ctx.ui.setStatus('rendo', `Rendo · ${context.role} · ${context.skill ?? 'SDD'}`);
    if (context.ui) {
      ctx.ui.setStatus('rendo-workflow', 'Rendo · listo · progreso v2');
      ctx.ui.setWidget('rendo-progress', ['Rendo listo · progreso en vivo v2', 'Usá /rendo <objetivo> para iniciar.'], { placement: 'aboveEditor' });
    }
  });
  let turns = 0;
  pi.on('agent_start', () => { turns = 0; });
  pi.on('turn_start', (_event, ctx) => {
    turns += 1;
    if (turns > context.config.limits.maxTurns) { ctx.abort(); throw new Error('Límite de turnos Rendo alcanzado.'); }
  });
  pi.on('model_select', (event, ctx) => {
    const model = context.config.roles[context.role];
    if (event.model.id !== model.model || event.model.provider !== model.provider) {
      ctx.abort(); throw new Error('Cambiar de rol con el orquestador; no mezclar sesiones/modelos.');
    }
  });
  pi.on('before_agent_start', event => {
    if (!context.ui) return;
    const state = bounded(readFileSync(safePath(context.root, STATE), 'utf8'), context.config.limits.stateChars, 'PROJECT_STATE');
    return { systemPrompt: `${event.systemPrompt}\n\nEstado operativo vigente de Rendo:\n${state}\nPara trabajar autónomamente usar /rendo. Las tareas no requieren esta interfaz de Codex.` };
  });
}

function registerUiCommands(pi, context) {
  let busy = false;
  const dispatch = async (command, args, ctx) => {
    if (busy) { ctx.ui.notify('Rendo ya está trabajando; seguí el panel de progreso.', 'info'); return; }
    await ctx.waitForIdle();
    if (busy) { ctx.ui.notify('Rendo ya está trabajando; seguí el panel de progreso.', 'info'); return; }
    const selection = /^--feature\s+(specs\/[^\s]+)\s+([\s\S]+)$/.exec(args);
    const state = readFileSync(safePath(context.root, STATE), 'utf8');
    const feature = selection?.[1] ?? /- Feature actual: (specs\/[^\s;]+)/.exec(state)?.[1];
    const prompt = selection?.[2] ?? args;
    if (!prompt.trim()) { ctx.ui.notify('Usá /rendo <objetivo de Rendo>; /rendo-status muestra el estado.', 'info'); return; }
    busy = true;
    const started = Date.now();
    const progress = { started, lastAt: started, phase: 'Preparación', message: 'Iniciando el workflow de Rendo.', history: [], finished: false };
    const render = () => { ctx.ui.setWidget('rendo-progress', progressLines(progress), { placement: 'aboveEditor' }); ctx.ui.setStatus('rendo-workflow', `Rendo · ${progress.phase}`); };
    const onStderr = jsonLines(event => {
      if (typeof event.message !== 'string' || typeof event.phase !== 'string') return;
      progress.phase = event.phase; progress.message = event.message; progress.lastAt = Date.now();
      if (event.kind !== 'heartbeat') { progress.history.push(`${event.phase}: ${event.message}`); progress.history = progress.history.slice(-4); }
      render();
    });
    render();
    const timer = setInterval(render, 1000);
    try {
      const result = await runProcess({ executable: process.execPath, args: [resolve(context.root, '.pi/sdd/cli.mjs'), command, prompt, ...(feature ? ['--feature', feature] : [])], cwd: context.root, env: { RENDO_SDD_PROGRESS_STREAM: '1' }, timeoutMs: context.config.limits.timeoutMs * (context.config.limits.maxBatches + 2), stdoutFile: resolve(context.runDir, 'workflow-output.json'), stderrFile: resolve(context.runDir, 'workflow-errors.log'), onStderr });
      let summary = result.stderr.split('\n').filter(line => !line.startsWith(PROGRESS_PREFIX)).join('\n').trim().slice(-1500) || 'La ejecución se interrumpió; revisar el último estado antes de retomar.';
      if (result.code === 0) { try { const packet = JSON.parse(result.stdout); summary = typeof packet.output === 'string' ? packet.output : JSON.stringify(packet.output ?? packet); } catch { summary = result.stdout.slice(-6000); } }
      else if (result.stdout.trim()) { try { const packet = JSON.parse(result.stdout); if (typeof packet.output === 'string' && packet.output.trim()) summary = packet.output; } catch { /* stderr retains the failure when stdout isn't a result packet. */ } }
      if (!summary?.trim()) summary = 'El proceso terminó sin un resumen. Revisá el resultado guardado antes de retomar; esta salida no acredita trabajo completado.';
      pi.sendMessage({ customType: 'rendo-result', content: `${summary}\n\nResultado guardado: ${context.runDir}/workflow-output.json`, display: true }, { triggerTurn: false });
      ctx.ui.notify(result.code === 0 ? 'Rendo terminó; resultado disponible en esta sesión.' : 'Rendo requiere atención; revisar el resultado.', result.code === 0 ? 'info' : 'error');
      progress.phase = result.code === 0 ? 'Terminado' : 'Requiere atención'; progress.message = result.code === 0 ? 'Resultado disponible en esta sesión.' : summary;
    } catch (error) {
      progress.phase = 'Requiere atención'; progress.message = error.message;
      ctx.ui.notify(error.message, 'error');
    } finally { clearInterval(timer); busy = false; progress.finished = true; render(); }
  };
  pi.registerCommand('rendo', { description: 'Workflow autónomo Rendo: Sol → Gemini → revisión → próximo lote.', handler: async (args, ctx) => dispatch('workflow', args, ctx) });
  pi.registerCommand('rendo-status', { description: 'Estado operativo compacto de Rendo sin gastar tokens.', handler: async (_args, ctx) => ctx.ui.notify(readFileSync(safePath(context.root, STATE), 'utf8'), 'info') });
  pi.registerCommand('rendo-web-status', { description: 'Comprobar el puente de chats web sin consultar modelos.', handler: async (_args, ctx) => {
    const result = await runProcess({ executable: process.execPath, args: [resolve(context.root, '.pi/sdd/cli.mjs'), 'web', 'status'], cwd: context.root, timeoutMs: 10000 });
    ctx.ui.notify(result.code === 0 ? result.stdout : result.stderr, result.code === 0 ? 'info' : 'error');
  } });
  for (const skill of SKILLS) pi.registerCommand(`speckit.${skill}`, { description: `Spec Kit ${skill} en Rendo; contexto aislado para Sol.`, handler: async (args, ctx) => dispatch(`speckit.${skill}`, args || 'Ejecutar sobre la feature actual respetando Spec Kit.', ctx) });
}
