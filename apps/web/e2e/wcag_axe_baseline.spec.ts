import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

// The pinned axe engine is installed only in the isolated CI runner, not in the app bundle.
// This is a WCAG automated signal; manual AT, focus order and usability QA remain required.
type AxeViolation = {
  id: string;
  impact: string | null;
  nodes: Array<{ target: string[]; failureSummary?: string | null }>;
};

test.describe('UX-001: axe WCAG 2.2 A/AA critical and serious regression gate', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const item of [
    { name: 'public catalog', route: '/es/unidades', auth: false },
    { name: 'login', route: '/es/auth/login', auth: false },
    { name: 'manager dashboard', route: '/es/dashboard', auth: true },
    { name: 'manager unit creation', route: '/es/mis-unidades/nueva', auth: true },
  ]) {
    test(item.name, async ({ page, context }, testInfo) => {
      const axePath = process.env.AXE_SCRIPT_PATH;
      if (!axePath) throw new Error('AXE_SCRIPT_PATH must refer to the pinned axe.min.js in CI');
      await context.clearCookies();
      if (item.auth) {
        const id = '11111111-1111-1111-1111-111111111111';
        const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
          sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
        })).toString('base64url')}.test`;
        await context.addCookies([{
          name: 'sb-localhost-auth-token',
          value: `base64-${Buffer.from(JSON.stringify({
            access_token: token, user: { id, email: 'gestor@example.invalid', user_metadata: { role: 'gestor' } },
          })).toString('base64')}`,
          domain: 'localhost', path: '/',
        }]);
      }
      await page.goto(item.route);
      await expect(page.locator('body')).toBeVisible();
      await page.addScriptTag({ path: axePath });
      const result = await page.evaluate(async () => {
        const engine = (window as Window & {
          axe?: { run: (doc: Document, options: object) => Promise<{ violations: AxeViolation[] }> };
        }).axe;
        if (!engine) throw new Error('axe-core engine was not injected');
        return engine.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
          },
        });
      });
      const severe = result.violations
        .filter(({ impact }) => impact === 'serious' || impact === 'critical')
        .map(({ id, impact, nodes }) => ({
          rule: id, impact, count: nodes.length,
          examples: nodes.slice(0, 3).map((node) => node.target.join(' ')),
        }));
      console.log(`AXE_AUDIT ${item.name} ${testInfo.project.name}: ${JSON.stringify(severe)}`);
      expect(severe, 'axe WCAG 2.2 A/AA serious and critical violations').toEqual([]);
    });
  }
});
