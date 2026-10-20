import { test, expect } from '@playwright/test';
import { BetaRealFixtureManager, TestUser } from './beta-real-fixtures';
import path from 'node:path';
import fs from 'node:fs';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CAPTURES_DIR = path.join(
  REPO_ROOT,
  'specs',
  '008-beta-observaciones-2026-10-02',
  'evidence',
  'N01',
  'captures'
);

test.describe('B007b — Inventario y Aislamiento Real Navegador', () => {
  let fixtures: BetaRealFixtureManager;
  let gestorA: TestUser;
  let gestorB: TestUser;
  let delReadOnly: TestUser;
  let unitA1Id: string;
  let unitA2Id: string;
  let unitA3Id: string;
  let unitB1Id: string;
  let grupoAId: string;
  let grupoBId: string;

  test.beforeAll(async () => {
    fixtures = new BetaRealFixtureManager();

    // 1. Crear Gestor A y Gestor B reales en Auth y users
    gestorA = await fixtures.createGestor('A');
    gestorB = await fixtures.createGestor('B');

    // Delegado en modo solo lectura para capturas de matriz visual
    delReadOnly = await fixtures.createDelegado(gestorA, 'VisualReadOnly', {
      permiso: 'ver',
      alcanceTipo: 'cuenta',
    });

    // 2. Sembrar datos de Gestor A (2 en grupo A, 1 sin grupo)
    grupoAId = await fixtures.seedGrupo(gestorA.id, 'Edificio Costanera A');
    unitA1Id = await fixtures.seedUnidad(gestorA.id, 'Depto A1 Vista al Rio', grupoAId, 'publicada', 'departamento');
    unitA2Id = await fixtures.seedUnidad(gestorA.id, 'Depto A2 Frente', grupoAId, 'publicada', 'departamento');
    unitA3Id = await fixtures.seedUnidad(gestorA.id, 'Cochera A3 Centro', null, 'publicada', 'cochera');

    // 3. Sembrar datos de Gestor B (1 en grupo B)
    grupoBId = await fixtures.seedGrupo(gestorB.id, 'Complejo B Goya');
    unitB1Id = await fixtures.seedUnidad(gestorB.id, 'Cabana Privada B1', grupoBId, 'publicada', 'casa');

    if (!fs.existsSync(CAPTURES_DIR)) {
      fs.mkdirSync(CAPTURES_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }, testInfo) => {
    const scheme = testInfo.project.use.colorScheme || 'light';
    await page.addInitScript((s) => {
      localStorage.setItem('theme', s);
    }, scheme);
  });

  test.afterAll(async () => {
    if (fixtures) {
      await fixtures.cleanup();
    }
  });

  test('Escenario 1: Aislamiento A/B con contextos separados y HTTP negatives @visual', async ({ browser }, testInfo) => {
    const contextOptions = {
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
      colorScheme: testInfo.project.use.colorScheme,
    };

    // 1. Contexto aislado Gestor A
    const contextA = await browser.newContext(contextOptions);
    await contextA.addInitScript((scheme) => {
      localStorage.setItem('theme', scheme || 'light');
    }, testInfo.project.use.colorScheme);

    try {
      const pageA = await contextA.newPage();
      await fixtures.loginViaUI(pageA, gestorA);
      await pageA.goto('/es/mis-unidades');
      await pageA.waitForLoadState('networkidle');

      // Verificaciones estrictas para Gestor A
      await expect(pageA.locator('text=Edificio Costanera A')).toBeVisible();
      await expect(pageA.locator('text=Depto A1 Vista al Rio')).toBeVisible();
      await expect(pageA.locator('text=Depto A2 Frente')).toBeVisible();
      await expect(pageA.locator('text=Cochera A3 Centro')).toBeVisible();

      // Gestor A jamás debe ver unidades ni grupos de Gestor B
      await expect(pageA.locator('text=Complejo B Goya')).not.toBeVisible();
      await expect(pageA.locator('text=Cabana Privada B1')).not.toBeVisible();
      await expect(pageA.locator('text=Mostrando 3 de 3 unidades autorizadas')).toBeVisible();

      // Asertar viewport y clase theme reales antes de captura
      const expectedWidthA = testInfo.project.use.viewport?.width;
      if (expectedWidthA !== undefined) {
        expect(pageA.viewportSize()?.width).toBe(expectedWidthA);
      }
      if (testInfo.project.use.colorScheme === 'dark') {
        await expect(pageA.locator('html')).toHaveClass(/dark/);
      } else {
        await expect(pageA.locator('html')).not.toHaveClass(/dark/);
      }

      // Captura post-login en vista Bento por defecto
      const capNameA = `${testInfo.project.name}_gestorA_inventario.png`;
      await pageA.screenshot({ path: path.join(CAPTURES_DIR, capNameA) });

      // Captura de tabla con selector de rol real
      const tableToggleBtn = pageA.getByRole('button', { name: 'Tabla Clásica' });
      await expect(tableToggleBtn).toBeVisible();
      await tableToggleBtn.click();
      await expect(pageA.getByRole('table')).toBeVisible();

      const capTableA = `${testInfo.project.name}_gestorA_tabla.png`;
      await pageA.screenshot({ path: path.join(CAPTURES_DIR, capTableA) });

      // Direct HTTP Negatives: Gestor A intenta mutar recurso de Gestor B por API directa (3201)
      const directApiUrl = 'http://127.0.0.1:3201';
      const patchRes = await fetch(`${directApiUrl}/unidades/${unitB1Id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${gestorA.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ titulo_es: 'Ataque Gestor A sobre B' }),
      });
      expect([403, 404]).toContain(patchRes.status);

      // Verificar que la DB de Gestor B quedó intacta
      const { data: dbB1, error: errB1 } = await fixtures.adminClient
        .from('unidades')
        .select('titulo_es')
        .eq('id', unitB1Id)
        .single();
      expect(errB1).toBeNull();
      expect(dbB1?.titulo_es).toBe('Cabana Privada B1');
    } finally {
      await contextA.close();
    }

    // 2. Contexto completamente nuevo y aislado para Gestor B
    const contextB = await browser.newContext(contextOptions);
    await contextB.addInitScript((scheme) => {
      localStorage.setItem('theme', scheme || 'light');
    }, testInfo.project.use.colorScheme);

    try {
      const pageB = await contextB.newPage();
      await fixtures.loginViaUI(pageB, gestorB);
      await pageB.goto('/es/mis-unidades');
      await pageB.waitForLoadState('networkidle');

      // Gestor B solo debe ver sus propios datos
      await expect(pageB.locator('text=Complejo B Goya')).toBeVisible();
      await expect(pageB.locator('text=Cabana Privada B1')).toBeVisible();
      await expect(pageB.locator('text=Edificio Costanera A')).not.toBeVisible();
      await expect(pageB.locator('text=Depto A1 Vista al Rio')).not.toBeVisible();
      await expect(pageB.locator('text=Mostrando 1 de 1 unidades autorizadas')).toBeVisible();

      // Asertar viewport y clase theme reales antes de captura
      const expectedWidthB = testInfo.project.use.viewport?.width;
      if (expectedWidthB !== undefined) {
        expect(pageB.viewportSize()?.width).toBe(expectedWidthB);
      }
      if (testInfo.project.use.colorScheme === 'dark') {
        await expect(pageB.locator('html')).toHaveClass(/dark/);
      } else {
        await expect(pageB.locator('html')).not.toHaveClass(/dark/);
      }

      const capNameB = `${testInfo.project.name}_gestorB_inventario.png`;
      await pageB.screenshot({ path: path.join(CAPTURES_DIR, capNameB) });
    } finally {
      await contextB.close();
    }
  });

  test('Escenario 1b: Capturas de tabla y modo solo lectura en matriz @visual', async ({ browser }, testInfo) => {
    const contextOptions = {
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
      colorScheme: testInfo.project.use.colorScheme,
    };
    const contextRO = await browser.newContext(contextOptions);
    await contextRO.addInitScript((scheme) => {
      localStorage.setItem('theme', scheme || 'light');
    }, testInfo.project.use.colorScheme);

    try {
      const pageRO = await contextRO.newPage();
      await fixtures.loginViaUI(pageRO, delReadOnly);
      await pageRO.goto('/es/mis-unidades');
      await pageRO.waitForLoadState('networkidle');

      // Validar dimensiones exactas y clase dark
      const expectedWidth = testInfo.project.use.viewport?.width;
      if (expectedWidth !== undefined) {
        expect(pageRO.viewportSize()?.width).toBe(expectedWidth);
      }
      if (testInfo.project.use.colorScheme === 'dark') {
        await expect(pageRO.locator('html')).toHaveClass(/dark/);
      } else {
        await expect(pageRO.locator('html')).not.toHaveClass(/dark/);
      }

      // Validar badge de solo lectura y ratio de contraste WCAG AA (>= 4.5:1)
      const badgeLocator = pageRO.locator('[data-testid="readonly-badge"]');
      await expect(badgeLocator).toBeVisible();

      const contrastResult = await badgeLocator.evaluate((el) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D context not available');

        const parseCssColor = (cssColor: string): [number, number, number, number] => {
          if (!cssColor || !CSS.supports('color', cssColor)) {
            throw new Error(`Color CSS inválido o no soportado: "${cssColor}"`);
          }
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = cssColor;
          ctx.fillRect(0, 0, 1, 1);
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
        };

        const composite = (
          under: [number, number, number, number],
          over: [number, number, number, number]
        ): [number, number, number, number] => {
          const [ru, gu, bu, au] = under;
          const [ro, go, bo, ao] = over;
          const aOut = ao + au * (1 - ao);
          if (aOut === 0) return [0, 0, 0, 0];
          const rOut = Math.round((ro * ao + ru * au * (1 - ao)) / aOut);
          const gOut = Math.round((go * ao + gu * au * (1 - ao)) / aOut);
          const bOut = Math.round((bo * ao + bu * au * (1 - ao)) / aOut);
          return [rOut, gOut, bOut, aOut];
        };

        const ancestors: Element[] = [];
        let curr: Element | null = el;
        while (curr) {
          ancestors.unshift(curr);
          curr = curr.parentElement;
        }

        for (const node of ancestors) {
          const s = window.getComputedStyle(node);
          if (s.backgroundImage && s.backgroundImage !== 'none') {
            throw new Error(`Medición no soportada: background-image presente en <${node.tagName.toLowerCase()}>`);
          }
          const op = parseFloat(s.opacity);
          if (!isNaN(op) && op < 0.999) {
            throw new Error(`Medición no soportada: opacity < 1 (${s.opacity}) en <${node.tagName.toLowerCase()}>`);
          }
          if (s.mixBlendMode && s.mixBlendMode !== 'normal') {
            throw new Error(`Medición no soportada: mix-blend-mode (${s.mixBlendMode}) en <${node.tagName.toLowerCase()}>`);
          }
          if (s.filter && s.filter !== 'none') {
            throw new Error(`Medición no soportada: filter (${s.filter}) en <${node.tagName.toLowerCase()}>`);
          }
        }

        let bgComposited: [number, number, number, number] = [0, 0, 0, 0];
        for (const node of ancestors) {
          const s = window.getComputedStyle(node);
          if (s.backgroundColor) {
            const parsed = parseCssColor(s.backgroundColor);
            if (parsed[3] > 0) {
              bgComposited = composite(bgComposited, parsed);
            }
          }
        }

        if (bgComposited[3] < 0.99) {
          throw new Error(`Fondo efectivo no es opaco (alpha: ${bgComposited[3]})`);
        }

        const fgRaw = window.getComputedStyle(el).color;
        const fgParsed = parseCssColor(fgRaw);
        if (fgParsed[3] < 0.05) {
          throw new Error(`Foreground transparente o invisible`);
        }
        const fgFinal = composite(bgComposited, fgParsed);

        const toLinear = (c: number) => {
          const s = c / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };

        const getLuminance = (r: number, g: number, b: number) =>
          0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

        const lFg = getLuminance(fgFinal[0], fgFinal[1], fgFinal[2]);
        const lBg = getLuminance(bgComposited[0], bgComposited[1], bgComposited[2]);
        const lighter = Math.max(lFg, lBg);
        const darker = Math.min(lFg, lBg);
        const ratio = (lighter + 0.05) / (darker + 0.05);

        return {
          contrastRatio: ratio,
          fgColor: `rgba(${fgFinal[0]}, ${fgFinal[1]}, ${fgFinal[2]}, ${fgFinal[3]})`,
          bgColor: `rgba(${bgComposited[0]}, ${bgComposited[1]}, ${bgComposited[2]}, ${bgComposited[3]})`,
        };
      });

      // Guardar artifact JSON de contraste por proyecto (sin datos de sesión)
      const contrastArtifactPath = path.join(CAPTURES_DIR, `${testInfo.project.name}_contrast.json`);
      fs.writeFileSync(
        contrastArtifactPath,
        JSON.stringify(
          {
            project: testInfo.project.name,
            colorScheme: testInfo.project.use.colorScheme || 'light',
            contrastRatio: contrastResult.contrastRatio,
            fgColor: contrastResult.fgColor,
            bgColor: contrastResult.bgColor,
            threshold: 4.5,
            pass: contrastResult.contrastRatio >= 4.5,
          },
          null,
          2
        ),
        'utf-8'
      );

      expect(contrastResult.contrastRatio).toBeGreaterThanOrEqual(4.5);

      // Captura de vista Bento en modo solo lectura
      const capROBento = `${testInfo.project.name}_readonly_bento.png`;
      await pageRO.screenshot({ path: path.join(CAPTURES_DIR, capROBento) });

      // Conmutar a vista Tabla Clásica con selector de rol real
      const tableToggleBtn = pageRO.getByRole('button', { name: 'Tabla Clásica' });
      await expect(tableToggleBtn).toBeVisible();
      await tableToggleBtn.click();

      // Verificar tabla y texto de Solo lectura por fila con selector real
      await expect(pageRO.getByRole('table')).toBeVisible();
      await expect(pageRO.locator('text=Solo lectura').first()).toBeVisible();

      // Captura de vista Tabla en modo solo lectura
      const capROTable = `${testInfo.project.name}_readonly_tabla.png`;
      await pageRO.screenshot({ path: path.join(CAPTURES_DIR, capROTable) });
    } finally {
      await contextRO.close();
    }
  });

  test('Escenario 2: Matriz completa de alcances de Delegado (cuenta, grupo, IDs, pending, revoked) @auth', async ({ browser }, testInfo) => {
    const contextOptions = {
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
      colorScheme: testInfo.project.use.colorScheme,
    };
    const directApiUrl = 'http://127.0.0.1:3201';

    // 2.1 Delegado gestionar/cuenta: puede crear unidad y grupo
    const delGestionarCuenta = await fixtures.createDelegado(gestorA, 'GestCuenta', {
      permiso: 'gestionar',
      alcanceTipo: 'cuenta',
    });
    const ctx1 = await browser.newContext(contextOptions);
    try {
      const p1 = await ctx1.newPage();
      await fixtures.loginViaUI(p1, delGestionarCuenta);
      await expect(p1.locator('a:has-text("Nueva Unidad")').first()).toBeVisible();
      await expect(p1.locator('button:has-text("Crear Nuevo Grupo")')).toBeVisible();
    } finally {
      await ctx1.close();
    }

    // 2.2 Delegado gestionar/grupo: puede crear unidad en su grupo, pero NO crear grupos
    const delGestionarGrupo = await fixtures.createDelegado(gestorA, 'GestGrupo', {
      permiso: 'gestionar',
      alcanceTipo: 'grupo',
      grupoId: grupoAId,
    });
    const ctx2 = await browser.newContext(contextOptions);
    try {
      const p2 = await ctx2.newPage();
      await fixtures.loginViaUI(p2, delGestionarGrupo);
      await expect(p2.locator('a:has-text("Nueva Unidad")').first()).toBeVisible();
      await expect(p2.locator('button:has-text("Crear Nuevo Grupo")')).not.toBeVisible();

      // Direct HTTP Negative: intentar mutar unidad fuera de grupo A (unitA3)
      const forbiddenPatch = await fetch(`${directApiUrl}/unidades/${unitA3Id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${delGestionarGrupo.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ titulo_es: 'Mutacion no permitida' }),
      });
      expect([403, 404]).toContain(forbiddenPatch.status);

      const { data: dbA3 } = await fixtures.adminClient.from('unidades').select('titulo_es').eq('id', unitA3Id).single();
      expect(dbA3?.titulo_es).toBe('Cochera A3 Centro');
    } finally {
      await ctx2.close();
    }

    // 2.3 Delegado gestionar/unidades (IDs explícitos): SOLO ve y edita unitA1; A2, A3 y B1 ausentes; crear prohibido
    const delGestionarUnidades = await fixtures.createDelegado(gestorA, 'GestUnidades', {
      permiso: 'gestionar',
      alcanceTipo: 'unidades',
      unidadIds: [unitA1Id],
    });
    const ctxIDs = await browser.newContext(contextOptions);
    try {
      const pIDs = await ctxIDs.newPage();
      await fixtures.loginViaUI(pIDs, delGestionarUnidades);
      await pIDs.goto('/es/mis-unidades');
      await pIDs.waitForLoadState('networkidle');

      // Exact allowed visible con acción editar disponible
      await expect(pIDs.locator('text=Depto A1 Vista al Rio')).toBeVisible();
      await expect(pIDs.locator(`a[href*="/mis-unidades/${unitA1Id}/editar"]`).first()).toBeVisible();

      // Recursos no permitidos ausentes
      await expect(pIDs.locator('text=Depto A2 Frente')).not.toBeVisible();
      await expect(pIDs.locator('text=Cochera A3 Centro')).not.toBeVisible();
      await expect(pIDs.locator('text=Cabana Privada B1')).not.toBeVisible();

      // Botones de creación prohibidos
      await expect(pIDs.locator('a:has-text("Nueva Unidad")')).not.toBeVisible();
      await expect(pIDs.locator('button:has-text("Crear Nuevo Grupo")')).not.toBeVisible();

      // HTTP negative: intentar editar unitA2
      const forbiddenIdPatch = await fetch(`${directApiUrl}/unidades/${unitA2Id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${delGestionarUnidades.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ titulo_es: 'Mutacion prohibida por scope IDs' }),
      });
      expect([403, 404]).toContain(forbiddenIdPatch.status);

      const { data: dbA2 } = await fixtures.adminClient.from('unidades').select('titulo_es').eq('id', unitA2Id).single();
      expect(dbA2?.titulo_es).toBe('Depto A2 Frente');
    } finally {
      await ctxIDs.close();
    }

    // 2.4 Delegado ver/cuenta: modo solo lectura obligatorio
    const delVer = await fixtures.createDelegado(gestorA, 'VerCuenta', {
      permiso: 'ver',
      alcanceTipo: 'cuenta',
    });
    const ctx3 = await browser.newContext(contextOptions);
    try {
      const p3 = await ctx3.newPage();
      await fixtures.loginViaUI(p3, delVer);
      await expect(p3.locator('[data-testid="readonly-badge"]')).toBeVisible();
      await expect(p3.locator('a:has-text("Nueva Unidad")')).not.toBeVisible();
      await expect(p3.locator('button:has-text("Crear Nuevo Grupo")')).not.toBeVisible();
      await expect(p3.locator('a:has-text("Editar")')).not.toBeVisible();
    } finally {
      await ctx3.close();
    }

    // 2.5 Delegado pendiente de configuración: muestra banner de restricción
    const delPending = await fixtures.createDelegado(gestorA, 'PendingConfig', {
      skipConfigure: true,
    });
    const ctx4 = await browser.newContext(contextOptions);
    try {
      const p4 = await ctx4.newPage();
      await fixtures.loginViaUI(p4, delPending, { next: '/dashboard', expectedUrlPattern: /\/dashboard/ });
      await expect(p4.locator('[data-testid="banner-pendiente-configuracion"]')).toBeVisible();
    } finally {
      await ctx4.close();
    }

    // 2.6 Revocación: vuelve a cuenta propia sin acceso al antiguo workspace.
    const delRevoked = await fixtures.createDelegado(gestorA, 'Revocado', {
      permiso: 'ver',
      alcanceTipo: 'cuenta',
      revoke: true,
    });
    const ctx5 = await browser.newContext(contextOptions);
    try {
      const p5 = await ctx5.newPage();
      await fixtures.loginViaUI(p5, delRevoked, { next: '/dashboard', expectedUrlPattern: /\/dashboard/ });

      const profile = await fixtures.adminClient.from('users')
        .select('rol, workspace_id').eq('id', delRevoked.id).single();
      expect(profile.error).toBeNull();
      expect(profile.data).toEqual({ rol: 'gestor', workspace_id: null });
      const relationship = await fixtures.adminClient.from('delegaciones')
        .select('estado').eq('gestor_id', gestorA.id)
        .eq('delegado_id', delRevoked.id).single();
      expect(relationship.error).toBeNull();
      expect(relationship.data?.estado).toBe('revocada');

      const headers = { Authorization: `Bearer ${delRevoked.accessToken}` };
      const accessResponse = await fetch(`${directApiUrl}/delegados/contexto`, { headers });
      expect(accessResponse.status).toBe(200);
      expect(await accessResponse.json()).toMatchObject({ actor: 'gestor', ownerOnly: true });
      const inventoryResponse = await fetch(`${directApiUrl}/unidades`, { headers });
      expect(inventoryResponse.status).toBe(200);
      expect(await inventoryResponse.json()).toMatchObject({ data: [], count: 0 });
      const groupsResponse = await fetch(`${directApiUrl}/grupos`, { headers });
      expect(groupsResponse.status).toBe(200);
      expect(await groupsResponse.json()).toEqual([]);

      const oldDetail = await fetch(`${directApiUrl}/unidades/${unitA1Id}`, { headers });
      expect([403, 404]).toContain(oldDetail.status);
      const oldMutation = await fetch(`${directApiUrl}/unidades/${unitA1Id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo_es: 'Intento después de revocación' }),
      });
      expect([403, 404]).toContain(oldMutation.status);
      const original = await fixtures.adminClient.from('unidades')
        .select('titulo_es').eq('id', unitA1Id).single();
      expect(original.error).toBeNull();
      expect(original.data?.titulo_es).toBe('Depto A1 Vista al Rio');

      await p5.goto('/es/mis-unidades');
      await expect(p5.getByTestId('inventory-empty')).toBeVisible();
      await expect(p5.getByText('Mostrando 0 de 0 unidades autorizadas en 0 grupos', { exact: true })).toBeVisible();
      for (const forbiddenName of [
        'Depto A1 Vista al Rio', 'Depto A2 Frente', 'Cochera A3 Centro',
        'Cabana Privada B1', 'Edificio Costanera A', 'Complejo B Goya',
      ]) {
        await expect(p5.getByText(forbiddenName, { exact: true })).not.toBeVisible();
      }
    } finally {
      await ctx5.close();
    }
  });

  test('Inventario vacío localizado sin overflow @empty @visual', async ({ page }, testInfo) => {
    const emptyOwner = await fixtures.createGestor(`Empty_${testInfo.project.name}`);
    await fixtures.loginViaUI(page, emptyOwner);
    const locales = [
      { code: 'es', title: 'Inventario Vacío', count: 'Mostrando 0 de 0 unidades autorizadas en 0 grupos', register: 'Registrar Unidad' },
      { code: 'en', title: 'Empty inventory', count: 'Showing 0 of 0 authorized units across 0 groups', register: 'Register unit' },
      { code: 'pt', title: 'Inventário vazio', count: 'Exibindo 0 de 0 unidades autorizadas em 0 grupos', register: 'Cadastrar unidade' },
    ];
    for (const locale of locales) {
      await page.goto(`/${locale.code}/mis-unidades`);
      await page.waitForLoadState('networkidle');
      const emptyState = page.getByTestId('inventory-empty');
      await expect(emptyState).toBeVisible();
      await expect(emptyState.getByRole('heading', { name: locale.title, exact: true })).toBeVisible();
      await expect(emptyState.getByText(locale.count, { exact: true })).toBeVisible();
      const register = emptyState.getByRole('link', { name: locale.register, exact: true });
      await expect(register).toBeVisible();
      await expect(register).toHaveAttribute('href', `/${locale.code}/mis-unidades/nueva`);
      expect((await register.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(page.viewportSize()?.width).toBe(testInfo.project.use.viewport?.width);
      if (testInfo.project.use.colorScheme === 'dark') {
        await expect(page.locator('html')).toHaveClass(/dark/);
      } else {
        await expect(page.locator('html')).not.toHaveClass(/dark/);
      }
      await page.screenshot({ path: path.join(CAPTURES_DIR, `${testInfo.project.name}_empty_${locale.code}.png`) });
    }
  });

  test('Escenario 3: Paginación explícita, out-of-range y límites inválidos @visual', async ({ page }, testInfo) => {
    await fixtures.loginViaUI(page, gestorA);

    // 1. Paginación normal limit=1
    await page.goto('/es/mis-unidades?page=1&limit=1');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Mostrando 1 de 3 unidades autorizadas')).toBeVisible();

    const navPaginacion = page.locator('nav[aria-label="Paginación de inventario"]');
    await expect(navPaginacion).toBeVisible();
    await expect(navPaginacion.locator('text=Página 1 de 3')).toBeVisible();

    const nextBtn = navPaginacion.locator('a:has-text("Siguiente")');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    await page.waitForURL(/page=2/);
    await expect(navPaginacion.locator('text=Página 2 de 3')).toBeVisible();

    const capPag2 = `${testInfo.project.name}_paginacion_page2.png`;
    await page.screenshot({ path: path.join(CAPTURES_DIR, capPag2) });

    // 2. Out-of-range page: count > 0 en página vacía NO debe mostrar inventario vacío global
    await page.goto('/es/mis-unidades?page=9999&limit=12');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Inventario Vacío')).not.toBeVisible();
    await expect(page.locator('text=Mostrando 0 de 3 unidades autorizadas')).toBeVisible();
    const navOutOfRange = page.locator('nav[aria-label="Paginación de inventario"]');
    await expect(navOutOfRange).toBeVisible();
    await expect(navOutOfRange.locator('text=Página fuera de rango (9999 de 1)')).toBeVisible();

    // Recuperación directa mediante enlace a primera página
    const firstPageLink = navOutOfRange.locator('a:has-text("Ir a la primera página")');
    await expect(firstPageLink).toBeVisible();
    await firstPageLink.click();
    await page.waitForURL(/\/mis-unidades\?page=1&limit=12/);
    await expect(page.locator('text=Mostrando 3 de 3 unidades autorizadas')).toBeVisible();

    // 3. Límite inválido string: se normaliza de forma segura sin romperse
    await page.goto('/es/mis-unidades?page=1&limit=invalid');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Mostrando 3 de 3 unidades autorizadas')).toBeVisible();
  });

  test('Escenario 4: Manejo de errores de SSR, fallo de grupos y recuperación con retry @visual', async ({ page }, testInfo) => {
    const proxyControlUrl = 'http://127.0.0.1:3202/__control/fault';

    try {
      // 1. Inyectar fallo HTTP 500 en endpoint /unidades
      const fault1Res = await fetch(proxyControlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/unidades', status: 500 }),
      });
      expect(fault1Res.ok).toBe(true);

      await fixtures.loginViaUI(page, gestorA);
      await page.goto('/es/mis-unidades');
      await page.waitForLoadState('networkidle');

      // Debe mostrar componente de error accesible (filtrando route announcer interno de Next.js)
      const errorAlert = page.getByRole('alert').filter({ hasText: 'Error de carga de inventario' });
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert.locator('text=Error de carga de inventario')).toBeVisible();

      const retryBtn = errorAlert.locator('button:has-text("Reintentar")');
      await expect(retryBtn).toBeVisible();

      const capErr = `${testInfo.project.name}_error_unidades.png`;
      await page.screenshot({ path: path.join(CAPTURES_DIR, capErr) });

      // 2. Reset de proxy y aserción de éxito (sin catch silencioso)
      const resetRes = await fetch(proxyControlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(resetRes.ok).toBe(true);

      // Click retry y comprobación de recuperación exitosa
      await retryBtn.click();
      await page.waitForLoadState('networkidle');
      await expect(errorAlert).not.toBeVisible();
      await expect(page.locator('text=Mostrando 3 de 3 unidades autorizadas')).toBeVisible();

      // 3. Inyectar fallo en /grupos: debe producir error conjunto y no unidades sin grupo
      const fault2Res = await fetch(proxyControlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/grupos', status: 500 }),
      });
      expect(fault2Res.ok).toBe(true);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('alert').filter({ hasText: 'Error de carga de inventario' })).toBeVisible();
    } finally {
      // Reset final garantizado
      const finalReset = await fetch(proxyControlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(finalReset.ok).toBe(true);
    }
  });
});
