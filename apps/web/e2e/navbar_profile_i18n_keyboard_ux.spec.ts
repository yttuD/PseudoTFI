import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function managerCookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
    sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
  })).toString('base64url')}.test`;
  return {
    name: 'sb-localhost-auth-token',
    value: `base64-${Buffer.from(JSON.stringify({
      access_token: token,
      user: { id, email: 'manager@example.invalid', user_metadata: { role: 'gestor', full_name: 'Test Manager' } },
    })).toString('base64')}`,
    domain: 'localhost', path: '/',
  };
}

test.describe('UX-001: profile navigation remains translated and operable with keyboard', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const { locale, menuName, profileName, dashboardName } of [
    { locale:'es', menuName:'Menú de perfil', profileName:'Mi perfil', dashboardName:'Ir a mi Panel de Gestor' },
    { locale:'en', menuName:'Profile menu', profileName:'My profile', dashboardName:'Go to Manager Dashboard' },
    { locale:'pt', menuName:'Menu do perfil', profileName:'Meu perfil', dashboardName:'Ir para o Painel do Gestor' },
  ]) {
    test(`${locale}: show menu, focus Escape, and keep localized destination links`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addCookies([managerCookie()]);
      await page.goto(`/${locale}/unidades`);
      const trigger = page.getByRole('button', { name: menuName });
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('link',{name:profileName,exact:true})).toHaveAttribute('href', `/${locale}/cuenta`);
      await expect(page.getByRole('link',{name:dashboardName})).toHaveAttribute('href', `/${locale}/dashboard`);
      await trigger.press('Escape');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toBeFocused();
      await expect(page.locator('#navbar-profile-popover')).toHaveCount(0);
    });
  }
});
