import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { changedOutside, collectDiff, jsonRead, reviewLevel, reviewPolicy, runProcess, safePath, save, snapshotFiles, taskSlice, validateResult, validateTask } from '../core.mjs';
import { createTools } from '../tools.mjs';
import { configuration, execute, requireImplementationEvidence, review, reviewContext, ROOT, syncCodexAccess, workflow } from '../runner.mjs';
import { gate } from '../executor-gate.mjs';

const config = configuration();
function fixture(t) {
  const base = resolve(ROOT, '.pi/local/tests');
  save(resolve(base, '.keep'), '');
  const root = mkdtempSync(`${base}/case-`);
  execFileSync('git', ['init', '--quiet', root]);
  save(resolve(root, '.gitignore'), '.pi/local/\n');
  save(resolve(root, 'package.json'), { name: config.project.packageName });
  save(resolve(root, '.pi/sdd/config.json'), config);
  save(resolve(root, '.specify/memory/PROJECT_STATE.md'), '# Rendo\n- Estado: en pruebas\n- Siguiente acción: ejecutar lote\n');
  for (const file of ['spec.md', 'plan.md']) save(resolve(root, `specs/test/${file}`), '# Scope\n');
  save(resolve(root, 'specs/test/tasks.md'), '# Tasks\n- [ ] T001 A\n  detalles A\n- [ ] T002 B\n## Next\n');
  save(resolve(root, 'apps/api/example.ts'), 'preexisting dirty work\n');
  t.after(() => { assert.ok(root.startsWith(`${base}/`) || root.startsWith(`${base}\\`)); rmSync(root, { recursive: true, force: true }); });
  return root;
}
function task(overrides = {}) {
  return { id: 'batch-test', mode: 'IMPLEMENT', feature: 'specs/test', taskIds: ['T001'], objective: 'Scoped change', relevantContext: 'Preserve existing work', readFiles: [], allowedFiles: ['apps/api/example.ts'], decisions: [], approvedChanges: [], acceptanceCriteria: [{ id: 'AC1', text: 'Observable result' }], risk: 'LOW', evidenceProfiles: ['CODE'], rules: [], commands: [{ id: 'check', command: 'node -e "process.exit(0)"', purpose: 'VERIFY', timeoutMs: 10000 }], verification: ['check'], expectedOutput: 'RESULT_PACKET', ...overrides };
}
function result(overrides = {}) { return { status: 'PASS', summary: 'Scoped change verified', acceptanceCriteria: [{ id: 'AC1', status: 'PASS' }], decisionsTaken: [], risks: [], evidenceArtifacts: [], architectInputRequired: '', ...overrides }; }
function tool(tools, name) { return tools.find(item => item.name === name).execute; }

