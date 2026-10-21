import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Strictly read-only HTTP smoke for an already staged Vercel Web/API pair.
// This program does NOT deploy, use credentials, mutate databases or assert SHA.
const TARGET_PATHS = {
  web: ['/es/auth/login'],
  api: ['/health/live', '/health/ready'],
};

export function validateVercelOrigin(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.pathname !== '/' && url.pathname !== '') ||
      url.search || url.hash ||
      !/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname)) {
    throw new Error('Smoke target must be an HTTPS origin under *.vercel.app without credentials or paths');
  }
  return url.origin;
}

export async function runReadOnlySmoke(webOrigin, apiOrigin, client = fetch) {
  const targets = [
    ...TARGET_PATHS.web.map(path => ['WEB', webOrigin + path]),
    ...TARGET_PATHS.api.map(path => ['API', apiOrigin + path]),
  ];
  const results = [];
  for (const [component, url] of targets) {
    const response = await client(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: { Accept: component === 'API' ? 'application/json' : 'text/html' },
      signal: AbortSignal.timeout(12000),
    });
    // Do not follow redirects to third-party sign-in or log private HTML.
    if (response.status !== 200) {
      throw new Error(`${component} GET health/read-only page did not return 200 (HTTP ${response.status})`);
    }
    results.push({ component, path: new URL(url).pathname, status: response.status });
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const getFlag = (name) => argv[argv.indexOf(name) + 1];
  if (argv.length !== 4 || !argv.includes('--web') || !argv.includes('--api')) {
    throw new Error('Usage: node scripts/release/readonly-vercel-smoke.mjs --web https://...vercel.app --api https://...vercel.app');
  }
  const web = validateVercelOrigin(getFlag('--web'));
  const api = validateVercelOrigin(getFlag('--api'));
  const results = await runReadOnlySmoke(web, api);
  for (const x of results) process.stdout.write(`PASS ${x.component} GET ${x.path} -> ${x.status}\n`);
  process.stdout.write('SHA NOT VERIFIED by HTTP smoke; compare both Vercel deployment metadata IDs with approved commit before promote.\n');
}
