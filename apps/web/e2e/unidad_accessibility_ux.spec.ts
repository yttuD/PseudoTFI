import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  return {
    name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({
      access_token: token, user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
    })).toString('base64')}`,
    domain: 'localhost', path: '/',
  };
}

test.describe('UX-001: labels, controls and accessible state of the unit form', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const width of [375, 1440]) {
    test(`${width}px: visible form labels name their actual keyboard controls`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addCookies([gestorCookie()]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/es/mis-unidades/nueva');
      await expect(page.getByRole('heading', { name: 'Nueva Unidad' })).toBeVisible();

      for (const [id, expected] of [
        ['categoria-select', 'Categoría *'],
        ['grupo-select', 'Grupo / Edificio'],
        ['zona-select', 'Zona Operativa'],
        ['titulo_es', 'Título de la Publicación (Español) *'],
        ['descripcion_es', 'Descripción Completa (Español) *'],
        ['whatsapp', 'WhatsApp de Contacto Directo'],
        ['instagram', 'Instagram (Opcional)'],
        ['unidad-direccion-busqueda', 'Dirección, Ciudad o Localidad (Autocompletado con Nominatim)'],
      ] as const) {
        await expect(page.locator(`#${id}`)).toHaveAccessibleName(expected);
      }
      await expect(page.locator('#unidad-auto-traducir')).toHaveAccessibleName('Traducción automática');
      await expect(page.locator('#unidad-auto-traducir')).toHaveAttribute('aria-describedby', 'unidad-auto-traducir-hint');

      for (const [lang, title, description] of [
        ['en', 'titulo_en', 'descripcion_en'],
        ['pt', 'titulo_pt', 'descripcion_pt'],
      ] as const) {
        await page.getByRole('button', { name: lang === 'en' ? /English/ : /Português/ }).click();
        await expect(page.getByRole('button', { name: lang === 'en' ? /English/ : /Português/ })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator(`#${title}`)).not.toHaveAccessibleName('');
        await expect(page.locator(`#${description}`)).not.toHaveAccessibleName('');
      }
      await page.getByRole('button', { name: /Español/ }).click();
      await expect(page.getByRole('button', { name: /Español/ })).toHaveAttribute('aria-pressed', 'true');

      await page.getByRole('button', { name: 'Alquiler por Día', exact: false }).click();
      await expect(page.locator('#precio_0')).toHaveAccessibleName(/Precio por Día/);
      await expect(page.locator('#plazo_0')).toHaveAccessibleName(/Estadía Mínima/);
      await page.locator('#precio_0').focus();
      await expect(page.locator('#precio_0')).toBeFocused();
    });
  }
});
