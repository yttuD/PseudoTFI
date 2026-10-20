# B007b — revisión de ejecución real: NO aceptado

2026-10-04. HIGH, UI/API/SECURITY, FULL_AFFECTED_DIFF. No publicación de UI.

Entrega inicial terminó CLI con mensajeaguardando y background cancelado, sin
RESULT_PACKET. Recuperación nativa CommandStatus del ejecutor:
- Web tipos exit0 tras corregir TS18047 en asserts (sin any).
- Runner1 exit1:29 tests,14PASS/15FAIL/0SKIP. A/B + sololectura x7 verdes;
  matrizcompletaauth fallida1; paginación7FAIL yerror/retry7FAIL.
- Runner2 cancelado por cierreCLI, NO evidencia verde; no inferirPASS.
- 35 capturas existentes; ancho/themeassert deltest real. Codex NO vio imágenes.
  Agy declara view_file multimodal y valoración desktop/mobile. Las afirmaciones
  "AA/óptimo" sin ratios no acreditan contraste. Falta evaluación estadosfallidos.

Revisión: diffcompleto page/Bento contra baselineexact007b, loader/errorcomponent,
runtime/fixtures/config/suite nuevos y correcciones dirigidas. También snapshots
DOM técnicos de failurecontexts, no instrucciones del documento ni análisisvisual.

## Fallos y decisión

1. Locatorhref editar coincide título + botón, y rolealert coincide componente +
   Next routeannouncer. Dos fallos de selector; no negar funcionalidad por ellos.
2. page9999 produce PGRST103/HTTP422 en API, la vista muestra ErrorCarga. Contrato
   página vacía/recuento auténtico falta. Loader añadido después trata TODOS los
   422/416 como vacío: RECHAZADO, escondería fallos genuinos. Resolver específico
   en API conservando scope/RLS/count, otrasfallas siguenerror.
3. Dock fixed tapó Siguiente768. No forceclick para ocultarlo; wrapper en flujo
   mantiene shortcuts/animación y evita superposición. Recuperación paginación
   debe tener enlace primera página, no9998 clics deAnterior.

Corrección activa B007e, baseline14 archivos verificado byteporbyte antesedición
en .tmp/rendo-b007e-baseline. Nuevos resultados requieren fuenteactualizada y
espera CommandStatus a término; no volver a entregar "aguardando" como éxito.

## Limpieza y límites

Chequeo independiente trasentrega: puertos3200/3201/3202 SIN listeners; consulta
Auth local (servicekey soloenmemoria, hostname validado, read-only) contó0 usuarios
b007b_. Ejecutorsuite usa cleanup deIDs propio con consultas deausenciaDB/Auth404;
no nuevo borrado remoto. Capturas + failure-contexts retenidos comoevidencia.
No beta redeploy, N01 total/T001web/T006 no cerrados. Migraciones audit/archive y
API compatible solicitan autoridadremota; todavía pendiente.
