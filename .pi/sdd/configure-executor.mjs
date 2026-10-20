import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { jsonRead, save } from './core.mjs';
import { ROOT, configuration } from './runner.mjs';

configuration();
const settingsPath = resolve(process.env.USERPROFILE ?? process.env.HOME, '.gemini/antigravity-cli/settings.json');
const settings = existsSync(settingsPath) ? jsonRead(settingsPath) : {};
const permissions = settings.permissions ?? {};
const names = ['sdd_read', 'sdd_tasks', 'sdd_rules', 'sdd_write', 'sdd_command', 'sdd_submit_result'];
const rules = names.map(name => `mcp(rendo_sdd/${name})`);
const additions = rules.filter(rule => !(permissions.allow ?? []).includes(rule));
if (additions.length) {
  const backup = resolve(ROOT, '.pi/local/install/antigravity-settings-before.json');
  if (!existsSync(backup)) save(backup, existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8') : '{}');
  save(settingsPath, { ...settings, permissions: { ...permissions, allow: [...(permissions.allow ?? []), ...additions] } });
}
process.stdout.write('Rendo: seis permisos MCP exactos configurados; restantes preferencias conservadas.\n');
