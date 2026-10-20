import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import WebSocket from '../../runtime/node_modules/ws/wrapper.mjs';
import { save, jsonRead } from '../core.mjs';
import { configuration, execute, review, ROOT, workflow } from '../runner.mjs';
import { connectBridge, startBridge } from '../web/bridge.mjs';
import { parseReply, runWeb } from '../web/protocol.mjs';
import { ProviderUnavailable, routeBackend, transportFailure } from '../web/routing.mjs';

const config = configuration();
function fixture(t) {
  const base = resolve(ROOT, '.pi/local/tests'); save(resolve(base, '.keep'), '');
  const root = mkdtempSync(`${base}/web-`); execFileSync('git', ['init', '--quiet', root]);
  save(resolve(root, 'package.json'), { name: config.project.packageName });
  save(resolve(root, '.gitignore'), '.pi/local/\n');
  save(resolve(root, '.pi/sdd/config.json'), config);
  save(resolve(root, '.specify/memory/PROJECT_STATE.md'), '# Rendo\n- Feature actual: specs/test; test\n');
  for (const role of ['architect', 'executor']) save(resolve(root, `.pi/sdd/agents/${role}.md`), readFileSync(resolve(ROOT, `.pi/sdd/agents/${role}.md`), 'utf8'));
  for (const artifact of ['spec.md', 'plan.md']) save(resolve(root, `specs/test/${artifact}`), '# Scope\n');
  save(resolve(root, 'specs/test/tasks.md'), '- [ ] T001 Scoped\n- [ ] T002 Other\n');
  save(resolve(root, 'apps/test.mjs'), 'existing work\n');
  t.after(() => { assert.ok(root.startsWith(base)); rmSync(root, { recursive: true, force: true }); });
  return root;
}
function task() {
  return { id: 'web-test', mode: 'IMPLEMENT', feature: 'specs/test', taskIds: ['T001'], objective: 'Scoped work', relevantContext: 'Preserve work', readFiles: [], allowedFiles: ['apps/test.mjs'], decisions: [], approvedChanges: [], acceptanceCriteria: [{ id: 'AC1', text: 'Checked' }], risk: 'LOW', evidenceProfiles: ['CODE'], rules: [], commands: [{ id: 'check', command: 'node -e "process.exit(0)"', purpose: 'VERIFY', timeoutMs: 10000 }], verification: ['check'], expectedOutput: 'RESULT_PACKET' };
}
const result = () => ({ status: 'PASS', summary: 'Scoped and checked', acceptanceCriteria: [{ id: 'AC1', status: 'PASS' }], decisionsTaken: [], risks: [], evidenceArtifacts: [], architectInputRequired: '' });
const call = (name, args) => ({ name, arguments: args });
function scripted(replies, observed = []) {
  let index = 0;
  return async () => ({
    request: async request => {
      observed.push(request);
      if (request.operation === 'open') return { selected: { model: request.model, effort: request.effort }, fresh: true };
      if (request.operation === 'close') return { closed: true };
      const reply = replies[index++]; assert.ok(reply, 'Unexpected extra web turn');
      return { text: typeof reply === 'string' ? reply : JSON.stringify(reply) };
    }, close() {},
  });
}

test('web replies cannot add raw shell, undeclared payload or malformed tool arguments', () => {
  assert.equal(parseReply('```json\n{"type":"final","text":"OK"}\n```').text, 'OK');
  for (const reply of [{ type: 'eval', code: 'bad' }, { type: 'final', text: 'OK', command: 'bad' }, { type: 'tools', calls: [] }, { type: 'tools', calls: [{ name: 'sdd_read', arguments: [] }] }]) assert.throws(() => parseReply(JSON.stringify(reply)));
  assert.throws(() => parseReply('x'.repeat(20), 10));
});

