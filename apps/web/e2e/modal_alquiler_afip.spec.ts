import { test, expect } from '@playwright/test';

test.describe('Verificación Integral: Modal Alquiler, CRM Garantes Ley 25.326 y Facturación AFIP', () => {

  // TEST 1: MODAL NUEVO ALQUILER - CERO SCROLL HORIZONTAL Y FORMATO NUMÉRICO
  test('Modal Nuevo Alquiler: Cero scroll horizontal, fechas dd/MM/yyyy y creación in situ', async ({ page }) => {
    // 1. Probar en viewport móvil de 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/es/alquileres');
    await page.waitForLoadState('networkidle');

    const openBtn = page.getByRole('button', { name: /Nuevo Alquiler/i });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Validar cero scroll horizontal en el diálogo
    const isOverflowing = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(isOverflowing).toBe(false);

    // Validar formato numérico en DatePickers (DD/MM/YYYY)
    const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
    const dateButtons = dialog.locator('button').filter({ hasText: dateRegex });
    const countDates = await dateButtons.count();
    expect(countDates).toBeGreaterThanOrEqual(2);

    // Validar botón de creación in-situ de inquilino
    const inqInSituBtn = dialog.getByRole('button', { name: /Inquilino/i });
    await expect(inqInSituBtn).toBeVisible();

    // Validar zona de carga de contrato PDF
    const contratoSection = dialog.getByText(/Contrato Digital Firmado/i);
    await expect(contratoSection).toBeVisible();
  });

  // TEST 2: CRM INQUILINOS Y GARANTES CON CONSENTIMIENTO LEY 25.326
  test('CRM Inquilinos: Sección garantes y AlertDialog obligatorio de Ley 25.326', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/es/inquilinos');
    await page.waitForLoadState('networkidle');

    const openBtn = page.getByRole('button', { name: /Nuevo Inquilino/i });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Completar datos básicos del inquilino
    await page.fill('#nombre_completo', 'Roberto Martínez');
    await page.fill('#documento', '28.999.111');
    await page.fill('#telefono', '3777443322');

    // Desplegar y añadir un garante
    const garantesBtn = dialog.getByRole('button', { name: /Añadir/i });
    await expect(garantesBtn).toBeVisible();
    await garantesBtn.click();

    // Presionar "Continuar" para detonar el modal de consentimiento
    const continuarBtn = dialog.getByRole('button', { name: /Continuar/i });
    await continuarBtn.click();

    // Verificar que aparece el modal de Ley 25.326
    const consentTitle = page.getByText(/Consentimiento y Protección de Datos Personales/i);
    await expect(consentTitle).toBeVisible();

    const confirmBtn = page.getByRole('button', { name: /Confirmar y Guardar/i });
    // Debe estar deshabilitado inicialmente
    await expect(confirmBtn).toBeDisabled();

    // Marcar check 1 (titular)
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();

    // Como hay garantes agregados, aún debe estar deshabilitado hasta marcar check 2
    await expect(confirmBtn).toBeDisabled();

    // Marcar check 2 (garantes)
    await checkboxes.nth(1).check();
    // Ahora debe habilitarse
    await expect(confirmBtn).toBeEnabled();
  });

  // TEST 3: MÓDULO FACTURACIÓN AFIP (SIDEBAR, KPIS Y MODAL EMISIÓN)
  test('Facturación AFIP: Acceso desde sidebar, KPIs, tabla y modal de emisión con CAE', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. Verificar enlace en Sidebar
    const afipLink = page.locator('a[href*="/facturacion-afip"]').first();
    await expect(afipLink).toBeAttached();
    await page.goto('/es/facturacion-afip');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Facturación AFIP');

    // 2. Verificar tarjetas KPI
    await expect(page.getByText('Total Facturado Mes')).toBeVisible();
    await expect(page.getByText('Comprobantes Emitidos')).toBeVisible();
    await expect(page.getByText('Último CAE Autorizado')).toBeVisible();

    // 3. Verificar botón y modal de emisión
    const emitirBtn = page.getByRole('button', { name: /Emitir Comprobante/i });
    await expect(emitirBtn).toBeVisible();
    await emitirBtn.click();

    const emitirModal = page.getByRole('dialog');
    await expect(emitirModal).toBeVisible();
    await expect(emitirModal.getByText(/Emitir Comprobante Fiscal/i)).toBeVisible();

    // 4. Verificar tabla de comprobantes y botón PDF
    const closeBtn = emitirModal.getByRole('button', { name: /Cancelar/i });
    await closeBtn.click();

    const pdfBtn = page.getByRole('button', { name: /PDF/i }).first();
    await expect(pdfBtn).toBeVisible();
  });
});
