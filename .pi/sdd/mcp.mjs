import { createInterface } from 'node:readline';
import { jsonRead } from './core.mjs';
import { createTools, toolResult } from './tools.mjs';

const tools = createTools(jsonRead(process.argv[2]));
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
let pending = Promise.resolve();
async function handle(line) {
  let request;
  try {
    request = JSON.parse(line);
    if (!Object.hasOwn(request, 'id')) return;
    let result;
    if (request.method === 'initialize') result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'rendo-sdd', version: '1.0.0' } };
    else if (request.method === 'ping') result = {};
    else if (['resources/list', 'prompts/list', 'resources/templates/list'].includes(request.method)) result = { [request.method.split('/')[0] === 'resources' ? (request.method.includes('templates') ? 'resourceTemplates' : 'resources') : 'prompts']: [] };
    else if (request.method === 'tools/list') result = { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
    else if (request.method === 'tools/call') {
      const tool = tools.find(item => item.name === request.params.name);
      if (!tool) throw new Error('Herramienta desconocida.');
      try { result = toolResult(await tool.execute(request.params.arguments ?? {})); }
      catch (error) { result = { content: [{ type: 'text', text: error.message }], isError: true }; }
    } else throw new Error(`Método no soportado: ${request.method}`);
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request?.id ?? null, error: { code: -32603, message: error.message } })}\n`);
  }
}
input.on('line', line => { pending = pending.then(() => handle(line)); });
