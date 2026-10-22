import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer, setMockMarketplaceCatalogEmpty } from './fixtures/mock-api-server';

function gestorCookie(signature = 'test') {
  const userId = '11111111-1111-1111-1111-111111111111';
  const payload = {
    sub: userId,
    accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  };
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`;
  const value = `base64-${Buffer.from(JSON.stringify({
    access_token: token,
    user: { id: userId, email: 'qa@example.invalid', user_metadata: { role: 'gestor' } },
  })).toString('base64')}`;
  return { name: 'sb-localhost-auth-token', value, domain: 'localhost', path: '/' };
}

test('filtros públicos y favicon Rendo', async ({ page }, testInfo) => {
  await page.goto('/es/unidades');
  const filterTitle = page.getByRole('heading', { name: 'Filtros del Catálogo' })
    .or(page.getByRole('button', { name: /Filtros del Catálogo/ }));
  await expect(filterTitle.first()).toBeVisible();
  const iconHrefs = await page.locator('link[rel="icon"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
  expect(iconHrefs.some((href) => href?.includes('rendo-app-icon.png'))).toBe(true);
  expect(iconHrefs.some((href) => href?.includes('favicon.ico'))).toBe(false);
  const filterPanel = page.locator('#catalog-filters');
  if (!(await filterPanel.isVisible())) await page.getByRole('button', { name: /Filtros del Catálogo/ }).click();
  await expect(filterPanel.getByText('Busca por título o descripción de la unidad.')).toBeVisible();
  await expect(filterPanel.getByText('“Todas” también incluye unidades fuera de las zonas listadas.')).toBeVisible();
  await filterPanel.locator('[data-slot="select-trigger"]').first().click();
  await expect(page.getByText('Cabaña', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Salón de Eventos', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Cancha', { exact: true }).last()).toBeVisible();
  await page.keyboard.press('Escape');
  const priceMin = filterPanel.getByPlaceholder('Mínimo');
  await priceMin.fill('50000');
  await priceMin.press('Enter');
  await expect(filterPanel.getByPlaceholder('Máximo')).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('marketplace-filtros.png'), fullPage: true });
});

test('contraseña visible con control propio en login y registro', async ({ page }, testInfo) => {
  for (const route of ['/es/auth/login', '/es/auth/registro?portal=gestor']) {
    await page.goto(route);
    const password = page.locator('#password');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  }
  await page.screenshot({ path: testInfo.outputPath('registro-contrasena.png'), fullPage: true });
});

test('formulario de gestor: borrador, categorías y fotos', async ({ page, context }, testInfo) => {
  await context.addCookies([gestorCookie()]);
  await page.goto('/es');
  const cookieNames = (await context.cookies()).map((cookie) => cookie.name);
  expect(cookieNames).toContain('sb-localhost-auth-token');
  await page.goto('/es/mis-unidades/nueva');
  if (page.url().includes('/auth/login')) throw new Error(`Sesión simulada no reconocida; cookies: ${cookieNames.join(', ')}`);
  await expect(page.getByRole('heading', { name: 'Nueva Unidad' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar y publicar' })).toHaveCount(0);
  await expect(page.getByText('Sin grupo / unidad individual').first()).toBeVisible();
  await expect(page.getByText('Sin zona predefinida').first()).toBeVisible();
  await expect(page.getByText('Guardá el borrador antes de subirlas')).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  // New units intentionally have no fictional default tariff.
  await expect(page.getByTestId('input-precio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Alquiler por Día', exact: false }).click();
  await expect(page.getByTestId('input-precio')).toHaveValue('');
  await expect(page.getByText('Precio para público en inglés (USD)')).toBeVisible();
  await expect(page.getByText('Precio para público en portugués (BRL)')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('gestor-formulario.png'), fullPage: true });
});

test('N02 y N03: editor permite cambiar categoría a cancha y muestra modalidades activas', async ({ page, context }, testInfo) => {
  await context.addCookies([gestorCookie()]);
  await page.goto('/es/mis-unidades/a0000000-0000-0000-0000-000000000001/editar');
  await expect(page.getByRole('heading', { name: 'Editar Unidad' })).toBeVisible();

  // N02: categoría inicial es Casa
  const categoriaTrigger = page.locator('#categoria-select');
  await expect(categoriaTrigger).toContainText('Casa');
  await categoriaTrigger.click();

  // Cambiar a Cancha
  await page.getByRole('option', { name: 'Cancha' }).click();
  await expect(categoriaTrigger).toContainText('Cancha');

  // N03: muestra exactamente las modalidades activas persistidas (m1 mes y m2 día)
  await expect(page.getByText('Modalidad: Alquiler Mensual (Contrato)')).toBeVisible();
  await expect(page.getByText('Modalidad: Alquiler Diario / Por Noche')).toBeVisible();

  // Tarifas no duplicadas (exactamente 2 modalidades)
  const deleteButtons = page.locator('#modalidades').getByRole('button', { name: 'Eliminar' });
  await expect(deleteButtons).toHaveCount(2);

  await page.screenshot({ path: testInfo.outputPath('gestor-editor-cancha.png'), fullPage: true });
});

test('N04 y N05: detalle público proyecta dirección solo para autenticado y localiza WhatsApp en es, en, pt', async ({ page, context }, testInfo) => {
  // The shared Playwright storage state contains a demo Gestor cookie. Clear it
  // explicitly so the anonymous assertions never inherit a signed-in identity.
  await context.clearCookies();
  // 1. Anónimo en español
  await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001');
  await expect(page.getByRole('heading', { name: /Departamento 2 Ambientes/ })).toBeVisible();
  await expect(page.locator('[data-testid="exact-address"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="approximate-location-note"]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Iniciá sesión para contactar' })).toBeVisible();

  // 2. Anónimo en inglés: verificar traducción de interfaz y WhatsApp en inglés
  await page.goto('/en/unidades/a0000000-0000-0000-0000-000000000001');
  await expect(page.getByRole('link', { name: 'Log in to contact' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in to view exact map' })).toBeVisible();

  // 3. Anónimo en portugués: verificar traducción de interfaz en portugués
  await page.goto('/pt/unidades/a0000000-0000-0000-0000-000000000001');
  await expect(page.getByRole('link', { name: 'Faça login para contatar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar para ver mapa exato' })).toBeVisible();

  // 4. Usuario autenticado: proyección de dirección y botón WhatsApp localizado
  await context.addCookies([gestorCookie()]);
  await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001');
  await expect(page.locator('[data-testid="exact-address"]')).toBeVisible();
  await expect(page.locator('[data-testid="exact-address"]')).toContainText('Av. Caá Guazú 450, Goya, Corrientes');
  const waEsBtn = page.getByRole('button', { name: 'Contactar por WhatsApp' });
  await expect(waEsBtn).toBeVisible();
  const waEsLink = page.locator('a[href*="wa.me"]');
  const esHref = await waEsLink.getAttribute('href');
  expect(esHref).toContain('Hola%2C%20me%20interesa%20la%20unidad');

  await page.screenshot({ path: testInfo.outputPath('detalle-autenticado-es.png'), fullPage: true });

  // 5. Usuario autenticado en inglés: botón WhatsApp localizado en inglés
  await page.goto('/en/unidades/a0000000-0000-0000-0000-000000000001');
  const waEnBtn = page.getByRole('button', { name: 'Contact via WhatsApp' });
  await expect(waEnBtn).toBeVisible();
  const waEnLink = page.locator('a[href*="wa.me"]');
  const enHref = await waEnLink.getAttribute('href');
  expect(enHref).toContain('Hello%2C%20I%20am%20interested%20in%20the%20unit');

  // 6. Usuario autenticado en portugués: botón WhatsApp localizado en portugués
  await page.goto('/pt/unidades/a0000000-0000-0000-0000-000000000001');
  const waPtBtn = page.getByRole('button', { name: 'Contatar via WhatsApp' });
  await expect(waPtBtn).toBeVisible();
  const waPtLink = page.locator('a[href*="wa.me"]');
  const ptHref = await waPtLink.getAttribute('href');
  expect(ptHref).toContain('Ol%C3%A1%2C%20tenho%20interesse%20na%20unidade');

  await page.screenshot({ path: testInfo.outputPath('detalle-autenticado-pt.png'), fullPage: true });
});

test.describe('UX-001: estados SSR de alquileres con API sintética de loopback', () => {
  test.beforeAll(async () => {
    await startMockApiServer(3001);
  });
  test.afterAll(async () => {
    await stopMockApiServer();
  });

  test('UX-001: alquileres distingue error, vacío real y recuperación sin perder datos', async ({ page, context }) => {
  // These cookie signatures are synthetic and accepted ONLY by the local test adapter.
  await context.clearCookies();
  await context.addCookies([gestorCookie('service-error')]);
  await page.goto('/es/alquileres');
  await expect(page.getByTestId('alquileres-load-error')).toBeVisible();
  await expect(page.getByText('No pudimos cargar los alquileres')).toBeVisible();
  await expect(page.getByText('No hay alquileres registrados.')).toHaveCount(0);
  await expect(page.getByTestId('btn-nuevo-alquiler')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

  await context.clearCookies();
  await context.addCookies([gestorCookie()]);
  await page.reload();
  await expect(page.getByTestId('alquileres-load-error')).toHaveCount(0);
  await expect(page.getByText('Departamento 2 Ambientes Frente al Río').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByTestId('btn-nuevo-alquiler')).toBeVisible();

  await context.clearCookies();
  await context.addCookies([gestorCookie('empty-rentals')]);
  await page.reload();
  await expect(page.getByText('No hay alquileres registrados.')).toBeVisible();
  await expect(page.getByTestId('alquileres-load-error')).toHaveCount(0);
});

test('UX-001: si falta el catálogo auxiliar, conserva contratos y bloquea el alta', async ({ page, context }) => {
  await context.clearCookies();
  await context.addCookies([gestorCookie('units-only-failure')]);
  await page.goto('/es/alquileres');
  await expect(page.getByTestId('alquileres-creation-data-error')).toBeVisible();
  await expect(page.getByText('Los alquileres se cargaron, pero faltan datos para registrar uno nuevo')).toBeVisible();
  await expect(page.getByText('Departamento 2 Ambientes Frente al Río').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByTestId('alquileres-load-error')).toHaveCount(0);
  await expect(page.getByTestId('btn-nuevo-alquiler')).toHaveCount(0);
});

test('UX-001: alquiler nuevo protege cambios ante Cancelar y Escape', async ({ page, context }) => {
  await context.clearCookies();
  await context.addCookies([gestorCookie()]);
  await page.goto('/es/alquileres');
  await expect(page.getByTestId('btn-nuevo-alquiler')).toBeVisible();
  await page.getByTestId('btn-nuevo-alquiler').click();
  await expect(page.getByRole('heading', { name: 'Nuevo Alquiler' })).toBeVisible();

  const monto = page.locator('#monto_total');
  await monto.fill('1234');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByTestId('alquiler-unsaved-confirm')).toBeVisible();
  await expect(monto).toHaveValue('1234');

  await page.getByTestId('alquiler-seguir-editando').click();
  await expect(page.getByTestId('alquiler-unsaved-confirm')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('alquiler-unsaved-confirm')).toBeVisible();

  await page.getByTestId('alquiler-descartar-cambios').click();
  await expect(page.getByRole('heading', { name: 'Nuevo Alquiler' })).toHaveCount(0);
  await page.getByTestId('btn-nuevo-alquiler').click();
  await expect(page.locator('#monto_total')).toHaveValue('0');
});

test('UX-001: PDF privado se adjunta solo después de registrar alquiler', async ({ page, context }) => {
  await context.clearCookies();
  await context.addCookies([gestorCookie()]);
  await page.goto('/es/alquileres');
  const documentControl = page.getByTestId('alquiler-contrato-documento').filter({ visible: true }).first();
  await expect(documentControl).toBeVisible();
  await expect(documentControl.getByLabel('Adjuntar contrato PDF')).toBeVisible();

  await page.getByTestId('btn-nuevo-alquiler').click();
  await expect(page.getByTestId('contrato-upload-after-save')).toContainText(
    'Guardá primero el alquiler y después adjuntá el PDF'
  );
  await expect(page.locator('#contrato-upload')).toHaveCount(0);
  await expect(page.locator('#monto_total')).toHaveValue('0');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo Alquiler' })).toHaveCount(0);

  // An invalid file is rejected before contacting Storage or updating money.
  await documentControl.getByLabel('Adjuntar contrato PDF').setInputFiles({
    name: 'not-a-contract.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not pdf'),
  });
  await expect(documentControl.getByRole('alert')).toContainText('PDF válido');
});
});

test('UX-001: catálogo sin filtros ni coincidencias no inventa propiedades ni precios', async ({ page }) => {
  await startMockApiServer(3001);
  try {
    // Regression-critical case: the removed fallback only ran for an unfiltered
    // successful empty response. A filtered q=no-results request missed it.
    setMockMarketplaceCatalogEmpty(true);
    await page.goto('/es/unidades');
    await expect(page.getByText('No encontramos resultados')).toBeVisible();
    await expect(page.getByText('0 unidades encontradas')).toBeVisible();
    await expect(page.getByText('Departamento 2 Ambientes Frente al Río')).toHaveCount(0);
    await expect(page.locator('a[href*="/unidades/a0000000-0000-0000-0000-000000000001"]')).toHaveCount(0);

    // Keep the filtered empty path covered too.
    setMockMarketplaceCatalogEmpty(false);
    await page.goto('/es/unidades?q=no-results');
    await expect(page.getByText('No encontramos resultados')).toBeVisible();
    await expect(page.getByText('0 unidades encontradas')).toBeVisible();
  } finally {
    setMockMarketplaceCatalogEmpty(false);
    await stopMockApiServer();
  }
});
