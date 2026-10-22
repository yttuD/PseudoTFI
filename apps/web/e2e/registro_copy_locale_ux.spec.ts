import { test, expect } from '@playwright/test';

test.describe('UX-001: registration uses clear language for each audience and locale', () => {
  test('phone/email method switches expose selected state in register and login', async ({ page }) => {
    for (const route of ['/es/auth/registro?portal=gestor', '/es/auth/login?portal=gestor']) {
      await page.goto(route);
      const email = page.getByRole('button', { name: /Email/i }).first();
      const phone = page.getByRole('button', { name: /Teléfono/i }).first();
      await expect(email).toBeVisible();
      await expect(phone).toBeVisible();
      await expect(email).toHaveAttribute('aria-pressed', 'true');
      await phone.click();
      await expect(phone).toHaveAttribute('aria-pressed', 'true');
      await expect(email).toHaveAttribute('aria-pressed', 'false');
      await email.click();
      await expect(email).toHaveAttribute('aria-pressed', 'true');
    }
  });

  for (const entry of [
    { locale:'es', manager:'Creá tu cuenta de gestor', visitor:'Creá tu cuenta en Rendo', visitorLink:'Creá tu cuenta para buscar', managerLink:'Creá tu cuenta de gestor' },
    { locale:'en', manager:'Create your manager account', visitor:'Create your Rendo account', visitorLink:'Create an account to search', managerLink:'Create a manager account' },
    { locale:'pt', manager:'Crie sua conta de gestor', visitor:'Crie sua conta no Rendo', visitorLink:'Crie uma conta para buscar', managerLink:'Crie sua conta de gestor' },
  ]) {
    test(`${entry.locale} registration clearly identifies both roles`, async ({ page }) => {
      await page.goto(`/${entry.locale}/auth/registro?portal=gestor`);
      await expect(page.getByRole('heading', { level:1, name:entry.manager })).toBeVisible();
      const visitorLink = page.getByRole('link', { name:entry.visitorLink });
      await expect(visitorLink).toHaveAttribute('href', /portal=marketplace/);
      await visitorLink.click();
      await expect(page.getByRole('heading', { level:1, name:entry.visitor })).toBeVisible();
      await expect(page.getByRole('link', { name:entry.managerLink })).toHaveAttribute('href', /portal=gestor/);
    });
  }
});
