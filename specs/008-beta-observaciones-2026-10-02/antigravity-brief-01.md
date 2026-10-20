# Antigravity — corrección UI/integración, lote 1

Modelo obligatorio: `gemini-3.8-flash-medium`; esfuerzo `medium`.
Trabajá en este checkout de Rendo. Leé `CONTEXT.md`, `specs/008-beta-observaciones-2026-10-02/issues.md`
y los archivos que vayas a modificar. El árbol ya tiene cambios locales de Codex y del usuario:
preservalos. No uses ni copies el DOCX de Descargas ni capturas con datos reales.

## Alcance

Implementá N02, N03 y N04, y la parte de traducción de interfaz de N05:

1. En edición de Unidad, permitir cambiar categoría y verificar que persiste tras recargar.
   Mantener coherentes los campos y etiquetas de categoría, incluyendo Cancha.
2. Mostrar en el editor exactamente las modalidades de precio activas persistidas;
   editar y eliminar sin duplicarlas. La publicación debe mostrar el mismo conjunto.
   No modificar datos reales ni hacer saneamiento masivo: si hay duplicados existentes,
   informar una estrategia segura y cuántos se podrían detectar, sin ejecutar cambios remotos.
3. La dirección textual ya se captura localmente y su esquema está preparado en
   `20261001010000_unit_address_and_regional_prices.sql`. Proyectarla en el detalle
   público *solo para usuario autenticado*. Para anónimos, conservar ubicación
   aproximada sin dirección exacta. Si no hay dirección, mostrar ausencia sin inventar.
4. Localizar el botón de WhatsApp y su mensaje prellenado para es/en/pt, usando
   el sistema de mensajes existente. Inventariar otros textos duros visibles en ese
   detalle y corregir los que estén dentro del componente afectado.

`TraduccionService` de API actualmente devuelve `[EN] texto`/`[PT] texto`: eso NO es
traducción. Diagnosticá opciones para N05 pero NO inventes una traducción ni integres
un proveedor externo sin clave/configuración aprobada. Informá el bloqueo exacto.

## Límites

- No tocar RLS, grupos, auth, cupos ni facturación; Codex supervisa esos apartados.
- No desplegar, migrar, comprometer a Git ni borrar documentos o carpetas del usuario.
- No añadir dependencia o servicio pago sin aprobación. No exponer tokens o datos reales.
- No ejecutar `git reset`, `git clean`, borrado amplio ni cambios en `.env`.
- Si una prueba necesita datos, usar fixture sintética y limpiar solo archivos temporales
  creados por esta tarea, previa comprobación de ruta.

## Verificación y entrega

- Añadir regresiones de integración/API cuando corresponda y Playwright para los flujos
  visuales. Capturas desktop y mobile de cada vista modificada con datos sintéticos;
  entregar rutas absolutas de las imágenes. Inspeccioná las capturas, no solo generarlas.
- Correr typechecks y pruebas dirigidas. Si el backend real no está disponible, decirlo
  con precisión y NO dar como verificada la integración remota.
- En modo desatendido usá `view_file` y `grep_search` para inspección; no uses
  `run_command` para `rg`, que el motor de permisos de Windows está rechazando.
  No uses MCP ni subagentes: este lote no los requiere y el CLI no puede pedir
  aprobación interactiva para ellos. Leé el código directamente.
  Tenés permiso temporal para ejecutables directos de TypeScript,
  Vitest y Playwright bajo `apps/*/node_modules`. Usá rutas desde la raíz del
  repositorio, por ejemplo `node apps/web/node_modules/@playwright/test/cli.js test
  --config=apps/web/playwright.observaciones.config.ts`. Si falta otro permiso,
  seguí con lo que puedas y reportá el comando exacto; nunca pidas modo irrestricto.
- Respuesta final breve y técnica: tabla N02/N03/N04/N05 con causa, cambio exacto,
  prueba y resultado; lista de archivos tocados; rutas de capturas; límites/riesgos;
  confirmación de que no hubo despliegue ni cambios remotos.
- Trabajá de forma autónoma hasta terminar este lote. No informes progreso intermedio;
  Codex revisará la entrega final y luego decidirá el siguiente lote.