test('web executor uses real scoped tools and real command evidence before ChatGPT acceptance', async t => {
  const root = fixture(t), observed = [], packet = task(); save(resolve(root, 'packet.json'), packet);
  const batch = await execute('packet.json', { root, executor: context => runWeb(context, 'Do the scoped task', { emit() {}, connect: scripted([{ type: 'tools', calls: [call('sdd_write', { path: 'apps/test.mjs', content: 'new scoped work\n' }), call('sdd_command', { id: 'check' }), call('sdd_submit_result', { packetJson: JSON.stringify(result()) })] }], observed) }) });
  assert.equal(batch.result.status, 'PASS'); assert.equal(batch.result.tests[0].code, 0);
  assert.equal(observed[0].provider, 'gemini'); assert.equal(observed[0].model, 'Gemini 3.8 Flash');
  const executorSession = observed[0].sessionId;
  await review(batch, { root, reviewer: (context, prompt) => runWeb(context, prompt, { emit() {}, connect: scripted([{ type: 'tools', calls: [call('sdd_decide', { decision: 'ACCEPT', reason: 'Current local evidence passes' })] }], observed) }) });
  const architectOpen = observed.find(item => item.operation === 'open' && item.provider === 'chatgpt');
  assert.equal(architectOpen.effort, 'Alto'); assert.notEqual(architectOpen.sessionId, executorSession);
  assert.ok(readFileSync(resolve(root, 'specs/test/tasks.md'), 'utf8').includes('- [x] T001'));
  assert.ok(readFileSync(resolve(root, 'specs/test/tasks.md'), 'utf8').includes('- [ ] T002'));
  assert.ok(existsSync(resolve(batch.runDir, 'actions.json')));
});

test('web tool calls reject outside writes, raw shell and PASS without verification', async t => {
  const root = fixture(t), observed = [];
  await runWeb({ root, role: 'executor', runDir: resolve(root, '.pi/local/test-web'), config, task: task() }, 'Task', { emit() {}, connect: scripted([{ type: 'tools', calls: [call('sdd_write', { path: 'apps/outside.mjs', content: 'bad' }), call('bash', { command: 'bad' }), call('sdd_submit_result', { packetJson: JSON.stringify(result()) })] }, { type: 'final', text: 'BLOCKED' }], observed) });
  assert.ok(!existsSync(resolve(root, 'apps/outside.mjs')));
  const returned = JSON.parse(observed.filter(item => item.operation === 'exchange')[1].prompt);
  assert.equal(returned.results.filter(item => item.error).length, 3);
});

test('a missing web reply closes the session without retransmitting the message', async t => {
  const root = fixture(t), operations = [];
  const connect = async () => ({ request: async packet => { operations.push(packet.operation); if (packet.operation === 'exchange') throw new Error('Ambiguous response'); return {}; }, close() {} });
  await assert.rejects(runWeb({ root, role: 'architect', config, noTools: true, runDir: resolve(root, '.pi/local/ambiguous') }, 'Hello', { connect, emit() {} }), /Ambiguous/);
  assert.deepEqual(operations, ['open', 'exchange', 'close']);
});

test('only provider outages trigger a web fallback; after an action the batch stops', async t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/fallback'), context = { root, runDir, role: 'architect', config };
  let calls = 0; const web = async () => { calls++; return { final: 'WEB', runDir }; };
  assert.equal((await routeBackend(context, 'Task', async () => { throw new ProviderUnavailable('quota'); }, { web, emit() {} })).final, 'WEB');
  assert.equal(calls, 1);
  await assert.rejects(routeBackend(context, 'Task', async () => { throw new Error('scope violation'); }, { web, emit() {} }), /scope/);
  save(resolve(runDir, 'actions.json'), [{ name: 'sdd_write_spec' }]);
  await assert.rejects(routeBackend(context, 'Task', async () => { throw new ProviderUnavailable('network'); }, { web, emit() {} }), /después de ejecutar acciones/);
  assert.equal(calls, 1);
  assert.equal(transportFailure('fetch failed'), true); assert.equal(transportFailure('scope violation'), false);
  assert.equal(transportFailure('No API key found for openai-codex'), true);
  assert.equal(transportFailure('invalid_grant: refresh token invalid'), true);
});

