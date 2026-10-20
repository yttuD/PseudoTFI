import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { architect, configuration, doctor, execute, prepare, registry, review, ROOT, workflow } from './runner.mjs';
import { ensure, jsonRead, LOCAL, runProcess, safePath, save, SKILLS, STATE, validateTask } from './core.mjs';
import { webCommand } from './web/commands.mjs';

const HELP = `Rendo · Pi SDD (Sol High → Antigravity Flash Medium → Sol)

node .pi/sdd/cli.mjs doctor                         Diagnóstico sin llamadas a modelos
node .pi/sdd/cli.mjs ui                             Abrir Pi para trabajar desde la terminal
node .pi/sdd/cli.mjs models architect|executor      Catálogo exacto; sin inferencias
node .pi/sdd/cli.mjs login architect|executor       Login oficial por suscripción
node .pi/sdd/cli.mjs architect "pedido" --feature specs/<feature>
node .pi/sdd/cli.mjs speckit.plan "contexto" --feature specs/<feature>
node .pi/sdd/cli.mjs workflow "pedido" --feature specs/<feature>
node .pi/sdd/cli.mjs validate <TASK_PACKET.json>     Validar sin ejecutar
node .pi/sdd/cli.mjs execute <TASK_PACKET.json>      Solo Gemini; Sol permanece apagado
node .pi/sdd/cli.mjs review <nombre-de-run>          Solo Sol; revisión adaptativa
node .pi/sdd/cli.mjs batch <TASK_PACKET.json>        Gemini seguido de revisión Sol
node .pi/sdd/cli.mjs configure architect|executor <modelo> [provider]
node .pi/sdd/cli.mjs smoke architect|executor       Una consulta breve al modelo real
node .pi/sdd/cli.mjs install-executor               Instalar CLI oficial con SHA512
node .pi/sdd/cli.mjs configure-executor             Autorizar las seis herramientas MCP de Rendo
node .pi/sdd/cli.mjs status                         Estado compacto de Rendo
node .pi/sdd/cli.mjs web serve                      Puente local para ChatGPT/Gemini web
node .pi/sdd/cli.mjs web pair                       Código para vincular la extensión Rendo
node .pi/sdd/cli.mjs web status                     Comprobar extensión y selección configurada
node .pi/sdd/cli.mjs web mode web|cli                Backend principal del workflow
node .pi/sdd/cli.mjs web fallback on|off             Fallback ante cuota, login o conexión
node .pi/sdd/cli.mjs web smoke architect|executor    Verificar un chat nuevo y su modelo/nivel

Las rutas de paquetes son relativas al repositorio. Logs, sesiones y paquetes:
.pi/local/ (privado e ignorado por Git). No se cambia de modelo en la misma sesión.
`;
function parseArguments(args) {
  const featureIndex = args.indexOf('--feature');
  const feature = featureIndex >= 0 ? args[featureIndex + 1] : undefined;
  return { feature, words: args.filter((_item, index) => featureIndex < 0 || (index !== featureIndex && index !== featureIndex + 1)) };
}
async function exclusive(action) {
  const lock = resolve(ROOT, LOCAL, 'orchestrator.lock');
  mkdirSync(resolve(ROOT, LOCAL), { recursive: true });
  try { saveLock(lock); } catch { throw new Error('Otro proceso SDD de Rendo está activo. Si fue interrumpido, comprobar su PID en orchestrator.lock antes de retirar el lock.'); }
  try { return await action(); } finally { unlinkSync(lock); }
}
function saveLock(path) {
  const { writeFileSync } = process.getBuiltinModule('fs');
  writeFileSync(path, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }), { flag: 'wx' });
}
function interactive(executable, args, cwd, env = {}) {
  return new Promise((resolveCode, reject) => {
    const child = spawn(executable, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('close', code => resolveCode(code ?? 1));
  });
}
async function openRendoUi({ login = false } = {}) {
  const config = configuration(), agentDir = prepare(), runDir = resolve(ROOT, LOCAL, 'ui', String(Date.now()));
  const contextPath = resolve(runDir, 'context.json');
  save(contextPath, { root: ROOT, role: 'architect', config, runDir, ui: true });
  if (login) process.stdout.write('Rendo: escribí /login dentro de Pi y elegí ChatGPT Plus/Pro (Codex subscription). Después podés usar /rendo directamente en esta misma sesión.\n');
  return interactive(process.execPath, [resolve(ROOT, '.pi/runtime/node_modules/@mariozechner/pi-coding-agent/dist/cli.js'), '--provider', config.roles.architect.provider, '--model', config.roles.architect.model, '--thinking', config.roles.architect.thinking, '--no-extensions', '--extension', resolve(ROOT, '.pi/runtime/rendo-loader.mjs'), '--no-context-files', '--no-skills', '--no-prompt-templates', '--no-builtin-tools', '--system-prompt', resolve(ROOT, '.pi/sdd/agents/architect.md'), '--session-dir', resolve(runDir, 'sessions')], ROOT, { PI_CODING_AGENT_DIR: agentDir, RENDO_SDD_CONTEXT: contextPath, PI_SKIP_VERSION_CHECK: '1' });
}
async function login(role) {
  const config = configuration();
  ensure(['architect', 'executor'].includes(role), 'Rol inválido.');
  if (role === 'executor') return interactive(resolve(ROOT, config.roles.executor.executable), [], ROOT);
  const agentDir = prepare(), marker = resolve(agentDir, 'codex-access-only.json');
  const code = await openRendoUi({ login: true });
  const authPath = resolve(agentDir, 'auth.json');
  if (existsSync(marker) && existsSync(authPath) && jsonRead(authPath)['openai-codex']?.refresh) unlinkSync(marker);
  return code;
}
async function listModels(role) {
  if (role === 'architect') {
    const { models } = await registry();
    return models.getAll().filter(model => model.provider === configuration().roles.architect.provider).map(model => ({ id: model.id, name: model.name }));
  }
  ensure(role === 'executor', 'Rol inválido.');
  const result = await runProcess({ executable: resolve(ROOT, configuration().roles.executor.executable), args: ['models'], cwd: ROOT, timeoutMs: 60000 });
  ensure(result.code === 0, 'No se pudo consultar el catálogo de Antigravity.');
  return result.stdout;
}
async function smoke(role) {
  ensure(['architect', 'executor'].includes(role), 'Rol inválido.');
  if (role === 'architect') {
    const result = await architect('Prueba de conexión: respondé únicamente RENDO_SOL_OK. No uses herramientas ni delegues.');
    ensure(result.final.includes('RENDO_SOL_OK'), 'Smoke de Sol no confirmado.');
    return { status: 'PASS', role, run: result.runDir, output: result.final };
  }
  const config = configuration(), dir = resolve(ROOT, LOCAL, 'smoke-executor');
  mkdirSync(dir, { recursive: true });
  const result = await runProcess({ executable: resolve(ROOT, config.roles.executor.executable), args: ['--print', 'Respondé únicamente RENDO_GEMINI_OK. No uses herramientas.', '--model', config.roles.executor.model, '--effort', 'medium', '--output-format', 'json', '--disable-slash-commands', '--print-timeout', '2m', '--log-file', resolve(dir, 'antigravity.log')], cwd: dir, timeoutMs: 150000, stdoutFile: resolve(dir, 'output.json'), stderrFile: resolve(dir, 'stderr.log') });
  const packet = JSON.parse(result.stdout);
  ensure(result.code === 0 && packet.status === 'SUCCESS' && packet.response.includes('RENDO_GEMINI_OK'), `Smoke Gemini falló; consultar ${dir}.`);
  return { status: 'PASS', role, model: config.roles.executor.model, usage: packet.usage, output: packet.response };
}
async function existingBatch(name) {
  ensure(/^[a-z0-9-]+$/.test(name), 'Nombre de run inválido.');
  const runDir = resolve(ROOT, LOCAL, 'runs', name), metadata = jsonRead(resolve(runDir, 'batch.json'));
  return { task: jsonRead(safePath(ROOT, metadata.taskPath, { privateAccess: true })), result: jsonRead(resolve(runDir, 'RESULT_PACKET.json')), name, runDir, snapshotDir: metadata.snapshotDir, finalSignature: metadata.finalSignature };
}
async function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const { words, feature } = parseArguments(rest);
  const config = configuration();
  if (command === 'help') return HELP;
  if (command === 'status') return readFileSync(safePath(ROOT, STATE), 'utf8');
  if (command === 'web') {
    if (words[0] === 'smoke') return exclusive(() => webCommand(words, ROOT, config));
    if (['mode', 'fallback', 'model'].includes(words[0])) ensure(!existsSync(resolve(ROOT, LOCAL, 'orchestrator.lock')), 'Cambiar configuración cuando no haya un workflow activo.');
    return webCommand(words, ROOT, config);
  }
  if (command === 'doctor') { const result = await doctor(); if (!result.ready) process.exitCode = 2; return result; }
  if (command === 'ui') {
    process.exitCode = await openRendoUi();
    return 'Pi de Rendo cerrado.';
  }
  if (command === 'login') { process.exitCode = await login(words[0]); return 'Login finalizado.'; }
  if (command === 'models') return listModels(words[0]);
  if (command === 'install-executor') { process.exitCode = await interactive('powershell.exe', ['-NoLogo', '-NoProfile', '-File', resolve(ROOT, '.pi/sdd/install-executor.ps1')], ROOT); return 'Instalación finalizada.'; }
  if (command === 'configure-executor') { process.exitCode = await interactive(process.execPath, [resolve(ROOT, '.pi/sdd/configure-executor.mjs')], ROOT); return 'Configuración finalizada.'; }
  if (command === 'configure') {
    const [role, model, provider] = words;
    ensure(['architect', 'executor'].includes(role) && model, 'Usar configure <rol> <modelo> [provider].');
    config.roles[role] = { ...config.roles[role], model, ...(provider ? { provider } : {}) };
    save(resolve(ROOT, '.pi/sdd/config.json'), config);
    return { configured: role, model, message: 'Verificar con doctor y smoke; no hay sustitución automática.' };
  }
  if (command === 'validate') return { status: 'PASS', task: validateTask(ROOT, jsonRead(safePath(ROOT, words[0], { privateAccess: true })), config).id };
  return exclusive(async () => {
    if (command === 'smoke') return smoke(words[0]);
    if (command === 'execute' || command === 'batch') {
      const batch = await execute(words[0]);
      if (batch.result.status !== 'PASS') process.exitCode = 2;
      if (command === 'batch') { const assessment = await review(batch); if (assessment.decision.decision !== 'ACCEPT') process.exitCode = 2; return { result: batch.result, ...assessment }; }
      return { result: batch.result, run: batch.name, next: `node .pi/sdd/cli.mjs review ${batch.name}` };
    }
    if (command === 'review') return review(await existingBatch(words[0]));
    if (command === 'architect' || command === 'workflow') {
      const readiness = await doctor(); ensure(readiness.ready, readiness.errors.join('\n'));
      const result = await (command === 'workflow' ? workflow : architect)(words.join(' '), { feature });
      if (result.blocked) process.exitCode = 2;
      return { output: result.final ?? result.decision, run: result.runDir };
    }
    if (command.startsWith('speckit.')) {
      const skill = command.slice(8);
      ensure(SKILLS.includes(skill), 'Comando Spec Kit no disponible para Sol. implement se ejecuta por TASK_PACKET.');
      const result = await architect(words.join(' '), { feature, skill });
      return { output: result.final, run: result.runDir };
    }
    throw new Error(`Comando desconocido: ${command}. Ejecutar node .pi/sdd/cli.mjs help.`);
  });
}
try { const result = await main(); process.stdout.write(`${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n`); }
catch (error) { process.stderr.write(`Rendo SDD: ${error.message}\n`); process.exitCode = 1; }


