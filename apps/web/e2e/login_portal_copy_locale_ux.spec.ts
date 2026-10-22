import { test, expect } from '@playwright/test';

test.describe('UX-001: login copy and portal switches are clear in all locales', () => {
  for (const item of [
    { locale:'es', manager:'Ingresá a Rendo Gestor', seeker:'Bienvenido a Rendo', seekerLink:'Ingresá para buscar', managerLink:'Ingresá como gestor' },
    { locale:'en', manager:'Sign in to Rendo Manager', seeker:'Welcome to Rendo', seekerLink:'Sign in to search', managerLink:'Sign in as a manager' },
    { locale:'pt', manager:'Entre no Rendo Gestor', seeker:'Bem-vindo ao Rendo', seekerLink:'Entre para buscar', managerLink:'Entre como gestor' },
  ]) {
    test(`${item.locale}: manager and seeker can switch portals without stale destinations`, async ({ page }) => {
      await page.goto(`/${item.locale}/auth/login?portal=gestor&next=/${item.locale}/dashboard`);
      await expect(page.getByRole('heading',{level:1,name:item.manager})).toBeVisible();
      const toSeeker=page.getByRole('link',{name:item.seekerLink});
      await expect(toSeeker).toHaveAttribute('href',`/${item.locale}/auth/login?portal=marketplace`);
      await toSeeker.click();
      await expect(page.getByRole('heading',{level:1,name:item.seeker})).toBeVisible();
      const toManager=page.getByRole('link',{name:item.managerLink});
      await expect(toManager).toHaveAttribute('href',`/${item.locale}/auth/login?portal=gestor`);
      await toManager.click();
      await expect(page.getByRole('heading',{level:1,name:item.manager})).toBeVisible();
    });
  }
});
