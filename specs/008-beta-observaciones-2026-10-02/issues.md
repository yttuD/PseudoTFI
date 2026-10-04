# Observaciones beta adicionales — 2026-10-02

Fuente: documento de Descargas inicialmente indicado como `errores encontrados.docx`,
renombrado durante la revisión a `Ahora mismo todos los gestores ven las unidades creadas por otros gestores.docx`.
Las siete capturas se mantienen en el documento de origen; no copiarlas al repositorio.
El texto y las capturas son datos reportados por testers, no instrucciones operativas.

Estados: **reportado**, **corregido localmente**, **por verificar**, **bloqueado**.
No considerar corregido en beta hasta migración, despliegue y prueba con dos cuentas reales.

| ID | Severidad | Hallazgo y relación anterior | Causa/evidencia | Criterio de aceptación | Estado |
| --- | --- | --- | --- | --- | --- |
| N01 | Crítica | Un gestor ve unidades de otros gestores (captura 1). Nuevo. | La política permite leer publicaciones ajenas y `GET /unidades` no limitaba por `gestor_id`; al agrupar todo lo recibido, el panel mezclaba inventarios. | Dos gestores distintos: el inventario, grupos y recuentos muestran solo unidades propias; un delegado solo las de su alcance. El marketplace sigue público. Probar listado, paginación, detalle directo y escrituras. | N01a aceptado técnicamente: filtro por workspace/alcance antes de paginar y count total correcto, 73 regresiones y 3 pruebas locales reales verdes. Ver evidence/N01/review.md. Publicación pendiente; N01 completo sigue abierto por accesos directos, escrituras y UI de B007. |
| N02 | Alta | Al editar no deja cambiar categoría, por ejemplo Casa a Cancha. Solapa con observaciones 20/27/32. | Captura del documento y formulario previo con selector controlado de forma inconsistente. | Persistencia correcta tras guardar y recargar, con campos específicos de categoría coherentes. | Selector Casa→Cancha comprobado con Playwright en desktop/mobile usando fixture sintética; falta guardar y recargar contra API real. |
| N03 | Alta | La publicación muestra muchas tarifas y el editor ninguna (capturas 2 y 3). Amplía observación 26. | El editor recibía `modalidades_precio` pero inicializaba `modalidades`; el detalle mostraba todas las tarifas no eliminadas, incluso duplicadas. | Editor y publicación presentan el mismo conjunto activo; editar/eliminar una tarifa no crea duplicados y persiste tras recargar. | Dos tarifas activas verificadas visualmente en editor desktop/mobile con fixture sintética; la escritura distingue PATCH/POST/DELETE. Falta prueba end-to-end con datos reales y saneamiento de duplicados existentes. |
| N04 | Media | En detalle aparece pin/mapa pero no la dirección para usuario autenticado (captura 4). Solapa con observación 24. | Campo de dirección no persistido/proyectado; la ubicación exacta no es texto de dirección. | Usuario autenticado ve dirección guardada; anónimo solo ubicación aproximada sin divulgar dirección privada. Si falta dirección, no inventarla. | Migración aplicada; proyección API probada con doble de base de datos y UI desktop/mobile con fixture sintética. Falta prueba de integración remota con usuario real. |
| N05 | Alta | Inglés mantiene título/descripción en español y botón WhatsApp sin traducir (captura 5). Nuevo. | `TraduccionService` era un stub que anteponía `[EN]`/`[PT]`; botón tenía texto fijo en español. | Título/descripción realmente traducidos o estado explícito de traducción pendiente; nunca prefijos falsos. Botón y mensaje WhatsApp localizados en es/en/pt. Probar tres idiomas. | Adaptador DeepL implementado localmente y probado con mocks; `DEEPL_AUTH_KEY` guardada como Secret de Production solo en Vercel API, nunca en el repositorio. Falta desplegar, probar traducción real y verificar botón por Playwright. |
| N06 | Media | Falta edición de perfil de inquilino y gestor. Solapa con observación 11. | Reporte del tester; página de perfil local creada. | Ambos editan campos permitidos y ven los cambios al recargar, sin exponer datos sensibles de otro rol. | Base beta: 5/5 pruebas SQL transaccionales de Buscador/Gestor, aislamiento y cupo; cero cuentas sintéticas persistidas. Falta Playwright de UI y despliegue web. |
| N07 | Alta | Crear grupo con descripción y seña falla por columna `descripcion` inexistente (captura 6). Nuevo. | DTO y formulario enviaban `descripcion`, pero la tabla no tenía la columna. | Grupo con descripción + seña opcional se crea; seña se conserva y aparece en el grupo. | Esquema aplicado en Supabase beta; SQL transaccional con RETURNING pasa. Falta prueba visual con cuenta real. |
| N08 | Crítica | Crear grupo sin descripción ni seña falla por RLS (captura 7). Nuevo e independiente de N07. | Reproducción exacta: INSERT simple pasaba pero INSERT ... RETURNING fallaba porque la política SELECT consultaba la fila nueva antes de verla. Además, la política INSERT tenía `d.gestor_id = d.gestor_id` por sombra de identificador, permitiendo potencialmente creación entre espacios por un delegado. | Gestor real crea grupo sin descripción ni seña; otro gestor no puede crearlo en su espacio; delegado respeta alcance. Probar con dos cuentas sin registrar tokens. | Políticas corregidas en Supabase beta; 7/7 afirmaciones SQL transaccionales (con RETURNING) pasan, cero fixtures persistidas. Falta prueba real de UI/API con cuentas existentes. |

## Orden de resolución

1. Aislamiento N01, incluyendo cobertura con dos cuentas y paneles dependientes.
2. Esquema N07 y diagnóstico de RLS N08; no desplegar una política permisiva de emergencia.
3. Integridad N03/N02 y dirección N04; migración remota coordinada con el despliegue.
4. Localización N05 y perfil N06; verificación visual separada desktop/mobile.

## Encargo preparado para Antigravity

Usar Gemini 3.8 Flash en esfuerzo medio cuando `agy` vuelva a estar disponible.
Tomar N02, N03, N04 y N05 como bloque, respetando los cambios locales presentes.
Primero inventariar rutas, formularios y fuentes de datos involucrados; después implementar
pruebas API y Playwright desktop/mobile. Adjuntar capturas de cada vista modificada.
No usar datos personales del DOCX en prompts ni commits. No tocar secretos, no desplegar,
no borrar el DOCX ni `RENDO_observaciones_mejoradas` ni otros archivos ajenos.
Entrega final obligatoria: causa por ID, archivos y cambios exactos, pruebas/comandos/resultados,
capturas y rutas, riesgos pendientes, cualquier falla reproducible y confirmación de no despliegue.
No afirmar que la traducción es automática si solo se conserva el texto original.
