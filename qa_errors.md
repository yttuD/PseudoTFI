# Registro de Errores QA

## Bug de Registro por Teléfono (Fallo de Trigger)
- **Fecha:** 2026-09-05
- **Descripción:** Al registrar un nuevo usuario exclusivamente mediante número de teléfono (OTP SMS), la redirección a la vista de Facturación falla arrojando "Error al cargar datos del cupo". 
- **Causa probable:** Supabase trigger `handle_new_user()` probablemente espera que el campo de email exista o asume que el usuario se crea con email, fallando la creación del cupo inicial en la tabla `public.users` al registrarse por teléfono.
- **Acción tomada:** Documentado aquí. Para continuar QA, se reemplazó el registro de nuevo usuario por un login con usuario existente en el test E2E.

---

## Fallo de UI: Flujo A (Gestor y Monetización)
- **URL:** `/es/facturacion`
- **Error:** Timeout 30000ms
- **Elemento no encontrado:** `locator('text=Pack 5 Unidades')`
- **Detalles:** El test intentó hacer clic en el paquete de unidades, pero el selector de texto ya no coincide con lo que renderiza la UI.
- **Entornos:** Desktop Chrome, Mobile Chrome

## Fallo de UI: Flujo B (Publicación de Unidades)
- **URL:** `/es/mis-unidades/nueva`
- **Error:** Timeout 5000ms
- **Elemento no encontrado:** `locator('text=Nueva Unidad')`
- **Detalles:** La vista no muestra ningún texto "Nueva Unidad" tras la carga inicial, lo que impide continuar el flujo de publicación.
- **Entornos:** Desktop Chrome, Mobile Chrome

## Fallo de UI: Flujo C (Usuario Común, Búsqueda y Mobile)
- **URL:** `/es` (Landing)
- **Error:** Timeout 5000ms
- **Elemento no encontrado:** `locator('input[type="text"]')`
- **Detalles:** El test intentó verificar la presencia de la barra de búsqueda en la landing principal, pero el selector genérico falló.
- **Entornos:** Desktop Chrome, Mobile Chrome
