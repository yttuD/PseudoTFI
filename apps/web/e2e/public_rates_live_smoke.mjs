// Browser-only read-only production verification. Never send credentials or mutate data.
import { chromium, expect } from '@playwright/test';

const origin = 'https://rendo-beta-web.vercel.app';
const api = 'https://rendo-beta-api.vercel.app';
const result = await fetch(api + '/marketplace/unidades?locale=es&limit=50&q=CASA%20Zona%20norte', {
  method: 'GET', signal: AbortSignal.timeout(20000), cache: 'no-store',
});
if (result.status !== 200) throw new Error('Public listing lookup HTTP ' + result.status);
const json = await result.json();
const rows = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
const matches = rows.filter(x => String(x.titulo || '').toLowerCase().trim() === 'casa zona norte');
if (matches.length !== 1) throw new Error('Public listing ambiguity: count=' + matches.length);
const id = matches[0].id;
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    try {
      const response = await page.goto(origin + '/es/unidades/' + encodeURIComponent(id), { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (response?.status() !== 200) throw new Error('Detail HTTP ' + response?.status());
      const offers = page.locator('li').filter({ has: page.getByTestId('public-tariff-minimum') });
      await expect(offers).toHaveCount(5, { timeout: 20000 });
      await expect(offers.filter({ hasText: 'Estadía mínima: 3 noches' })).toHaveCount(1);
      await expect(offers.filter({ hasText: 'Plazo mínimo: 1 mes' })).toHaveCount(2);
      await expect(offers.filter({ hasText: 'Reserva mínima: 1 hora' })).toHaveCount(1);
      const prices = await offers.allTextContents();
      if (prices.filter(x => x.includes('45.000,00')).length !== 1) throw new Error('Expected one visible $45.000/daily offer');
      if (!prices.some(x => x.includes('25.000,00') && x.includes('3 noches'))) throw new Error('Unique 3-night offer missing');
      if (!prices.some(x => x.includes('250.005,00')) || !prices.some(x => x.includes('250.000,00'))) throw new Error('Distinct monthly options missing');
      await page.getByRole('tab', { name: 'Modalidades de Cobro' }).click();
      await expect(page.getByRole('tabpanel').getByTestId('public-tariff-minimum')).toHaveCount(5);
      console.log('PUBLIC_UI_PASS width=' + width + ' five offers and clear minimum terms; exact duplicate suppressed');
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
