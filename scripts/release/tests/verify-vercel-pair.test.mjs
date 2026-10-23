import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPair } from '../verify-vercel-pair.mjs';

const sha = 'cfbdabf5fbd12740ae0d3fae6f42541a4d7172c1';
const create = (role, target = 'preview') => ({
  result: { deployment: {
    id: role === 'web' ? 'dpl_WEB_TEST' : 'dpl_API_TEST',
    name: role === 'web' ? 'rendo-beta-web' : 'rendo-beta-api',
    project: {
      id: role === 'web' ? 'prj_ccBNuSoRrobUZtTwY8PpsYr8PlHR' : 'prj_dL8gNB3eb3ePfOI9NBoE1GbRLtVB',
      name: role === 'web' ? 'rendo-beta-web' : 'rendo-beta-api',
    },
    url: role === 'web' ? 'rendo-web-abc123.vercel.app' : 'rendo-api-abc123.vercel.app',
    state: 'READY', readyState: 'READY', target,
    meta: { githubOrg: 'yttuD', githubRepo: 'PseudoTFI', githubCommitSha: sha },
    alias: target === 'production' ? [
      role === 'web' ? 'rendo-beta-web.vercel.app' : 'rendo-beta-api.vercel.app',
    ] : [],
  } },
});

test('reject mixed web/API commit even if both report READY', () => {
  const api = create('api');
  api.result.deployment.meta.githubCommitSha = '7e66fc48fe87b77c3782f2aa1e5a505ecde5fc1b';
  assert.throws(() => verifyPair(create('web'), api, sha, 'preview'), /commit SHA/);
});

test('reject wrong project identity or swapped API and Web', () => {
  assert.throws(() => verifyPair(create('api'), create('web'), sha, 'preview'), /project/);
  const web = create('web');
  web.result.deployment.project.id = 'prj_other';
  assert.throws(() => verifyPair(web, create('api'), sha, 'preview'), /project/);
});

test('reject incomplete SHA, wrong git origin or missing deployment ID', () => {
  assert.throws(() => verifyPair(create('web'), create('api'), 'abc', 'preview'), /40-character/);
  const web = create('web');
  web.result.deployment.meta.githubOrg = 'other';
  assert.throws(() => verifyPair(web, create('api'), sha, 'preview'), /repository/);
  const api = create('api');
  api.result.deployment.id = null;
  assert.throws(() => verifyPair(create('web'), api, sha, 'preview'), /READY/);
});

test('reject a staging deployment that is already assigned to production', () => {
  assert.throws(() => verifyPair(create('web','production'),create('api'),sha,'preview'), /production alias/);
});

test('reject missing production alias, non-READY and external hostnames', () => {
  assert.throws(() => verifyPair(create('web'),create('api','production'),sha,'production'), /production alias/);
  const api = create('api','production');
  api.result.deployment.readyState='ERROR';
  assert.throws(() => verifyPair(create('web','production'),api,sha,'production'), /READY/);
  const web = create('web');
  web.result.deployment.url = 'evil.vercel.app.example.net';
  assert.throws(() => verifyPair(web,create('api'),sha,'preview'), /hostname/);
});

test('accept both previews on approved SHA and production only with exact aliases', () => {
  const a=verifyPair(create('web'),create('api'),sha,'preview');
  assert.equal(a.sha,sha);
  assert.equal(a.web.id,'dpl_WEB_TEST');
  assert.equal(a.api.id,'dpl_API_TEST');
  const b=verifyPair(create('web','production'),create('api','production'),sha,'production');
  assert.equal(b.target,'production');
});
