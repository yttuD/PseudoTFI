# Contratos de aceptación — feature008

## Inventario (FR001-003 / SC001)

GET /unidades: {data,count,page,limit}; count total autorizado, no tamaño de página.
page>=1, limit1..1000 según DTO. Workspace obligatorio; scope Delegado resuelto solo
en servidor, antes de count/range. Pendiente/revocado/IDs vacíos: cero. Detalle y
escrituras canRead/canManage; cero datos/cambios cruzados. Marketplace separado.

## Grupos (FR014-016 / SC007)

GET listado autorizado; POST del workspace actor, Delegado solo gestionar/cuenta.
Nombre max100, descripción opcional max500, seña opcional independiente. Cuatro
combinaciones válidas con retorno/recarga; detalle completo y seña porcentaje/monto
ARS o sin seña, nunca pago. Cruces denegados, sin registros parciales/éxito falso.
No GET por ID adicional requerido.

## Edición/modalidades/dirección (FR004-008 / SC002-004)

PATCH unidad conserva categoría/comunes tras dos recargas. POST modalidad añade
una, PATCH modId conserva identidad, DELETE lógico retira solo esa. No duplicados
nuevos; editor/publicación coinciden; históricos intactos. Dirección real con sesión,
ausencia explícita si falta; anónimo no recibe dirección/exacta en API/DOM/caché.
Logout elimina privados visibles.

## Idiomas/perfil (FR009-013 / SC005-006/009)

ES/EN/PT reales o pendientes explícitos por campo, original identificado, WhatsApp
localizado. Backfill separado. users update solo full_name/phone de auth.uid propio;
rol/cupo/workspace/email fuera del formulario; errores no simulan éxito. Gestor y
Buscador persisten tras dos recargas, acceso cruzado denegado.

## Transversal (FR016-017 / SC008)

Errores claros, loading/vacío/éxito/restricción; Playwright desktop/mobile con captura
real y análisis Agy o Carlos. Auth+DB real para scope/persistencia. Publicación requiere
artefacto aceptado, SHA Vercel identificado/Ready y smoke; sin credentials/fixtures en Git.
