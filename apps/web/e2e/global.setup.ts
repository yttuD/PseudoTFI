import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext();
  const page = await context.newPage();

  // URL base, asumiendo localhost:3000
  const baseURL = 'http://localhost:3000';

  // Ir a la página de login
  await page.goto(`${baseURL}/es/auth/login`);

  // Llenar el formulario OTP
  await page.fill('input[type="tel"]', '+541111111111');
  await page.click('button:has-text("Enviar Código OTP")');

  // Esperar a que aparezca el input del código o haya un error
  const errorLocator = page.locator('.text-red-500');
  const otpInputLocator = page.locator('input[placeholder="123456"]');
  
  await Promise.race([
    otpInputLocator.waitFor({ timeout: 10000 }),
    errorLocator.waitFor({ timeout: 10000 })
  ]).catch(() => {});

  if (await errorLocator.isVisible()) {
    const errorText = await errorLocator.innerText();
    console.error('Error durante el envío de OTP en global.setup.ts:', errorText);
    throw new Error('OTP send failed: ' + errorText);
  }

  await otpInputLocator.fill('123456');
  
  // Hacer clic en Ingresar
  await page.click('button:has-text("Verificar y Entrar")');

  // Esperar a que la redirección suceda y estemos en el dashboard
  await page.waitForURL(/.*\/es\/dashboard/);

  // Guardar estado
  await page.context().storageState({ path: 'e2e/.auth/user.json' });

  await browser.close();
}

export default globalSetup;
