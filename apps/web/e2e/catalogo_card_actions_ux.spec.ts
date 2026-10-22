import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';
import { whatsappDestination, whatsappContactUrl } from '../src/lib/whatsapp-link';

test.describe('UX-001: card navigation and favorite are separate accessible actions', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('a card offers keyboard access to details and favorites, without nested interactive elements', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades');
    const first = page.getByTestId('unit-card').first();
    await expect(first).toBeVisible();
    const detail = first.getByTestId('unit-card-detail-link');
    await expect(detail).toHaveAttribute('href', /\/es\/unidades\//);
    await expect(detail).toHaveAccessibleName(/Departamento 2 Ambientes/);
    const favorite = first.getByRole('button', { name: 'Guardar en favoritos' });
    await expect(favorite).toBeVisible();
    await expect(detail.locator('button')).toHaveCount(0);
    await detail.focus();
    await expect(detail).toBeFocused();
    await favorite.focus();
    await expect(favorite).toBeFocused();
    // The separate favorite button is above the full-card clickable overlay.
    const hitTargetIsFavorite = await favorite.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit != null && el.contains(hit);
    });
    expect(hitTargetIsFavorite).toBe(true);
    await detail.click();
    await expect(page).toHaveURL(/\/es\/unidades\/a0000000-0000-0000-0000-000000000001/);
  });
});


test.describe('UX-001: WhatsApp contact links are valid and single-focus controls', () => {
  test('country prefixes and messages are normalized only when unambiguous', () => {
    expect(whatsappDestination('+54 9 3777 123456')).toBe('5493777123456');
    expect(whatsappDestination('5493777123456')).toBe('5493777123456');
    expect(whatsappDestination('005493777123456')).toBe('5493777123456');
    expect(whatsappDestination('3777123456')).toBe('543777123456');
    expect(whatsappDestination('+55 11 98765 4321')).toBe('5511987654321');
    expect(whatsappDestination('5511987654321')).toBe('5511987654321');
    expect(whatsappDestination('abc')).toBeNull();
    expect(whatsappDestination('')).toBeNull();
    expect(whatsappDestination('++++5493777123456')).toBeNull();
    expect(whatsappContactUrl('+5493777123456', 'Hola, ¿está disponible?'))
      .toContain('https://wa.me/5493777123456?text=');
  });

  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('contact number with 54 country prefix does not become 5454 and the CTA is a link', async ({ page, context }) => {
    const id = '11111111-1111-1111-1111-111111111111';
    const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({
      sub: id, accessContext: { actor: 'gestor', ownerOnly: true, capabilities: ['*'] },
    })).toString('base64url')}.synthetic`;
    await context.clearCookies();
    await context.addCookies([{
      name: 'sb-localhost-auth-token',
      value: `base64-${Buffer.from(JSON.stringify({
        access_token: token, user: { id, email: 'qa@example.invalid', user_metadata: { role: 'gestor' } },
      })).toString('base64')}`,
      domain: 'localhost', path: '/',
    }]);
    await page.goto('/es/unidades/a0000000-0000-0000-0000-000000000001');
    const contact = page.getByRole('link', { name: 'Contactar por WhatsApp' });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute('href', /^https:\/\/wa\.me\/5493777123456\?text=/);
    await expect(contact).toHaveAttribute('rel', /noopener noreferrer/);
    await expect(contact.locator('button')).toHaveCount(0);
    await contact.focus();
    await expect(contact).toBeFocused();
  });
});
