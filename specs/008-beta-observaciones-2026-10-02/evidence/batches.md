# Baselines por lote

Solo fuentes/entorno; sin claves, cookies, JWT ni datos personales.

| Batch | Baseline | Decisión/evidencia |
| --- | --- | --- |
| B006-N01a | controller DB5099634F6814E3F05E5D7E73C2F3D398AEC20280D88B13E3557D684E9EEB7F; service E6B613D983589AFEA9DF55F916C36F7607E28EC0582BB711DD76E9645228B0B7; beta dpl_3i2b2EdBhpRW7aMWsZr9LoHuRL3L | Aceptado/publicado; N01/review.md, N01/deploy.md. SHA completo publicado no equivale a HEAD sucio. |
| B007a | harness BAACF8EBF549B36CE030C206A47504F5121ACF39098D7351BA1084B637A60AA8; copia propia .tmp/rendo-b007a-baseline; HEAD87f2a08; Auth/PostgREST/DB Rendo local, Node22.16.0 | Solo harness/evidencia; API productiva intacta. Entrega y aceptación pendientes. |
| B007c | Función histórica audit_operational_mutation en migración20260925120000, sin editar; DB local última20261002030000 | B007a rojo26/27 detectó SQLSTATE42703. Reemplazo nuevo20261005010000 en revisión, test010 pendiente corregir antes ejecución. Sin acceso remoto autorizado. |
| B007b | Copia EXACTA .tmp/rendo-b007b-baseline-exact; sourcepage3024C38F1B8694567342C8E9CB5790D80755830C207E8D4392C9906622DC63C6; Bento34489FB84540ADF355E00E3E38D0B42B17AEFE5135511911CB6E49242A0806EB | Preparación inicial rechazada por nombres de tablas/columnas/login incorrectos, runner/flags/cleanup inválidos. No ejecución ni publicación UI. Snapshot reconstruido nativo anterior alteraba entidad HTML: no usarlo como baseline. |
| B007d | .tmp/rendo-b007d-baseline (service/service.spec/harness/test010 exactos) tras localauditfix | Regresión archivado42501 separada. RPC+service+tests preparados y revisión dirigida por NULL/historial/locks/resultadofailclosed. Sin aplicación local/remota de RPC todavía. |

Setup de este lote: requisitos16/16; hooks inexistentes; exclusiones git/env/log/auth,
ESLint web y Prettier API completadas sin formatear código ni borrar trabajo previo.
Docker Rendo necesario: db/auth/rest/kong; servicios ajenos no modificados.

B007b mensajes baseline (previos sucios, preservar ajenos):
- en5795B1898A839053A53358C77B1018E51501BC7330E3EC91495AEA137DE6BBD8
- es99A78D2B62CF43D0CD10170598DFE63C6B06A060CB9F02C7FC1B79626811AB0A
- pt94CC07162983741DE213593218C3FD503337BB78314936650F94168D03050380

B007c aceptación puntual: migrationSHA19056E79A0618AC7F7F48B06903AB989F8F4F6348BF2E0FF0EA6A0118E8077E9,
Git d0cfeae push confirmado; aplicada SOLOlocal, test0109 fallos deauditresueltos,
3RLSarchive pendientes; Authdirect27/27 verdes. Ver N01/audit-review.md.

B007a/d aceptación local posterior: SQL010/01160/60, Authdirect30/30, gruposunit13/13,
tipos productivos exit0; RPC aplicada SOLOlocal. N01/group-archive-review.md contiene
revisión, hashes, límites y fallo inicial de selección de baseline.tmp corregido por
cwdAPI. Los estados PREPARED anteriores son historia, no estado operativo actual.
Beta pendiente de autorización audit+archive/API; UI/HTTP/visual aún no aceptados.
