import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

export const STATE = '.specify/memory/PROJECT_STATE.md';
export const LOCAL = '.pi/local';
export const SKILLS = ['constitution', 'specify', 'clarify', 'plan', 'tasks', 'checklist', 'analyze', 'converge'];
const PROFILES = ['CODE', 'API', 'DB', 'UI', 'SECURITY', 'MONEY', 'MIGRATION'];
const PRIVATE = /(^|\/)(\.git|node_modules|\.env[^/]*|auth\.json|.*credentials.*|.*\.pem|.*\.key)(\/|$)|\/\.auth\/|\.pi\/local\//i;
const CONTROL = /^(\.pi\/|\.agents\/|\.agent\/|\.claude\/|\.specify\/|scripts\/sdd)|^(INICIO|ESTADO-REAL|ADR-candidatos|ARQUITECTURA-Y-PRODUCTO)\.md$/i;
const CONTRACT = /(^|\/)(contracts|migrations)\/|(^|\/)(schema|data-model)[^/]*\.|^packages\/(types|database)\//i;
export function ensure(condition, message) { if (!condition) throw new Error(message); }
export function jsonRead(path) { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')); }
export function save(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
export function bounded(text, max, label) {
  ensure(text.length <= max, `${label}: ${text.length} caracteres supera ${max}; resumir o dividir.`);
  return text;
}
export function normalized(path) {
  ensure(typeof path === 'string' && path.length > 0, 'Ruta requerida.');
  const result = path.replaceAll('\\', '/');
  ensure(!isAbsolute(result) && !/[:\x00-\x1f]/.test(result), 'Usar una ruta relativa al proyecto.');
  ensure(!result.split('/').some(part => part === '..' || part === '.' || !part), 'Ruta ambigua o fuera del proyecto.');
  return result;
}
export function safePath(root, path, { privateAccess = false } = {}) {
  const clean = normalized(path);
  ensure(privateAccess || !PRIVATE.test(clean), `Ruta privada: ${clean}`);
  const target = resolve(root, clean);
  let ancestor = target;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const actual = realpathSync(ancestor);
  const base = realpathSync(root);
  const rel = relative(base, actual);
  ensure(!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel), 'Symlink fuera del proyecto.');
  return target;
}
export function hashFile(path) {
  return existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null;
}
export function taskSignature(root, task) {
  return JSON.stringify(task.allowedFiles.map(path => [path, hashFile(safePath(root, path))]));
}
function uniqueStrings(value, label) {
  ensure(Array.isArray(value) && value.every(item => typeof item === 'string'), `${label}: usar array de strings.`);
  ensure(new Set(value.map(item => item.toLowerCase())).size === value.length, `${label}: duplicados.`);
}
export function sensitive(task) {
  return task.evidenceProfiles.some(item => ['SECURITY', 'MONEY', 'MIGRATION'].includes(item)) ||
    /auth|rls|permission|permis|secrets|pagos|pricing|factur|billing|afip|migration|authorization/i.test(task.allowedFiles.join(' '));
}
const REVIEW_POLICIES = ['PACKET_ONLY', 'TARGETED_DIFF', 'FULL_AFFECTED_DIFF'];
function reviewFloor(task) { return task.risk === 'HIGH' ? 2 : sensitive(task) || task.risk === 'MEDIUM' ? 1 : 0; }
export function reviewPolicy(task) {
  return REVIEW_POLICIES[Math.max(reviewFloor(task), REVIEW_POLICIES.indexOf(task.solReview))];
}
export function reviewLevel(task) { return ['LOW', 'MEDIUM', 'HIGH'][REVIEW_POLICIES.indexOf(reviewPolicy(task))]; }
export function validateTask(root, task, config) {
  bounded(JSON.stringify(task), config.limits.taskChars, 'TASK_PACKET');
  ensure(/^[a-z0-9][a-z0-9-]{0,63}$/.test(task.id), 'id de lote inválido.');
  ensure(['IMPLEMENT', 'DISCOVERY'].includes(task.mode), 'mode: IMPLEMENT o DISCOVERY.');
  ensure(['LOW', 'MEDIUM', 'HIGH'].includes(task.risk), 'risk inválido.');
  ensure(typeof task.objective === 'string' && task.objective.trim(), 'Objetivo requerido.');
  ensure(typeof task.relevantContext === 'string', 'relevantContext requerido.');
  ensure(task.expectedOutput === 'RESULT_PACKET', 'expectedOutput debe ser RESULT_PACKET.');
  ensure(/^specs\/[^/]+$/.test(task.feature), 'Feature debe ser specs/<nombre>.');
  for (const key of ['readFiles', 'allowedFiles', 'decisions', 'rules', 'taskIds', 'verification', 'evidenceProfiles']) uniqueStrings(task[key], key);
  ensure(task.evidenceProfiles.length && task.evidenceProfiles.every(p => PROFILES.includes(p)), 'Perfiles inválidos.');
  if (task.solReview !== undefined) {
    ensure(REVIEW_POLICIES.includes(task.solReview), 'solReview inválido.');
    ensure(REVIEW_POLICIES.indexOf(task.solReview) >= reviewFloor(task), 'solReview no puede reducir el mínimo de riesgo/sensibilidad.');
  }
  ensure(task.rules.every(rule => Object.hasOwn(config.rules, rule)), 'Regla desconocida.');
  ensure(Array.isArray(task.approvedChanges), 'approvedChanges requerido.');
  for (const path of [...task.readFiles, ...task.allowedFiles, ...task.decisions]) safePath(root, path);
  for (const path of task.decisions) ensure(/^\.specify\/memory\/decisions\/.*\.md$/.test(path) && existsSync(safePath(root, path)), 'Decisión duradera inexistente.');
  for (const path of task.allowedFiles) validateWritable(root, task, path);
  ensure(Array.isArray(task.acceptanceCriteria) && task.acceptanceCriteria.length, 'Criterios requeridos.');
  uniqueStrings(task.acceptanceCriteria.map(item => item.id), 'ids de criterios');
  ensure(task.acceptanceCriteria.every(item => /^[A-Z0-9-]+$/.test(item.id) && typeof item.text === 'string' && item.text.trim()), 'Criterio inválido.');
  ensure(Array.isArray(task.commands), 'commands requerido.');
  uniqueStrings(task.commands.map(command => command.id), 'ids de comandos');
  for (const command of task.commands) {
    ensure(/^[a-z0-9-]+$/.test(command.id) && typeof command.command === 'string' && command.command.trim(), 'Comando inválido.');
    ensure(['VERIFY', 'DISCOVERY'].includes(command.purpose), 'purpose inválido.');
    ensure(Number.isSafeInteger(command.timeoutMs) && command.timeoutMs > 0 && command.timeoutMs <= config.limits.timeoutMs, 'Timeout inválido.');
  }
  ensure(task.verification.every(id => task.commands.some(c => c.id === id && c.purpose === 'VERIFY')), 'Verificación sin comando VERIFY.');
  if (task.mode === 'DISCOVERY') ensure(!task.allowedFiles.length, 'DISCOVERY no puede implementar.');
  if (task.mode === 'IMPLEMENT') {
    ensure(task.allowedFiles.length && task.taskIds.length && task.verification.length, 'IMPLEMENT necesita archivos, tareas y verificaciones.');
    for (const artifact of ['spec.md', 'plan.md', 'tasks.md']) ensure(existsSync(safePath(root, `${task.feature}/${artifact}`)), `Falta ${artifact} de Spec Kit.`);
    taskSlice(root, task.feature, task.taskIds);
  }
  if (task.evidenceProfiles.includes('UI')) ensure(task.commands.some(c => /playwright/.test(c.command)), 'UI requiere Playwright.');
  return { ...task, solReview: reviewPolicy(task) };
}
export function validateWritable(root, task, path) {
  const clean = normalized(path);
  safePath(root, clean);
  ensure(!CONTROL.test(clean), `El ejecutor no puede editar configuración, SDD o decisiones: ${clean}`);
  if (!CONTRACT.test(clean)) return;
  const approval = task.approvedChanges.find(item => item.path === clean && task.decisions.includes(item.decision));
  ensure(approval && existsSync(safePath(root, approval.decision)), `Cambio protegido requiere decisión de Sol: ${clean}`);
}
export function taskSlice(root, feature, ids) {
  const text = readFileSync(safePath(root, `${feature}/tasks.md`), 'utf8');
  const blocks = text.split(/(?=^- \[[ xX]\] T\d+\b)/m);
  return ids.map(id => {
    ensure(/^T\d+$/.test(id), `Task id inválido: ${id}`);
    const block = blocks.find(item => new RegExp(`^- \\[[ xX]\\] ${id}\\b`).test(item));
    ensure(block, `No existe ${id} en tasks.md.`);
    return block.split(/^#{1,6} /m)[0].trim();
  }).join('\n\n');
}
export function validateResult(task, result, config) {
  bounded(JSON.stringify(result), config.limits.resultChars, 'RESULT_PACKET');
  ensure(['PASS', 'FAIL', 'BLOCKED'].includes(result.status), 'Resultado inválido.');
  ensure(typeof result.summary === 'string' && result.summary.trim(), 'Resumen requerido.');
  for (const key of ['decisionsTaken', 'risks', 'evidenceArtifacts']) uniqueStrings(result[key], key);
  ensure(typeof result.architectInputRequired === 'string', 'architectInputRequired requerido.');
  ensure(Array.isArray(result.acceptanceCriteria), 'Estado por criterio requerido.');
  uniqueStrings(result.acceptanceCriteria.map(item => item.id), 'ids de resultado');
  ensure(JSON.stringify(result.acceptanceCriteria.map(item => item.id).sort()) === JSON.stringify(task.acceptanceCriteria.map(item => item.id).sort()), 'Criterios ausentes o ajenos.');
  ensure(result.acceptanceCriteria.every(item => ['PASS', 'FAIL'].includes(item.status)), 'Estado de criterio inválido.');
  if (result.status === 'PASS') ensure(result.acceptanceCriteria.every(item => item.status === 'PASS') && !result.architectInputRequired, 'PASS con criterio fallido o decisión pendiente.');
  return result;
}
export function markdownPacket(kind, packet) {
  return `# ${kind}\n\n${Object.entries(packet).map(([key, value]) => `## ${key}\n\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}`).join('\n\n')}\n`;
}
export function runProcess({ executable, args, cwd, env, input, timeoutMs = 120000, stdoutFile, stderrFile, onStdout, onStderr }) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(executable, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const streams = [stdoutFile, stderrFile].map(path => {
      if (!path) return null;
      mkdirSync(dirname(path), { recursive: true });
      return createWriteStream(path);
    });
    const timer = setTimeout(() => { timedOut = true; stopTree(child); }, timeoutMs);
    child.stdout.on('data', chunk => { stdout = `${stdout}${chunk}`.slice(-4e6); streams[0]?.write(chunk); onStdout?.(chunk); });
    child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-1e6); streams[1]?.write(chunk); onStderr?.(chunk); });
    child.once('error', error => { clearTimeout(timer); streams.forEach(stream => stream?.end()); reject(error); });
    child.once('close', async code => {
      clearTimeout(timer);
      await Promise.all(streams.filter(Boolean).map(stream => new Promise(done => stream.end(done))));
      resolveResult({ code: timedOut ? 124 : code ?? 1, stdout, stderr, timedOut });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}
function stopTree(child) {
  if (process.platform !== 'win32') return child.kill('SIGTERM');
  spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }).on('error', () => child.kill());
}
export function inventory(root) {
  const paths = execFileSync('git', ['ls-files', '-c', '-o', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 16e6 }).split('\0').filter(Boolean);
  return Object.fromEntries([...new Set(paths)].map(path => {
    if (!existsSync(resolve(root, path))) return [path, null];
    const stat = statSync(resolve(root, path));
    return [path, `${stat.size}:${stat.mtimeMs}`];
  }));
}
export function changedOutside(before, after, allowed) {
  const permit = new Set(allowed.map(path => path.toLowerCase()));
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(path =>
    before[path] !== after[path] && !permit.has(path.toLowerCase()));
}
export function snapshotFiles(root, task, folder) {
  const manifest = task.allowedFiles.map((path, index) => {
    const file = safePath(root, path);
    const data = existsSync(file) ? readFileSync(file) : null;
    save(resolve(folder, `${index}.before`), data ? data.toString('base64') : '');
    return { path, index, existed: data !== null, hash: hashFile(file) };
  });
  save(resolve(folder, 'manifest.json'), manifest);
}
export function collectDiff(root, folder) {
  const manifest = jsonRead(resolve(folder, 'manifest.json'));
  const result = [];
  for (const entry of manifest) {
    const target = safePath(root, entry.path);
    if (entry.hash === hashFile(target)) continue;
    const oldFile = resolve(folder, `${entry.index}.old`), newFile = resolve(folder, `${entry.index}.new`);
    writeFileSync(oldFile, Buffer.from(readFileSync(resolve(folder, `${entry.index}.before`), 'utf8'), 'base64'));
    writeFileSync(newFile, existsSync(target) ? readFileSync(target) : Buffer.alloc(0));
    let diff;
    try { diff = execFileSync('git', ['diff', '--no-index', '--no-color', '--', oldFile, newFile], { encoding: 'utf8', maxBuffer: 16e6 }); }
    catch (error) { ensure(error.status === 1, 'No se pudo generar el diff.'); diff = error.stdout.toString(); }
    diff = diff.replaceAll(oldFile.replaceAll('\\', '/'), entry.path).replaceAll(newFile.replaceAll('\\', '/'), entry.path);
    diff = diff.replace(/^diff --git .*$/m, `diff --git a/${entry.path} b/${entry.path}`).replace(/^--- .*$/m, `--- ${entry.existed ? `a/${entry.path}` : '/dev/null'}`).replace(/^\+\+\+ .*$/m, `+++ ${existsSync(target) ? `b/${entry.path}` : '/dev/null'}`);
    result.push({ path: entry.path, added: diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).length, removed: diff.split('\n').filter(line => line.startsWith('-') && !line.startsWith('---')).length, diff });
  }
  return result;
}
export function updateState(root, changes) {
  const path = safePath(root, STATE);
  let text = readFileSync(path, 'utf8');
  for (const [key, value] of Object.entries(changes)) {
    const line = `- ${key}: ${String(value).replaceAll('\n', ' ')}`;
    const pattern = new RegExp(`^- ${key}:.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  save(path, bounded(text, 2400, 'PROJECT_STATE'));
}
