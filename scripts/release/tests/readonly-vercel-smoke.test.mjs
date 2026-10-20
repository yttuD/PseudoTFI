import test from 'node:test';
import assert from 'node:assert/strict';
import { validateVercelOrigin, runReadOnlySmoke } from '../readonly-vercel-smoke.mjs';

test('release: allow only exact HTTPS *.vercel.app origins', () => {
  assert.equal(validateVercelOrigin('https://rendo-beta-web.vercel.app'),
    'https://rendo-beta-web.vercel.app');
  for (const url of [
    'http://rendo-beta-web.vercel.app',
    'https://rendo-beta-web.vercel.app.evil.tld',
    'https://evil.vercel.app@evil.tld',
    'https://rendo-beta-web.vercel.app/secret',
    'https://rendo-beta-web.vercel.app/?token=1',
    'https://localhost',
    'https://vercel.app',
  ]) {
    assert.throws(() => validateVercelOrigin(url), /Smoke target|Invalid URL/);
  }
});

test('release: uses only GET, no redirects and no auth headers', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return { status: 200 };
  };
  const out = await runReadOnlySmoke(
    'https://rendo-beta-web.vercel.app',
    'https://rendo-beta-api.vercel.app',
    fakeFetch,
  );
  assert.equal(out.length, 3);
  assert.deepEqual(out.map(x => x.status), [200, 200, 200]);
  for (const { options } of calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, undefined);
  }
});

test('release: requires 200 and never follows external redirect', async () => {
  await assert.rejects(
    () => runReadOnlySmoke(
      'https://rendo-beta-web.vercel.app',
      'https://rendo-beta-api.vercel.app',
      async () => ({ status: 302 }),
    ),
    /HTTP 302/,
  );
});