test('paths reject traversal, private files, drive paths and alternate streams', t => {
  const root = fixture(t);
  for (const path of ['../secret', 'C:/secret', '.env.local', '.git/config', '.pi/local/agent/auth.json', 'apps/api/file:stream']) assert.throws(() => safePath(root, path));
  assert.equal(safePath(root, 'apps/api/example.ts'), resolve(root, 'apps/api/example.ts'));
});
test('implementation requires genuine Spec Kit tasks and verification', t => {
  const root = fixture(t);
  assert.equal(validateTask(root, task(), config).id, 'batch-test');
  assert.throws(() => validateTask(root, task({ taskIds: ['T999'] }), config));
  assert.throws(() => validateTask(root, task({ verification: [] }), config));
  assert.throws(() => validateTask(root, task({ feature: 'specs/missing' }), config));
});
test('discovery cannot write code', t => {
  const root = fixture(t);
  assert.throws(() => validateTask(root, task({ mode: 'DISCOVERY' }), config));
  assert.doesNotThrow(() => validateTask(root, task({ mode: 'DISCOVERY', feature: 'specs/new', allowedFiles: [], taskIds: [], verification: [] }), config));
});
test('protected changes require a durable decision; orchestration is never executor-writable', t => {
  const root = fixture(t), decision = '.specify/memory/decisions/approved.md';
  save(resolve(root, decision), '# Approved by Sol\n');
  assert.throws(() => validateTask(root, task({ allowedFiles: ['supabase/migrations/new.sql'] }), config));
  assert.doesNotThrow(() => validateTask(root, task({ allowedFiles: ['supabase/migrations/new.sql'], decisions: [decision], approvedChanges: [{ path: 'supabase/migrations/new.sql', decision }] }), config));
  assert.throws(() => validateTask(root, task({ allowedFiles: ['.pi/sdd/config.json'] }), config));
});
test('sensitive paths cannot bypass directed review with LOW labels', () => {
  assert.equal(reviewLevel(task()), 'LOW');
  for (const path of ['apps/api/src/auth/guard.ts', 'apps/api/src/pagos/pricing.ts', 'supabase/migrations/test.sql']) assert.equal(reviewLevel(task({ allowedFiles: [path] })), 'MEDIUM');
  assert.equal(reviewLevel(task({ risk: 'HIGH' })), 'HIGH');
});
test('review metadata is compatible with legacy packets and cannot lower risk floors', t => {
  const root = fixture(t);
  assert.equal(validateTask(root, task(), config).solReview, 'PACKET_ONLY');
  assert.equal(reviewPolicy(task({ risk: 'HIGH' })), 'FULL_AFFECTED_DIFF');
  assert.equal(reviewPolicy(task({ evidenceProfiles: ['SECURITY'] })), 'TARGETED_DIFF');
  assert.throws(() => validateTask(root, task({ risk: 'MEDIUM', solReview: 'PACKET_ONLY' }), config), /mínimo/);
  assert.throws(() => validateTask(root, task({ evidenceProfiles: ['MONEY'], solReview: 'PACKET_ONLY' }), config), /mínimo/);
  assert.throws(() => validateTask(root, task({ solReview: 'INVALID' }), config), /inválido/);
  assert.equal(reviewLevel(task({ solReview: 'FULL_AFFECTED_DIFF' })), 'HIGH');
});
test('task slicing discloses only selected task', t => {
  const root = fixture(t), slice = taskSlice(root, 'specs/test', ['T001']);
  assert.ok(slice.includes('detalles A'));
  assert.ok(!slice.includes('T002'));
});
test('results cannot omit criteria, contain false PASS or exceed context budgets', () => {
  assert.throws(() => validateResult(task(), result({ acceptanceCriteria: [] }), config));
  assert.throws(() => validateResult(task(), result({ acceptanceCriteria: [{ id: 'AC1', status: 'FAIL' }] }), config));
  assert.throws(() => validateResult(task(), result({ summary: 'x'.repeat(7000) }), config));
});
test('executor tools enforce scope and require actual successful commands before PASS', async t => {
  const root = fixture(t), packet = task(), runDir = resolve(root, '.pi/local/run');
  const tools = createTools({ root, role: 'executor', config, task: packet, runDir });
  await assert.rejects(tool(tools, 'sdd_write')({ path: 'apps/api/other.ts', content: 'bad' }));
  await assert.rejects(tool(tools, 'sdd_submit_result')({ packetJson: JSON.stringify(result()) }));
  await assert.rejects(tool(tools, 'sdd_command')({ id: 'unapproved' }));
  await tool(tools, 'sdd_command')({ id: 'check' });
  await tool(tools, 'sdd_submit_result')({ packetJson: JSON.stringify(result()) });
  assert.ok(existsSync(resolve(runDir, 'result-proposal.json')));
  await tool(tools, 'sdd_write')({ path: 'apps/api/example.ts', content: 'changed after test' });
  await assert.rejects(tool(tools, 'sdd_submit_result')({ packetJson: JSON.stringify(result()) }));
});
test('non-native PowerShell failures are reported as failures', async t => {
  const root = fixture(t), packet = task({ commands: [{ id: 'fail', command: "Write-Error 'expected failure'", purpose: 'VERIFY', timeoutMs: 10000 }], verification: ['fail'] });
  const tools = createTools({ root, role: 'executor', config, task: packet, runDir: resolve(root, '.pi/local/run') });
  const response = JSON.parse(await tool(tools, 'sdd_command')({ id: 'fail' }));
  assert.notEqual(response.code, 0);
  await assert.rejects(tool(tools, 'sdd_submit_result')({ packetJson: JSON.stringify(result()) }));
});
test('batch diffs start at dirty working-tree baseline instead of HEAD', t => {
  const root = fixture(t), baseline = resolve(root, '.pi/local/baseline');
  snapshotFiles(root, task(), baseline);
  save(resolve(root, 'apps/api/example.ts'), 'new batch work\n');
  const diff = collectDiff(root, baseline)[0];
  assert.ok(diff.diff.includes('-preexisting dirty work'));
  assert.ok(diff.diff.includes('+new batch work'));
  assert.equal(diff.path, 'apps/api/example.ts');
});
test('outside changes are detected independently of executor claims', () => {
  assert.deepEqual(changedOutside({ a: '1', b: '1' }, { a: '2', b: '2', c: '3' }, ['a']), ['b', 'c']);
});
test('end-to-end local batch executes, reviews, persists acceptance and marks only selected tasks', async t => {
  const root = fixture(t), taskPath = 'packet.json';
  save(resolve(root, taskPath), task());
  const executor = async context => {
    const tools = createTools(context);
    await tool(tools, 'sdd_write')({ path: 'apps/api/example.ts', content: 'new scoped work\n' });
    await tool(tools, 'sdd_command')({ id: 'check' });
    await tool(tools, 'sdd_submit_result')({ packetJson: JSON.stringify(result()) });
  };
  const batch = await execute(taskPath, { root, executor });
  assert.equal(batch.result.status, 'PASS');
  const input = reviewContext(batch, root);
  assert.ok(!input.prompt.includes('new scoped work'));
  const reviewer = async context => { await tool(createTools(context), 'sdd_decide')({ decision: 'ACCEPT', reason: 'All criteria and evidence pass', nextAction: 'T002' }); };
  await review(batch, { root, reviewer });
  const tasks = readFileSync(resolve(root, 'specs/test/tasks.md'), 'utf8');
  assert.ok(tasks.includes('- [x] T001'));
  assert.ok(tasks.includes('- [ ] T002'));
  assert.ok(existsSync(resolve(root, 'specs/test/evidence/pi-sdd/batch-test/acceptance.json')));
});
test('out-of-scope executor writes block acceptance without reverting user work', async t => {
  const root = fixture(t); save(resolve(root, 'packet.json'), task());
  const batch = await execute('packet.json', { root, executor: async context => {
    save(resolve(root, 'apps/api/unapproved.ts'), 'outside scope');
    save(resolve(context.runDir, 'result-proposal.json'), result());
  } });
  assert.equal(batch.result.status, 'BLOCKED');
  assert.ok(batch.result.scopeViolations.includes('apps/api/unapproved.ts'));
  assert.equal(readFileSync(resolve(root, 'apps/api/example.ts'), 'utf8'), 'preexisting dirty work\n');
  await assert.rejects(tool(createTools({ root, role: 'architect', task: task(), result: batch.result, config, runDir: resolve(root, '.pi/local/review') }), 'sdd_decide')({ decision: 'ACCEPT', reason: 'fake' }));
});
test('logs are saved fully while model-facing output stays bounded', async t => {
  const root = fixture(t), path = resolve(root, '.pi/local/full.log');
  const result = await runProcess({ executable: process.execPath, args: ['-e', 'process.stdout.write("x".repeat(4100000))'], cwd: root, stdoutFile: path });
  assert.equal(result.code, 0);
  assert.equal(readFileSync(path, 'utf8').length, 4100000);
  assert.equal(result.stdout.length, 4000000);
});
test('stdio MCP negotiates and lists only executor SDD tools', async t => {
  const root = fixture(t), context = resolve(root, '.pi/local/context.json');
  save(context, { root, role: 'executor', config, task: task(), runDir: resolve(root, '.pi/local/run') });
  const input = [{ jsonrpc: '2.0', id: 1, method: 'initialize' }, { jsonrpc: '2.0', id: 2, method: 'tools/list' }].map(item => JSON.stringify(item)).join('\n') + '\n';
  const response = await runProcess({ executable: process.execPath, args: [resolve(ROOT, '.pi/sdd/mcp.mjs'), context], cwd: root, input });
  const records = response.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(records[0].result.serverInfo.name, 'rendo-sdd');
  const names = records[1].result.tools.map(item => item.name);
  assert.ok(names.includes('sdd_submit_result'));
  assert.ok(!names.includes('sdd_decide'));
  assert.ok(!names.includes('bash'));
});

