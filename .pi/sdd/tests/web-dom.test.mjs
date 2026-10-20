import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../runner.mjs';

const { chromium } = createRequire(resolve(ROOT, 'apps/web/package.json'))('@playwright/test');
const source = readFileSync(resolve(ROOT, '.pi/browser-extension/content.js'), 'utf8');
let browser;
test.before(async () => { browser = await chromium.launch({ channel: 'msedge', headless: true }); });
test.after(async () => { await browser?.close(); });
async function fixture(t, provider) {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  t.after(() => page.close());
  const chatgpt = provider === 'chatgpt';
  const model = chatgpt ? 'GPT 5.6 Sol' : 'Gemini 3.8 Flash', effort = chatgpt ? 'Alto' : 'Avanzado';
  await page.setContent(`<button id="model" data-testid="model-switcher-dropdown-button" aria-haspopup="menu">${model}</button><button id="effort" aria-haspopup="menu">${effort}</button><rich-textarea><div id="prompt-textarea" role="textbox" contenteditable="true" style="width:300px;min-height:50px"></div></rich-textarea><input type="file" style="display:none"><button id="send" data-testid="send-button" aria-label="Enviar mensaje">Enviar</button><button id="stop" data-testid="stop-button" aria-label="Detener respuesta" style="display:none">Stop</button><section id="replies"></section>`);
  await page.evaluate(({ provider }) => {
    window.rendoFixtureMessages = []; window.rendoSendCount = 0;
    window.rendoFixtureChrome = { storage: { local: { get: async () => ({ selectors: {} }) } }, runtime: { onMessage: { addListener: handler => { window.rendoFixtureHandler = handler; } }, sendMessage: async packet => window.rendoFixtureMessages.push(packet) } };
    document.querySelector('#send').onclick = () => {
      window.rendoSendCount++;
      const prompt = document.querySelector('#prompt-textarea').innerText;
      const node = document.createElement(provider === 'chatgpt' ? 'div' : 'model-response');
      if (provider === 'chatgpt') node.dataset.messageAuthorRole = 'assistant';
      const pre = document.createElement('pre'), code = document.createElement('code');
      code.textContent = JSON.stringify({ type: 'final', text: prompt.includes('second') ? 'SECOND' : 'FIRST' });
      pre.append(code); node.append(pre); document.querySelector('#replies').append(node);
    };
  }, { provider });
  await page.addScriptTag({ content: `{ const chrome=window.rendoFixtureChrome; const location={hostname:${JSON.stringify(chatgpt ? 'chatgpt.com' : 'gemini.google.com')}}; ${source} }` });
  return { page, model, effort };
}
async function request(page, message) { return page.evaluate(message => new Promise(done => window.rendoFixtureHandler(message, {}, done)), message); }

for (const provider of ['chatgpt', 'gemini']) test(`extension DOM driver starts fresh ${provider}, sends and receives only new replies`, async t => {
  const { page, model, effort } = await fixture(t, provider);
  assert.ok(!(await request(page, { type: 'rendo-open', model, effort })).error);
  assert.equal(JSON.parse((await request(page, { type: 'rendo-exchange', requestId: 'one', prompt: 'first', images: [] })).text).text, 'FIRST');
  assert.equal(JSON.parse((await request(page, { type: 'rendo-exchange', requestId: 'two', prompt: 'second', images: [] })).text).text, 'SECOND');
  assert.equal(await page.evaluate(() => window.rendoSendCount), 2);
});

test('extension refuses an old conversation and a model changed after opening', async t => {
  const { page, model, effort } = await fixture(t, 'chatgpt');
  await request(page, { type: 'rendo-open', model, effort });
  await page.locator('#model').evaluate(element => { element.textContent = 'Other model'; });
  const answer = await request(page, { type: 'rendo-exchange', requestId: 'bad', prompt: 'GPT 5.6 Sol Alto', images: [] });
  assert.match(answer.error, /Modelo no confirmado/); assert.equal(await page.evaluate(() => window.rendoSendCount), 0);
  await page.locator('#model').evaluate((element, model) => { element.textContent = model; }, model);
  await page.evaluate(() => { const previous = document.createElement('div'); previous.dataset.messageAuthorRole = 'assistant'; previous.textContent = 'old'; document.querySelector('#replies').append(previous); });
  assert.match((await request(page, { type: 'rendo-open', model, effort })).error, /respuestas anteriores/);
});

test('extension selects the requested model from a unique menu before submitting', async t => {
  const { page, model, effort } = await fixture(t, 'chatgpt');
  await page.evaluate(model => {
    const trigger = document.querySelector('#model'); trigger.textContent = 'Other model';
    trigger.onclick = () => { const option = document.createElement('button'); option.role = 'menuitemradio'; option.textContent = model; option.onclick = () => { trigger.textContent = model; option.remove(); }; document.body.append(option); };
  }, model);
  assert.ok(!(await request(page, { type: 'rendo-open', model, effort })).error);
  assert.equal(await page.locator('#model').innerText(), model); assert.equal(await page.evaluate(() => window.rendoSendCount), 0);
});

test('extension attaches an image only when its preview is visible before sending', async t => {
  const { page, model, effort } = await fixture(t, 'chatgpt');
  await page.evaluate(() => {
    document.querySelector('input[type=file]').onchange = event => {
      for (const file of event.target.files) { const preview = document.createElement('div'); preview.setAttribute('aria-label', file.name); preview.textContent = file.name; document.body.append(preview); }
    };
  });
  await request(page, { type: 'rendo-open', model, effort });
  const response = await request(page, { type: 'rendo-exchange', requestId: 'image', prompt: 'Inspect', images: [{ mimeType: 'image/png', data: Buffer.from('fixture').toString('base64') }] });
  assert.ok(!response.error); assert.equal(await page.locator('input[type=file]').evaluate(element => element.files.length), 1);
  assert.equal(await page.evaluate(() => window.rendoSendCount), 1);
});