test('web primary mode works without ever invoking the CLI backend', async t => {
  const root = fixture(t), context = { root, role: 'executor', config: { ...config, webChats: { ...config.webChats, mode: 'web' } }, runDir: resolve(root, '.pi/local/direct') };
  const answer = await routeBackend(context, 'Task', () => { throw new Error('CLI must not run'); }, { web: async () => ({ final: 'WEB' }) });
  assert.equal(answer.final, 'WEB');
});

async function extensionPeer(port, token, onRequest) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/rendo`, { origin: `chrome-extension://${'a'.repeat(32)}` });
  await new Promise((ready, reject) => {
    socket.once('error', reject);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'hello', kind: 'extension', token })));
    socket.on('message', bytes => { const packet = JSON.parse(bytes.toString()); if (packet.type === 'ready') ready(); if (packet.type === 'request') onRequest(packet, socket); });
  });
  return socket;
}

test('loopback bridge authenticates peers, routes progress and rejects unauthorized operations', async t => {
  const root = fixture(t), token = 'a'.repeat(64), server = await startBridge({ root, port: 0, token }); t.after(() => server.close());
  const settings = { port: server.port, token }, progress = [];
  const extension = await extensionPeer(server.port, token, (packet, socket) => {
    socket.send(JSON.stringify({ type: 'progress', id: packet.id, message: 'Generating' }));
    socket.send(JSON.stringify({ type: 'result', id: packet.id, value: { text: 'OK' } }));
  }); t.after(() => extension.terminate());
  const client = await connectBridge(root, { settings, onProgress: event => progress.push(event) }); t.after(() => client.close());
  assert.equal((await client.request({ operation: 'exchange', provider: 'chatgpt', sessionId: 'case-1', prompt: 'Hello' })).text, 'OK');
  assert.equal(progress.length, 1);
  await assert.rejects(client.request({ operation: 'shell', provider: 'chatgpt', sessionId: 'case-1' }), /no permitida/);
  await assert.rejects(connectBridge(root, { settings: { ...settings, token: 'b'.repeat(64) } }), /Vinculación rechazada/);
});

test('an extension disconnect rejects the original waiting request immediately', async t => {
  const root = fixture(t), token = 'c'.repeat(64), server = await startBridge({ root, port: 0, token }); t.after(() => server.close());
  await extensionPeer(server.port, token, (_packet, socket) => socket.close());
  const client = await connectBridge(root, { settings: { port: server.port, token }, timeoutMs: 2000 }); t.after(() => client.close());
  await assert.rejects(client.request({ operation: 'exchange', provider: 'gemini', sessionId: 'case-2', prompt: 'Hello' }), /extensión se desconectó/);
});

test('the actual extension worker opens separate provider tabs and never retries an ambiguous send', async t => {
  const root = fixture(t), token = 'd'.repeat(64), server = await startBridge({ root, port: 0, token }); t.after(() => server.close());
  const tabs = new Map(), timers = new Set(); let listener, sends = 0;
  const fakeChrome = {
    storage: { local: { get: async () => ({ connection: { port: server.port, token } }), set: async () => {} } },
    action: { setBadgeText: async () => {} }, alarms: { create() {}, onAlarm: { addListener() {} } },
    runtime: { onMessage: { addListener: fn => { listener = fn; } } },
    tabs: {
      create: async ({ url }) => { const tab = { id: tabs.size + 1, url, status: 'complete' }; tabs.set(tab.id, tab); return tab; },
      get: async id => tabs.get(id),
      sendMessage: async (_id, message) => { if (message.type === 'rendo-open') return { selected: { model: message.model, effort: message.effort } }; if (message.type === 'rendo-exchange') { sends++; throw new Error('Response channel closed'); } return {}; },
    },
  };
  runInNewContext(readFileSync(resolve(ROOT, '.pi/browser-extension/worker.js'), 'utf8'), { chrome: fakeChrome, WebSocket, URL, setTimeout, clearInterval, setInterval: (fn, ms) => { const timer = setInterval(fn, ms); timers.add(timer); return timer; } });
  t.after(() => { for (const timer of timers) clearInterval(timer); });
  const until = Date.now() + 3000;
  while (Date.now() < until) { const status = await new Promise(done => listener({ type: 'status' }, {}, done)); if (status.connected) break; await new Promise(done => setTimeout(done, 30)); }
  const client = await connectBridge(root, { settings: { port: server.port, token }, timeoutMs: 3000 }); t.after(() => client.close());
  await client.request({ operation: 'open', provider: 'chatgpt', sessionId: 'worker-arch', model: 'GPT 5.6 Sol', effort: 'Alto' });
  await assert.rejects(client.request({ operation: 'exchange', provider: 'chatgpt', sessionId: 'worker-arch', prompt: 'Hello' }), /Response channel closed/);
  assert.equal(sends, 1);
  await client.request({ operation: 'close', provider: 'chatgpt', sessionId: 'worker-arch' });
  await client.request({ operation: 'open', provider: 'gemini', sessionId: 'worker-exec', model: 'Gemini 3.8 Flash', effort: 'Avanzado' });
  await client.request({ operation: 'close', provider: 'gemini', sessionId: 'worker-exec' });
  assert.deepEqual([...tabs.values()].map(tab => tab.url), ['https://chatgpt.com/', 'https://gemini.google.com/app?hl=es']);
});

