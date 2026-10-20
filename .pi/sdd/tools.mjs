import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bounded, ensure, jsonRead, markdownPacket, normalized, reviewLevel, sensitive, runProcess, safePath, save, SKILLS, STATE, taskSignature, taskSlice, validateResult, validateTask, validateWritable } from './core.mjs';

const object = properties => ({ type: 'object', properties, additionalProperties: false });
const string = { type: 'string' };
const packetSchema = object({ packetJson: string });
packetSchema.required = ['packetJson'];
export function validateInput(schema, value, path = 'arguments') {
  ensure(value !== null && (schema.type !== 'object' || (typeof value === 'object' && !Array.isArray(value))), `${path}: objeto requerido.`);
  if (schema.enum) ensure(schema.enum.includes(value), `${path}: valor no permitido.`);
  if (schema.type === 'string') ensure(typeof value === 'string', `${path}: string requerido.`);
  if (schema.type === 'boolean') ensure(typeof value === 'boolean', `${path}: boolean requerido.`);
  if (schema.type === 'integer') ensure(Number.isSafeInteger(value) && (schema.minimum === undefined || value >= schema.minimum) && (schema.maximum === undefined || value <= schema.maximum), `${path}: entero fuera del rango.`);
  if (schema.type === 'array') { ensure(Array.isArray(value), `${path}: array requerido.`); value.forEach((item, index) => validateInput(schema.items, item, `${path}[${index}]`)); }
  if (schema.type === 'object') {
    for (const key of schema.required ?? []) ensure(Object.hasOwn(value, key), `${path}.${key}: requerido.`);
    for (const [key, item] of Object.entries(value)) { ensure(Object.hasOwn(schema.properties, key), `${path}.${key}: argumento no permitido.`); validateInput(schema.properties[key], item, `${path}.${key}`); }
  }
}
function definition(name, description, inputSchema, execute) { return { name, description, inputSchema, execute: async args => { validateInput(inputSchema, args); return execute(args); } }; }