test('native executor gate allows only Rendo MCP and exact schema metadata', () => {
  const profile = resolve(ROOT, '.pi/local/fake-profile');
  const allow = (name, args) => gate({ toolCall: { name, args } }, profile).decision;
  assert.equal(allow('call_mcp_tool', { ServerName: 'rendo_sdd', ToolName: 'sdd_read' }), 'allow');
  assert.equal(allow('call_mcp_tool', { ServerName: 'other', ToolName: 'sdd_read' }), 'deny');
  assert.equal(allow('call_mcp_tool', { ServerName: 'rendo_sdd', ToolName: 'sdd_write_spec' }), 'deny');
  assert.equal(allow('view_file', { AbsolutePath: resolve(profile, '.gemini/antigravity-cli/mcp/rendo_sdd/sdd_read.json') }), 'allow');
  assert.equal(allow('view_file', { AbsolutePath: resolve(ROOT, '.specify/memory/PROJECT_STATE.md') }), 'deny');
  for (const name of ['run_command', 'write_to_file', 'invoke_subagent', 'send_message', 'ask_permission', 'search_web']) assert.equal(allow(name, {}), 'deny');
});

test('HIGH and UI cannot accept without relevant evidence and visual inspection', async t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/review');
  const context = { root, role: 'architect', config, task: task({ risk: 'HIGH', evidenceProfiles: ['UI'] }), result: result({ reviewLevel: 'HIGH', scopeViolations: [] }), runDir, reviewArtifacts: [] };
  await assert.rejects(tool(createTools(context), 'sdd_decide')({ decision: 'ACCEPT', reason: 'claimed success' }), /HIGH/);
  await assert.rejects(tool(createTools({ ...context, task: task({ evidenceProfiles: ['UI'] }), result: result({ reviewLevel: 'LOW', scopeViolations: [] }) }), 'sdd_decide')({ decision: 'ACCEPT', reason: 'claimed success' }), /visual/);
});

