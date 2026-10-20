import { test, expect } from '@playwright/test';

const GESTOR_USER = {
  email: 'gestor@renda.com.ar',
  password: 'Password123!',
};

test.describe('Fases 1 a 5: Bento Grid, Nominatim Geocoding, Auto-Traducción y UX Precios', () => {
  test('TC-BENTO-01: Grilla Bento en /mis-unidades con grupos, sin grupo y botón crear grupo', async ({ page }) => {
    // 1. Login como Gestor
    await page.goto('/es/auth/login');
    await page.fill('input[type="email"]', GESTOR_USER.email);
    await page.fill('input[type="password"]', GESTOR_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/es\/mis-unidades|\/es\/dashboard/, { timeout: 15000 });

    // 2. Navegar a /es/mis-unidades
    await page.goto('/es/mis-unidades');
    await page.waitForLoadState('networkidle');

    // Verificar Bento Grid o contenedor principal
    const mainArea = page.locator('main');
    await expect(mainArea).toBeVisible();

    // Debe existir tarjeta o contenedor para Unidades sin Grupo Asignado o el grupo demo
    const sinGrupoOrGrupos = mainArea.getByText(/Unidades sin Grupo Asignado|Complejo Costanera Norte/i);
    await expect(sinGrupoOrGrupos.first()).toBeVisible();

    // Botón "+ Crear Nuevo Grupo" o "Nuevo Grupo" presente en main
    const btnCrearGrupo = mainArea.locator('button:has-text("Crear Nuevo Grupo"), button:has-text("Nuevo Grupo")');
    await expect(btnCrearGrupo.first()).toBeVisible();
  });

  test('TC-FORM-02: Formulario Nueva Unidad con Nominatim, Traducción y Modalidades de Lenguaje Natural', async ({ page }) => {
    // 1. Login
    await page.goto('/es/auth/login');
    await page.fill('input[type="email"]', GESTOR_USER.email);
    await page.fill('input[type="password"]', GESTOR_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/es\/mis-unidades|\/es\/dashboard/, { timeout: 15000 });

    // 2. Ir al formulario de creación
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('networkidle');

    // Fase 2: Input de geocodificación Nominatim presente
    const searchAddressInput = page.locator('input[placeholder*="Belgrano 750"], input[placeholder*="Dirección"]');
    await expect(searchAddressInput).toBeVisible();

    // Fase 3: Auto-traducción y Pestañas de idioma
    const tabEs = page.locator('button:has-text("Español")');
    const tabEn = page.locator('button:has-text("English")');
    const tabPt = page.locator('button:has-text("Português")');
    await expect(tabEs.first()).toBeVisible();
    await expect(tabEn.first()).toBeVisible();
    await expect(tabPt.first()).toBeVisible();

    // Switch de auto-traducción
    const autoTraducirSwitch = page.locator('button[role="switch"]');
    await expect(autoTraducirSwitch.first()).toBeVisible();

    // Fase 4: Modalidades de precio con tarjetas amigables
    const tarjetaDiario = page.getByText(/Diario \/ Por Noche/i);
    const tarjetaMensual = page.getByText(/Mensual/i);
    const tarjetaHora = page.getByText(/Por Hora/i);
    await expect(tarjetaDiario.first()).toBeVisible();
    await expect(tarjetaMensual.first()).toBeVisible();
    await expect(tarjetaHora.first()).toBeVisible();

    // Barra de acciones sticky
    const btnGuardar = page.locator('button:has-text("Guardar Unidad")');
    await expect(btnGuardar).toBeVisible();
  });

  test('TC-AUTOCOMPLETE-03: Typeahead Autocomplete Dropdown con Nominatim ("Colón") y selección', async ({ page }) => {
    // Interceptar la API de búsqueda de Nominatim
    await page.route('**/nominatim.openstreetmap.org/search*', async (route) => {
      const json = [
        {
          place_id: 998878,
          lat: '-29.1450',
          lon: '-59.2610',
          display_name: 'Colón 1050, Goya, Corrientes, W3450, Argentina',
          name: 'Colón',
          address: {
            road: 'Colón',
            house_number: '1050',
            city: 'Goya',
            state: 'Corrientes',
            country: 'Argentina'
          }
        }
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    // 1. Login
    await page.goto('/es/auth/login');
    await page.fill('input[type="email"]', GESTOR_USER.email);
    await page.fill('input[type="password"]', GESTOR_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/es\/mis-unidades|\/es\/dashboard/, { timeout: 15000 });

    // 2. Ir a nueva unidad
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('networkidle');

    // 3. Escribir "Colón" en el input de dirección
    const searchAddressInput = page.locator('input[placeholder*="Belgrano 750"]');
    await expect(searchAddressInput).toBeVisible();
    await searchAddressInput.fill('Colón');

    // 4. Verificar que se despliega el dropdown flotante con las sugerencias
    const suggestionItem = page.locator('button:has-text("Colón 1050")');
    await expect(suggestionItem).toBeVisible({ timeout: 5000 });

    // 5. Seleccionar la sugerencia
    await suggestionItem.click();

    // 6. El input debe completarse con la dirección elegida
    await expect(searchAddressInput).toHaveValue(/Colón 1050/);

    // 7. El badge de confirmación "Ubicación fijada:" debe estar visible
    const badgeFijada = page.locator('text=/Ubicación fijada:/i');
    await expect(badgeFijada).toBeVisible();
  });

  test('TC-REVERSE-GEOCODING-04: Clic en el mapa Leaflet dispara Reverse Geocoding y sincroniza input', async ({ page }) => {
    // Interceptar la API de reverse geocoding de Nominatim
    await page.route('**/nominatim.openstreetmap.org/reverse*', async (route) => {
      const json = {
        place_id: 887766,
        lat: '-29.1460',
        lon: '-59.2630',
        display_name: 'Mariano I. Loza 450, Goya, Corrientes, Argentina',
        address: {
          road: 'Mariano I. Loza',
          house_number: '450',
          city: 'Goya',
          state: 'Corrientes',
          country: 'Argentina'
        }
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json)
      });
    });

    // 1. Login
    await page.goto('/es/auth/login');
    await page.fill('input[type="email"]', GESTOR_USER.email);
    await page.fill('input[type="password"]', GESTOR_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/es\/mis-unidades|\/es\/dashboard/, { timeout: 15000 });

    // 2. Ir a nueva unidad
    await page.goto('/es/mis-unidades/nueva');
    await page.waitForLoadState('networkidle');

    // 3. En mobile, si el botón de abrir mapa modal está visible, abrirlo
    const openMobileMapBtn = page.locator('button:has-text("Fijar ubicación en mapa"), button:has-text("Editar ubicación en mapa")');
    if (await openMobileMapBtn.isVisible()) {
      await openMobileMapBtn.click();
    }

    const leafletCanvas = page.locator('.leaflet-container:visible').first();
    await expect(leafletCanvas).toBeVisible({ timeout: 10000 });
    await leafletCanvas.click({ position: { x: 120, y: 120 } });

    // Si estábamos en modal móvil, confirmar ubicación
    const confirmBtn = page.locator('button:has-text("Confirmar Ubicación")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // 4. El input debe sincronizarse automáticamente mediante reverse geocoding con la dirección detectada
    const searchAddressInput = page.locator('input[placeholder*="Belgrano 750"]');
    await expect(searchAddressInput).toHaveValue(/Mariano I\. Loza/i, { timeout: 10000 });
  });

  test('TC-LANGUAGE-OPAQUE-05: Selector de idiomas es 100% opaco y sin transparencias translúcidas', async ({ page }) => {
    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    // Abrir el selector de idiomas visible (Desktop Navbar o Mobile NativeHeader)
    const langBtn = page.locator('button[aria-haspopup="listbox"]:visible').first();
    await expect(langBtn).toBeVisible();
    await langBtn.click();

    // Verificar contenedor dropdown con opacity-100 y bg-card sólido
    const dropdown = page.locator('div[role="listbox"]:visible').first();
    await expect(dropdown).toBeVisible();
    const dropdownClass = await dropdown.getAttribute('class');
    expect(dropdownClass).toContain('opacity-100');
    expect(dropdownClass).toContain('bg-card');
    expect(dropdownClass).not.toContain('backdrop-blur');

    // Verificar opciones con hover/active corporativos
    const langOption = dropdown.locator('a[role="option"]').first();
    await expect(langOption).toBeVisible();
  });
});
