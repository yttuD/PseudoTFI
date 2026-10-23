import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function gestorCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  return { name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({
      access_token: token, user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
    })).toString('base64')}`, domain: 'localhost', path: '/' };
}

test.describe('UX-001: calmer, readable tariff form in desktop/mobile layout', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const width of [375, 1440]) {
    test(`${width}px: important tariff labels are at least 14px and readable`, async ({ page, context }, testInfo) => {
      await context.clearCookies();
      await context.addCookies([gestorCookie()]);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/es/mis-unidades/nueva');
      await page.getByRole('button', { name: 'Alquiler por Día', exact: false }).click();
      const label = page.locator('#modalidades label').filter({ hasText: /Precio por Día/ }).first();
      await expect(label).toBeVisible();
      const style = await label.evaluate(el => ({
        px: Number.parseFloat(getComputedStyle(el).fontSize),
        transform: getComputedStyle(el).textTransform,
      }));
      expect(style.px).toBeGreaterThanOrEqual(14);
      expect(style.transform).toBe('none');
      await page.screenshot({ path: testInfo.outputPath(`unidad-tarifas-legibles-${width}.png`), fullPage: false });
    });
  }
});
