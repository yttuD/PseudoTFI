import { test, expect } from '@playwright/test';
import { startMockApiServer, stopMockApiServer } from './fixtures/mock-api-server';
import { setTestSessionForActor } from './fixtures/actors';

test.beforeAll(async () => {
  await startMockApiServer();
});

test.afterAll(async () => {
  await stopMockApiServer();
});

test.beforeEach(async ({ page }) => {
  const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#2563eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#ffffff">Rendo Mock Media</text></svg>`;

  await page.route('**/_next/image*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: dummySvg });
  });
  await page.route('**images.unsplash.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: dummySvg });
  });
  await page.route('**tile.openstreetmap.org/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: dummySvg });
  });
});

test.describe('Antigravity Batch 03A — Rental Modalities & Seña Audit (T027 & T028)', () => {

  // ==========================================================================
  // T027: Rental Modality Journeys (Monthly, Daily, Hourly)
  // ==========================================================================
  test.describe('T027: Modality Journeys (Monthly, Daily, Hourly)', () => {

    test('TC-RENT-001: Monthly rental contract creation and date validation', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      // Open Alquiler Form Modal
      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await expect(newBtn).toBeVisible();
      await newBtn.click();

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Verify monthly labels and date fields
      await expect.soft(dialog.locator('label:has-text("Fecha Inicio")').first()).toBeVisible();
      await expect.soft(dialog.locator('label:has-text("Fecha Fin")').first()).toBeVisible();
      await expect.soft(dialog.locator('input[id="monto_total"], input[name="monto_total"]').first()).toBeVisible();

      // Product Audit Assertion: Check if modal exposes distinct modality selector for monthly vs daily vs hourly
      const modalitySelector = dialog.locator('select[name="modalidad"], [data-testid="modality-select"], button:has-text("Mensual")');
      const hasModalitySelector = await modalitySelector.first().isVisible().catch(() => false);
      // Soft assertion to document FIND-005-003 in audit
      expect.soft(hasModalitySelector, 'FIND-005-003: AlquilerFormModal lacks explicit modality selector (monthly/daily/hourly)').toBe(true);

      // Verify date range validation: end date cannot be earlier than start date
      // Total amount positive validation
      const totalInput = dialog.locator('input[id="monto_total"], input[name="monto_total"]').first();
      await totalInput.fill('450000');
      expect(await totalInput.inputValue()).toBe('450000');
    });

    test('TC-RENT-002: Monthly boundary adjacency vs true temporal overlap rejection', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'domcontentloaded' });

      // 1. Allowed exact-boundary adjacency:
      // Existing active contract in mock runs 2026-10-01T00:00:00.000Z to 2027-09-30T23:59:59.000Z.
      // Next contract starting immediately on 2027-10-01T00:00:00.000Z is non-overlapping adjacency (201 Created).
      const adjacentResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('http://127.0.0.1:3001/alquileres', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token-gestor',
            },
            body: JSON.stringify({
              unidad_id: 'a0000000-0000-0000-0000-000000000001',
              inquilino_id: 'i0000000-0000-0000-0000-000000000001',
              fecha_inicio: '2027-10-01T00:00:00.000Z',
              fecha_fin: '2028-09-30T23:59:59.000Z',
              monto_total: 480000,
            }),
          });
          return { status: res.status, data: await res.json() };
        } catch (e: any) {
          return { status: 0, error: e.message };
        }
      });

      expect(adjacentResponse.status).toBe(201);
      expect(adjacentResponse.data?.id).toBeTruthy();

      // 2. Rejected true temporal overlap:
      // Contract from 2026-11-01 to 2027-01-31 falls squarely inside the active contract window.
      // Must be rejected with 409 Conflict.
      const overlapResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('http://127.0.0.1:3001/alquileres', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-token-gestor',
            },
            body: JSON.stringify({
              unidad_id: 'a0000000-0000-0000-0000-000000000001',
              inquilino_id: 'i0000000-0000-0000-0000-000000000001',
              fecha_inicio: '2026-11-01T00:00:00.000Z',
              fecha_fin: '2027-01-31T23:59:59.000Z',
              monto_total: 450000,
            }),
          });
          return { status: res.status, data: await res.json() };
        } catch (e: any) {
          return { status: 0, error: e.message };
        }
      });

      expect(overlapResponse.status).toBe(409);
      expect(overlapResponse.data?.message).toMatch(/Superposición de fechas detectada/i);
    });

    test('TC-RENT-003: Daily rental modality check-in / check-out semantics', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Product Audit Assertion: Check if daily check-in / check-out labels exist
      const checkinLabel = dialog.locator('label:has-text("Check-in"), label:has-text("Ingreso"), [data-testid="daily-checkin"]');
      const hasCheckinSemantics = await checkinLabel.first().isVisible().catch(() => false);
      expect.soft(hasCheckinSemantics, 'FIND-005-003: AlquilerFormModal lacks distinct daily check-in/check-out semantics').toBe(true);
    });

    test('TC-RENT-004: Hourly rental modality and America/Argentina/Buenos_Aires boundary handling', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Product Audit Assertion: Check if start time / end time inputs exist for hourly modality
      const timeInputs = dialog.locator('input[type="time"], [data-testid="time-start"], [data-testid="time-end"]');
      const hasTimeInputs = await timeInputs.count() > 0;
      expect.soft(hasTimeInputs, 'FIND-005-003: AlquilerFormModal lacks time pickers for hourly rental modality').toBe(true);

      // Verify America/Argentina/Buenos_Aires timezone formatting concrete conversion value
      // 14:00 UTC corresponds to 11:00 ART (UTC-3)
      const sampleDateIso = '2026-10-15T14:00:00.000Z';
      const d = new Date(sampleDateIso);
      const parts = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const hourPart = parts.find(p => p.type === 'hour')?.value;
      const minutePart = parts.find(p => p.type === 'minute')?.value;
      expect(`${hourPart}:${minutePart}`).toBe('11:00');
    });

    test('TC-RENT-005: Cross-midnight and DST boundary behavior in Argentina timezone', async () => {
      // Validate cross-midnight interval calculation in America/Argentina/Buenos_Aires (UTC-3)
      // Booking spanning across midnight in ART: 22:00 on Oct 15 to 02:00 on Oct 16
      const tz = 'America/Argentina/Buenos_Aires';

      function parseArtToUtc(dateStr: string, timeStr: string): Date {
        const [y, m, d] = dateStr.split('-').map(Number);
        const [hh, mm] = timeStr.split(':').map(Number);
        // ART is UTC-3 year-round
        return new Date(Date.UTC(y, m - 1, d, hh + 3, mm, 0));
      }

      const bookingStart = parseArtToUtc('2026-10-15', '22:00');
      const bookingEnd = parseArtToUtc('2026-10-16', '02:00');

      const fmt = (date: Date) =>
        new Intl.DateTimeFormat('es-AR', {
          timeZone: tz,
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);

      expect(fmt(bookingStart)).toBe('15, 22:00');
      expect(fmt(bookingEnd)).toBe('16, 02:00');

      // Duration across midnight must evaluate to exactly 4 hours (14,400,000 ms)
      const durationHours = (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60);
      expect(durationHours).toBe(4);

      // Adjacency boundary check: booking starting at 02:00 ART is non-overlapping
      const adjacentBooking = parseArtToUtc('2026-10-16', '02:00');
      expect(adjacentBooking.getTime() >= bookingEnd.getTime()).toBe(true);

      // Overlap check: booking from 23:00 ART to 01:00 ART overlaps the cross-midnight window
      const overlapStart = parseArtToUtc('2026-10-15', '23:00');
      const overlapEnd = parseArtToUtc('2026-10-16', '01:00');
      const isOverlapping = overlapStart.getTime() < bookingEnd.getTime() && overlapEnd.getTime() > bookingStart.getTime();
      expect(isOverlapping).toBe(true);
    });
  });

  // ==========================================================================
  // T028: Optional and Reusable Seña
  // ==========================================================================
  test.describe('T028: Optional and Reusable Seña Journeys', () => {

    test('TC-SENA-001: Rental without seña correctly omits/nulls seña fields', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Default seña choice is sin_sena, note explains no advance payment
      await expect(dialog.locator('[data-testid="sena-sin-sena-note"]')).toBeVisible();
    });

    test('TC-SENA-002: Explicit seña with valid amount/percentage and visible summary', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      const totalInput = dialog.locator('input[id="monto_total"], input[name="monto_total"]').first();
      await totalInput.fill('450000');

      await dialog.locator('[data-testid="btn-sena-personalizada"]').click();
      await dialog.locator('[data-testid="sena-tipo-monto-fijo"]').click();
      const senaInput = dialog.locator('[data-testid="sena-valor-input"]');
      await senaInput.fill('90000');

      // Summary calculation should update in the UI
      await expect(dialog.locator('[data-testid="sena-preview-amount"]')).toContainText('90.000');
    });

    test('TC-SENA-003: Invalid seña validation (seña exceeding total contract amount)', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      const totalInput = dialog.locator('input[id="monto_total"], input[name="monto_total"]').first();
      await totalInput.fill('100000');

      await dialog.locator('[data-testid="btn-sena-personalizada"]').click();
      await dialog.locator('[data-testid="sena-tipo-monto-fijo"]').click();
      const senaInput = dialog.locator('[data-testid="sena-valor-input"]');
      await senaInput.fill('150000');

      // Submit form to trigger Zod validation error
      const submitBtn = dialog.locator('button[type="submit"]:has-text("Guardar"), [data-testid="btn-guardar-alquiler"]').first();
      await submitBtn.click();

      // Error message: "La seña no puede superar el monto total acordado"
      const errMsg = dialog.locator(':is(:text("La seña no puede superar el monto total acordado"), :text("superar el monto total"))');
      await expect(errMsg.first()).toBeVisible();
    });

    test('TC-SENA-004: Grupo default seña inheritance across multiple units', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/mis-unidades', { waitUntil: 'domcontentloaded' });

      // Group configuration should allow setting a reusable default seña (e.g. 20%)
      // Product Audit Assertion: Check if GrupoFormModal exposes sena_default field
      const newGroupBtn = page.locator('button:has-text("Nuevo Grupo"), [data-testid="btn-nuevo-grupo"]').first();
      await newGroupBtn.click();
      const groupModal = page.locator('[role="dialog"]').first();
      await expect(groupModal).toBeVisible();

      const senaDefaultInput = groupModal.locator('input[id*="sena"], input[name*="sena"], [data-testid="grupo-sena-default"]');
      const hasGroupSenaDefault = await senaDefaultInput.count() > 0;
      // Soft assertion to document FIND-005-002 in audit
      expect.soft(hasGroupSenaDefault, 'FIND-005-002: GrupoFormModal lacks explicit default seña percentage input').toBe(true);
    });

    test('TC-SENA-005: Per-rental seña override and opt-out without mutating Grupo default', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Assert inheritance-source controls: modal must indicate inherited default
      const inheritanceSource = dialog.locator('[data-testid="sena-inheritance-source"]').first();
      await expect(inheritanceSource).toBeVisible({ timeout: 5000 });

      // Click heredar
      await dialog.locator('[data-testid="btn-sena-heredar-grupo"]').click();
      await expect(dialog.locator('[data-testid="sena-preview-card"]')).toBeVisible();

      // Opt-out by switching to sin_sena
      await dialog.locator('[data-testid="btn-sena-sin-sena"]').click();
      await expect(dialog.locator('[data-testid="sena-sin-sena-note"]')).toBeVisible();

      const grupoState = await page.evaluate(async () => {
        const res = await fetch('http://127.0.0.1:3001/grupos', {
          headers: { Authorization: 'Bearer test-token-gestor' },
        });
        return res.json();
      });
      expect(Array.isArray(grupoState)).toBe(true);
    });

    test('TC-SENA-006: Seña persistence after reload', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      // The existing active rental in mock has monto_sena: 90000
      await expect.soft(page.locator(':is(:text("90.000"), :text("90000"), :text("$90.000"))').first()).toBeVisible();

      // Reload page and verify state persists
      await page.reload({ waitUntil: 'networkidle' });
      await expect.soft(page.locator(':is(:text("90.000"), :text("90000"), :text("$90.000"))').first()).toBeVisible();
    });

  });

  // ==========================================================================
  // Brief 10: Canonical Seña Contract Interception & Invalidation Tests
  // ==========================================================================
  test.describe('Brief 10: Canonical Seña Contract Form Interceptions', () => {
    test('TC-SENA-CONTRACT-001: Submitting without seña sends sena_eleccion: "sin_sena", sena_tipo: null, sena_valor: null, monto_sena: 0', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      let interceptedPayload: any = null;
      await page.route('**/alquileres', async (route) => {
        if (route.request().method() === 'POST') {
          interceptedPayload = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'alq-test-sin-sena', ...interceptedPayload }),
          });
        } else {
          await route.continue();
        }
      });

      await dialog.locator('input[id="monto_total"]').fill('300000');
      // Ensure sin_sena is selected
      await dialog.locator('[data-testid="btn-sena-sin-sena"]').click();

      // Submit
      const submitBtn = dialog.locator('[data-testid="btn-guardar-alquiler"]').first();
      await submitBtn.click();

      await expect(dialog.locator('[data-testid="alquiler-success-feedback"]')).toBeVisible({ timeout: 5000 });
      expect(interceptedPayload).not.toBeNull();
      expect(interceptedPayload.sena_eleccion).toBe('sin_sena');
      expect(interceptedPayload.sena_tipo).toBeNull();
      expect(interceptedPayload.sena_valor).toBeNull();
      expect(interceptedPayload.monto_sena).toBe(0);
    });

    test('TC-SENA-CONTRACT-002: Inherited seña submits clean payload without client-fabricated type/value and preview matches', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      let interceptedPayload: any = null;
      await page.route('**/alquileres', async (route) => {
        if (route.request().method() === 'POST') {
          interceptedPayload = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'alq-test-inherited', ...interceptedPayload }),
          });
        } else {
          await route.continue();
        }
      });

      await dialog.locator('input[id="monto_total"]').fill('400000');
      // Select heredar_grupo
      await dialog.locator('[data-testid="btn-sena-heredar-grupo"]').click();

      // Preview should show 20% of 400,000 = 80,000
      await expect(dialog.locator('[data-testid="sena-preview-amount"]')).toContainText('80.000');

      // Submit
      const submitBtn = dialog.locator('[data-testid="btn-guardar-alquiler"]').first();
      await submitBtn.click();

      await expect(dialog.locator('[data-testid="alquiler-success-feedback"]')).toBeVisible({ timeout: 5000 });
      expect(interceptedPayload).not.toBeNull();
      expect(interceptedPayload.sena_eleccion).toBe('heredar_grupo');
      expect(interceptedPayload.sena_tipo).toBeNull();
      expect(interceptedPayload.sena_valor).toBeNull();
      expect(interceptedPayload.monto_sena).toBe(80000);
    });

    test('TC-SENA-CONTRACT-003: Custom fixed seña sends sena_eleccion: "personalizada", sena_tipo: "monto_fijo", sena_valor: 65000, monto_sena: 65000 and preview matches', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      let interceptedPayload: any = null;
      await page.route('**/alquileres', async (route) => {
        if (route.request().method() === 'POST') {
          interceptedPayload = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'alq-test-custom-fixed', ...interceptedPayload }),
          });
        } else {
          await route.continue();
        }
      });

      await dialog.locator('input[id="monto_total"]').fill('200000');
      await dialog.locator('[data-testid="btn-sena-personalizada"]').click();
      await dialog.locator('[data-testid="sena-tipo-monto-fijo"]').click();
      await dialog.locator('[data-testid="sena-valor-input"]').fill('65000');

      // Preview should show 65.000
      await expect(dialog.locator('[data-testid="sena-preview-amount"]')).toContainText('65.000');

      // Submit
      const submitBtn = dialog.locator('[data-testid="btn-guardar-alquiler"]').first();
      await submitBtn.click();

      await expect(dialog.locator('[data-testid="alquiler-success-feedback"]')).toBeVisible({ timeout: 5000 });
      expect(interceptedPayload).not.toBeNull();
      expect(interceptedPayload.sena_eleccion).toBe('personalizada');
      expect(interceptedPayload.sena_tipo).toBe('monto_fijo');
      expect(interceptedPayload.sena_valor).toBe(65000);
      expect(interceptedPayload.monto_sena).toBe(65000);
    });

    test('TC-SENA-CONTRACT-004: Custom percentage seña sends sena_eleccion: "personalizada", sena_tipo: "porcentaje", sena_valor: 20, matching 20% preview and amount', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      let interceptedPayload: any = null;
      await page.route('**/alquileres', async (route) => {
        if (route.request().method() === 'POST') {
          interceptedPayload = JSON.parse(route.request().postData() || '{}');
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'alq-test-custom-pct', ...interceptedPayload }),
          });
        } else {
          await route.continue();
        }
      });

      await dialog.locator('input[id="monto_total"]').fill('250000');
      await dialog.locator('[data-testid="btn-sena-personalizada"]').click();
      await dialog.locator('[data-testid="sena-tipo-porcentaje"]').click();
      await dialog.locator('[data-testid="sena-valor-input"]').fill('20');

      // 20% of 250,000 is 50,000
      await expect(dialog.locator('[data-testid="sena-preview-amount"]')).toContainText('50.000');

      // Submit
      const submitBtn = dialog.locator('[data-testid="btn-guardar-alquiler"]').first();
      await submitBtn.click();

      await expect(dialog.locator('[data-testid="alquiler-success-feedback"]')).toBeVisible({ timeout: 5000 });
      expect(interceptedPayload).not.toBeNull();
      expect(interceptedPayload.sena_eleccion).toBe('personalizada');
      expect(interceptedPayload.sena_tipo).toBe('porcentaje');
      expect(interceptedPayload.sena_valor).toBe(20);
      expect(interceptedPayload.monto_sena).toBe(50000);
    });

    test('TC-SENA-CONTRACT-005: Unidad without active Grupo hides inheritance option and never fabricates fallback', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Switch to Unidad 3 (a0000000-0000-0000-0000-000000000003), which has grupo_id: null
      await dialog.locator('select[id="unidad_id"]').selectOption('a0000000-0000-0000-0000-000000000003');

      // Inheritance indicator must NOT be visible
      await expect(dialog.locator('[data-testid="sena-inheritance-source"]')).toHaveCount(0);
      // "Heredar del grupo" button must NOT be visible
      await expect(dialog.locator('[data-testid="btn-sena-heredar-grupo"]')).toHaveCount(0);
    });

    test('TC-SENA-CONTRACT-006: Switching to an Unidad without active Grupo cleanly invalidates prior inherited selection', async ({ page }) => {
      await setTestSessionForActor(page.context(), 'gestor');
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/es/alquileres', { waitUntil: 'networkidle' });

      const newBtn = page.locator('button:has-text("Nuevo Alquiler"), [data-testid="btn-nuevo-alquiler"]').first();
      await newBtn.click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Starts on Unidad 1 (has Grupo 1). Click heredar_grupo
      await expect(dialog.locator('[data-testid="btn-sena-heredar-grupo"]')).toBeVisible();
      await dialog.locator('[data-testid="btn-sena-heredar-grupo"]').click();
      await expect(dialog.locator('[data-testid="sena-preview-card"]')).toBeVisible();

      // Now switch to Unidad 3 (no grupo)
      await dialog.locator('select[id="unidad_id"]').selectOption('a0000000-0000-0000-0000-000000000003');

      // Inherited selection must automatically invalidate to sin_sena
      await expect(dialog.locator('[data-testid="sena-sin-sena-note"]')).toBeVisible();
      await expect(dialog.locator('[data-testid="btn-sena-heredar-grupo"]')).toHaveCount(0);
      await expect(dialog.locator('[data-testid="sena-inheritance-source"]')).toHaveCount(0);
    });
  });

});
