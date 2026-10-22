import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function linear(v:number) {
  const x = v / 255;
  return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
}
function luminance(str:string) {
  const rgb = str.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number);
  if (!rgb || rgb.length !== 3) throw Error(`Invalid computed color: ${str}`);
  return .2126 * linear(rgb[0]) + .7152 * linear(rgb[1]) + .0722 * linear(rgb[2]);
}

test.describe('UX-001: published listing state stays readable inside the detail panel', () => {
  test.beforeAll(async() => { await startMockApiServer(3001); });
  test.afterAll(async() => { await stopMockApiServer(); });

  test('desktop and mobile: publication status has WCAG AA text contrast in both themes', async ({page,context}) => {
    await context.clearCookies();
    await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001');
    const badge=page.getByTestId('unit-detail-published-badge');
    await expect(badge).toContainText('Unidad publicada');
    const axePath=process.env.AXE_SCRIPT_PATH;
    if (!axePath) throw Error('Pinned axe engine required for WCAG detail audit');
    await page.addScriptTag({path:axePath});
    for (const theme of ['light','dark']) {
      await page.evaluate((value) => document.documentElement.classList.toggle('dark', value==='dark'),theme);
      await page.waitForTimeout(350);
      const color=await badge.evaluate(el=> {
        const style=getComputedStyle(el);
        return {fg:style.color,bg:style.backgroundColor};
      });
      expect(color.bg).toMatch(/^rgb\(/);
      const [hi,lo]=[luminance(color.fg),luminance(color.bg)].sort((a,b)=>b-a);
      expect((hi+.05)/(lo+.05),`Contrast for ${theme}`).toBeGreaterThanOrEqual(4.5);
      const violations = await page.evaluate(async()=>{
        const engine = (window as Window & { axe?: {
          run: (doc:Document,options:object)=>Promise<{violations:Array<{
            id:string,impact:string,nodes:Array<{target:string[]}>
          }>}>
        }}).axe;
        if (!engine) throw Error('axe not injected');
        const result = await engine.run(document,{
          runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}
        });
        return result.violations.filter(v=>v.impact==='serious'||v.impact==='critical')
          .map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,targets:v.nodes.slice(0,2).map(n=>n.target)}));
      });
      console.log(`AXE_UNIT_DETAIL ${theme}: ${JSON.stringify(violations)}`);
      expect(violations,`WCAG detail page ${theme}`).toEqual([]);
    }
  });

  test('tablist exposes its panel, supports arrow keys and restores roving focus', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001');
    const list = page.getByRole('tablist').first();
    const tabs = list.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    const first = tabs.nth(0);
    const second = tabs.nth(1);
    const last = tabs.nth(2);
    const panel = page.getByRole('tabpanel').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('tabindex', '0');
    await expect(second).toHaveAttribute('tabindex', '-1');

    await first.focus();
    await first.press('ArrowRight');
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(first).toHaveAttribute('tabindex', '-1');
    await expect(panel).toHaveAttribute('aria-labelledby', await second.getAttribute('id') || '');
    await expect(second).toHaveAttribute('aria-controls', await panel.getAttribute('id') || '');

    await second.press('End');
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute('aria-selected', 'true');
    await last.press('Home');
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('aria-selected', 'true');
  });

});


test.describe('UX-001: published prices are unique by actual contract terms', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  for (const [locale, expectedNight, expectedMonths, expectedHours] of [
    ['es', 'Estadía mínima: 3 noches', 'Plazo mínimo: 1 mes', 'Reserva mínima: 1 hora'],
    ['en', 'Minimum stay: 3 nights', 'Minimum term: 1 month', 'Minimum booking: 1 hour'],
    ['pt', 'Estadia mínima: 3 noites', 'Prazo mínimo: 1 mês', 'Reserva mínima: 1 hora'],
  ] as const) {
    test(`${locale}: all seven historical rows become five visible distinct offers in sidebar and pricing tab`, async ({ page, context }) => {
      await context.clearCookies();
      await page.goto(`/${locale}/unidades/a0000000-0000-0000-0000-000000000099`);
      const offers = page.locator('li').filter({ has: page.getByTestId('public-tariff-minimum') });
      await expect(offers).toHaveCount(5);
      await expect(offers.filter({ hasText: expectedNight })).toHaveCount(1);
      await expect(offers.filter({ hasText: expectedMonths })).toHaveCount(2);
      await expect(offers.filter({ hasText: expectedHours })).toHaveCount(1);
      // Identical 45K/1-night rows display only once; 25K/3-night is not lost.
      await expect(offers.filter({ hasText: expectedNight })).toHaveCount(1);
      await page.getByRole('tab', { name: /Modalidades|Pricing|Cobrança/i }).click();
      await expect(page.getByRole('tabpanel').getByTestId('public-tariff-minimum')).toHaveCount(5);
      await expect(page.getByRole('tabpanel')).toContainText(expectedNight);
    });
  }
});

test('tariff presentation dedupes exact tuples only, preserving different minimum stays, monthly amounts and alternate currencies', async () => {
  const { uniquePublicTariffs } = await import('../src/lib/public-tariffs');
  const examples = [
    { id: '1', unidad_tiempo: 'día', cantidad_tiempo: 1, precio: 45000, precio_usd: null, precio_brl: null },
    { id: '2', unidad_tiempo: 'día', cantidad_tiempo: 1, precio: 45000, precio_usd: null, precio_brl: null },
    { id: '3', unidad_tiempo: 'día', cantidad_tiempo: 3, precio: 45000, precio_usd: null, precio_brl: null },
    { id: '4', unidad_tiempo: 'mes', cantidad_tiempo: 1, precio: 250000, precio_usd: null, precio_brl: null },
    { id: '5', unidad_tiempo: 'mes', cantidad_tiempo: 1, precio: 250005, precio_usd: null, precio_brl: null },
    { id: '6', unidad_tiempo: 'mes', cantidad_tiempo: 1, precio: 250005, precio_usd: 250, precio_brl: null },
  ];
  const original = JSON.stringify(examples);
  expect(uniquePublicTariffs(examples).map(x => x.id)).toEqual(['1', '3', '4', '5', '6']);
  expect(JSON.stringify(examples)).toBe(original);
});
