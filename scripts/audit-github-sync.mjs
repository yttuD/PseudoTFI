// Read-only by default. --stage stages only the audited, explicit candidate paths.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', ['-c', 'core.safecrlf=false', ...args], {
  encoding: 'utf8', maxBuffer: 32_000_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
const others = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
const all = [...new Set([...tracked, ...others])].sort();
const excluded = [];
const selected = [];
const findings = [];
const privatePath = /(^|\/)(\.env(?!\.example$)(\.|$)|\.auth\/|\.vercel\/|settings\.local\.json$|config\.local\.json$|local\.properties$)|\.(tsbuildinfo|keystore|jks)$/i;
const snapshot = /^(snapshots|snapshots-vercel)\/|\/evidence\/(?:.*\/)?(?:candidates|screenshots|contact-sheets|captures|captures-remote)\/|\/evidence\/.*backup-/i;
const rawMedia = /^(specs|RENDO_observaciones_mejoradas|entregables)\/.*\.(png|jpe?g|webp|pdf|docx|mp4|webm|har|zip|tgz)$/i;
const demoHelper = /^scripts\/(seed_demo_accounts\.(js|sql)|verify_demo_accounts\.js)$/;
const textExt = /\.(md|txt|json|ya?ml|[cm]?js|tsx?|sql|ps1|sh|xml|html|css|properties|gradle|toml|example|gitignore|dockerignore)$/i;
const patterns = [
  ['provider-token', /\b(?:sb_secret_|sbp_|github_pat_|gh[pousr]_|sk-proj-|xox[baprs]-)[A-Za-z0-9_-]{15,}/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['deepl-key', /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}:fx\b/gi],
  ['hardcoded-bypass', /(?:x-vercel-protection-bypass|VERCEL_AUTOMATION_BYPASS_SECRET)["'\s]*[:=][\s]*["'](?!\$|process\.|<|REDACTED|placeholder|test|dummy)[A-Za-z0-9_-]{20,}/gi],
];

for (const path of all) {
  let reason = privatePath.test(path) ? 'private/local state' : snapshot.test(path) ? 'duplicate source snapshot' : rawMedia.test(path) ? 'raw binary evidence pending privacy review' : demoHelper.test(path) ? 'local demo credential helper' : null;
  if (reason) { excluded.push({ path, reason }); continue; }
  if (!fs.existsSync(path)) { selected.push({ path, deleted: true }); continue; }
  const stat = fs.lstatSync(path);
  if (!stat.isFile()) { findings.push({ path, type: 'non-regular-file' }); continue; }
  if (stat.size > 50_000_000) { findings.push({ path, type: 'oversize-file' }); continue; }
  const bytes = fs.readFileSync(path);
  selected.push({ path, bytes: stat.size, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  if (!textExt.test(path) && !['Dockerfile', 'Makefile'].includes(path.split('/').at(-1))) continue;
  const text = bytes.toString('utf8');
  for (const [type, re] of patterns) {
    for (const match of text.matchAll(re)) findings.push({ path, type, line: text.slice(0, match.index).split('\n').length });
  }
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString());
      if (payload.ref || (typeof payload.iss === 'string' && /\.supabase\.co/.test(payload.iss)))
        findings.push({ path, type: 'embedded-project-jwt', line: text.slice(0, match.index).split('\n').length });
    } catch { /* Not a decodable JWT; other patterns still apply. */ }
  }
}

const summary = { selected: selected.length, bytes: selected.reduce((sum, x) => sum + (x.bytes || 0), 0), excluded: excluded.length, findings };
if (process.argv.includes('--paths')) console.log(selected.map(x => x.path).join('\n'));
else if (process.argv.includes('--manifest')) console.log(JSON.stringify({ summary, selected, excluded }, null, 2));
else console.log(JSON.stringify(summary, null, 2));
if (process.argv.includes('--stage')) {
  if (findings.length) throw new Error('Publication blocked: resolve secret/file findings before staging.');
  const paths = selected.map(x => x.path);
  for (let i = 0; i < paths.length; i += 80) git(['--literal-pathspecs', 'add', '--', ...paths.slice(i, i + 80)]);
  const formerlyTracked = excluded.map(x => x.path).filter(x => tracked.includes(x));
  for (const path of formerlyTracked) git(['--literal-pathspecs', 'rm', '--cached', '--', path]);
  console.log(JSON.stringify({ stagedPaths: paths.length, untrackedPrivatePaths: formerlyTracked }));
}
if (findings.length) process.exitCode = 1;