test('review starts compact at every risk and retains full diff as an artifact', t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/review-input');
  save(resolve(runDir, 'RESULT_PACKET.md'), '# RESULT\nPASS\n');
  save(resolve(runDir, 'affected.diff'), 'UNIQUE_DIFF_CONTENT'.repeat(3000));
  save(resolve(runDir, 'VERIFICATION.md'), 'check exit 0\n');
  for (const risk of ['LOW', 'MEDIUM', 'HIGH']) {
    const input = reviewContext({ task: task({ risk }), result: result(), runDir }, root);
    assert.ok(!input.prompt.includes('UNIQUE_DIFF_CONTENT'));
    assert.ok(input.prompt.includes(`SOL_REVIEW: ${reviewPolicy(task({ risk }))}`));
    assert.ok(input.artifacts.some(path => path.endsWith('/affected.diff')));
  }
});

test('HIGH cannot accept a partial or gapped diff; complete reads and evidence persist', async t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/review');
  const diff = '.pi/local/review/affected.diff', evidence = '.pi/local/review/VERIFICATION.md';
  save(resolve(root, diff), 'changed hunk\n'.repeat(700));
  save(resolve(root, evidence), 'check: exit 0; real command log index\n');
  const tools = createTools({ root, role: 'architect', config, task: task({ risk: 'HIGH' }), result: result({ scopeViolations: [] }), runDir, reviewArtifacts: [diff, evidence] });
  const decide = () => tool(tools, 'sdd_decide')({ decision: 'ACCEPT', reason: 'All criteria and current evidence verified' });
  await assert.rejects(decide(), /dirigida/);
  await tool(tools, 'sdd_review_read')({ artifact: diff, chars: 40 });
  await assert.rejects(decide(), /completo/);
  await tool(tools, 'sdd_review_read')({ artifact: diff, offset: 6000, chars: 1000 });
  await assert.rejects(decide(), /completo/);
  await tool(tools, 'sdd_review_read')({ artifact: diff, chars: 6000 });
  await tool(tools, 'sdd_review_read')({ artifact: diff, offset: 7000, chars: 3000 });
  await assert.rejects(decide(), /ejecutable/);
  await tool(tools, 'sdd_review_read')({ artifact: evidence, chars: 1000 });
  await decide();
  const decision = jsonRead(resolve(runDir, 'decision.json'));
  assert.deepEqual(decision.reviewedArtifacts, [diff, evidence]);
  assert.equal(decision.reviewedRanges[diff].length, 4);
});

