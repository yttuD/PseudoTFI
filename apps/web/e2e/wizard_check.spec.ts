import { test, expect } from '@playwright/test';

test('Verificar alineación y ausencia de solapamiento en SearchWizard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile redirige al catálogo nativo según diseño de landing');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/es');
  
  const wizard = page.locator('[data-testid="search-wizard"]');
  await expect(wizard).toBeVisible();
  
  const measurements = await page.evaluate(() => {
    const wizardEl = document.querySelector('[data-testid="search-wizard"]');
    const grid = wizardEl?.querySelector('.grid');
    if (!grid) return null;
    
    const items = Array.from(grid.children).map((el, i) => {
      const rect = el.getBoundingClientRect();
      const triggerOrInput = el.querySelector('input, button');
      const innerRect = triggerOrInput ? triggerOrInput.getBoundingClientRect() : null;
      return {
        index: i,
        outer: { x: rect.x, y: rect.y, width: rect.width, right: rect.right },
        inner: innerRect ? { x: innerRect.x, y: innerRect.y, width: innerRect.width, right: innerRect.right } : null,
        text: el.textContent?.trim() || ''
      };
    });
    
    const gaps = [];
    for (let i = 0; i < items.length - 1; i++) {
      const curr = items[i];
      const next = items[i + 1];
      const currRight = curr.inner ? curr.inner.right : curr.outer.right;
      const nextLeft = next.inner ? next.inner.x : next.outer.x;
      gaps.push({
        pair: `${i} -> ${i+1}`,
        gap: nextLeft - currRight,
        overlaps: currRight > nextLeft
      });
    }
    
    return { items, gaps };
  });

  console.log('MEASUREMENTS:', JSON.stringify(measurements, null, 2));
  
  // Guardar screenshot del wizard para evidencia visual
  await wizard.screenshot({ path: 'C:/Users/carlo/.gemini/antigravity-ide/brain/17fab217-4928-45e8-a655-68c6616d4180/wizard_fixed.png' });
  
  // Aserciones formales: no debe haber ningún solapamiento entre columnas
  expect(measurements).not.toBeNull();
  measurements?.gaps.forEach((g) => {
    expect(g.overlaps).toBe(false);
    expect(g.gap).toBeGreaterThanOrEqual(5); // gap mínimo de 5px
  });
});
