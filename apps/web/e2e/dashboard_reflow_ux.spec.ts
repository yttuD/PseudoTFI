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

test.describe('UX-001: manager dashboard primary actions reflow without clipping', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('honors the system reduced-motion preference for recurring status animations', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies([gestorCookie()]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/es/dashboard');
    const indicator = page.locator('.animate-ping').first();
    await expect(indicator).toBeAttached();
    const animation = await indicator.evaluate(element => {
      const computed = getComputedStyle(element);
      return { duration: computed.animationDuration, iterations: computed.animationIterationCount };
    });
    const durations = animation.duration.split(',').map((item) => parseFloat(item.trim()));
    expect(durations.every((duration) => Number.isFinite(duration) && duration <= 0.001)).toBe(true);
    expect(animation.iterations.split(',').every((value) => Number(value.trim()) <= 1)).toBe(true);
  });

  for (const width of [320, 640]) {
    test(`${width}px: both primary actions remain entirely operable`, async ({ page, context }, testInfo) => {
      test.skip(!testInfo.project.name.includes('mobile'), 'Run narrow-width reflow once in mobile Chromium');
      await context.clearCookies();
      await context.addCookies([gestorCookie()]);
      await page.setViewportSize({ width, height: 740 });
      await page.goto('/es/dashboard');
      await expect(page.locator('h1')).toBeVisible();
      const actions = page.getByTestId('dashboard-primary-actions');
      const links = actions.locator('a');
      await expect(links).toHaveCount(2);
      for (const href of ['/es/mis-unidades/nueva', '/es/facturacion']) {
        const link = actions.locator(`a[href="${href}"]`);
        await expect(link).toBeVisible();
        const rect = await link.boundingBox();
        expect(rect, `${href} must have a clickable bounding box`).not.toBeNull();
        expect(rect!.x, `${href} clipped at left edge`).toBeGreaterThanOrEqual(-1);
        expect(rect!.x + rect!.width, `${href} clipped at right edge`).toBeLessThanOrEqual(width + 1);
        expect(rect!.height).toBeGreaterThanOrEqual(43);
      }
      const bounds = await Promise.all([0, 1].map(async i => links.nth(i).boundingBox()));
      const [first, second] = bounds;
      expect(first && second).toBeTruthy();
      const verticalGap = Math.abs((first!.y + first!.height / 2) - (second!.y + second!.height / 2));
      const horizontalGap = Math.abs((first!.x + first!.width / 2) - (second!.x + second!.width / 2));
      expect(verticalGap >= 4 || horizontalGap >= (first!.width + second!.width)/2 - 2).toBeTruthy();
    });
  }
});
