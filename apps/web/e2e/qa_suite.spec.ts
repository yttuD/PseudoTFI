import { test, expect } from '@playwright/test';

// Ejecutar en serie para evitar rate-limits de Supabase en el mismo número
test.describe.configure({ mode: 'serial' });
test.use({ storageState: { cookies: [], origins: [] } });

let delegadoEmail = `delegado${Math.floor(Math.random() * 1000000)}@test.com`;

async function registerGestor(page) {
  const rand = Math.floor(Math.random() * 1000000);
  const email = `gestor${rand}@test.com`;
  
  await page.goto('/es/auth/registro');
  await page.click('button:has-text("Email")');
  await page.fill('#email', email);
  await page.fill('#password', 'password123');
  await page.fill('#fullName', 'Gestor QA');
  
  await page.click('button:has-text("Registrarse")');

  // Debería redirigir al dashboard sin confirmación
  await expect(page).toHaveURL(/\/es\/dashboard/, { timeout: 15000 });
  return email;
}

test('Flujo 1: Gestor - Facturación, MP, Unidades, Grupos, Inquilinos, Delegados', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  const email = await registerGestor(page);

  // 1. Facturación y MP
  await page.goto('/es/facturacion');
  
  // Interceptar la llamada a MercadoPago para simular la redirección a ?status=approved
  await page.route('**/pagos/mercadopago/preferencia', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ init_point: 'http://localhost:3000/es/facturacion?status=approved' })
    });
  });

  // Omitir alert nativo de JS que bloquea Playwright para Facturacion
  page.once('dialog', async dialog => {
    try {
      if (dialog.message().includes('Pago procesado con éxito')) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    } catch (e) {}
  });

  // Buscar la tarjeta "Pack 5 Unidades" y hacer click en Comprar
  const packCard = page.locator('div').filter({ hasText: 'Pack 5 Unidades' }).filter({ hasText: 'Sin vencimiento' }).first();
  await packCard.locator('button', { hasText: 'Comprar' }).first().click();
  // En el modal, hacer click en MercadoPago
  await page.click('button:has-text("MercadoPago")');

  // Validar retorno (la ruta interceptada nos tirará a ?status=approved)
  await expect(page).toHaveURL(/.*status=approved/, { timeout: 10000 });

  // 2. Publicar unidades
  await page.goto('/es/mis-unidades/nueva');
  await expect(page.locator('h1:has-text("Nueva Unidad")')).toBeVisible();

  // Llenar categoría (Radix UI Select)
  await page.click('button[role="combobox"]');
  await page.click('div[role="option"]:has-text("Departamento")');

  // Llenar info de Marketplace
  await page.click('button[role="tab"]:has-text("Marketplace")');
  await page.fill('input[name="titulo_es"]', 'Departamento Test E2E');
  await page.fill('textarea[name="descripcion_es"]', 'Una hermosa unidad de prueba');

  // Agregar modalidad
  await page.click('button[role="tab"]:has-text("Modalidades")');
  await page.click('button:has-text("+ Agregar Modalidad")');
  await page.fill('input[name="modalidades.0.precio"]', '10000');

  // Interceptar el alert
  page.once('dialog', async dialog => {
    try {
      if (dialog.message().includes('Unidad creada')) {
        await dialog.accept();
      } else {
        console.error('UNEXPECTED DIALOG:', dialog.message());
        await dialog.dismiss();
      }
    } catch (e) {}
  });

  // Guardar Unidad
  await page.click('button:has-text("Guardar Unidad")');
  await expect(page).toHaveURL(/.*\/es\/mis-unidades\/.*/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  // 3. Crear Grupo
  await page.goto('/es');
  await expect(page.locator('h1')).toContainText(/Encontrá el espacio perfecto|Marketplace|Propiedades|Alquiler/i);
  await page.click('a:has-text("Buscar")');
  await page.waitForTimeout(500); // Wait for Radix UI Dialog animation and focus trap
  await page.fill('#nombre', 'Grupo Test E2E');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('text=Grupo Test E2E').first()).toBeVisible({ timeout: 15000 });

  // 4. Crear Inquilino
  await page.goto('/es/inquilinos');
  await expect(page.locator('h1:has-text("Inquilinos")')).toBeVisible();
  await page.click('button:has-text("Nuevo Inquilino")');
  await page.waitForTimeout(500);
  await page.fill('#nombre_completo', 'Inquilino Test E2E');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('text=Inquilino Test E2E')).toBeVisible({ timeout: 15000 });

  // 5. Invitar Delegado
  await page.goto('/es/delegados');
  await expect(page.locator('h1:has-text("Delegados")')).toBeVisible();
  await page.click('button:has-text("+ Invitar Delegado")');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', delegadoEmail);
  await page.getByRole('button', { name: 'Invitar', exact: true }).click();
  
  // Como el componente hace un alert de éxito, necesitamos aceptar el dialog
  page.once('dialog', async dialog => {
    try {
      if (dialog.message().includes('delegado')) {
        await dialog.accept();
      } else {
        console.error('UNEXPECTED DIALOG:', dialog.message());
        await dialog.dismiss();
      }
    } catch (e) {}
  });
  
  await expect(page.locator(`text=${delegadoEmail}`)).toBeVisible({ timeout: 15000 });
});

test('Flujo 2: Delegado - Login y Acceso a Workspace', async ({ page }) => {
  // 1. Registrarse como el delegado invitado en Flujo 1
  await page.goto('/es/auth/registro');
  await page.click('button:has-text("Email")');
  
  await page.fill('#email', delegadoEmail);
  await page.fill('#password', 'password123');
  await page.fill('#fullName', 'Delegado QA');
  
  await page.click('button:has-text("Registrarse")');

  // Debería redirigir al dashboard
  await expect(page).toHaveURL(/\/es\/dashboard/, { timeout: 15000 });
  
  // Validar que no vea opciones prohibidas para delegado, ej. Facturación
  await expect(page.locator('text=Facturación')).toBeHidden();
  // Validar que vea Mis Unidades
  await expect(page.locator('text=Mis Unidades').first()).toBeVisible();
});

test('Flujo 3: Cliente Normal - Landing y Búsqueda', async ({ page }) => {
  await page.goto('/es');
  
  // Omitir paso 1
  await page.click('button:has-text("Siguiente")');
  // Omitir paso 2
  await page.click('button:has-text("Siguiente")');
  // Llenar precio y buscar
  await page.fill('input[type="number"]', '150000');
  await page.click('button:has-text("Buscar")');
  
  await page.waitForTimeout(1000); // Darle tiempo a React en Mobile
  await expect(page).toHaveURL(/.*\/es\/unidades.*/, { timeout: 15000 });
  
  // Validar que veamos resultados (al menos la unidad que creamos en Flujo 1)
  // Aunque si los flujos corrieran en paralelo o limpios no estaría,
  // como corremos serial, el "Departamento Test E2E" con precio 10000 debería aparecer.
  await expect(page.locator('text=Departamento Test E2E').first()).toBeVisible({ timeout: 15000 });
  
  // Entrar al detalle de la unidad
  await page.locator('text=Departamento Test E2E').first().click();
  await expect(page).toHaveURL(/.*\/es\/unidades\/.*/, { timeout: 15000 });
  
  // Como usuario deslogueado (o cliente normal), intentar Ver Ubicación Exacta
  // Dependiendo de la regla de negocio, podría mostrar el mapa o pedir login
  // Sólo verificamos que la página cargue correctamente
  await expect(page.locator('h1:has-text("Departamento Test E2E")')).toBeVisible();
});
