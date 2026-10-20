import { StringDecoder } from 'node:string_decoder';

export const PROGRESS_PREFIX = 'RENDO_PROGRESS ';
export function jsonLines(consume) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  return chunk => {
    pending += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    let index;
    while ((index = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, index); pending = pending.slice(index + 1);
      try { consume(JSON.parse(line.startsWith(PROGRESS_PREFIX) ? line.slice(PROGRESS_PREFIX.length) : line)); } catch { /* Diagnostic lines and incomplete JSON are not progress events. */ }
    }
    if (pending.length > 2e6) pending = '';
  };
}
export function publishProgress(event) {
  const packet = { ...event, at: Date.now() };
  process.stderr.write(process.env.RENDO_SDD_PROGRESS_STREAM === '1' ? `${PROGRESS_PREFIX}${JSON.stringify(packet)}\n` : `[Rendo · ${packet.phase ?? 'workflow'}] ${packet.message}\n`);
}
const toolLabels = { sdd_read: 'Leyendo contexto', sdd_file_info: 'Comprobando archivos', sdd_rules: 'Consultando reglas', sdd_tasks: 'Consultando tareas', sdd_task_index: 'Consultando índice de tareas', sdd_write_spec: 'Guardando artefacto SDD', sdd_write: 'Editando archivo', sdd_command: 'Ejecutando verificación', sdd_spec_command: 'Ejecutando fase Spec Kit', sdd_submit_task: 'Preparando lote para Gemini', sdd_submit_result: 'Entregando resultado', sdd_decide: 'Registrando revisión', sdd_request_skill: 'Solicitando próxima fase' };
export function providerProgress(event, phase) {
  let name, args, error;
  if (event.type === 'message_update' || (event.event === 'step_update' && event.step_update?.state === 'ACTIVE' && event.step_update?.step_type !== 'tool')) return { phase, kind: 'heartbeat', message: 'El proveedor está generando la respuesta.' };
  if (event.type === 'tool_execution_start' || event.type === 'tool_execution_end') {
    name = event.toolName; args = event.args; error = event.isError;
    if (event.type === 'tool_execution_end' && !error) return null;
  } else if (event.event === 'step_update' && event.step_update?.step_type === 'tool') {
    const step = event.step_update;
    if (!['ACTIVE', 'ERROR'].includes(step.state)) return null;
    const nativeArgs = step.tool_info?.parameters ?? {};
    name = nativeArgs.ToolName ?? step.tool_name;
    args = nativeArgs.Arguments ?? {}; error = step.state === 'ERROR';
  } else return null;
  const target = args?.path ?? args?.id ?? args?.script ?? args?.skill;
  return { phase, kind: error ? 'warning' : 'activity', message: `${error ? 'La herramienta requiere corrección' : toolLabels[name] ?? 'Usando herramienta'}${target ? `: ${String(target).slice(0, 160)}` : ''}` };
}
export function providerStream(phase, emit = publishProgress) {
  let lastHeartbeat = 0;
  return jsonLines(event => {
    const progress = providerProgress(event, phase);
    if (!progress || (progress.kind === 'heartbeat' && Date.now() - lastHeartbeat < 10000)) return;
    if (progress.kind === 'heartbeat') lastHeartbeat = Date.now();
    emit(progress);
  });
}
export function progressLines(state, now = Date.now()) {
  const seconds = Math.floor((now - state.started) / 1000);
  const quiet = Math.floor((now - state.lastAt) / 1000);
  const spinner = ['⠋', '⠙', '⠹', '⠸'][seconds % 4];
  return [`${state.finished ? '■' : spinner} Rendo · ${state.finished ? 'Finalizado' : 'En ejecución'} · ${Math.floor(seconds / 60)}m ${seconds % 60}s`, `Fase: ${state.phase}`, `${state.message}${!state.finished && quiet >= 10 ? ` · ${quiet}s desde la última actividad reportada` : ''}`, ...state.history.slice(-4).map(line => `  ${line}`)];
}
