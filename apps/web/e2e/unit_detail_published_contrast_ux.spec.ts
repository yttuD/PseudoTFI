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
});