test('sensitive LOW cannot accept without targeted diff and executable evidence', async t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/sensitive-review');
  const diff = '.pi/local/sensitive-review/affected.diff', evidence = '.pi/local/sensitive-review/VERIFICATION.md';
  save(resolve(root, diff), 'affected security hunk\n');
  save(resolve(root, evidence), 'negative and positive tests: exit 0\n');
  const tools = createTools({ root, role: 'architect', config, task: task({ evidenceProfiles: ['SECURITY'] }), result: result({ scopeViolations: [] }), runDir, reviewArtifacts: [diff, evidence] });
  const decide = () => tool(tools, 'sdd_decide')({ decision: 'ACCEPT', reason: 'Directed review complete' });
  await assert.rejects(decide(), /dirigida/);
  await tool(tools, 'sdd_review_read')({ artifact: diff, offset: 9999, chars: 20 });
  await assert.rejects(decide(), /rango/);
  await tool(tools, 'sdd_review_read')({ artifact: diff, chars: 100 });
  await assert.rejects(decide(), /ejecutable/);
  await tool(tools, 'sdd_review_read')({ artifact: evidence, chars: 100 });
  await decide();
});

test('acceptance refuses stale evidence after a later file edit', async t => {
  const root = fixture(t); save(resolve(root, 'packet.json'), task());
  const batch = await execute('packet.json', { root, executor: async context => {
    const tools = createTools(context);
    await tool(tools, 'sdd_command')({ id: 'check' });
    await tool(tools, 'sdd_submit_result')({ packetJson: JSON.stringify(result()) });
  } });
  save(resolve(root, 'apps/api/example.ts'), 'later edit\n');
  await assert.rejects(review(batch, { root, reviewer: async context => tool(createTools(context), 'sdd_decide')({ decision: 'ACCEPT', reason: 'all tests passed' }) }), /después/);
  assert.ok(readFileSync(resolve(root, 'specs/test/tasks.md'), 'utf8').includes('- [ ] T001'));
});

test('converge rejects diagnostics and requires accepted implementation', t => {
  const root = fixture(t), path = resolve(root, 'specs/test/evidence/pi-sdd/test/acceptance.json');
  save(path, { mode: 'DISCOVERY', decision: { decision: 'ACCEPT' } });
  assert.throws(() => requireImplementationEvidence(root, 'specs/test'), /implementación/);
  save(path, { mode: 'IMPLEMENT', decision: { decision: 'ACCEPT' } });
  assert.doesNotThrow(() => requireImplementationEvidence(root, 'specs/test'));
});

test('autonomous workflow loads requested existing Spec Kit phase then resumes goal', async t => {
  const root = fixture(t), calls = [];
  const architect = async (prompt, options) => {
    const runDir = resolve(root, `.pi/local/phase-${calls.length}`);
    calls.push({ prompt, skill: options.skill });
    save(resolve(runDir, '.keep'), '');
    if (calls.length === 1) await tool(createTools({ root, role: 'architect', config, runDir }), 'sdd_request_skill')({ skill: 'plan', prompt: 'Plan the selected feature' });
    return { runDir, final: options.skill ? 'Plan saved' : 'Finished' };
  };
  const answer = await workflow('Original Rendo goal', { root, feature: 'specs/test' }, { architect });
  assert.equal(calls.length, 3);
  assert.equal(calls[1].skill, 'plan');
  assert.ok(calls[2].prompt.includes('Original Rendo goal'));
  assert.equal(answer.final, 'Finished');
});

