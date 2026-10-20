import { test, expect } from '@playwright/test';

test.describe('Verificación de Correcciones Visuales (Testimonios, Logo Dark Mode, Selector de Idiomas)', () => {

  test('1. Testimonios: Marca de agua en fondo sin colisión y navegación funcional', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Testimonios web están en la landing comercial (suprimida en móvil por bypass nativo)');

    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    // Scroll hasta testimonios
    const testimonialSection = page.locator('section').filter({ hasText: /Lo que dicen|Testimonios/i }).first();
    await testimonialSection.scrollIntoViewIfNeeded();

    // Validar que el SVG con las comillas fue completamente eliminado
    const quoteSvg = testimonialSection.locator('path[d*="14.017"]');
    await expect(quoteSvg).toHaveCount(0);

    // Validar que el texto del testimonio esté presente y legible
    const quoteText = testimonialSection.locator('p.italic').first();
    await expect(quoteText).toBeVisible();
    const textContent = await quoteText.innerText();
    expect(textContent.length).toBeGreaterThan(10);

    // Validar navegación interactiva
    const nextBtn = testimonialSection.locator('button[aria-label*="Siguiente" i], button[aria-label*="Next" i]').first();
    await nextBtn.click();

    // Esperar la transición de Framer Motion
    await expect(testimonialSection.locator('p.italic').first()).not.toHaveText(textContent, { timeout: 5000 });
  });

  test('2. Logo Navbar: Adaptación adecuada para modo claro y oscuro', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navbar desktop está oculto en móvil (reemplazado por NativeHeader)');

    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    const logoLight = page.locator('header img[alt="Rendo"], header img[alt="RENDA"]').first();
    await expect(logoLight).toBeVisible();

    const toggleButton = page.locator('button[aria-label*="modo" i], button[aria-label*="theme" i]').first();
    await expect(toggleButton).toBeVisible();

    // Conmutar tema
    await toggleButton.click();
    await page.waitForTimeout(400);

    // El logo en dark mode está operativo y visible
    const logoDark = page.locator('header img[alt="Rendo"]:visible, header img[alt="RENDA"]:visible').first();
    await expect(logoDark).toBeVisible();
  });

  test('3. Selector de Idioma Premium: Píldora interactiva y menú desplegable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navbar desktop está oculto en móvil (LanguageSelector móvil testeado en gestion_bento_nominatim.spec.ts)');

    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    const langTrigger = page.locator('button[aria-haspopup="listbox"]').first();
    await expect(langTrigger).toBeVisible();
    await expect(langTrigger).toContainText('ES');

    // Abrir dropdown
    await langTrigger.click();
    const listbox = page.locator('div[role="listbox"]');
    await expect(listbox).toBeVisible();

    // Verificar opciones con nombres completos
    await expect(listbox.getByRole('option', { name: /Español/i })).toBeVisible();
    const enOption = listbox.getByRole('option', { name: /English/i });
    await expect(enOption).toBeVisible();
    await expect(listbox.getByRole('option', { name: /Português/i })).toBeVisible();

    // Cambiar a inglés usando el Link
    await enOption.click();

    // Validar redirección a /en
    await expect(page).toHaveURL(/\/en/, { timeout: 5000 });
    await expect(page.locator('button[aria-haspopup="listbox"]').first()).toContainText('EN');
  });

});
