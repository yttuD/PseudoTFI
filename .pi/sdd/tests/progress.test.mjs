import test from 'node:test';
import assert from 'node:assert/strict';
import { jsonLines, PROGRESS_PREFIX, progressLines, providerProgress, providerStream } from '../progress.mjs';
import { runProcess } from '../core.mjs';

test('progress decodes partial UTF8 lines without interpreting other diagnostics', () => {
  const events = [], read = jsonLines(event => events.push(event));
  const bytes = Buffer.from(`${PROGRESS_PREFIX}${JSON.stringify({ phase: 'Sol', message: 'Especificación' })}\nordinary diagnostic\n`);
  for (const byte of bytes) read(Buffer.from([byte]));
  assert.deepEqual(events, [{ phase: 'Sol', message: 'Especificación' }]);
});
test('provider progress exposes actions while keeping reasoning and file contents private', () => {
  const text = JSON.stringify(providerProgress({ type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta: 'private reasoning' } }, 'Sol'));
  assert.ok(!text.includes('private reasoning'));
  const action = providerProgress({ type: 'tool_execution_start', toolName: 'sdd_write_spec', args: { path: 'specs/008/spec.md', content: 'full document' } }, 'Sol');
  assert.ok(action.message.includes('specs/008/spec.md'));
  assert.ok(!JSON.stringify(action).includes('full document'));
  const command = providerProgress({ event: 'step_update', step_update: { state: 'ACTIVE', step_type: 'tool', tool_info: { parameters: { ToolName: 'sdd_command', Arguments: { id: 'typecheck' } } } } }, 'Gemini');
  assert.ok(command.message.includes('typecheck'));
});
test('heartbeats are throttled and tool events still arrive immediately', () => {
  const events = [], read = providerStream('Sol', event => events.push(event));
  for (let i = 0; i < 100; i += 1) read(`${JSON.stringify({ type: 'message_update' })}\n`);
  read(`${JSON.stringify({ type: 'tool_execution_start', toolName: 'sdd_read', args: { path: 'specs/008/issues.md' } })}\n`);
  assert.equal(events.length, 2);
  assert.equal(events[1].kind, 'activity');
});
test('the panel distinguishes elapsed time from missing provider activity', () => {
  const state = { started: 0, lastAt: 10000, phase: 'Sol · specify', message: 'Esperando respuesta', history: ['Inicio'], finished: false };
  const text = progressLines(state, 65000).join('\n');
  assert.ok(text.includes('1m 5s'));
  assert.ok(text.includes('55s desde la última actividad'));
  state.finished = true;
  assert.ok(progressLines(state, 65000)[0].includes('Finalizado'));
});
test('subprocess activity is delivered before completion instead of being buffered', async () => {
  let completed = false;
  const events = [];
  const read = jsonLines(event => events.push({ event, completed }));
  const result = await runProcess({ executable: process.execPath, args: ['-e', 'process.stderr.write(JSON.stringify({phase:"Sol",message:"live"})+"\\n");setTimeout(()=>process.exit(0),200);'], onStderr: read });
  completed = true;
  assert.equal(result.code, 0);
  assert.equal(events.length, 1);
  assert.equal(events[0].completed, false);
});