test('MCP-style arguments cannot bypass read budgets with negative ranges or unknown fields', async t => {
  const root = fixture(t), tools = createTools({ root, role: 'executor', config, task: task(), runDir: resolve(root, '.pi/local/run') });
  for (const args of [{ path: '.specify/memory/PROJECT_STATE.md', chars: -1 }, { path: '.specify/memory/PROJECT_STATE.md', offset: -1 }, { path: '.specify/memory/PROJECT_STATE.md', extra: true }]) await assert.rejects(tool(tools, 'sdd_read')(args));
});

test('a rejected large read leaves the remaining budget usable for a smaller range', async t => {
  const root = fixture(t), path = '.specify/memory/PROJECT_STATE.md';
  save(resolve(root, path), 'x'.repeat(1000));
  const read = tool(createTools({ root, role: 'architect', config: { ...config, limits: { ...config.limits, architectReadChars: 300 } }, runDir: resolve(root, '.pi/local/run') }), 'sdd_read');
  await assert.rejects(read({ path, chars: 1000 }), /presupuesto/);
  assert.equal(JSON.parse(await read({ path, chars: 20 })).content, 'x'.repeat(20));
  await assert.rejects(read({ path, chars: 200 }), /presupuesto/);
  assert.equal(JSON.parse(await read({ path, offset: 20, chars: 20 })).content, 'x'.repeat(20));
});

test('the architect can follow an exact decision pointer from PROJECT_STATE', async t => {
  const root = fixture(t), decision = '.specify/memory/decisions/rendo-approved.md';
  save(resolve(root, '.specify/memory/PROJECT_STATE.md'), `# Rendo\n- Decisión: ${decision}\n`);
  save(resolve(root, decision), '# Approved\n');
  save(resolve(root, '.specify/memory/decisions/unrelated.md'), '# Unrelated\n');
  const read = tool(createTools({ root, role: 'architect', config, runDir: resolve(root, '.pi/local/run') }), 'sdd_read');
  assert.equal(JSON.parse(await read({ path: decision })).content, '# Approved\n');
  await assert.rejects(read({ path: '.specify/memory/decisions/unrelated.md' }), /no autorizado/);
  const executorRead = tool(createTools({ root, role: 'executor', config, task: task(), runDir: resolve(root, '.pi/local/executor') }), 'sdd_read');
  await assert.rejects(executorRead({ path: decision }), /no autorizado/);
});

test('a completed independent Pi login survives a leftover Codex import marker', t => {
  const root = fixture(t), profile = resolve(root, '.pi/local/profile');
  const ownAuth = { 'openai-codex': { type: 'oauth', access: 'test-pi-access', refresh: 'test-pi-refresh', expires: Date.now() + 60000 } };
  const authPath = resolve(root, '.pi/local/agent/auth.json'), marker = resolve(root, '.pi/local/agent/codex-access-only.json');
  save(authPath, ownAuth);
  save(marker, { source: 'test' });
  save(resolve(profile, '.codex/auth.json'), { auth_mode: 'chatgpt', tokens: { access_token: 'test-codex-access' } });
  syncCodexAccess(root, profile);
  assert.deepEqual(jsonRead(authPath), ownAuth);
  assert.equal(existsSync(marker), false);
});

test('an active phase cannot request itself again', async t => {
  const root = fixture(t), runDir = resolve(root, '.pi/local/phase');
  const tools = createTools({ root, role: 'architect', config, feature: 'specs/test', skill: 'specify', runDir });
  await assert.rejects(tool(tools, 'sdd_request_skill')({ skill: 'specify', prompt: 'again' }));
  assert.equal(existsSync(resolve(runDir, 'skill-request.json')), false);
});

