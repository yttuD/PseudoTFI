import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { EXECUTOR_TOOLS } from './executor-gate.mjs';
import { providerStream, publishProgress } from './progress.mjs';
import { ProviderUnavailable, routeBackend, selectedBackend, transportFailure } from './web/routing.mjs';
import { connectBridge, PROVIDERS } from './web/bridge.mjs';
import { bounded, changedOutside, collectDiff, ensure, inventory, jsonRead, LOCAL, markdownPacket, reviewLevel, reviewPolicy, runProcess, safePath, save, SKILLS, snapshotFiles, STATE, taskSignature, validateResult, validateTask, updateState } from './core.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function configuration(root = ROOT) {
  const config = jsonRead(resolve(root, '.pi/sdd/config.json'));
  ensure(jsonRead(resolve(root, 'package.json')).name === config.project.packageName, 'Este orquestador pertenece exclusivamente al proyecto Rendo.');
  return config;
}
export function prepare(root = ROOT) {
  const agentDir = resolve(root, LOCAL, 'agent');
  save(resolve(agentDir, 'settings.json'), { quietStartup: true, compaction: { enabled: false }, retry: { enabled: true, maxRetries: 1 }, defaultProvider: 'openai-codex', defaultModel: 'gpt-6.1-sol', defaultThinkingLevel: 'high' });
  save(resolve(agentDir, 'models.json'), jsonRead(resolve(root, '.pi/sdd/models.json')));
  syncCodexAccess(root);
  return agentDir;
}
export function syncCodexAccess(root, profile = process.env.USERPROFILE ?? process.env.HOME) {
  const source = resolve(profile, '.codex/auth.json');
  const target = resolve(root, LOCAL, 'agent/auth.json');
  const marker = resolve(root, LOCAL, 'agent/codex-access-only.json');
  if (existsSync(target) && jsonRead(target)['openai-codex']?.refresh) {
    if (existsSync(marker)) unlinkSync(marker);
    return;
  }
  if (!existsSync(source) || (existsSync(target) && !existsSync(marker))) return;
  const auth = jsonRead(source);
  if (auth.auth_mode !== 'chatgpt' || !auth.tokens?.access_token) return;
  const payload = JSON.parse(Buffer.from(auth.tokens.access_token.split('.')[1], 'base64url').toString());
  if (!payload.exp || payload.exp * 1000 <= Date.now()) return;
  const existing = existsSync(target) ? jsonRead(target) : {};
  // Refresh rotation remains owned by Codex; Pi never receives its refresh token.
  save(target, { ...existing, 'openai-codex': { type: 'oauth', access: auth.tokens.access_token, refresh: '', expires: payload.exp * 1000, accountId: auth.tokens.account_id } });
  save(marker, { source: 'Codex access only; renovar en Codex o hacer login independiente en Pi' });
}
export async function registry(root = ROOT) {
  const { AuthStorage, ModelRegistry } = await import('../runtime/node_modules/@mariozechner/pi-coding-agent/dist/index.js');
  const dir = prepare(root);
  const auth = AuthStorage.create(resolve(dir, 'auth.json'));
  return { auth, models: ModelRegistry.create(auth, resolve(dir, 'models.json')) };
}
export async function doctor(root = ROOT) {
  const config = configuration(root);
  const { auth, models } = await registry(root);
  const model = config.roles.architect;
  const credential = auth.get(model.provider);
  const errors = [];
  if (selectedBackend(config, 'architect') === 'cli' && !models.find(model.provider, model.model)) errors.push(`Modelo de Sol ausente: ${model.provider}/${model.model}.`);
  const authenticated = Boolean(credential && (credential.type !== 'oauth' || credential.expires > Date.now() || credential.refresh));
  if (selectedBackend(config, 'architect') === 'cli' && !authenticated) errors.push('Login de Sol ausente o vencido. Ejecutar sdd login architect.');
  const executor = resolve(root, config.roles.executor.executable);
  if (selectedBackend(config, 'executor') === 'cli' && !existsSync(executor)) errors.push('Antigravity CLI ausente: ejecutar sdd install-executor.');
  const settings = resolve(process.env.USERPROFILE ?? process.env.HOME, '.gemini/antigravity-cli/settings.json');
  const grants = existsSync(settings) ? jsonRead(settings).permissions?.allow ?? [] : [];
  const missingGrants = EXECUTOR_TOOLS.filter(name => !grants.includes(`mcp(rendo_sdd/${name})`));
  if (selectedBackend(config, 'executor') === 'cli' && missingGrants.length) errors.push(`Permisos MCP pendientes: ${missingGrants.join(', ')}. Ejecutar sdd configure-executor.`);
  const state = readFileSync(safePath(root, STATE), 'utf8');
  if (state.length > config.limits.stateChars) errors.push('PROJECT_STATE supera el presupuesto.');
  const feature = /- Feature actual: (specs\/[^\s;]+)/.exec(state)?.[1];
  const warnings = feature ? ['spec.md', 'plan.md', 'tasks.md'].filter(file => !existsSync(safePath(root, `${feature}/${file}`))).map(file => `Feature actual sin ${file}: permite DISCOVERY, bloquea IMPLEMENT.`) : [];
  let webReady = null;
  if (config.webChats?.mode === 'web' || (config.webChats?.fallback && errors.length && !errors.some(error => error.includes('PROJECT_STATE')))) {
    let client;
    try { client = await connectBridge(root, { timeoutMs: 5000 }); await client.request({ operation: 'status', provider: PROVIDERS.architect, sessionId: 'doctor' }); webReady = true; }
    catch (error) { if (config.webChats.mode === 'web') errors.push(error.message); else warnings.push(`Fallback web pendiente: ${error.message}`); }
    finally { client?.close(); }
    if (webReady && config.webChats.mode !== 'web') { warnings.push(...errors.filter(error => !error.includes('PROJECT_STATE'))); errors.splice(0, errors.length, ...errors.filter(error => error.includes('PROJECT_STATE'))); }
  }
  return { project: 'Rendo', webChats: { mode: config.webChats?.mode ?? 'cli', fallback: Boolean(config.webChats?.fallback), bridgeReady: webReady }, ready: errors.length === 0, architect: { provider: model.provider, model: model.model, thinking: model.thinking, authenticated }, executor: { model: config.roles.executor.model, thinking: config.roles.executor.thinking, installed: existsSync(executor), authentication: 'keyring del CLI oficial; confirmar con smoke executor' }, errors, warnings, tokenPricing: 'No se inventan precios; se registran tokens reportados por cada proveedor.' };
}
function newRun(root, label) {
  const name = `${Date.now()}-${label}-${Math.random().toString(36).slice(2, 7)}`;
  const runDir = resolve(root, LOCAL, 'runs', name);
  mkdirSync(runDir, { recursive: true });
  return { runDir, name };
}
export async function runPi(context, prompt, { interactive = false } = {}) {
  return routeBackend(context, prompt, () => runPiPrimary(context, prompt, { interactive }));
}
async function runPiPrimary(context, prompt, { interactive = false } = {}) {
  const { root, config, runDir, role } = context;
  const model = config.roles[role];
  const agentDir = prepare(root);
  const contextPath = resolve(runDir, 'context.json');
  save(contextPath, context);
  const args = [resolve(root, '.pi/runtime/node_modules/@mariozechner/pi-coding-agent/dist/cli.js'), '--provider', model.provider, '--model', model.model, '--thinking', model.thinking, '--no-extensions', '--extension', resolve(root, '.pi/runtime/rendo-loader.mjs'), '--no-skills', '--no-prompt-templates', '--no-context-files', '--no-builtin-tools', '--system-prompt', resolve(root, `.pi/sdd/agents/${role}.md`), '--session-dir', resolve(runDir, `session-${role}`)];
  if (context.skill) {
    ensure(SKILLS.includes(context.skill), 'Skill no disponible para Sol.');
    args.push('--skill', safePath(root, `.agents/skills/speckit-${context.skill}/SKILL.md`));
    prompt = `/skill:speckit-${context.skill} FASE ACTIVA: ${context.skill}. La skill ya está cargada en esta intervención: ejecutala ahora con las herramientas SDD. No solicites esta misma fase otra vez. PROJECT_STATE ya está incluido debajo. Conservá el directorio de feature seleccionado.\n\n${prompt}`;
  }
  if (!interactive) args.push('--mode', 'json', '--print');
  const phase = `Sol · ${context.skill ?? (context.result ? 'revisión' : 'planificación')}`;
  publishProgress({ phase, kind: 'phase', message: 'Intervención iniciada; esperando respuesta del proveedor.' });
  const onStdout = providerStream(phase);
  const result = await runProcess({ executable: process.execPath, args, cwd: root, env: { PI_CODING_AGENT_DIR: agentDir, RENDO_SDD_CONTEXT: contextPath, PI_SKIP_VERSION_CHECK: '1', ...(context.feature ? { SPECIFY_FEATURE: context.feature.split('/')[1] } : {}) }, input: prompt, timeoutMs: config.limits.timeoutMs, stdoutFile: resolve(runDir, 'pi-events.jsonl'), stderrFile: resolve(runDir, 'pi-stderr.log'), onStdout });
  const events = result.stdout.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const messages = events.filter(event => event.type === 'message_end' && event.message?.role === 'assistant').map(event => event.message);
  const failure = messages.find(message => message.stopReason === 'error' || message.stopReason === 'aborted');
  const final = messages.at(-1)?.content.filter(item => item.type === 'text').map(item => item.text).join('\n') ?? '';
  save(resolve(runDir, 'usage.json'), messages.map(message => { const { cost, ...usage } = message.usage ?? {}; return { model: message.model, provider: message.provider, usage, pricing: 'unavailable-subscription' }; }));
  if (result.code !== 0 || failure) {
    const reason = `${failure?.errorMessage ?? ''} ${result.stderr}`;
    if (transportFailure(reason)) throw new ProviderUnavailable(`Sol no disponible: ${reason.slice(-600)}`);
    throw new Error(`Sol no completó la intervención. Consultar ${runDir}/pi-stderr.log y pi-events.jsonl.`);
  }
  publishProgress({ phase, kind: 'complete', message: 'Intervención terminada.' });
  return { final, runDir };
}
export async function architect(prompt, { feature, skill, root = ROOT, readFiles = [] } = {}) {
  const config = configuration(root), run = newRun(root, 'architect');
  const state = bounded(readFileSync(safePath(root, STATE), 'utf8'), config.limits.stateChars, 'PROJECT_STATE');
  feature ??= /- Feature actual: (specs\/[^\s;]+)/.exec(state)?.[1];
  if (skill === 'converge') requireImplementationEvidence(root, feature);
  if (feature) {
    ensure(/^specs\/[^/]+$/.test(feature), 'Feature inválida.');
    for (const file of ['spec.md', 'plan.md', 'issues.md']) if (existsSync(safePath(root, `${feature}/${file}`))) readFiles.push(`${feature}/${file}`);
  }
  return runPi({ root, role: 'architect', config, feature, skill, readFiles, ...run }, `${state}\n\nFeature seleccionada: ${feature ?? 'seguir PROJECT_STATE'}\n\n${prompt}\n\nSi delegás, registrá sdd_submit_task y finalizá. No ejecutes trabajo del ejecutor.`);
}
export function prepareExecutorWorkspace(context) {
  const workspace = resolve(context.runDir, 'workspace');
  mkdirSync(workspace, { recursive: true });
  // A nested repository bounds automatic workspace rule discovery to this empty workspace.
  execFileSync('git', ['init', '--quiet', workspace], { stdio: 'ignore' });
  const contextPath = resolve(context.runDir, 'executor-context.json');
  save(contextPath, context);
  save(resolve(workspace, '.agents/mcp_config.json'), { mcpServers: { rendo_sdd: { command: process.execPath, args: [resolve(context.root, '.pi/sdd/mcp.mjs'), contextPath], cwd: context.root } } });
  const prompt = readFileSync(resolve(context.root, '.pi/sdd/agents/executor.md'), 'utf8');
  save(resolve(workspace, '.agents/agents/rendo-executor.md'), `---\nname: rendo-executor\ndescription: Ejecutor SDD exclusivo de Rendo; usar las herramientas MCP rendo_sdd.\nmainAgent: true\nsubagent: false\ncommandExecutionPolicy: off\nskills: []\nplugins: []\n---\n${prompt}\n`);
  save(resolve(workspace, '.agents/rendo-executor-gate.mjs'), readFileSync(resolve(context.root, '.pi/sdd/executor-gate.mjs'), 'utf8'));
  save(resolve(workspace, '.agents/hooks.json'), { 'rendo-scope-gate': { enabled: true, PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node ./rendo-executor-gate.mjs', timeout: 10 }] }] } });
  save(resolve(workspace, 'AGENTS.md'), 'Proyecto Rendo. Este workspace vacío es un puente de contexto. Usar solo MCP rendo_sdd. No leer reglas globales ni directorios padre, no usar subagentes o herramientas nativas para acceder al proyecto.\n');
  return workspace;
}
export async function runExecutor(context, correction = '') {
  const state = bounded(readFileSync(safePath(context.root, STATE), 'utf8'), context.config.limits.stateChars, 'PROJECT_STATE');
  const prompt = `${state}\n\nTASK_PACKET\n${JSON.stringify(context.task)}\n\n${correction ? `Corrección de Sol: ${correction}` : ''}\nUsá SOLO las herramientas SDD autorizadas para este lote. Entregá sdd_submit_result y terminá. Si faltan herramientas o comandos aprobados, devolvé BLOCKED con la causa concreta. No inventes resultado.`;
  return routeBackend(context, prompt, () => runExecutorPrimary(context, correction));
}
async function runExecutorPrimary(context, correction = '') {
  const { root, task, config, runDir } = context;
  if (!existsSync(resolve(root, config.roles.executor.executable))) throw new ProviderUnavailable('Antigravity CLI no está instalado.');
  const workspace = prepareExecutorWorkspace(context);
  const state = bounded(readFileSync(safePath(root, STATE), 'utf8'), config.limits.stateChars, 'PROJECT_STATE');
  const prompt = `${state}\n\nTASK_PACKET\n${JSON.stringify(task)}\n\n${correction ? `Corrección de Sol: ${correction}` : ''}\nUsá SOLO las herramientas del MCP rendo_sdd para acceder a Rendo y ejecutar comandos. Entregá sdd_submit_result y terminá. Si MCP no está disponible, devolvé BLOCKED. No inventes resultado.`;
  const args = ['--input-format', 'stream-json', '--output-format', 'stream-json', '--model', config.roles.executor.model, '--effort', config.roles.executor.thinking, '--agent', 'rendo-executor', '--disable-slash-commands', '--print-timeout', `${Math.ceil(config.limits.timeoutMs / 60000)}m`, '--log-file', resolve(runDir, 'antigravity.log')];
  const phase = `Gemini · lote ${task.id}`;
  publishProgress({ phase, kind: 'phase', message: correction ? 'Corrigiendo el lote según la revisión de Sol.' : 'Ejecutor iniciado; esperando respuesta del proveedor.' });
  const onStdout = providerStream(phase);
  const result = await runProcess({ executable: resolve(root, config.roles.executor.executable), args, cwd: workspace, input: `${JSON.stringify({ event: 'user', message: { content: prompt } })}\n`, timeoutMs: config.limits.timeoutMs, stdoutFile: resolve(runDir, 'agy-events.jsonl'), stderrFile: resolve(runDir, 'agy-stderr.log'), onStdout });
  const events = result.stdout.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const terminal = events.findLast(event => event.event === 'result')?.result;
  save(resolve(runDir, 'usage.json'), terminal?.usage ?? { unavailable: true });
  if (result.code !== 0 || terminal?.status !== 'SUCCESS') {
    const reason = `${JSON.stringify(terminal ?? {})} ${result.stderr}`;
    if (transportFailure(reason)) throw new ProviderUnavailable(`Antigravity no disponible: ${reason.slice(-600)}`);
    throw new Error(`Antigravity no completó el lote. Consultar ${runDir}/agy-stderr.log.`);
  }
  ensure(existsSync(resolve(runDir, 'result-proposal.json')), 'Antigravity no entregó RESULT_PACKET validado; revisar permisos MCP.');
  publishProgress({ phase, kind: 'complete', message: 'Resultado de Gemini recibido y validado.' });
}
export async function execute(taskPath, { root = ROOT, correction = '', snapshotDir, executor = runExecutor } = {}) {
  const config = configuration(root);
  const task = validateTask(root, jsonRead(safePath(root, taskPath, { privateAccess: true })), config);
  const run = newRun(root, `${task.id}-executor`);
  const baseline = snapshotDir ?? resolve(run.runDir, 'baseline');
  if (!snapshotDir) snapshotFiles(root, task, baseline);
  const before = inventory(root);
  save(resolve(run.runDir, 'inventory-before.json'), before);
  let failure;
  try { await executor({ root, role: 'executor', config, task, ...run }, correction); }
  catch (error) { failure = error.message; save(resolve(run.runDir, 'failure.log'), failure); }
  const diffs = collectDiff(root, baseline);
  const scopeViolations = changedOutside(before, inventory(root), task.allowedFiles);
  let result = existsSync(resolve(run.runDir, 'result-proposal.json')) ? jsonRead(resolve(run.runDir, 'result-proposal.json')) : { status: 'BLOCKED', summary: failure ?? 'Sin RESULT_PACKET.', acceptanceCriteria: task.acceptanceCriteria.map(item => ({ id: item.id, status: 'FAIL' })), decisionsTaken: [], risks: [], evidenceArtifacts: [], architectInputRequired: 'Resolver fallo del ejecutor; consultar failure.log.' };
  if (failure || scopeViolations.length) result = { ...result, status: 'BLOCKED', architectInputRequired: failure ?? 'Cambios fuera del alcance; revisión humana antes de continuar.' };
  const journal = existsSync(resolve(run.runDir, 'commands.json')) ? jsonRead(resolve(run.runDir, 'commands.json')) : [];
  if (result.status === 'PASS') ensure(task.verification.every(id => journal.findLast(command => command.id === id)?.code === 0 && journal.findLast(command => command.id === id)?.signature === taskSignature(root, task)), 'Resultado PASS sin verificaciones actuales.');
  validateResult(task, result, config);
  result = { ...result, taskId: task.id, changedFiles: diffs.map(diff => diff.path), tests: journal.map(({ signature, ...command }) => command), diffStat: diffs.map(({ diff, ...entry }) => entry), scopeViolations, reviewLevel: reviewLevel(task) };
  bounded(JSON.stringify(result), config.limits.resultChars, 'RESULT_PACKET final');
  save(resolve(run.runDir, 'RESULT_PACKET.json'), result);
  save(resolve(run.runDir, 'RESULT_PACKET.md'), markdownPacket('RESULT', result));
  save(resolve(run.runDir, 'affected.diff'), diffs.map(diff => diff.diff).join('\n'));
  save(resolve(run.runDir, 'VERIFICATION.md'), journal.map(command => `- ${command.id}: exit ${command.code}; ${command.command}; logs ${command.log}, ${command.errorLog}`).join('\n'));
  const finalSignature = taskSignature(root, task);
  save(resolve(run.runDir, 'batch.json'), { taskPath, snapshotDir: baseline, finalSignature });
  return { task, result, ...run, snapshotDir: baseline, finalSignature };
}
export function reviewContext(batch, root = ROOT) {
  const config = configuration(root), { task, result, runDir } = batch;
  const packet = readFileSync(resolve(runDir, 'RESULT_PACKET.md'), 'utf8');
  const dir = `${LOCAL}/runs/${runDir.split(/[\\/]/).at(-1)}`;
  const artifacts = [`${dir}/affected.diff`, `${dir}/VERIFICATION.md`, ...result.evidenceArtifacts, ...readdirSync(runDir).filter(path => path.endsWith('.log')).map(path => `${dir}/${path}`)];
  let prompt = `${readFileSync(safePath(root, STATE), 'utf8')}\n\n${packet}\n\nCriterios del lote: ${JSON.stringify(task.acceptanceCriteria)}\nObjetivo: ${task.objective}\n`;
  const level = reviewLevel(task);
  prompt += `\nSOL_REVIEW: ${reviewPolicy(task)}. Orden: RESULT_PACKET → criterios → diff stat → evidencia específica → diff dirigido. Diff en artifact: ${dir}/affected.diff (no incluido automáticamente). Evidencia: ${dir}/VERIFICATION.md. ${level === 'HIGH' ? 'Leer todo el diff afectado por rangos y evidencia ejecutable antes de aceptar.' : level === 'MEDIUM' ? 'Leer los rangos de diff pertinentes antes de aceptar.' : 'Paquete normalmente suficiente salvo evidencia visual o discrepancia.'} ${task.evidenceProfiles.includes('UI') ? 'Inspeccionar capturas con sdd_review_image.' : ''} Decidí con sdd_decide. No repetir pruebas válidas. Logs solo ante fallo/inconsistencia.`;
  return { prompt: bounded(prompt, config.limits.reviewChars, 'Contexto de revisión'), artifacts, diffTruncated: false };
}
export async function review(batch, { root = ROOT, reviewer = runPi } = {}) {
  const config = configuration(root), run = newRun(root, `${batch.task.id}-review`);
  const input = reviewContext(batch, root);
  await reviewer({ root, role: 'architect', config, task: batch.task, feature: batch.task.feature, result: batch.result, readFiles: batch.task.decisions, reviewArtifacts: input.artifacts, diffTruncated: input.diffTruncated, ...run }, input.prompt);
  ensure(existsSync(resolve(run.runDir, 'decision.json')), 'Sol no entregó una decisión validada.');
  const decision = jsonRead(resolve(run.runDir, 'decision.json'));
  if (decision.decision === 'ACCEPT') persistAcceptance(root, batch, decision);
  updateState(root, { Estado: `${batch.task.id}: ${decision.decision}`, 'Siguiente acción': decision.nextAction || decision.reason });
  return { decision, ...run };
}
function persistAcceptance(root, batch, decision) {
  ensure(batch.result.status === 'PASS' && !batch.result.scopeViolations.length, 'Resultado no aceptable.');
  ensure(batch.finalSignature === taskSignature(root, batch.task), 'Archivos modificados después de ejecutar el lote: repetir evidencia/revisión.');
  const destination = safePath(root, `${batch.task.feature}/evidence/pi-sdd/${batch.task.id}`);
  save(resolve(destination, 'RESULT_PACKET.md'), markdownPacket('RESULT', batch.result));
  save(resolve(destination, 'acceptance.json'), { decision, mode: batch.task.mode, taskIds: batch.task.taskIds, run: batch.name, acceptedAt: new Date().toISOString() });
  if (batch.task.mode !== 'IMPLEMENT') return;
  const tasksPath = safePath(root, `${batch.task.feature}/tasks.md`);
  let text = readFileSync(tasksPath, 'utf8');
  for (const id of batch.task.taskIds) text = text.replace(new RegExp(`(^- \\[) ([\\]] ${id}\\b)`, 'm'), '$1x$2');
  save(tasksPath, text);
}
export function requireImplementationEvidence(root, feature) {
  ensure(feature && /^specs\/[^/]+$/.test(feature), 'Converge necesita una feature explícita.');
  for (const artifact of ['spec.md', 'plan.md', 'tasks.md']) ensure(existsSync(safePath(root, `${feature}/${artifact}`)), `Converge requiere ${artifact}.`);
  const directory = safePath(root, `${feature}/evidence/pi-sdd`);
  const accepted = existsSync(directory) && readdirSync(directory).some(name => {
    const path = resolve(directory, name, 'acceptance.json');
    return existsSync(path) && jsonRead(path).mode === 'IMPLEMENT' && jsonRead(path).decision?.decision === 'ACCEPT';
  });
  ensure(accepted, 'Converge requiere implementación aceptada; un diagnóstico DISCOVERY no cumple ese requisito.');
}
export function unavailableCommands(batch) {
  return (batch.result.tests ?? []).filter(command => {
    if (command.code === 0 || !/^[a-z0-9.-]+\.log$/i.test(command.errorLog ?? '')) return false;
    const path = resolve(batch.runDir, command.errorLog);
    return existsSync(path) && /CommandNotFoundException|not recognized|no se reconoce/i.test(readFileSync(path, 'utf8'));
  }).map(command => command.id);
}
function stopForCorrection(batch, assessment, root) {
  const final = `Lote ${batch.task.id} detenido: se alcanzó el límite de correcciones.\nCausa: ${assessment.decision.reason}\nCorrección pendiente: ${assessment.decision.correction}\nÚltima revisión: ${assessment.runDir}/decision.json\nNo se aceptó el lote. Retomar con un diagnóstico más pequeño y evidencia efectiva.`;
  save(resolve(assessment.runDir, 'workflow-stop.json'), { taskId: batch.task.id, reason: assessment.decision.reason, correction: assessment.decision.correction });
  updateState(root, { Estado: `${batch.task.id}: bloqueado tras correcciones`, 'Siguiente acción': `Replantear discovery en lotes pequeños; revisar ${assessment.runDir.split(/[\\/]/).at(-1)}/decision.json. No declarar PASS sin hallazgos verificables.` });
  return { ...assessment, final, blocked: true };
}
export async function workflow(prompt, options = {}, backends = {}) {
  const root = options.root ?? ROOT, config = configuration(root);
  const planWith = backends.architect ?? architect, executeWith = backends.execute ?? execute, reviewWith = backends.review ?? review;
  let plan = await planWith(prompt, options), batches = 0;
  for (let step = 0; step < (config.limits.maxTransitions ?? 16); step += 1) {
    const skillRequest = resolve(plan.runDir, 'skill-request.json');
    if (existsSync(skillRequest)) {
      const request = jsonRead(skillRequest);
      ensure(SKILLS.includes(request.skill), 'Fase Spec Kit inválida.');
      const feature = options.feature ?? /- Feature actual: (specs\/[^\s;]+)/.exec(readFileSync(safePath(root, STATE), 'utf8'))?.[1];
      if (request.skill === 'converge') requireImplementationEvidence(root, feature);
      const phase = await planWith(request.prompt, { ...options, feature, skill: request.skill });
      const nextRequest = resolve(phase.runDir, 'skill-request.json');
      ensure(!existsSync(nextRequest) || jsonRead(nextRequest).skill !== request.skill, `La fase ${request.skill} se solicitó a sí misma sin avanzar. Workflow detenido para evitar consumir cuota en un bucle.`);
      const expected = { specify: 'spec.md', plan: 'plan.md', tasks: 'tasks.md' }[request.skill];
      if (expected) ensure(existsSync(safePath(root, `${feature}/${expected}`)), `La fase ${request.skill} terminó sin ${expected}. Requiere atención: ${(phase.final ?? '').slice(0, 1500)}`);
      if (existsSync(resolve(phase.runDir, 'handoff.json')) || existsSync(resolve(phase.runDir, 'skill-request.json'))) { plan = phase; continue; }
      plan = await planWith(`Objetivo original: ${prompt}. Fase ${request.skill}: ${bounded(phase.final ?? '', config.limits.resultChars, 'Resumen de fase')}. Continuá con la próxima fase necesaria, un lote o una pregunta imprescindible.`, options);
      continue;
    }
    const handoff = resolve(plan.runDir, 'handoff.json');
    if (!existsSync(handoff)) return plan;
    ensure(batches < config.limits.maxBatches, 'Límite de lotes alcanzado. Retomar desde PROJECT_STATE.');
    batches += 1;
    const taskPath = jsonRead(handoff).taskPath;
    let batch = await executeWith(taskPath, { root });
    let replan = false;
    for (let attempt = 0; attempt <= config.limits.maxCorrections; attempt += 1) {
      const assessment = await reviewWith(batch, { root });
      if (assessment.decision.decision === 'DECISION_REQUIRED') return assessment;
      if (assessment.decision.decision === 'ACCEPT') break;
      const missing = unavailableCommands(batch);
      if (missing.length) {
        plan = await planWith(`Objetivo original: ${prompt}. El lote ${batch.task.id} no fue aceptado: comandos ${missing.join(', ')} fallaron por herramienta no disponible. Su lista de comandos es inmutable: no devolver ese mismo lote. Emití un TASK_PACKET nuevo dentro del alcance original, con búsquedas PowerShell acotadas o git grep, sin asumir rg, y criterios más pequeños que entreguen los hallazgos concretos. Revisión: ${assessment.decision.reason}. Pendiente: ${assessment.decision.correction}. No ampliar acceso remoto ni autorizar producción.`, options);
        replan = true; break;
      }
      if (attempt >= config.limits.maxCorrections) return stopForCorrection(batch, assessment, root);
      batch = await executeWith(taskPath, { root, snapshotDir: batch.snapshotDir, correction: assessment.decision.correction });
    }
    if (replan) continue;
    plan = await planWith(`Lote ${batch.task.id} aceptado. Objetivo original: ${prompt}. Elegí el próximo lote; si todo está cubierto, solicitar converge con evidencia previamente recopilada. Resultado: ${JSON.stringify(batch.result)}`, options);
  }
  throw new Error('Límite de transiciones alcanzado. Continuar mediante otro workflow desde PROJECT_STATE.');
}