test('a timed out bridge request cannot leave cleanup waiting on a closed socket', async t => {
  const root = fixture(t), token = 'e'.repeat(64), server = await startBridge({ root, port: 0, token }); t.after(() => server.close());
  const extension = await extensionPeer(server.port, token, () => {}); t.after(() => extension.terminate());
  const client = await connectBridge(root, { settings: { port: server.port, token }, timeoutMs: 50 });
  await assert.rejects(client.request({ operation: 'exchange', provider: 'chatgpt', sessionId: 'timeout', prompt: 'Hello' }), /agotado/);
  await assert.rejects(client.request({ operation: 'close', provider: 'chatgpt', sessionId: 'timeout' }), /cerrada/);
});

test('a blocked discovery with a missing command is replanned as a new task instead of corrected repeatedly', async t => {
  const root = fixture(t), calls = [];
  const architect = async prompt => { calls.push(prompt); const runDir = resolve(root, `.pi/local/plan-${calls.length}`); save(resolve(runDir, '.keep'), ''); if (calls.length === 1) save(resolve(runDir, 'handoff.json'), { taskPath: 'packet.json' }); return { runDir, final: 'New task required' }; };
  const runDir = resolve(root, '.pi/local/failed'); save(resolve(runDir, 'missing.stderr.log'), 'CommandNotFoundException: rg');
  const batch = { task: task(), runDir, result: { tests: [{ id: 'search', code: 1, errorLog: 'missing.stderr.log' }] } };
  let executions = 0;
  await workflow('Goal', { root, feature: 'specs/test' }, { architect, execute: async () => { executions++; return batch; }, review: async () => ({ runDir, decision: { decision: 'CORRECT', reason: 'Missing facts', correction: 'Use PowerShell' } }) });
  assert.equal(executions, 1); assert.equal(calls.length, 2); assert.ok(calls[1].includes('TASK_PACKET nuevo'));
});

test('correction limit returns a visible cause and actionable review instead of an empty error', async t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/review');
  const architect = async () => { const path = resolve(root, '.pi/local/plan'); save(resolve(path, 'handoff.json'), { taskPath: 'packet.json' }); return { runDir: path }; };
  const answer = await workflow('Goal', { root, feature: 'specs/test' }, { architect, execute: async () => ({ task: task(), runDir, result: { tests: [] }, snapshotDir: 'baseline' }), review: async () => ({ runDir, decision: { decision: 'CORRECT', reason: 'Facts absent', correction: 'Provide a matrix' } }) });
  assert.equal(answer.blocked, true); assert.ok(answer.final.includes('Facts absent')); assert.ok(answer.final.includes('Provide a matrix'));
  assert.ok(existsSync(resolve(runDir, 'workflow-stop.json')));
});