test('the host stops recursive phase requests before invoking a third model session', async t => {
  const root = fixture(t);
  let calls = 0;
  const architect = async () => {
    const runDir = resolve(root, `.pi/local/recursive-${calls++}`);
    save(resolve(runDir, 'skill-request.json'), { skill: 'specify', prompt: 'again' });
    return { runDir, final: 'requested again' };
  };
  await assert.rejects(workflow('Goal', { root, feature: 'specs/test' }, { architect }), /bucle/);
  assert.equal(calls, 2);
});

test('Pi command displays phase and file activity before its subprocess finishes', async t => {
  const root = fixture(t), contextPath = resolve(root, '.pi/local/ui-context.json');
  save(contextPath, { root, role: 'architect', config, runDir: resolve(root, '.pi/local/ui'), ui: true });
  save(resolve(root, '.pi/sdd/cli.mjs'), `process.stderr.write('RENDO_PROGRESS '+JSON.stringify({phase:'Sol · specify',message:'Guardando spec.md',kind:'activity'})+'\\n');setTimeout(()=>{process.stdout.write(JSON.stringify({output:'Done'})+'\\n');},1100);`);
  const previous = process.env.RENDO_SDD_CONTEXT;
  process.env.RENDO_SDD_CONTEXT = contextPath;
  try {
    const extension = (await import('../../runtime/sdd-extension.mjs')).default;
    const commands = new Map(), widgets = [], messages = [];
    extension({ on() {}, registerTool() {}, registerCommand(name, command) { commands.set(name, command); }, sendMessage(message) { messages.push(message); } });
    const ctx = { waitForIdle: async () => {}, ui: { setWidget(_name, lines) { widgets.push({ lines, messagesSoFar: messages.length }); }, setStatus() {}, notify() {} } };
    await commands.get('rendo').handler('Scoped goal', ctx);
    const live = widgets.find(widget => widget.lines.join('\n').includes('Guardando spec.md'));
    assert.ok(live);
    assert.equal(live.messagesSoFar, 0);
    assert.ok(widgets.at(-1).lines.join('\n').includes('Finalizado'));
    assert.ok(widgets.at(-1).lines.join('\n').includes('Terminado'));
    assert.equal(messages.length, 1);
    assert.ok(messages[0].content.includes('Done'));
  } finally { if (previous === undefined) delete process.env.RENDO_SDD_CONTEXT; else process.env.RENDO_SDD_CONTEXT = previous; }
});

