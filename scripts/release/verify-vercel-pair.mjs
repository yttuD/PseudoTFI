import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const projects = {
  web: { name: 'rendo-beta-web', id: 'prj_ccBNuSoRrobUZtTwY8PpsYr8PlHR', alias: 'rendo-beta-web.vercel.app' },
  api: { name: 'rendo-beta-api', id: 'prj_dL8gNB3eb3ePfOI9NBoE1GbRLtVB', alias: 'rendo-beta-api.vercel.app' },
};

function normalize(input) {
  if (!input || typeof input !== 'object') throw new Error('Invalid deployment metadata');
  return input.result?.deployment ?? input.deployment ?? input;
}

function assertDeployment(raw, role, expectedSha, expectedTarget) {
  const d = normalize(raw);
  const p = projects[role];
  if (d.project?.id !== p.id || d.project?.name !== p.name) {
    throw new Error(`Unexpected ${role} project; do not promote`);
  }
  if (d.meta?.githubOrg !== 'yttuD' || d.meta?.githubRepo !== 'PseudoTFI' ||
      d.meta.githubCommitSha !== expectedSha) {
    throw new Error(`Unexpected ${role} repository or commit SHA`);
  }
  if (d.readyState !== 'READY' || d.state !== 'READY' || typeof d.id !== 'string' || !d.id.startsWith('dpl_')) {
    throw new Error(`${role} deployment not READY with a verifiable ID`);
  }
  if (typeof d.url !== 'string' || !/^[a-z0-9-]+\.vercel\.app$/.test(d.url)) {
    throw new Error(`${role} has an untrusted or missing deployment hostname`);
  }
  const aliases = Array.isArray(d.alias) ? d.alias : [];
  if (expectedTarget === 'preview') {
    if (d.target === 'production' || aliases.includes(p.alias)) {
      throw new Error(`${role} already points to a production alias; refusing preview verification`);
    }
  } else if (expectedTarget === 'production') {
    if (d.target !== 'production' || !aliases.includes(p.alias)) {
      throw new Error(`${role} production alias is missing or deployment target differs`);
    }
  } else {
    throw new Error('Target must be preview or production');
  }
  return { role, id: d.id, hostname: d.url, sha: d.meta.githubCommitSha, target: expectedTarget };
}

export function verifyPair(web, api, sha, target) {
  if (!/^[a-f\d]{40}$/i.test(sha || '')) throw new Error('Expected a complete 40-character Git commit SHA');
  const w = assertDeployment(web, 'web', sha, target);
  const a = assertDeployment(api, 'api', sha, target);
  if (w.id === a.id) throw new Error('Web and API cannot be the same deployment');
  return { web: w, api: a, sha, target };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 8 ||
      ['--web-file', '--api-file', '--sha', '--target'].some(flag => args.indexOf(flag) < 0)) {
    throw new Error('Usage: node scripts/release/verify-vercel-pair.mjs --web-file web.json --api-file api.json --sha <40-char> --target preview|production');
  }
  const value = flag => args[args.indexOf(flag) + 1];
  const web = JSON.parse(readFileSync(value('--web-file'), 'utf8'));
  const api = JSON.parse(readFileSync(value('--api-file'), 'utf8'));
  const result = verifyPair(web, api, value('--sha'), value('--target'));
  process.stdout.write(`PASS: ${result.target} Vercel web ${result.web.id} + API ${result.api.id}, exact SHA ${result.sha}\n`);
  process.stdout.write('NEXT: run read-only HTTP smoke against BOTH exact deployment origins; pair verification alone does not prove runtime health.\n');
}
