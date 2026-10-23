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

  for (const { locale, menuName, profileName, dashboardName, accountName, managersName } of [
    { locale:'es', menuName:'Menú de perfil', profileName:'Mi perfil', dashboardName:'Ir a mi Panel de Gestor', accountName:'Cuenta', managersName:'Gestores' },
    { locale:'en', menuName:'Profile menu', profileName:'My profile', dashboardName:'Go to Manager Dashboard', accountName:'Account', managersName:'Managers' },
    { locale:'pt', menuName:'Menu do perfil', profileName:'Meu perfil', dashboardName:'Ir para o Painel do Gestor', accountName:'Conta', managersName:'Gestores' },
  ]) {
    test(`${locale}: show menu, focus Escape, and keep localized destination links`, async ({ page, context }) => {
      await context.clearCookies();
      await context.addCookies([managerCookie()]);
      await page.goto(`/${locale}/unidades`);
      if (page.viewportSize()!.width < 768) {
        // The marketplace deliberately uses NativeBottomNav at mobile widths.
        // Verify the actual mobile affordances rather than searching for a hidden desktop menu.
        const navigation = page.locator('nav.fixed.bottom-0');
        await expect(navigation).toBeVisible();
        const account = navigation.getByRole('link', { name: accountName });
        await expect(account).toHaveAttribute('href', `/${locale}/cuenta`);
        // This scenario signs in as gestor; Publish must bypass registration.
        const publish = navigation.getByRole('link', { name: { es:'Publicar', en:'List', pt:'Publicar' }[locale as 'es'|'en'|'pt'] });
        await expect(publish).toHaveAttribute('href', `/${locale}/mis-unidades/nueva`);
        const manager = navigation.getByRole('link', { name: managersName });
        await expect(manager).toHaveAttribute('href', `/${locale}/dashboard`);
        await account.focus();
        await expect(account).toBeFocused();
        // The desktop-only profile trigger must not compete with native mobile navigation.
        await expect(page.getByRole('button', { name: menuName })).toHaveCount(0);
        return;
      }
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
