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

test.describe('UX-001: mobile unit section picker never obscures the destination heading', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('scrolling to rates keeps the section below the opaque sticky picker', async ({ page, context }, info) => {
    test.skip(!info.project.name.includes('mobile'), 'Run mobile scroll clearance once');
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/es/mis-unidades/nueva');
    const nav = page.getByTestId('unidad-mobile-section-nav');
    const select = nav.locator('#unidad-section-picker');
    await select.selectOption('modalidades');
    await expect(page.locator('#modalidades')).toBeInViewport({ ratio: 0.1 });
    await expect.poll(async () => {
      const header = await nav.boundingBox();
      const section = await page.locator('#modalidades').boundingBox();
      return header && section ? section.y - (header.y + header.height) : -999;
    }, { timeout: 12000 }).toBeGreaterThanOrEqual(8);
    const background = await nav.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(background).toMatch(/^rgb\(/);
    await page.screenshot({ path: 'test-results/mobile-unit-section-clearance.png' });
  });
});
