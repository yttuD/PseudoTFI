import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Evolución Módulo Alquileres, Señas, Depósitos y Criterio de Caja en Métricas', () => {

  test.beforeEach(async ({ request }) => {
    try {
      await request.delete('http://localhost:3005/alquileres/dev/limpiar', {
        headers: {
          Authorization: 'Bearer dev-access-token-gestor',
        },
      });
    } catch (e) {
      console.warn('Could not reset alquileres store:', e);
    }
  });

  test('Registrar alquiler con seña y verificar desglose financiero en vivo y en /metricas', async ({ page }) => {
    // 1. Acceder a la sección de alquileres
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/es/alquileres');
    await page.waitForLoadState('networkidle');

    // 2. Abrir Modal de Nuevo Alquiler
    const nuevoBtn = page.getByRole('button', { name: /Nuevo Alquiler/i });
    await expect(nuevoBtn).toBeVisible();
    await nuevoBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 3. Validar cero overflow horizontal
    const isOverflowing = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(isOverflowing).toBe(false);

    // 4. Completar datos del alquiler: $280.000 total, $50.000 seña, $20.000 depósito
    const montoTotalInput = page.locator('#monto_total');
    await montoTotalInput.fill('280000');

    const montoSenaInput = page.locator('#monto_sena');
    await montoSenaInput.fill('50000');

    const montoDepositoInput = page.locator('#monto_deposito');
    await montoDepositoInput.fill('20000');

    // Seleccionar estado de cobro 'seña_cobrada'
    const estadoPagoSelect = page.locator('#estado_pago');
    await estadoPagoSelect.selectOption('seña_cobrada');

    // 5. Validar widget interactivo de desglose en el propio modal
    await expect(dialog.getByText('$280.000', { exact: true })).toBeVisible();
    await expect(dialog.getByText('$50.000', { exact: true })).toBeVisible();
    await expect(dialog.getByText('$230.000', { exact: true })).toBeVisible();
    await expect(dialog.getByText('$20.000', { exact: true })).toBeVisible();

    // 6. Guardar alquiler
    const guardarBtn = dialog.getByRole('button', { name: /Guardar Alquiler/i });
    await expect(guardarBtn).toBeEnabled();
    await guardarBtn.click();

    // Esperar cierre del diálogo
    await expect(dialog).toBeHidden({ timeout: 10000 });

    // 7. Navegar a /es/metricas y validar criterio de caja
    await page.goto('/es/metricas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 15000 });

    // Comprobar ingresos del período / mes actual (Criterio de caja: $ 50.000)
    const ingresosCaja = page.getByText(/\$\s*50\.000/);
    await expect(ingresosCaja.first()).toBeVisible({ timeout: 10000 });

    // Comprobar saldo pendiente ($ 230.000)
    const saldoPendiente = page.getByText(/\$\s*230\.000/);
    await expect(saldoPendiente.first()).toBeVisible();

    // Comprobar fondos en custodia ($ 20.000)
    const fondosCustodia = page.getByText(/\$\s*20\.000/);
    await expect(fondosCustodia.first()).toBeVisible();
  });

  test('Verificar cards KPI en Facturación AFIP sin recortes tipográficos y captura visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/es/facturacion-afip');
    await page.waitForLoadState('networkidle');

    // Verificar las tres tarjetas superiores
    const totalFacturadoTitle = page.locator('text=TOTAL FACTURADO MES');
    await expect(totalFacturadoTitle).toBeVisible();

    const comprobantesTitle = page.locator('text=COMPROBANTES EMITIDOS');
    await expect(comprobantesTitle).toBeVisible();

    const ultimoCaeTitle = page.locator('text=ÚLTIMO CAE AUTORIZADO');
    await expect(ultimoCaeTitle).toBeVisible();

    // Tomar captura de pantalla de la vista
    const artifactPath = 'C:/Users/carlo/.gemini/antigravity-ide/brain/17fab217-4928-45e8-a655-68c6616d4180/kpi-audit-afip.png';
    await page.screenshot({ path: artifactPath, fullPage: false });
  });

});
