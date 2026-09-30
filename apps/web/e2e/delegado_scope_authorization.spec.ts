import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';

test.beforeAll(async () => {
  await startMockApiServer();
});

test.afterAll(async () => {
  await stopMockApiServer();
});

const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  '../../../specs/004-delegado-scope-authorization/evidence/screenshots'
);

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureVisualEvidence(
  page: Page,
  uiId: string,
  actor: string,
  state: string
) {
  const viewports = [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // UI-009: Re-establish Grupo selection after every viewport change and scroll into position
    if (uiId === 'UI-009') {
      const radioGrupo = page.locator('[data-testid="radio-alcance-grupo"]');
      if (await radioGrupo.isVisible()) {
        await radioGrupo.click();
      }
      const selectGrupoInput = page.locator('[data-testid="select-grupo-input"]');
      if (await selectGrupoInput.isVisible()) {
        await selectGrupoInput.selectOption('grp-1');
      }

      const summary = page.locator('[data-testid="editor-scope-summary"]');
      await expect(summary).toBeVisible();
      await expect(summary).toContainText('Edificio Torre Norte');

      const reviewBtn = page.locator('[data-testid="review-access-btn"]');
      await expect(reviewBtn).toBeVisible();

      // Scroll modal container so Edificio Torre Norte, summary, and sticky Revisar y Confirmar appear together
      await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="modal-configuracion-delegado"]');
        const summaryEl = document.querySelector('[data-testid="editor-scope-summary"]');
        if (modal && summaryEl) {
          const top = (summaryEl as HTMLElement).offsetTop - 20;
          modal.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
        }
      });
      await page.waitForTimeout(100);
    }

    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate((t) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(t);
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(250);

      // In UI-009, verify summary text in each theme
      if (uiId === 'UI-009') {
        const summary = page.locator('[data-testid="editor-scope-summary"]');
        await expect(summary).toContainText('Edificio Torre Norte');
      }

      // Permanent contrast, surface, and backdrop assertions for UI-008, UI-009, UI-010 per Brief 13
      if (['UI-008', 'UI-009', 'UI-010'].includes(uiId)) {
        const dialog = page.locator('[data-slot="dialog-content"]');
        await expect(dialog).toBeVisible();

        const contrastResults = await page.evaluate((currTheme) => {
          function parseRgb(colorStr: string): [number, number, number, number] {
            const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (!m) return [0, 0, 0, 1];
            return [
              parseInt(m[1], 10),
              parseInt(m[2], 10),
              parseInt(m[3], 10),
              m[4] !== undefined ? parseFloat(m[4]) : 1,
            ];
          }

          function getLuminance(r: number, g: number, b: number): number {
            const [rs, gs, bs] = [r, g, b].map((c) => {
              const s = c / 255;
              return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
          }

          function blend(fg: [number, number, number, number], bg: [number, number, number, number]): [number, number, number] {
            const a = fg[3];
            return [
              Math.round(fg[0] * a + bg[0] * (1 - a)),
              Math.round(fg[1] * a + bg[1] * (1 - a)),
              Math.round(fg[2] * a + bg[2] * (1 - a)),
            ];
          }

          function calcContrast(fgStr: string, bgStr: string, baseBgStr: string = 'rgb(19, 31, 60)'): number {
            const fg = parseRgb(fgStr);
            const bg = parseRgb(bgStr);
            const base = parseRgb(baseBgStr);
            const effectiveBg = bg[3] < 1 ? blend(bg, base) : [bg[0], bg[1], bg[2]];
            const effectiveFg = fg[3] < 1 ? blend(fg, [effectiveBg[0], effectiveBg[1], effectiveBg[2], 1]) : [fg[0], fg[1], fg[2]];
            const l1 = getLuminance(effectiveFg[0], effectiveFg[1], effectiveFg[2]);
            const l2 = getLuminance(effectiveBg[0], effectiveBg[1], effectiveBg[2]);
            const lighter = Math.max(l1, l2);
            const darker = Math.min(l1, l2);
            return (lighter + 0.05) / (darker + 0.05);
          }

          const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement;
          const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
          const title = document.querySelector('[data-slot="dialog-title"]') as HTMLElement;
          const desc = (document.querySelector('[data-slot="dialog-header"] p') || document.querySelector('[data-slot="dialog-title"] ~ p')) as HTMLElement;
          const scopeSummary = document.querySelector('[data-testid="editor-scope-summary"]') as HTMLElement;
          const stickyFooter = document.querySelector('[data-slot="dialog-content"] .sticky') as HTMLElement;
          const buttons = Array.from(document.querySelectorAll('[data-slot="dialog-content"] button'));
          const cancelBtn = (buttons.find((b) => b.textContent && b.textContent.includes('Cancelar')) || null) as HTMLElement | null;

          const unselectedCard = (
            document.querySelector('[data-testid="radio-permiso-ver"]:not([class*="ring"])') ||
            document.querySelector('[data-testid="radio-permiso-gestionar"]:not([class*="ring"])')
          ) as HTMLElement;
          const unselectedCardText = unselectedCard ? (unselectedCard.querySelector('p, span') as HTMLElement) : null;

          const overlayZ = overlay ? parseInt(window.getComputedStyle(overlay).zIndex, 10) : 0;
          const popupZ = popup ? parseInt(window.getComputedStyle(popup).zIndex, 10) : 0;

          // Stacking verification: popup at center must be on top of overlay
          const pRect = popup.getBoundingClientRect();
          const elementsAtCenter = document.elementsFromPoint(pRect.left + pRect.width / 2, pRect.top + pRect.height / 2);
          const popupIdx = elementsAtCenter.indexOf(popup);
          const overlayIdx = overlay ? elementsAtCenter.indexOf(overlay) : -1;
          const backdropBehindPopup = overlayIdx === -1 || (popupIdx !== -1 && popupIdx < overlayIdx);

          const popupBg = window.getComputedStyle(popup).backgroundColor;
          const popupRgb = parseRgb(popupBg);
          const popupLum = getLuminance(popupRgb[0], popupRgb[1], popupRgb[2]);
          const hasRealDarkSurface = currTheme === 'dark' ? (popupLum < 0.1 && popupBg !== 'rgb(255, 255, 255)') : (popupLum > 0.7);

          // Contrast ratios
          const titleColor = title ? window.getComputedStyle(title).color : '';
          const titleRatio = title ? calcContrast(titleColor, popupBg) : 0;

          const descColor = desc ? window.getComputedStyle(desc).color : '';
          const descRatio = desc ? calcContrast(descColor, popupBg) : 0;

          const cardBg = unselectedCard ? window.getComputedStyle(unselectedCard).backgroundColor : popupBg;
          const cardTextColor = unselectedCardText ? window.getComputedStyle(unselectedCardText).color : '';
          const cardRatio = unselectedCard && unselectedCardText ? calcContrast(cardTextColor, cardBg, popupBg) : 0;

          const summaryBg = scopeSummary ? window.getComputedStyle(scopeSummary).backgroundColor : popupBg;
          const summaryColor = scopeSummary ? window.getComputedStyle(scopeSummary).color : '';
          const summaryRatio = scopeSummary ? calcContrast(summaryColor, summaryBg, popupBg) : 0;

          const footerBg = stickyFooter ? window.getComputedStyle(stickyFooter).backgroundColor : popupBg;
          const cancelColor = cancelBtn ? window.getComputedStyle(cancelBtn).color : '';
          const footerRatio = cancelBtn ? calcContrast(cancelColor, footerBg, popupBg) : 0;

          return {
            overlayZ,
            popupZ,
            backdropBehindPopup,
            popupBg,
            popupLum,
            hasRealDarkSurface,
            cardInfo: unselectedCard ? {
              testid: unselectedCard.getAttribute('data-testid'),
              className: unselectedCard.className,
              rawBg: window.getComputedStyle(unselectedCard).backgroundColor,
            } : null,
            elements: {
              title: { color: titleColor, bg: popupBg, ratio: titleRatio, pass: titleRatio >= 3.0 },
              desc: { color: descColor, bg: popupBg, ratio: descRatio, pass: descRatio >= 4.5 },
              unselectedCard: { color: cardTextColor, bg: cardBg, ratio: cardRatio, pass: cardRatio >= 4.5 },
              summary: { color: summaryColor, bg: summaryBg, ratio: summaryRatio, pass: summaryRatio >= 4.5 },
              footer: { color: cancelColor, bg: footerBg, ratio: footerRatio, pass: footerRatio >= 4.5 },
            },
          };
        }, theme);

        if (!contrastResults.elements.unselectedCard.pass) {
          console.log(`[CONTRAST-FAIL] ${uiId} @ ${vp.width}w (${theme}):`, JSON.stringify(contrastResults, null, 2));
        }

        expect(contrastResults.overlayZ).toBeLessThan(contrastResults.popupZ);
        expect(contrastResults.backdropBehindPopup).toBe(true);
        expect(contrastResults.hasRealDarkSurface).toBe(true);
        expect(contrastResults.elements.title.pass).toBe(true);
        expect(contrastResults.elements.desc.pass).toBe(true);
        if (contrastResults.elements.unselectedCard.ratio > 0) {
          expect(contrastResults.elements.unselectedCard.pass).toBe(true);
        }
        expect(contrastResults.elements.summary.pass).toBe(true);
        expect(contrastResults.elements.footer.pass).toBe(true);
      }

      // UI-017: bounding-box assertions for title, close button, and dialog at every viewport/theme
      if (uiId === 'UI-017') {
        const dialog = page.locator('[data-slot="dialog-content"]');
        await expect(dialog).toBeVisible();

        // Wait for dialog bounding box to settle at required inset before reading final boxes
        await expect.poll(async () => {
          const b1 = await dialog.boundingBox();
          if (!b1) return false;
          if (vp.width <= 768) {
            if (b1.x < 4 || (b1.x + b1.width) > (vp.width - 4)) return false;
          } else {
            if (b1.x < 0 || (b1.x + b1.width) > (vp.width + 1)) return false;
          }
          await new Promise((r) => setTimeout(r, 60));
          const b2 = await dialog.boundingBox();
          if (!b2) return false;
          return Math.abs(b1.x - b2.x) < 0.5 && Math.abs(b1.width - b2.width) < 0.5;
        }).toBe(true);

        const dialogBox = await dialog.boundingBox();
        expect(dialogBox).not.toBeNull();

        const title = page.locator('[data-slot="dialog-title"]');
        await expect(title).toBeVisible();
        const titleBox = await title.boundingBox();
        expect(titleBox).not.toBeNull();

        const closeBtn = page.locator('[data-slot="dialog-close"]');
        await expect(closeBtn).toBeVisible();
        const closeBox = await closeBtn.boundingBox();
        expect(closeBox).not.toBeNull();

        if (dialogBox && titleBox && closeBox) {
          // Dialog bounding box inside viewport with inset on mobile
          expect(dialogBox.x).toBeGreaterThanOrEqual(0);
          expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(vp.width + 1);
          if (vp.width <= 768) {
            expect(dialogBox.x).toBeGreaterThanOrEqual(4);
            expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(vp.width - 4);
          }

          // Close button bounding box inside dialog and viewport
          expect(closeBox.x).toBeGreaterThanOrEqual(dialogBox.x);
          expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width + 1);
          expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(vp.width);
          expect(closeBox.y).toBeGreaterThanOrEqual(dialogBox.y);
          expect(closeBox.width).toBeGreaterThanOrEqual(44);
          expect(closeBox.height).toBeGreaterThanOrEqual(44);

          // Title bounding box inside dialog and viewport, reserved space before close button
          expect(titleBox.x).toBeGreaterThanOrEqual(dialogBox.x);
          expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(closeBox.x + 2);
          expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(vp.width);

          // Title text must not be clipped / no ellipsis
          const isTitleClipped = await title.evaluate((el) => el.scrollWidth > el.clientWidth);
          expect(isTitleClipped).toBe(false);
        }
      }

      // Verify zero horizontal overflow per ui-state-matrix
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(hasOverflow).toBe(false);

      // Verify touch targets for interactive elements on mobile/tablet (44x44 minimum per contract, strict wrapper check without generic parentElement)
      if (vp.width <= 768) {
        const smallTouchTargets = await page.evaluate(() => {
          const interactives = Array.from(
            document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]')
          );
          let tooSmall = 0;
          const smallDetails: string[] = [];
          for (const el of interactives) {
            const style = window.getComputedStyle(el);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              style.opacity === '0' ||
              el.hasAttribute('hidden') ||
              el.getAttribute('aria-hidden') === 'true'
            ) {
              continue;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
              continue;
            }
            const isSelf44 = rect.width >= 44 && rect.height >= 44;
            const wrapper = el.closest('label') || el.closest('[data-touch-target]');
            const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;
            const isWrapper44 = wrapperRect ? wrapperRect.width >= 44 && wrapperRect.height >= 44 : false;

            let isWrapperValid = false;
            if (wrapper && isWrapper44) {
              if (wrapper.tagName.toLowerCase() === 'label') {
                const label = wrapper as HTMLLabelElement;
                isWrapperValid = label.control === el || wrapper.contains(el);
              } else if (wrapper.hasAttribute('data-touch-target')) {
                isWrapperValid = wrapper.contains(el);
              }
            }

            if (!isSelf44 && !isWrapperValid) {
              tooSmall++;
              const tag = el.tagName.toLowerCase();
              const action =
                tag === 'button'
                  ? 'click'
                  : tag === 'a'
                    ? `navigate to ${el.getAttribute('href') || '#'}`
                    : el.getAttribute('type') === 'checkbox'
                      ? 'toggle checkbox'
                      : el.getAttribute('type') === 'radio'
                        ? 'select radio'
                        : 'activate control';
              const selector = el.id
                ? `#${el.id}`
                : el.getAttribute('data-testid')
                  ? `[data-testid="${el.getAttribute('data-testid')}"]`
                  : `${tag}.${el.className.split(' ').slice(0, 2).join('.')}`;
              smallDetails.push(`${selector} [action: ${action}] (${Math.round(rect.width)}x${Math.round(rect.height)}px)`);
            }
          }
          return { tooSmall, smallDetails };
        });
        if (smallTouchTargets.tooSmall > 0) {
          console.log(`[TOUCH-TARGET-FAIL] ${uiId} @ ${vp.width}w (${theme}):`, smallTouchTargets.smallDetails);
        }
        expect(smallTouchTargets.tooSmall).toBe(0);
      }

      const filename = `${uiId}__${actor}__${state}__${vp.width}w__${theme}.png`;
      const targetPath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: targetPath, fullPage: false });
    }
  }
}

function createMockSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
  accessContext?: Record<string, unknown>;
  simulateError?: boolean;
}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(
    JSON.stringify({
      sub: payload.userId,
      email: payload.email,
      role: 'authenticated',
      user_metadata: { role: payload.role, rol: payload.role },
      accessContext: payload.accessContext,
      simulateError: payload.simulateError,
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  ).toString('base64');
  return `${header}.${body}.mocksignature`;
}

async function setTestSession(
  context: BrowserContext,
  role: 'gestor' | 'delegado',
  accessContext?: Record<string, unknown> | null,
  email?: string
) {
  const isGestor = role === 'gestor';
  const userId = isGestor
    ? '11111111-1111-1111-1111-111111111111'
    : '33333333-3333-3333-3333-333333333333';
  const userEmail = email || (isGestor ? 'gestor@test.com' : 'delegado@test.com');

  const resolvedAccessContext = accessContext === null
    ? undefined
    : (accessContext || (isGestor
        ? { actor: 'gestor', ownerOnly: true, capabilities: ['*'] }
        : { actor: 'delegado', state: 'pendiente_configuracion', ownerOnly: false, capabilities: [] }));

  const token = createMockSessionToken({
    userId,
    email: userEmail,
    role,
    accessContext: resolvedAccessContext,
    simulateError: accessContext === null,
  });

  const cookiePayload = {
    access_token: token,
    user: {
      id: userId,
      email: userEmail,
      user_metadata: { role, rol: role },
    },
  };

  const cookieValue = `base64-${Buffer.from(JSON.stringify(cookiePayload)).toString('base64')}`;

  await context.addCookies([
    {
      name: 'sb-127-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'sb-localhost-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Delegado Scope Authorization UI/UX Matrix (UI-001 - UI-022)', () => {
  test.setTimeout(120000);

  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  // Documented allowlist for intentional/expected non-fatal messages
  const ALLOWED_CONSOLE_ERRORS = [
    /favicon\.ico/i,
    /Failed to load resource.*(400|401|403|404|500)/i,
    /Error fetching zonas/i,
    /net::ERR_ABORTED/i,
    /Function components cannot be given refs/i,
    /React\.forwardRef/i,
  ];

  const ALLOWED_FAILED_REQUESTS = [
    /favicon\.ico/i,
    /net::ERR_ABORTED/i,
  ];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    consoleErrors.length = 0;
    failedRequests.length = 0;

    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const isAllowed = ALLOWED_CONSOLE_ERRORS.some((pattern) => pattern.test(text));
        if (!isAllowed) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      const failureText = request.failure()?.errorText || '';
      const isAllowed =
        ALLOWED_FAILED_REQUESTS.some((pattern) => pattern.test(url) || pattern.test(failureText));
      if (!isAllowed) {
        failedRequests.push(`${request.method()} ${url}: ${failureText}`);
      }
    });
  });

  test.afterEach(async () => {
    expect(
      pageErrors,
      `Unexpected page errors detected: ${JSON.stringify(pageErrors.map((e) => e.message))}`
    ).toEqual([]);
    expect(
      consoleErrors,
      `Unexpected console.error detected: ${JSON.stringify(consoleErrors)}`
    ).toEqual([]);
    expect(
      failedRequests,
      `Unexpected failed network requests detected: ${JSON.stringify(failedRequests)}`
    ).toEqual([]);
  });

  // UI-001: /delegados empty state
  test('UI-001: Gestor empty state shows explanation and invite CTA', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ invitaciones: [], delegaciones: [] }),
      });
    });

    await page.goto('/es/delegados');
    await page.waitForLoadState('domcontentloaded');

    const emptyContainer = page.locator('[data-testid="empty-delegados"]');
    await expect(emptyContainer).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-invitar-delegado"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-001', 'gestor', 'empty');
  });

  // UI-002: Invite dialog with validation
  test('UI-002: Invite dialog shows validation for invalid email without browser alert', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ invitaciones: [], delegaciones: [] }),
      });
    });

    await page.goto('/es/delegados');
    await page.waitForLoadState('domcontentloaded');

    const btnInvitar = page.locator('[data-testid="btn-invitar-delegado"]');
    await expect(btnInvitar).toBeVisible({ timeout: 10000 });
    await btnInvitar.click();

    const modal = page.locator('[data-testid="modal-invitar-delegado"]');
    await expect(modal).toBeVisible({ timeout: 10000 });

    const inputEmail = page.locator('[data-testid="input-delegado-email"]');
    await expect(inputEmail).toBeVisible({ timeout: 5000 });
    await inputEmail.fill('invalido-sin-arroba');
    await page.click('[data-testid="btn-enviar-invitacion"]');

    const errorText = page.locator('.text-destructive');
    await expect(errorText).toBeVisible({ timeout: 5000 });

    await captureVisualEvidence(page, 'UI-002', 'gestor', 'invalid-email');
  });

  // UI-003: Invite dialog safe error handling
  test('UI-003: Safe direct error display without leaking user profile', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados/invitaciones', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'No se encontró un usuario verificado con ese correo.' }),
      });
    });

    await page.goto('/es/delegados');
    await page.click('[data-testid="btn-invitar-delegado"]');

    const inputEmail = page.locator('[data-testid="input-delegado-email"]');
    await inputEmail.fill('desconocido@ejemplo.com');
    await page.click('[data-testid="btn-enviar-invitacion"]');

    const errorMsg = page.locator('.text-destructive');
    await expect(errorMsg).toContainText('No se encontró un usuario verificado');

    await captureVisualEvidence(page, 'UI-003', 'gestor', 'unknown-account');
  });

  // UI-004: Pending invitations list
  test('UI-004: Gestor displays pending invitations with expiry and cancel action', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invitaciones: [
            {
              id: 'inv-123',
              delegadoEmail: 'colaborador.pendiente@empresa.com',
              estado: 'pendiente',
              expiraEn: new Date(Date.now() + 86400000 * 3).toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
          delegaciones: [],
        }),
      });
    });

    await page.goto('/es/delegados');
    await expect(page.locator('[data-testid="invitaciones-pendientes-list"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="cancel-invitation-btn"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-004', 'gestor', 'pending');
  });

  // UI-005: Account invitations pending
  test('UI-005: Target account views pending invitation with accept/reject CTAs', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados/invitaciones/recibidas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'inv-123',
            gestorNombre: 'Inmobiliaria Central',
            gestorEmail: 'titular@inmobiliariacentral.com',
            estado: 'pendiente',
            createdAt: new Date().toISOString(),
            expiraEn: new Date(Date.now() + 86400000 * 5).toISOString(),
          },
        ]),
      });
    });

    await page.goto('/es/cuenta/invitaciones');
    await expect(page.locator('[data-testid="btn-aceptar-invitacion"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-rechazar-invitacion"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-005', 'target_account', 'pending');
  });

  // UI-006: Account invitations empty/expired
  test('UI-006: Target account views empty invitations state', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados/invitaciones/recibidas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/es/cuenta/invitaciones');
    await expect(page.locator('[data-testid="empty-invitaciones"]')).toBeVisible({ timeout: 10000 });

    await captureVisualEvidence(page, 'UI-006', 'target_account', 'empty');
  });

  // UI-007: Accepted but unconfigured delegation
  test('UI-007: Gestor views accepted delegation with zero-access badge and configure CTA', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invitaciones: [],
          delegaciones: [
            {
              id: 'del-001',
              delegadoId: 'user-002',
              delegadoNombre: 'Carlos Asistente',
              delegadoEmail: 'carlos.asistente@ejemplo.com',
              estado: 'pendiente_configuracion',
              permiso: null,
              scope: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/es/delegados');
    await expect(page.locator('[data-testid="badge-pendiente-configuracion"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-configurar-permisos"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-007', 'gestor', 'unconfigured');
  });

  // UI-008: Permission editor - Account level
  test('UI-008: Permission editor allows setting Account-wide scope with plain-language summary', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invitaciones: [],
          delegaciones: [
            {
              id: 'del-001',
              delegadoId: 'user-002',
              delegadoNombre: 'Carlos Asistente',
              delegadoEmail: 'carlos.asistente@ejemplo.com',
              estado: 'pendiente_configuracion',
              permiso: null,
              scope: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/es/delegados');
    await page.click('[data-testid="btn-configurar-permisos"]');

    const modal = page.locator('[data-testid="modal-configuracion-delegado"]');
    await expect(modal).toBeVisible();

    await page.click('[data-testid="radio-alcance-cuenta"]');
    await page.click('[data-testid="radio-permiso-gestionar"]');

    const summary = page.locator('[data-testid="editor-scope-summary"]');
    await expect(summary).toContainText('Toda la cuenta del Gestor');

    await captureVisualEvidence(page, 'UI-008', 'gestor', 'scope-cuenta');
  });

  // UI-009: Permission editor - Grupo level
  test('UI-009: Permission editor allows configuring Grupo scope', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invitaciones: [],
          delegaciones: [
            {
              id: 'del-001',
              delegadoId: 'user-002',
              delegadoNombre: 'Carlos Asistente',
              delegadoEmail: 'carlos.asistente@ejemplo.com',
              estado: 'pendiente_configuracion',
              permiso: null,
              scope: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('**/api/grupos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'grp-1', nombre: 'Edificio Torre Norte', color: '#B89355' },
          { id: 'grp-2', nombre: 'Complejo Costanera', color: '#131F3C' },
        ]),
      });
    });

    await page.goto('/es/delegados');
    await page.click('[data-testid="btn-configurar-permisos"]');

    await page.click('[data-testid="radio-alcance-grupo"]');
    await expect(page.locator('[data-testid="select-grupo"]')).toBeVisible();
    await page.selectOption('[data-testid="select-grupo-input"]', 'grp-1');

    const summary = page.locator('[data-testid="editor-scope-summary"]');
    await expect(summary).toContainText('Edificio Torre Norte');
    await expect(page.locator('[data-testid="review-access-btn"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-009', 'gestor', 'scope-grupo');
  });

  // UI-010: Permission editor - Selected units (500-fixture support)
  test('UI-010: Permission editor searches and selects specific units', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    const fixtureUnidades = Array.from({ length: 50 }, (_, i) => ({
      id: `unit-${i + 1}`,
      titulo: `Departamento ${100 + i}`,
      direccion: `Av. Libertador ${1000 + i}`,
      precio: 150000 + i * 5000,
      moneda: 'ARS',
      tipo: 'departamento',
      estado: 'disponible',
    }));

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invitaciones: [],
          delegaciones: [
            {
              id: 'del-001',
              delegadoId: 'user-002',
              delegadoNombre: 'Carlos Asistente',
              delegadoEmail: 'carlos.asistente@ejemplo.com',
              estado: 'pendiente_configuracion',
              permiso: null,
              scope: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('**/api/unidades?limit=500', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: fixtureUnidades }),
      });
    });

    await page.goto('/es/delegados');
    await page.click('[data-testid="btn-configurar-permisos"]');

    await page.click('[data-testid="radio-alcance-unidades"]');
    await expect(page.locator('[data-testid="input-search-unidades"]')).toBeVisible();

    const firstCheckbox = page.locator('[data-testid="unit-selection-checkbox"]').first();
    await firstCheckbox.check();

    await captureVisualEvidence(page, 'UI-010', 'gestor', 'scope-units');
  });

  // UI-011: Active delegation summary with edit & revoke actions
  test('UI-011: Gestor displays active delegation with scope summary, replace warning, and revoke', async ({ page, context }) => {
    await setTestSession(context, 'gestor');

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invitaciones: [],
          delegaciones: [
            {
              id: 'del-001',
              delegadoId: 'user-002',
              delegadoNombre: 'Carlos Asistente',
              delegadoEmail: 'carlos.asistente@ejemplo.com',
              estado: 'activo',
              permiso: 'gestionar',
              scope: { alcanceTipo: 'cuenta' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/es/delegados');
    await expect(page.locator('[data-testid="delegaciones-activas-list"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-revocar-delegado"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-011', 'gestor', 'active-revoke');
  });

  // UI-012: Operational layout - Delegado pending configuration
  test('UI-012: Delegado with pending configuration sees warning banner and zero operational data', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'pendiente_configuracion',
      ownerOnly: false,
      capabilities: [],
    };
    await setTestSession(context, 'delegado', accessCtx);

    const privateRequests: string[] = [];
    page.on('request', (req) => {
      const u = req.url();
      if (
        u.includes('/api/unidades') ||
        u.includes('/api/grupos') ||
        u.includes('/api/alquileres') ||
        u.includes('/api/inquilinos') ||
        u.includes('/api/pagos') ||
        u.includes('/api/facturacion') ||
        u.includes('/api/reportes')
      ) {
        privateRequests.push(u);
      }
    });

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const pendingBanner = page.locator('[data-testid="banner-pendiente-configuracion"]');
    await expect(pendingBanner).toBeVisible();

    const pendingStateCard = page.locator('[data-testid="pending-configuration-state"]');
    await expect(pendingStateCard).toBeVisible();

    // Verify zero private resource requests fired
    expect(privateRequests.length).toBe(0);

    await captureVisualEvidence(page, 'UI-012', 'delegado', 'unconfigured');
  });

  // UI-013: Dashboard/Sidebar - Delegado Ver read-only
  test('UI-013: Delegado Ver sees read-only banner and owner destinations are concealed', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'ver',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['unidades:read', 'alquileres:read'],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('[data-testid="dashboard-readonly-badge"]')).toBeVisible();
    await expect(page.locator('a[href*="/facturacion"]').first()).toBeHidden();
    await expect(page.locator('a[href*="/delegados"]').first()).toBeHidden();

    await captureVisualEvidence(page, 'UI-013', 'delegado_ver', 'active');
  });

  // UI-014: Units/Alquileres/Inquilinos - Delegado Ver has no mutation affordances
  test('UI-014: Delegado Ver in inventory view displays read-only badge and no create button', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'ver',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['unidades:read'],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('a[href*="/mis-unidades/nueva"]')).toBeHidden();

    await captureVisualEvidence(page, 'UI-014', 'delegado_ver', 'no-mutation');
  });

  // UI-015: Mutation attempted by Delegado Ver shows application safe 403 denial feedback
  test('UI-015: Delegado Ver attempting direct mutation gets denied response', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'ver',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['unidades:read'],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.route('**/api/unidades', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'Acceso denegado: el rol Delegado con permiso "ver" no tiene autorización para crear unidades.',
            error: 'Forbidden',
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to Nueva Unidad which invokes server-side access context verification
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('domcontentloaded');

    // Assert genuine application safe 403 feedback banner is displayed
    const denialBanner = page.locator('[data-testid="denial-feedback-banner"]');
    await expect(denialBanner).toBeVisible({ timeout: 10000 });
    await expect(denialBanner).toContainText('Error 403');
    await expect(denialBanner).toContainText('Acceso Denegado: Permisos Insuficientes');

    await captureVisualEvidence(page, 'UI-015', 'delegado_ver', 'mutation-denied');
  });

  // UI-016: Delegado Gestionar dashboard and sidebar
  test('UI-016: Delegado Gestionar has operational access but sensitive routes concealed', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'gestionar',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['unidades:manage', 'alquileres:manage', 'inquilinos:manage'],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('a[href*="/facturacion-afip"]')).toBeHidden();
    await expect(page.locator('a[href*="/logs"]')).toBeHidden();

    await captureVisualEvidence(page, 'UI-016', 'delegado_gestionar', 'active');
  });

  // UI-017: Delegado Gestionar in-scope action feedback
  test('UI-017: Delegado Gestionar in-scope operational actions execute with success feedback', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'gestionar',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: ['alquileres:manage', 'unidades:manage'],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.route('**/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.route(/(?:api\/)?alquileres\?limit=1000/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'alq-1',
              unidad: { titulo_es: 'Departamento Belgrano' },
              inquilino: { nombre_completo: 'Martin Gomez' },
              fecha_inicio: '2026-09-01T00:00:00.000Z',
              fecha_fin: '2026-09-30T00:00:00.000Z',
              monto_total: 120000,
              estado: 'activo',
            },
          ],
        }),
      });
    });

    await page.route(/(?:api\/)?unidades\?limit=1000/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'u-1', titulo_es: 'Departamento Belgrano', categoria: 'residencial' },
          ],
        }),
      });
    });

    await page.route(/(?:api\/)?inquilinos\?limit=1000/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'inq-1', nombre_completo: 'Martin Gomez', email: 'martin@test.com' },
          ],
        }),
      });
    });

    await page.route(/(?:api\/)?alquileres(?:\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'alq-created-999', status: 'created' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/es/alquileres');
    await page.waitForLoadState('domcontentloaded');

    // Ensure zero fetch error overlay
    await expect(page.locator('text=fetch failed')).toBeHidden();

    // Trigger allowed in-scope action
    const btnNuevo = page.locator('[data-testid="btn-nuevo-alquiler"]');
    await expect(btnNuevo).toBeVisible({ timeout: 10000 });
    await btnNuevo.click();

    // Fill form and submit
    const inputMonto = page.locator('#monto_total');
    await expect(inputMonto).toBeVisible({ timeout: 5000 });
    await inputMonto.fill('120000');

    // Submit form and assert visible success feedback
    const btnGuardar = page.locator('[data-testid="btn-guardar-alquiler"]');
    await expect(btnGuardar).toBeEnabled({ timeout: 5000 });
    await btnGuardar.click();

    const successFeedback = page.locator('[data-testid="alquiler-success-feedback"]');
    await expect(successFeedback).toBeVisible({ timeout: 10000 });
    await expect(successFeedback).toContainText('¡Alquiler registrado con éxito!');

    const btnCerrarExito = page.locator('[data-testid="btn-cerrar-alquiler-exito"]');
    await expect(btnCerrarExito).toBeVisible();

    await captureVisualEvidence(page, 'UI-017', 'delegado_gestionar', 'allowed-operation');

    // Verify explicit dismissal closes dialog and subsequent reopen displays fresh form
    await btnCerrarExito.click();
    await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden();

    await btnNuevo.click();
    await expect(page.locator('#monto_total')).toBeVisible();
    await expect(page.locator('[data-testid="alquiler-success-feedback"]')).toBeHidden();
  });

  // UI-018: Operational direct route - out of scope concealed
  test('UI-018: Out of scope unit access yields concealed not-found response', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'gestionar',
      scope: { alcanceTipo: 'unidades', unidadIds: ['other-unit'] },
      capabilities: ['unidades:manage'],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/unidades/unit-fuera-de-alcance', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 404,
          message: 'Unidad no encontrada.',
        }),
      });
    });

    await page.goto('/es/mis-unidades/unit-fuera-de-alcance/editar');
    await page.waitForURL('**/mis-unidades');
    await page.waitForLoadState('domcontentloaded');
    await captureVisualEvidence(page, 'UI-018', 'delegado', 'concealed-not-found');
  });


  // UI-019: Owner-only direct navigation
  test('UI-019: Delegado navigating to owner-only route shows localized forbidden screen', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'gestionar',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: [],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(accessCtx),
      });
    });

    await page.goto('/es/delegados');
    await page.waitForLoadState('domcontentloaded');

    const forbiddenContainer = page.locator('[data-testid="owner-only-forbidden"]');
    await expect(forbiddenContainer).toBeVisible();

    await captureVisualEvidence(page, 'UI-019', 'delegado', 'forbidden-screen');
  });

  // UI-020: Public marketplace anonymous regression
  test('UI-020: Public marketplace has zero operational data or delegation UI', async ({ page, context }) => {
    await context.clearCookies();

    // Emulate reduced motion to ensure typing animation renders complete text immediately
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/es');
    await page.waitForLoadState('domcontentloaded');

    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Alquileres en Goya');
    await expect(heroHeading).toContainText('directos entre partes');
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="delegados-container"]')).toBeHidden();
    await expect(page.locator('[data-testid="banner-pendiente-configuracion"]')).toBeHidden();

    await captureVisualEvidence(page, 'UI-020', 'anonymous', 'marketplace-regression');
  });

  // UI-021: Dev console rejection regression
  test('UI-021: Dev console denies delegated access without privilege escalation', async ({ page, context }) => {
    const accessCtx = {
      actor: 'delegado',
      state: 'activo',
      ownerOnly: false,
      permiso: 'gestionar',
      scope: { alcanceTipo: 'cuenta' },
      capabilities: [],
    };
    await setTestSession(context, 'delegado', accessCtx);

    await page.goto('/es/dev/logs');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('[data-testid="owner-only-forbidden"]')).toBeVisible();

    await captureVisualEvidence(page, 'UI-021', 'delegado', 'dev-console-rejected');
  });

  // UI-022: Fail-closed error states
  test('UI-022: Service error shows retryable fail-closed state without leaking mock data', async ({ page, context }) => {
    await setTestSession(context, 'gestor', null, 'service-error@test.com');

    await page.route('**/api/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Error interno del servicio de autorización.' }),
      });
    });

    await page.route('**/delegados/contexto', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Error interno del servicio de autorización.' }),
      });
    });

    await page.route('**/api/delegados', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Error interno del servicio de autorización.' }),
      });
    });

    await page.goto('/es/delegados');
    await page.waitForLoadState('domcontentloaded');

    const blockedError = page.locator('[data-testid="access-context-error"]');
    await expect(blockedError).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="empty-delegados"]')).toBeHidden();
    await expect(page.locator('[data-testid="btn-invitar-delegado"]')).toBeHidden();

    await captureVisualEvidence(page, 'UI-022', 'all', 'fail-closed-error');
  });
});
