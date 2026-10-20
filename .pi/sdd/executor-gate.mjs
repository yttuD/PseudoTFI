import { appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXECUTOR_TOOLS = ['sdd_read', 'sdd_tasks', 'sdd_rules', 'sdd_write', 'sdd_command', 'sdd_submit_result'];
export function gate(payload, profile = process.env.USERPROFILE ?? process.env.HOME) {
  const call = payload.toolCall ?? {}, args = call.args ?? {};
  if (call.name === 'finish') return { decision: 'allow' };
  if (call.name === 'call_mcp_tool' && args.ServerName === 'rendo_sdd' && EXECUTOR_TOOLS.includes(args.ToolName)) return { decision: 'allow' };
  // Antigravity discovers MCP schemas through these generated metadata files.
  if (call.name === 'view_file' && typeof args.AbsolutePath === 'string' && EXECUTOR_TOOLS.some(name => resolve(args.AbsolutePath).toLowerCase() === resolve(profile, `.gemini/antigravity-cli/mcp/rendo_sdd/${name}.json`).toLowerCase())) return { decision: 'allow' };
  return { decision: 'deny', reason: 'Rendo: acceder al proyecto exclusivamente mediante MCP rendo_sdd y el TASK_PACKET aprobado. Las herramientas nativas están bloqueadas.' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let output;
  try { output = gate(JSON.parse(input)); }
  catch { output = { decision: 'deny', reason: 'Rendo: entrada del gate inválida.' }; }
  const log = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../gate-events.jsonl');
  appendFileSync(log, `${JSON.stringify({ tool: (() => { try { return JSON.parse(input).toolCall?.name; } catch { return 'invalid'; } })(), ...output })}\n`);
  process.stdout.write(JSON.stringify(output));
}
