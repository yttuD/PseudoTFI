import { test, expect } from '@playwright/test';

test.describe('Flujo Completo de Feedback y Navegación en Registro y Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('1. Registro con feedback visible y redirección automática al Dashboard', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('/es/auth/registro?portal=gestor');
    await page.waitForLoadState('domcontentloaded');

    // Cambiar al método Email
    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    const testEmail = `gestor.test.${Date.now()}@renda.com.ar`;
    const testPass = 'PasswordSeguro123!';

    await page.fill('input[name="full_name"]', 'Carlos Gómez Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPass);

    console.log('Enviando registro para:', testEmail);
    await page.click('button[type="submit"]');

    // 1. Debe aparecer el mensaje de feedback visible en pantalla
    const successFeedback = page.getByText(/cuenta creada exitosamente/i);
    await expect(successFeedback).toBeVisible({ timeout: 5000 });
    console.log('Feedback visible! Esperando navegación...');

    // Esperar a que la URL cambie
    await page.waitForURL(/.*\/es\/dashboard/, { timeout: 15000 });
    console.log('Navegación completada. URL actual:', page.url());
  });

  test('2. Login con contraseña incorrecta muestra error claro en pantalla', async ({ page }) => {
    // Precargar una cuenta en el store local
    await page.goto('/es/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const testEmail = 'gestor.existente@renda.com.ar';
    const testPass = 'MiPasswordValido123!';

    await page.evaluate(({ email, pass }) => {
      const accounts = [
        {
          id: 'gestor-local-test',
          email,
          password: pass,
          full_name: 'Gestor Verificado',
          role: 'gestor'
        }
      ];
      localStorage.setItem('rendo_local_accounts', JSON.stringify(accounts));
    }, { email: testEmail, pass: testPass });

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    // Intentar login con contraseña incorrecta
    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', 'ClaveErronea999!');
    await page.click('button[type="submit"]');

    // Debe mostrar error claro en pantalla
    const errorAlert = page.getByText(/contraseña incorrecta/i);
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('3. Login con credenciales correctas muestra feedback de éxito y redirige', async ({ page }) => {
    await page.goto('/es/auth/login?portal=gestor');
    await page.waitForLoadState('domcontentloaded');

    const testEmail = 'gestor.login.ok@renda.com.ar';
    const testPass = 'PasswordCorrecto123!';

    await page.evaluate(({ email, pass }) => {
      const accounts = [
        {
          id: 'gestor-ok-id',
          email,
          password: pass,
          full_name: 'Gestor Logueado',
          role: 'gestor'
        }
      ];
      localStorage.setItem('rendo_local_accounts', JSON.stringify(accounts));
    }, { email: testEmail, pass: testPass });

    const emailTab = page.locator('button').filter({ hasText: /email|correo/i }).first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
    }

    await page.fill('input[name="email"], input[type="email"]', testEmail);
    await page.fill('input[name="password"], input[type="password"]', testPass);
    await page.click('button[type="submit"]');

    // Feedback de éxito visible
    const successFeedback = page.getByText(/ingreso exitoso/i);
    await expect(successFeedback).toBeVisible({ timeout: 5000 });

    // Redirección efectiva a dashboard
    await expect(page).toHaveURL(/.*\/es\/dashboard/, { timeout: 10000 });
  });
});