export function createTools(context) {
  const { root, role, task, config, runDir } = context;
  let readChars = 0;
  const journal = [];
  const finish = items => items.map(tool => {
    if (!['sdd_write', 'sdd_command', 'sdd_write_spec', 'sdd_spec_command', 'sdd_submit_task', 'sdd_request_skill', 'sdd_submit_result', 'sdd_decide'].includes(tool.name)) return tool;
    return { ...tool, execute: async args => {
      const path = resolve(runDir, 'actions.json');
      save(path, [...(existsSync(path) ? jsonRead(path) : []), { name: tool.name, at: new Date().toISOString() }]);
      return tool.execute(args);
    } };
  });
  const allowedReads = new Set([STATE, '.specify/memory/constitution.md', '.pi/sdd/templates/TASK_PACKET.json', 'CONTEXT.md', 'ADR-candidatos.md', 'INICIO.md', 'ARQUITECTURA-Y-PRODUCTO.md', '.agents/rules/test.md', '.agent/skills/impeccable/SKILL.md', ...(context.readFiles ?? []), ...(task?.readFiles ?? []), ...(task?.allowedFiles ?? []), ...(task?.decisions ?? [])]);
  for (const paths of Object.values(config.rules)) paths.forEach(path => allowedReads.add(path));
  if (role === 'architect') for (const path of readFileSync(safePath(root, STATE), 'utf8').match(/\.specify\/memory\/decisions\/[a-z0-9-]+\.md/g) ?? []) allowedReads.add(path);
  if (role === 'architect' && context.skill) {
    for (const path of ['.specify/extensions.yml', '.specify/init-options.json', '.specify/templates/spec-template.md', '.specify/templates/plan-template.md', '.specify/templates/tasks-template.md', '.specify/templates/checklist-template.md', '.specify/templates/constitution-template.md']) allowedReads.add(path);
    if (context.feature) for (const path of ['spec.md', 'plan.md', 'research.md', 'data-model.md', 'quickstart.md']) allowedReads.add(`${context.feature}/${path}`);
  }
  const consume = text => {
    const limit = config.limits[role === 'architect' ? 'architectReadChars' : 'executorReadChars'];
    ensure(text.length <= limit - readChars, `Lectura excede presupuesto: quedan ${limit - readChars} caracteres; solicitar un rango más pequeño y usar el contexto ya recibido.`);
    readChars += text.length;
    return text;
  };
  const tools = [definition('sdd_read', 'Leer un rango de un archivo autorizado de Rendo; path relativo completo. PROJECT_STATE es .specify/memory/PROJECT_STATE.md y ya viene incluido al iniciar. Sin lectura global ni secrets.', object({ path: string, offset: { type: 'integer', minimum: 0 }, chars: { type: 'integer', minimum: 1, maximum: config.limits.readChars } }), async ({ path, offset = 0, chars = config.limits.readChars }) => {
    const clean = normalized(path === 'PROJECT_STATE' ? STATE : path);
    ensure(allowedReads.has(clean), `Archivo no autorizado: ${clean}. Solicitar contexto a Sol.`);
    ensure(!clean.endsWith('/tasks.md'), 'Usar sdd_tasks con ids; no leer tasks.md completo.');
    const text = readFileSync(safePath(root, clean), 'utf8');
    ensure(!text.includes('\0'), 'Archivo binario: usar evidencia específica.');
    return consume(JSON.stringify({ path: clean, offset, totalChars: text.length, content: text.slice(offset, offset + Math.min(chars, config.limits.readChars)) }));
  }), definition('sdd_tasks', 'Leer únicamente las tareas Spec Kit identificadas.', object({ feature: string, ids: { type: 'array', items: string } }), async ({ feature, ids }) => {
    ensure(/^specs\/[^/]+$/.test(feature), 'Feature inválida.');
    if (task) ensure(feature === task.feature && ids.every(id => task.taskIds.includes(id)), 'Tareas fuera del lote.');
    return consume(bounded(taskSlice(root, feature, ids), config.limits.readChars, 'Selección de tareas'));
  }), definition('sdd_rules', 'Cargar solo reglas especializadas pertinentes: DESIGN/SECURITY/DOMAIN/AGENT_RULES.', object({ name: string }), async ({ name }) => {
    ensure(Object.hasOwn(config.rules, name), 'Regla desconocida.');
    return consume(config.rules[name].map(path => readFileSync(safePath(root, path), 'utf8')).join('\n'));
  })];
  if (role === 'architect') return finish([...tools, ...architectTools(context, allowedReads, consume)]);
  return finish([...tools, definition('sdd_write', 'Escribir un archivo exacto autorizado por Sol. No cambiar arquitectura/contratos sin decisión.', object({ path: string, content: string }), async ({ path, content }) => {
    ensure(task.allowedFiles.includes(path), 'Archivo fuera del alcance.');
    validateWritable(root, task, path);
    save(safePath(root, path), content);
    return `Guardado: ${path}`;
  }), definition('sdd_command', 'Ejecutar un comando aprobado por id. Logs completos a disco; devuelve solo código y extracto.', object({ id: string }), async ({ id }) => {
    const command = task.commands.find(item => item.id === id);
    ensure(command, `Comando no autorizado: ${id}`);
    const prefix = `${journal.length + 1}-${id}`;
    const result = await runProcess({ executable: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'\n${command.command}\n$taskCommandSucceeded = $?\nif ($null -ne $LASTEXITCODE) { exit $LASTEXITCODE }\nif (-not $taskCommandSucceeded) { exit 1 }`], cwd: root, timeoutMs: command.timeoutMs, stdoutFile: resolve(runDir, `${prefix}.stdout.log`), stderrFile: resolve(runDir, `${prefix}.stderr.log`) });
    journal.push({ id, command: command.command, code: result.code, signature: taskSignature(root, task), log: `${prefix}.stdout.log`, errorLog: `${prefix}.stderr.log` });
    save(resolve(runDir, 'commands.json'), journal);
    return JSON.stringify({ id, code: result.code, log: `${prefix}.stdout.log`, stderr: `${prefix}.stderr.log`, excerpt: `${result.stdout}\n${result.stderr}`.slice(-3000) });
  }), definition('sdd_submit_result', 'Entregar RESULT_PACKET compacto en JSON. El orquestador añade diff y evidencia de comandos.', packetSchema, async ({ packetJson }) => {
    const result = validateResult(task, JSON.parse(packetJson), config);
    if (result.status === 'PASS') {
      const signature = taskSignature(root, task);
      ensure(task.verification.every(id => journal.findLast(c => c.id === id)?.code === 0 && journal.findLast(c => c.id === id)?.signature === signature), 'Faltan verificaciones PASS sobre la versión final.');
    }
    for (const path of result.evidenceArtifacts) {
      ensure(path.startsWith(`${task.feature}/evidence/`), 'Evidencia debe pertenecer a la feature activa.');
      ensure(existsSync(safePath(root, path)), `Evidencia inexistente: ${path}`);
    }
    save(resolve(runDir, 'result-proposal.json'), result);
    return 'RESULT_PACKET registrado. Terminá el turno.';
  })]);
}
function architectTools(context, allowedReads, consume) {
  const { root, runDir, config, feature, task } = context;
  const inspected = new Set();
  const reviewedRanges = new Map();
  return [definition('sdd_file_info', 'Comprobar existencia de un archivo autorizado, sin leerlo. Usar para extensions.yml, plantillas y artefactos de la feature.', object({ path: string }), async ({ path }) => {
    const clean = normalized(path);
    ensure(allowedReads.has(clean), 'Archivo fuera del contexto autorizado.');
    return JSON.stringify({ path: clean, exists: existsSync(safePath(root, clean)) });
  }), definition('sdd_request_skill', `Solicitar otra fase Spec Kit y terminar. ${context.skill ? `La fase ${context.skill} ya está activa: ejecutarla, no volver a solicitarla.` : 'Pi carga la skill en otro contexto de Sol.'}`, object({ skill: { type: 'string', enum: SKILLS.filter(name => name !== context.skill) }, prompt: string }), async ({ skill, prompt }) => {
    ensure(!task && SKILLS.includes(skill) && typeof prompt === 'string' && prompt.trim(), 'Solicitud Spec Kit inválida o durante revisión.');
    ensure(skill !== context.skill, 'La fase solicitada ya está activa; ejecutar sus instrucciones y crear sus artefactos.');
    ensure(!existsSync(resolve(runDir, 'handoff.json')), 'Elegir skill o lote, nunca ambos.');
    save(resolve(runDir, 'skill-request.json'), { skill, prompt: bounded(prompt, config.limits.taskChars, 'Pedido Spec Kit') });
    return 'Fase solicitada. Terminá el turno; Pi la ejecuta en otro contexto.';
  }), definition('sdd_task_index', 'Obtener IDs, checkboxes y títulos de tareas de la feature, sin detalles ni historial.', object({ feature: string }), async ({ feature: selected }) => {
    ensure(selected === feature && /^specs\/[^/]+$/.test(selected), 'Feature fuera del contexto.');
    const lines = readFileSync(safePath(root, `${selected}/tasks.md`), 'utf8').split('\n').filter(line => /^- \[[ xX]\] T\d+\b/.test(line));
    return consume(bounded(lines.join('\n'), config.limits.readChars, 'Índice de tareas; dividir feature si excede presupuesto'));
  }), definition('sdd_submit_task', 'Crear TASK_PACKET de Rendo y ceder el turno. Pi despacha al terminar Sol.', packetSchema, async ({ packetJson }) => {
    const packet = validateTask(root, JSON.parse(packetJson), config);
    ensure(!existsSync(resolve(runDir, 'skill-request.json')), 'Elegir skill o lote, nunca ambos.');
    const dir = resolve(root, '.pi/local/packets', packet.id);
    ensure(!existsSync(resolve(dir, 'TASK_PACKET.json')), 'ID de lote existente: usar otro id.');
    save(resolve(dir, 'TASK_PACKET.json'), packet);
    save(resolve(dir, 'TASK_PACKET.md'), markdownPacket('TASK', packet));
    save(resolve(runDir, 'handoff.json'), { taskPath: relativePacket(packet.id) });
    return `TASK_PACKET registrado: ${packet.id}. Terminá el turno; Sol se detiene antes del ejecutor.`;
  }), definition('sdd_write_spec', 'Escribir artefactos Spec Kit de la feature activa o añadir una decisión duradera. Nunca código.', object({ path: string, content: string, append: { type: 'boolean' } }), async ({ path, content, append = false }) => {
    const decision = /^\.specify\/memory\/decisions\/[a-z0-9-]+\.md$/.test(path);
    const spec = feature && path.startsWith(`${feature}/`) && /\.md$|\/contracts\/[^/]+\.(yaml|json)$/.test(path);
    ensure(decision || spec || (context.skill === 'constitution' && path === '.specify/memory/constitution.md'), 'Sol solo puede escribir artefactos SDD autorizados.');
    if (context.skill === 'converge') ensure(path === `${feature}/tasks.md` && append, 'Converge solo puede añadir a tasks.md.');
    const file = safePath(root, path);
    if (decision) ensure(!existsSync(file), 'Las decisiones son append-only: crear otra decisión.');
    save(file, `${append && existsSync(file) ? readFileSync(file, 'utf8') : ''}${content}`);
    allowedReads.add(path);
    return `Artefacto SDD guardado: ${path}`;
  }), definition('sdd_spec_command', 'Ejecutar scripts administrativos existentes de Spec Kit. script es el nombre corto sin ruta ni .ps1; arguments contiene sus parámetros PowerShell.', object({ script: { type: 'string', enum: ['check-prerequisites', 'setup-plan', 'setup-tasks', 'create-new-feature', 'resolve-template'] }, arguments: { type: 'array', items: string } }), async ({ script, arguments: args = [] }) => {
    const scripts = ['check-prerequisites', 'setup-plan', 'setup-tasks', 'create-new-feature', 'resolve-template'];
    ensure(scripts.includes(script), 'Script fuera de Spec Kit.');
    ensure(args.every(arg => typeof arg === 'string' && !/[\r\n\x00]/.test(arg)), 'Argumentos inválidos.');
    const result = await runProcess({ executable: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', safePath(root, `.specify/scripts/powershell/${script}.ps1`), ...args], cwd: root, env: feature ? { SPECIFY_FEATURE: feature.split('/')[1], SPECIFY_FEATURE_DIRECTORY: feature } : {}, timeoutMs: 120000 });
    save(resolve(runDir, `spec-${script}.log`), `${result.stdout}\n${result.stderr}`);
    return consume(bounded(JSON.stringify({ code: result.code, stdout: result.stdout, stderr: result.stderr }), config.limits.readChars, 'Salida Spec Kit'));
  }), definition('sdd_review_read', 'Leer evidencia o diff dirigido por secciones. Logs solo ante fallo/inconsistencia.', object({ artifact: string, offset: { type: 'integer', minimum: 0 }, chars: { type: 'integer', minimum: 1 }, reason: string }), async ({ artifact, offset = 0, chars = config.limits.readChars, reason = '' }) => {
    ensure(task && context.reviewArtifacts?.includes(artifact), 'Artefacto fuera de esta revisión.');
    if (artifact.endsWith('.log')) ensure(context.result?.status !== 'PASS' || reason.trim().length >= 20, 'Logs solo ante un fallo o inconsistencia explicada.');
    const text = readFileSync(safePath(root, artifact, { privateAccess: true }), 'utf8');
    const end = Math.min(text.length, offset + Math.min(chars, config.limits.readChars));
    const output = consume(text.slice(offset, end));
    inspected.add(artifact);
    if (end > offset) reviewedRanges.set(artifact, [...(reviewedRanges.get(artifact) ?? []), [offset, end]]);
    return output;
  }), definition('sdd_review_image', 'Inspeccionar una captura afectada o contact sheet autorizada para aceptar UI.', object({ artifact: string }), async ({ artifact }) => {
    ensure(task && context.reviewArtifacts?.includes(artifact) && /\.(png|jpe?g|webp)$/i.test(artifact), 'Captura fuera de esta revisión.');
    const bytes = readFileSync(safePath(root, artifact));
    ensure(bytes.length <= 5e6, 'Captura demasiado grande: solicitar contact sheet compacta.');
    inspected.add(artifact);
    return { content: [{ type: 'image', data: bytes.toString('base64'), mimeType: /\.png$/i.test(artifact) ? 'image/png' : /\.webp$/i.test(artifact) ? 'image/webp' : 'image/jpeg' }], details: { artifact } };
  }), definition('sdd_decide', 'Aceptar, pedir corrección o elevar una decisión. Solo sobre el resultado actual.', object({ decision: { type: 'string', enum: ['ACCEPT', 'CORRECT', 'DECISION_REQUIRED'] }, reason: string, correction: string, nextAction: string }), async decision => {
    ensure(task && context.result, 'No hay resultado revisable.');
    ensure(typeof decision.reason === 'string' && decision.reason.trim(), 'Razón requerida.');
    if (decision.decision === 'ACCEPT') {
      ensure(context.result.status === 'PASS' && !context.result.scopeViolations?.length, 'No aceptar un resultado sin PASS o fuera del alcance.');
      const level = reviewLevel(task);
      if (level !== 'LOW' || context.diffTruncated) {
        const diff = [...inspected].find(path => path.endsWith('/affected.diff'));
        ensure(diff, `${level} requiere revisión dirigida del diff afectado.`);
        const length = readFileSync(safePath(root, diff, { privateAccess: true }), 'utf8').length;
        const ranges = reviewedRanges.get(diff) ?? [];
        ensure(!length || ranges.length, 'El rango solicitado no cubre ningún cambio.');
        if (level === 'HIGH') ensure(coversWholeFile(ranges, length), 'HIGH requiere leer el diff afectado completo, sin rangos omitidos.');
      }
      if (level === 'HIGH' || sensitive(task)) ensure([...inspected].some(path => path.endsWith('/VERIFICATION.md')), 'La revisión sensible/HIGH requiere evidencia ejecutable pertinente.');
      if (task.evidenceProfiles.includes('UI')) ensure([...inspected].some(path => /\.(png|jpe?g|webp)$/i.test(path)), 'UI requiere inspección visual de Sol.');
    }
    if (decision.decision === 'CORRECT') ensure(decision.correction?.trim(), 'Corrección concreta requerida.');
    save(resolve(runDir, 'decision.json'), { ...decision, reviewedArtifacts: [...inspected], reviewedRanges: Object.fromEntries(reviewedRanges) });
    return 'Decisión registrada. Terminá tu turno.';
  })];
}
function coversWholeFile(ranges, length) {
  let covered = 0;
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start > covered) return false;
    covered = Math.max(covered, end);
  }
  return covered >= length;
}
function relativePacket(id) { return `.pi/local/packets/${id}/TASK_PACKET.json`; }

export function toolResult(value) { return value?.content ? value : { content: [{ type: 'text', text: String(value) }], details: {} }; }
