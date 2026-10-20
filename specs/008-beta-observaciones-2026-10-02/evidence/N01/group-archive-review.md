# B007a/d — aceptación técnica local, beta pendiente

2026-10-04. RISK HIGH; API/DB/SECURITY/MIGRATION; FULL_AFFECTED_DIFF.
Estado: solución de archivado y harness directo aceptados LOCALMENTE. No cierre
total N01/N07/N08: navegador/HTTP/visual/publicación pendientes.

## Revisión y decisiones

Revisados: migración completa20261005020000; diff completo grupos.service.ts y
service.spec.ts; SQL010/011 completos; harness B007a contra baseline original y
adición B007d (owner/delegado positivos, ver/IDs/otro workspace negativos).
SQL011 pending corregido a aceptada_sin_configurar y camposNULL según schema.
No políticas ampliadas, admin bypass API ni borrado físico. RPC exige actor
vigente, pertenencia y gestionar/cuenta para delegado; locks delegación→grupo,
historial revocado ignorado. Servicio exige success===true e id solicitado.

Reproducción: UPDATE directo grupos.deleted_at arroja42501. Las políticas
excluyen archivados; el conflicto de RLS/visibilidad está demostrado, pero no
se aisló experimentalmente qué expresión causa primero el42501. La explicación
del preparado sobre WITH CHECK/tupla nueva no es prueba del orden del ejecutor.

## Ejecución y aceptación

- Antes RPC: SQL010 33/36 PASS, SQL011 5/24 PASS, exit1. Las fixtures cargaron;
  falla esperada42883 por RPC ausente. Reproducción original42501 conservada.
- migration up --local: aplicó SOLO20261005020000, exit0. Nunca remoto.
- test db SQL010 + SQL011 --local: 60/60 PASS, exit0; fixtures transaccionales
  ROLLBACK. Roles/claims SQL son simulados, no Auth real.
- API cwd apps/api: vitest --config vitest.config.e2e.ts
  test/beta-isolation.e2e-spec.ts: 30/30 PASS, exit0, Auth/PostgREST reales locales,
  cleanup DB/Auth comprobado. Guard/controllers/services directos, no listenerHTTP,
  pipes/serialización ni Playwright. Anon independiente sesiónnull confirmado.
- API grupos.service.spec.ts: 13/13 PASS, exit0.
- API tsc --noEmit -p tsconfig.build.json: exit0. No afirmar tipos generales
  verdes: cuatro archivos de tests base siguen pendientes.
- Primer comando harness desde raíz seleccionó también copia.tmp, exit1 por
  imports de baseline; producto30PASS. CwdAPI corregido excluyó copia y dioexit0.

## Fuente

SHA256 (antes de commit; Git puede normalizar finales de línea):
- migration: 216F74556AE5BECD2B65E6F99C0CA303F94239B156A44471256FE4E324EDAB8E
- SQL010: 74364C0393349A113516DAAF3D107D295425A5B2449A92CC933D46B6F5C0FC07
- SQL011: 189B76200A5DF3B0E8ED186CAE4F576C3019A4F8E91C7E7FFD91F1BCBD931A29
- harness: D6A6C4CC79283F531AC39319F1A9484AF71190A270895FCC2E488C299FEA03BD

## Limitaciones / siguiente paso

No prueba concurrente de revocación ni eliminación de perfil vs archivado; el
orden de locks fue revisado, no demostrado bajo carga. No nuevos permisos.
Audit42703 reproducido en grupos/inquilinos/modalidades; alquileres NO reprodujo
ese fallo (tiene estado), contra generalización del documento preparado.
Esta evidencia actual prevalece sobre PREPARED/FAIL históricos de los documentos
authorization-runtime/audit-runtime/group-archive-runtime, conservados para traza.
Beta requiere autorización puntual de ambas migraciones y API compatible;
solicitada, no asumida. Continuar B007b navegador real y gruposconsulta/seña.