test('real Pi runtime exposes SDD extension tools with builtins disabled', async t => {
  const root = fixture(t), contextPath = resolve(root, '.pi/local/context.json'), agentDir = resolve(root, '.pi/local/agent');
  save(contextPath, { root, role: 'architect', config, runDir: resolve(root, '.pi/local/ui'), ui: true });
  save(resolve(root, '.pi/sdd/cli.mjs'), `process.stderr.write('RENDO_PROGRESS '+JSON.stringify({phase:'Sol · specify',message:'Guardando spec.md',kind:'activity'})+'\\n');setTimeout(()=>{process.stdout.write(JSON.stringify({output:'Done'})+'\\n');},1100);`);
  const previous = process.env.RENDO_SDD_CONTEXT;
  process.env.RENDO_SDD_CONTEXT = contextPath;
  const sdk = await import('../../runtime/node_modules/@mariozechner/pi-coding-agent/dist/index.js');
  const settingsManager = sdk.SettingsManager.inMemory();
  const loader = new sdk.DefaultResourceLoader({ cwd: root, agentDir, settingsManager, noExtensions: true, additionalExtensionPaths: [resolve(ROOT, '.pi/runtime/rendo-loader.mjs')], noSkills: true, noPromptTemplates: true, noContextFiles: true });
  try {
    await loader.reload();
    const { session, extensionsResult } = await sdk.createAgentSession({ cwd: root, agentDir, settingsManager, resourceLoader: loader, noTools: 'builtin', sessionManager: sdk.SessionManager.inMemory(root), authStorage: sdk.AuthStorage.inMemory() });
    try {
      assert.deepEqual(extensionsResult.errors, []);
      const widgets = [], errors = [];
      await session.bindExtensions({ uiContext: { setStatus() {}, setWidget(name, lines) { widgets.push({ name, lines, messagesSoFar: session.messages.length }); }, notify() {} }, commandContextActions: { waitForIdle: async () => {} }, onError(error) { errors.push(error); } });
      assert.deepEqual(errors, []);
      assert.ok(widgets.some(widget => widget.lines.includes('Rendo listo · progreso en vivo v2')));
      const command = session.extensionRunner.getRegisteredCommands().find(item => item.name === 'rendo');
      await command.handler('Scoped goal', session.extensionRunner.createCommandContext());
      const live = widgets.find(widget => widget.lines.join('\n').includes('Guardando spec.md'));
      assert.ok(live);
      assert.equal(live.messagesSoFar, 0);
      assert.ok(widgets.at(-1).lines.join('\n').includes('Finalizado'));
      assert.ok(session.messages.some(message => message.role === 'custom' && message.content.includes('Done')));
      const commands = session.extensionRunner.getRegisteredCommands().map(command => command.name);
      assert.ok(commands.includes('rendo'));
      assert.ok(commands.includes('rendo-status'));
      const names = session.getActiveToolNames();
      for (const name of ['sdd_submit_task', 'sdd_decide', 'sdd_request_skill', 'sdd_task_index']) assert.ok(names.includes(name), name);
      for (const name of ['bash', 'read', 'write', 'edit']) assert.ok(!names.includes(name), name);
      widgets.length = 0;
      await session.reload();
      assert.deepEqual(errors, []);
      assert.ok(widgets.some(widget => widget.lines.includes('Rendo listo · progreso en vivo v2')));
    } finally { session.dispose(); }
  } finally { if (previous === undefined) delete process.env.RENDO_SDD_CONTEXT; else process.env.RENDO_SDD_CONTEXT = previous; }
});

test('real Pi reload loads changed transitive mjs modules through the Rendo loader', async t => {
  const root = fixture(t), entry = resolve(root, 'entry.mjs'), source = resolve(root, 'source.mjs'), helper = resolve(root, 'helper.mjs');
  const loaderUrl = pathToFileURL(resolve(ROOT, '.pi/runtime/rendo-loader.mjs')).href;
  save(entry, `import { loadRendoExtension } from ${JSON.stringify(loaderUrl)}; export default async function(pi) { await (await loadRendoExtension(${JSON.stringify(source)}))(pi); }`);
  save(source, "import { marker } from './helper.mjs'; export default function(pi) { pi.registerCommand(marker, {description: marker, handler: async () => {}}); }");
  save(helper, "export const marker = 'fresh-one';");
  const sdk = await import('../../runtime/node_modules/@mariozechner/pi-coding-agent/dist/index.js');
  const agentDir = resolve(root, '.pi/local/agent'), settingsManager = sdk.SettingsManager.inMemory();
  const resourceLoader = new sdk.DefaultResourceLoader({ cwd: root, agentDir, settingsManager, noExtensions: true, additionalExtensionPaths: [entry], noSkills: true, noPromptTemplates: true, noContextFiles: true });
  await resourceLoader.reload();
  const { session, extensionsResult } = await sdk.createAgentSession({ cwd: root, agentDir, settingsManager, resourceLoader, noTools: 'builtin', sessionManager: sdk.SessionManager.inMemory(root), authStorage: sdk.AuthStorage.inMemory() });
  try {
    assert.deepEqual(extensionsResult.errors, []);
    const commands = () => session.extensionRunner.getRegisteredCommands().map(command => command.name);
    assert.ok(commands().includes('fresh-one'));
    save(helper, "export const marker = 'fresh-two';");
    await session.reload();
    assert.deepEqual(resourceLoader.getExtensions().errors, []);
    assert.ok(commands().includes('fresh-two'), JSON.stringify(commands()));
    assert.ok(!commands().includes('fresh-one'));
  } finally { session.dispose(); }
});

