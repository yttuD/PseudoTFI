import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';
function cookie() {
  const id = '11111111-1111-1111-1111-111111111111';
  const token = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,accessContext:{actor:'gestor',ownerOnly:true,capabilities:['*']}})).toString('base64url')}.test`;
  return {name:'sb-localhost-auth-token',value:`base64-${Buffer.from(JSON.stringify({access_token:token,user:{id,email:'gestor@example.invalid',user_metadata:{role:'gestor'}}})).toString('base64')}`,domain:'localhost',path:'/'};
}
test.describe('UX-001: rental modality is an accessible mobile touch target',()=>{
  test.beforeAll(async()=>{await startMockApiServer(3001)});
  test.afterAll(async()=>{await stopMockApiServer()});
  test('each modality has a 44px touch target, selected state and keyboard activation',async({page,context})=>{
    await context.clearCookies(); await context.addCookies([cookie()]);
    await page.goto('/es/alquileres'); await page.getByTestId('btn-nuevo-alquiler').click();
    const buttons=['Mensual','Diaria','Por Hora'].map(name=>page.getByRole('button',{name,exact:true}));
    for(const button of buttons){
      await expect(button).toBeVisible();
      const bounds=await button.boundingBox();
      expect(bounds?.height||0).toBeGreaterThanOrEqual(43.5);
    }
    await expect(buttons[0]).toHaveAttribute('aria-pressed','true');
    await buttons[1].focus();await buttons[1].press('Enter');
    await expect(buttons[1]).toHaveAttribute('aria-pressed','true');
    await expect(buttons[0]).toHaveAttribute('aria-pressed','false');
    await buttons[2].focus();await buttons[2].press('Space');
    await expect(buttons[2]).toHaveAttribute('aria-pressed','true');
  });
});
