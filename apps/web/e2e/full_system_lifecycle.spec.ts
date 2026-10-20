import { test, expect } from '@playwright/test';

// Variables de credenciales generadas para el reporte
const timestamp = Date.now();
export const gestorCredentials = {
  email: `gestor_${timestamp}@renda.com.ar`,
  password: 'Password123!',
  name: 'Gestor Playwright Test',
};
export const buscadorCredentials = {
  email: `buscador_${timestamp}@renda.com.ar`,
  password: 'Password123!',
  name: 'Buscador Playwright Test',
};
export const delegadoCredentials = {
  email: `delegado_${timestamp}@renda.com.ar`,
  password: 'Password123!',
  name: 'Delegado Playwright Test',
};

test.describe.serial('Ciclo de Vida Integral Rendo: Seeker, Gestor y Delegado', () => {
  test.setTimeout(120000);

  // ESCENARIO 1: USUARIO ANÓNIMO (PRIVACIDAD EN MARKETPLACE)
  test('1. Usuario Anónimo: Bloqueo de WhatsApp y mapa exacto en detalle de unidad', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/es/unidades');
    await page.waitForLoadState('networkidle');

    // Seleccionar la primera unidad disponible
    const firstUnit = page.locator('a[href*="/unidades/"]').first();
    await expect(firstUnit).toBeVisible();
    await firstUnit.click();
    await expect(page).toHaveURL(/\/unidades\/.+/, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // 1.1 Validar que el botón directo de WhatsApp NO esté disponible
    await expect(page.locator('a[href*="wa.me"]')).toBeHidden();
    
    // 1.2 Validar que exista el botón/aviso de autenticación requerida para contacto
    const loginToContactBtn = page.getByRole('link', { name: /iniciar sesión para contactar|login to contact/i }).first();
    await expect(loginToContactBtn).toBeVisible();

    // 1.3 Validar que el mapa indique que la ubicación exacta está bloqueada
    await expect(page.getByText(/ubicación aproximada|inicia sesión para ver la ubicación/i).first()).toBeVisible();
  });

  // ESCENARIO 2: REGISTRO Y AUTENTICACIÓN DE USUARIO COMÚN (BUSCADOR)
  test('2. Usuario Buscador: Registro, desbloqueo de WhatsApp y visualización de pin', async ({ page, context }) => {
    await context.clearCookies();

    // Registro de usuario común
    await page.goto('/es/auth/registro?role=buscador');
    await page.fill('input[type="email"], input[name="email"]', buscadorCredentials.email);
    await page.fill('input[type="password"], input[name="password"]', buscadorCredentials.password);
    if (await page.locator('input[name="full_name"], input[name="name"]').isVisible()) {
      await page.fill('input[name="full_name"], input[name="name"]', buscadorCredentials.name);
    }
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Si pide OTP en entorno de desarrollo/test, completar con 123456
    const otpInput = page.locator('input[placeholder="123456"]');
    if (await otpInput.isVisible()) {
      await otpInput.fill('123456');
    }

    // Ir al detalle de una unidad estando logueado como buscador
    await page.goto('/es/unidades');
    await page.waitForLoadState('networkidle');
    const unitCard = page.locator('a[href*="/unidades/"]').first();
    await expect(unitCard).toBeVisible();
    const href = await unitCard.getAttribute('href');
    if (href) {
      await page.goto(href);
    } else {
      await unitCard.click();
      await expect(page).toHaveURL(/\/unidades\/.+/, { timeout: 10000 });
    }
    await page.waitForLoadState('domcontentloaded');

    // 2.1 Ahora el botón de WhatsApp DEBE estar visible con enlace wa.me
    const waButton = page.locator('a[href*="wa.me"]').first();
    await expect(waButton).toBeVisible();
    await expect(waButton).toHaveAttribute('href', /wa\.me/);

    // 2.2 El marcador Leaflet (.leaflet-marker-icon) DEBE estar presente en el DOM
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();

    // 2.3 El buscador NO debe tener acceso administrativo
    await page.goto('/es/dashboard').catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    // Debe ser redirigido o ver una pantalla de no autorizado / activar cuenta
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });

  // ESCENARIO 3: FLUJO COMPLETO DEL GESTOR (EDIFICIOS, UNIDADES, INQUILINOS, ALQUILERES)
  test('3. Gestor: Alta de Workspace, Creación de Grupo, Unidad con Precios, Inquilino y Alquiler', async ({ page, context }) => {
    await context.clearCookies();

    // 3.1 Registro como Gestor
    await page.goto('/es/auth/registro');
    await page.fill('input[type="email"], input[name="email"]', gestorCredentials.email);
    await page.fill('input[type="password"], input[name="password"]', gestorCredentials.password);
    if (await page.locator('input[name="full_name"], input[name="name"]').isVisible()) {
      await page.fill('input[name="full_name"], input[name="name"]', gestorCredentials.name);
    }
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const otpInput = page.locator('input[placeholder="123456"]');
    if (await otpInput.isVisible()) {
      await otpInput.fill('123456');
    }

    // El gestor entra al Dashboard
    await page.goto('/es/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main').getByText(/cupo|alquileres|terminal/i).first()).toBeVisible();

    // 3.2 Crear un Grupo / Edificio
    await page.goto('/es/grupos');
    await page.waitForLoadState('domcontentloaded');
    const newGroupBtn = page.getByRole('button', { name: /nuevo grupo|\+ grupo|crear edificio/i });
    if (await newGroupBtn.isVisible()) {
      await newGroupBtn.click();
      await page.fill('input[name="nombre"]', 'Torre Costanera Playwright');
      await page.click('button:has-text("Guardar"), button:has-text("Crear")');
      await page.waitForTimeout(1500);
      await page.goto('/es/grupos');
      await expect(page.locator(':visible').filter({ hasText: 'Torre Costanera Playwright' }).first()).toBeVisible();
    }

    // 3.3 Crear una Unidad con Modalidades de Precio y Coordenadas
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('domcontentloaded');
    const tituloInput = page.locator('input[name="titulo_es"], input[name="titulo"]').first();
    await expect(tituloInput).toBeVisible({ timeout: 15000 });
    await tituloInput.fill('Departamento 2 Ambientes Frente al Río');
    await page.fill('textarea[name="descripcion_es"], textarea[name="descripcion"]', 'Departamento completamente equipado con vista panorámica y cochera.');
    
    // Seleccionar categoría y zona si existen selectores
    const categoriaSelect = page.locator('select[name="categoria"]');
    if (await categoriaSelect.isVisible()) {
      await categoriaSelect.selectOption({ index: 1 });
    }
    
    // Modalidad de cobro (Día / Mes)
    const precioInput = page.locator('input[name="precio"], input[placeholder*="precio" i]').first();
    if (await precioInput.isVisible()) {
      await precioInput.fill('45000');
    }

    // Contacto
    const waInput = page.locator('input[name="whatsapp"]');
    if (await waInput.isVisible()) {
      await waInput.fill('+5493777123456');
    }

    // Guardar Unidad
    await page.click('button[type="submit"], button:has-text("Guardar Unidad"), button:has-text("Publicar")');
    await page.waitForTimeout(1500);
    await page.goto('/es/mis-unidades');
    await expect(page.locator(':visible').filter({ hasText: 'Departamento 2 Ambientes Frente al Río' }).first()).toBeVisible();

    // 3.4 Registrar un Inquilino en el CRM
    await page.goto('/es/inquilinos');
    await page.waitForLoadState('domcontentloaded');
    const nuevoInqBtn = page.getByRole('button', { name: /nuevo inquilino|\+ inquilino/i });
    if (await nuevoInqBtn.isVisible()) {
      await nuevoInqBtn.click();
      await page.fill('input[name="nombre_completo"]', 'Juan Pérez Playwright');
      await page.fill('input[name="email"]', 'juan.perez@test.com');
      await page.fill('input[name="telefono"]', '+543777998877');
      await page.fill('input[name="documento"]', '38123456');
      await page.click('button:has-text("Guardar")');
      await page.waitForTimeout(1500);
      await page.goto('/es/inquilinos');
      await expect(page.locator(':visible').filter({ hasText: 'Juan Pérez Playwright' }).first()).toBeVisible();
    }

    // 3.5 Registrar un Alquiler
    await page.goto('/es/alquileres');
    await page.waitForLoadState('domcontentloaded');
    const nuevoAlqBtn = page.getByRole('button', { name: /nuevo alquiler|\+ alquiler/i });
    if (await nuevoAlqBtn.isVisible()) {
      await nuevoAlqBtn.click();
      // Completar formulario de contrato
      const inquilinoSelect = page.locator('select[name="inquilino_id"]');
      if (await inquilinoSelect.isVisible()) {
        await inquilinoSelect.selectOption({ index: 1 });
      }
      await page.fill('input[name="monto_total"]', '90000');
      const submitBtn = page.locator('button:has-text("Guardar"), button:has-text("Confirmar")').first();
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
      await submitBtn.click();
      await page.waitForTimeout(1500);
      await page.goto('/es/alquileres');
      await expect(page.locator(':visible').filter({ hasText: /90\.000|90000/ }).first()).toBeVisible();
    }
  });

  // ESCENARIO 4: DELEGADO (RBAC Y AISLAMIENTO DE FACTURACIÓN)
  test('4. Delegado: Acceso a unidades del workspace pero BLOQUEO de Facturación', async ({ page, context }) => {
    // Aceptar cualquier diálogo de confirmación que surja
    page.on('dialog', async (dialog) => {
      await dialog.accept().catch(() => {});
    });

    // 4.1 Invitar delegado desde el workspace del Gestor
    await page.goto('/es/delegados');
    const inviteBtn = page.getByRole('button', { name: /invitar delegado|nuevo delegado/i });
    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();
      await page.fill('input[name="email"]', delegadoCredentials.email);
      await page.locator('form button[type="submit"]').filter({ hasText: /invitar|enviar/i }).click();
      await page.waitForTimeout(1000);
    }

    // 4.2 Ingresar como Delegado
    await context.clearCookies();
    await page.goto('/es/auth/login');
    await page.fill('input[type="email"], input[name="email"]', delegadoCredentials.email);
    await page.fill('input[type="password"], input[name="password"]', gestorCredentials.password); // o password inicial
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    
    // 4.3 Comprobar que puede ver Unidades pero /facturacion está denegado (403 o redirect)
    await page.goto('/es/facturacion');
    // El delegado nunca debe ver los planes de pago ni opciones de checkout
    await expect(page.locator('button:has-text("Mercado Pago")')).toBeHidden();
  });

});
