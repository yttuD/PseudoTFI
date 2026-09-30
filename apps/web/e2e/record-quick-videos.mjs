import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTOR_DEFINITIONS, createMockSessionToken } from './fixtures/actors.ts';

const base = 'http://127.0.0.1:3000';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.tmp/rendo-video-capture');
await mkdir(dir, { recursive: true });
const pause = (ms = 850) => new Promise((resolve) => setTimeout(resolve, ms));

async function startRecording(browser, name) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'es-AR',
    colorScheme: 'light',
    recordVideo: { dir, size: { width: 1440, height: 900 } },
  });
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  page.on('dialog', async (dialog) => dialog.accept());
  return { context, page, name };
}

async function finishRecording(recording) {
  const source = await recording.page.video().path();
  await recording.context.close();
  console.log(`${recording.name}=${source}`);
}

async function addGestorSession(context) {
  const actor = ACTOR_DEFINITIONS.gestor;
  const token = createMockSessionToken({
    userId: actor.id,
    email: actor.email,
    role: actor.authRole,
    accessContext: actor.accessContext,
  });
  const value = `base64-${Buffer.from(JSON.stringify({
    access_token: token,
    user: { id: actor.id, email: actor.email, user_metadata: { role: 'gestor', rol: 'gestor' } },
  })).toString('base64')}`;
  await context.addCookies(['sb-127-auth-token', 'sb-localhost-auth-token'].map((name) => ({
    name,
    value,
    url: base,
    expires: Math.floor(Date.now() / 1000) + 86400,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  })));
}

async function customerJourney(browser) {
  const recording = await startRecording(browser, 'cliente');
  const { page } = recording;
  try {
    await page.goto(`${base}/es`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('search-wizard').waitFor();
    await pause(1300);
    await page.getByTestId('search-wizard').getByPlaceholder('Buscar por zona, título...').fill('departamento');
    await pause(650);
    await page.getByTestId('search-wizard').getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Departamento' }).click();
    await pause(650);
    await page.getByTestId('search-wizard').getByRole('button', { name: 'Buscar' }).click();
    await page.waitForURL(/\/es\/unidades\?/);
    await page.getByText('unidades encontradas').waitFor();
    await pause(1250);
    const card = page.locator('a[href^="/es/unidades/"]').first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForURL(/\/es\/unidades\/[a-f0-9-]+$/);
    await pause(1350);
    await page.mouse.wheel(0, 550);
    await pause(1300);
    await page.mouse.wheel(0, -550);
    await pause(800);
    console.log(`CLIENTE_OK ${page.url()}`);
  } catch (error) {
    await page.screenshot({ path: path.join(dir, 'cliente-error.png'), fullPage: true });
    throw error;
  } finally {
    await finishRecording(recording);
  }
}

async function createUnit(page, { title, description, category, price, hourly }) {
  await page.goto(`${base}/es/mis-unidades/nueva`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Nueva Unidad' }).waitFor();
  await pause(850);
  if (category !== 'departamento') {
    await page.locator('#basicos').getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Cancha' }).click();
  }
  await page.locator('#basicos').getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Complejo Costanera Demo' }).click();
  await page.locator('input[name="titulo_es"]').fill(title);
  await page.locator('textarea[name="descripcion_es"]').fill(description);
  await page.locator('input[name="whatsapp"]').fill('+5493777123456');
  await pause(900);
  await page.locator('#modalidades').scrollIntoViewIfNeeded();
  await pause(550);
  if (hourly) {
    await page.locator('#modalidades').getByRole('button', { name: 'Eliminar' }).first().click();
    await page.locator('#modalidades').getByRole('button', { name: /Alquiler por Hora/ }).click();
  }
  await page.getByTestId('input-precio').first().fill(String(price));
  await pause(850);
  const responsePromise = page.waitForResponse((response) =>
    response.url() === 'http://127.0.0.1:3001/unidades' && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Guardar Unidad' }).click();
  const response = await responsePromise;
  if (response.status() !== 201) throw new Error(`Alta de ${title}: HTTP ${response.status()}`);
  await page.waitForURL(/\/es\/mis-unidades\/[a-f0-9-]+\/editar$/);
  await pause(1000);
  console.log(`UNIDAD_OK ${title} ${page.url()}`);
}

async function managerJourney(browser) {
  const recording = await startRecording(browser, 'gestor');
  const { page, context } = recording;
  try {
    await addGestorSession(context);
    await page.goto(`${base}/es/mis-unidades`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Inventario & Grupos/ }).waitFor();
    await pause(1000);
    await page.getByTestId('btn-nuevo-grupo').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nombre del Grupo *').fill('Complejo Costanera Demo');
    await dialog.getByLabel('Descripción (Opcional)').fill('Unidades de alquiler y espacios deportivos');
    await pause(650);
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByText('Complejo Costanera Demo').first().waitFor();
    await pause(1000);
    console.log('GRUPO_OK');

    await createUnit(page, {
      title: 'Departamento Costanera A',
      description: 'Departamento luminoso frente al río, equipado para estadías cortas.',
      category: 'departamento',
      price: 55000,
      hourly: false,
    });
    await createUnit(page, {
      title: 'Cancha Costanera 1',
      description: 'Cancha iluminada con reservas por hora y vestuarios.',
      category: 'cancha',
      price: 18000,
      hourly: true,
    });
    await page.goto(`${base}/es/mis-unidades`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Departamento Costanera A').first().waitFor();
    await page.getByText('Cancha Costanera 1').first().waitFor();
    await pause(1500);
    console.log('GESTOR_OK');
  } catch (error) {
    await page.screenshot({ path: path.join(dir, 'gestor-error.png'), fullPage: true });
    throw error;
  } finally {
    await finishRecording(recording);
  }
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  await customerJourney(browser);
  await managerJourney(browser);
} finally {
  await browser.close();
}
