import { test, expect } from '@playwright/test';

test.describe('E2E: Configuración Fiscal del Gestor (Emisor ARCA / AFIP)', () => {
  test('Navegación, Card Fiscal, Edición/Guardado de Datos y Sincronización con Modal de Emisión', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/facturacion-afip');
    await page.waitForLoadState('networkidle');

    // 1. Verificar encabezado principal
    await expect(page.locator('h1')).toContainText('Facturación AFIP');

    // 2. Verificar existencia de la Card de Datos Fiscales del Emisor
    const cardFiscal = page.locator('#fiscal-config-section');
    await expect(cardFiscal).toBeVisible();
    await expect(cardFiscal.getByText('Datos Fiscales del Emisor (ARCA / AFIP)')).toBeVisible();

    // 3. Si está en vista resumen, hacer clic en "Editar Datos" para interactuar con el formulario
    const editBtn = cardFiscal.getByRole('button', { name: /Editar Datos/i });
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }

    // 4. Verificar presencia de todos los campos reglamentarios
    const cuitInput = cardFiscal.locator('#cfg_cuit');
    const razonInput = cardFiscal.locator('#cfg_razon');
    const ivaSelect = cardFiscal.locator('#cfg_iva');
    const ptoVtaInput = cardFiscal.locator('#cfg_ptovta');
    const domicilioInput = cardFiscal.locator('#cfg_domicilio');
    const entornoSelect = cardFiscal.locator('#cfg_entorno');

    await expect(cuitInput).toBeVisible();
    await expect(razonInput).toBeVisible();
    await expect(ivaSelect).toBeVisible();
    await expect(ptoVtaInput).toBeVisible();
    await expect(domicilioInput).toBeVisible();
    await expect(entornoSelect).toBeVisible();

    // 5. Completar y guardar datos tributarios
    await cuitInput.fill('20334455667');
    await razonInput.fill('RENDO GESTIÓN INMOBILIARIA S.R.L.');
    await ivaSelect.selectOption('monotributo');
    await ptoVtaInput.fill('3');
    await domicilioInput.fill('Mariano I. Loza 450, Goya, Corrientes');
    await entornoSelect.selectOption('homologacion');

    const saveBtn = cardFiscal.getByRole('button', { name: /Guardar/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 6. Verificar feedback de éxito y badge verificado
    const badgeVerificado = cardFiscal.getByText(/Datos Fiscales Verificados/i);
    await expect(badgeVerificado).toBeVisible({ timeout: 10000 });
    await expect(cardFiscal.getByText('RENDO GESTIÓN INMOBILIARIA S.R.L.')).toBeVisible();

    // 7. Abrir modal "+ Emitir Comprobante" y verificar sincronización
    const emitirBtn = page.getByRole('button', { name: /Emitir Comprobante/i });
    await expect(emitirBtn).toBeVisible();
    await emitirBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Emitir Comprobante Fiscal/i)).toBeVisible();

    // Verificar que el emisor y el punto de venta (3) están sincronizados
    await expect(dialog.getByText(/RENDO GESTIÓN INMOBILIARIA S.R.L./i)).toBeVisible();
    const ptoVtaDialog = dialog.locator('#pto_vta');
    await expect(ptoVtaDialog).toHaveValue('3');

    // Cerrar modal
    const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });
});
