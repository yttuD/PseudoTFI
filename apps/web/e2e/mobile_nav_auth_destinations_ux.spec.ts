import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

function cookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  return {
    name:'sb-localhost-auth-token',
    value:`base64-${Buffer.from(JSON.stringify({
      access_token:'local-synthetic-manager',
      user:{id,email:'manager@example.invalid',user_metadata:{role:'gestor',full_name:'Test Manager'}},
    })).toString('base64')}`,
    domain:'localhost',path:'/',
  };
}

test.describe('UX-001: manager mobile navigation goes to tasks rather than registration', () => {
  test.beforeAll(async () => { await startMockApiServer(3001); });
  test.afterAll(async () => { await stopMockApiServer(); });

  test('guest sees public portal destinations while manager reaches tasks directly', async ({ page, context }, info) => {
    test.skip(!info.project.name.includes('mobile'), 'Dedicated mobile navigation behavior');
    await context.clearCookies();
    await page.goto('/es/unidades');
    const nav = page.getByRole('navigation',{name:'Navegación principal móvil'});
    const publish=nav.getByRole('link',{name:'Publicar'});
    const managers=nav.getByRole('link',{name:'Gestores'});
    await expect(publish).toHaveAttribute('href','/es/auth/registro?portal=gestor');
    await expect(managers).toHaveAttribute('href','/es/auth/login?portal=gestor&next=/es/dashboard');
    await context.addCookies([cookie()]);
    await page.reload();
    await expect(publish).toHaveAttribute('href','/es/mis-unidades/nueva');
    await expect(managers).toHaveAttribute('href','/es/dashboard');
    await managers.focus();
    await expect(managers).toBeFocused();
  });
});
