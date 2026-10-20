# Tasks: cierre de observaciones beta N01–N08

Fuentes: spec.md, plan.md, research.md, data-model.md, contracts/beta-fixes.md,
quickstart.md. No casilla acredita cierre hasta aceptación Codex con evidencia.

## Phase 1: Setup / Foundational

- [ ] T001 Preparar harness Auth/DB real exclusivamente local en apps/api/test/beta-isolation.e2e-spec.ts y apps/web/playwright.beta-real.config.ts; dos gestores/delegado con fixtures propias, cleanup por IDs, bloqueo si no localhost. Evidencia evidence/N01/runtime.md (SC008).
- [ ] T002 Registrar baseline por lote y fuente/entorno en evidence/batches.md; preservar todos los cambios anteriores y no registrar credentials (SC008).

## Phase 2: US1 — inventario autorizado (P1)

Goal FR001-003 / SC001. Independiente: dos gestores, delegado por cuenta/grupo/unidades,
revocado/pendiente, visitante público; páginas limit1 y escrituras/lecturas negativas.

- [x] T003 [US1] Añadir regresiones rojo/verde de count y páginas por scope en apps/api/src/unidades/unidades.isolation.spec.ts; cubrir IDs vacíos/revocación y workspace (FR001, SC001). Aceptación parcial N01a: evidence/N01/review.md; integración completa pendiente B007.
- [x] T004 [US1] Corregir scope antes de count/range en apps/api/src/unidades/unidades.controller.ts y unidades.service.ts, reutilizar authorization.types.ts sin any nuevo ni alcance cliente (FR001, SC001). Aceptación N01a: evidence/N01/review.md.
- [ ] T005 [US1] Probar detalle/estado/modalidades/alquileres y escrituras cruzadas con Auth/DB real en apps/api/test/beta-isolation.e2e-spec.ts; corregir defectos demostrados en controller/service/authorization.service.ts dentro de lote aprobado (FR002, SC001).
- [ ] T006 [US1] Verificar inventario/grupos/recuentos desktop/mobile y marketplace público separado en apps/web/e2e/beta_isolation_real.spec.ts, guardar capturas/análisis en evidence/N01/ (FR003/017, SC001/008).
- [ ] T007 [US1] Publicar fix aceptado por sub-lote N01 y comprobar SHA/Ready/health/flujo en evidence/N01/deploy.md; N01 no cierra solo con paginación (SC008).

## Phase 3: US2 — grupos (P1)

Goal FR014-016 / SC007. Independiente: cuatro combinaciones descripción/seña y
recargas reales, dueño/delegado autorizado/otro workspace.

- [ ] T008 [US2] Añadir regresiones de nombre max100, descripción opcional max500, seña activa>0 y porcentaje<=100 en apps/api/src/grupos/grupos.service.spec.ts y grupos.controller.spec.ts; comprobar políticas actuales con supabase/tests/008_beta_group_description.sql local (FR014-016, SC007).
- [ ] T009 [US2] Presentar consulta completa de grupo/seña opcional en apps/web/src/components/gestor/BentoGruposGrid.tsx y GrupoDetailsDialog.tsx (nuevo si necesario), mensajes apps/web/messages/es.json/en.json/pt.json; no nuevo endpoint por inercia (FR014, SC007).
- [ ] T010 [US2] Verificar creación/reload y rechazo cruzado real en apps/api/test/beta-isolation.e2e-spec.ts y apps/web/e2e/beta_groups_real.spec.ts, errores/retorno; capturas/análisis evidence/N07-N08/ (FR014-017, SC007/008).
- [ ] T011 [US2] Publicar fixes N07/N08 aceptados y comprobar versión/flujo en evidence/N07-N08/deploy.md; cerrar IDs individualmente solo con su evidencia (SC008).

## Phase 4: US3 — categoría y modalidades (P2)

Goal FR004-007 / SC002-003. Dos lotes para N02 y N03, cada uno probado por separado.

- [ ] T012 [US3] Probar/corregir Casa→Cancha y campos comunes/específicos en apps/web/src/components/gestor/UnidadForm.tsx y src/app/[locale]/(gestor)/mis-unidades/[id]/editar/page.tsx, tests apps/web/e2e/beta_unit_edit_real.spec.ts; guardar y recargar dos veces (FR004/016/017, SC002).
- [ ] T013 [US3] Probar/corregir identidad POST/PATCH/DELETE lógico de modalidades en apps/api/src/unidades/unidades.service.ts y unidades.observaciones.spec.ts, editor anterior y apps/web/src/app/[locale]/(marketplace)/unidades/[id]/page.tsx (FR005-006, SC003).
- [ ] T014 [US3] Inventariar duplicados históricos sin saneamiento en evidence/N03/duplicates.md; probar retries/doble submit/coincidencia editor-publicación real en apps/web/e2e/beta_unit_edit_real.spec.ts, capturas/análisis (FR007/016/017, SC003/008).
- [ ] T015 [US3] Publicar N02 y N03 individualmente tras aceptación, verificar deploy/flujo en evidence/N02/deploy.md y evidence/N03/deploy.md (SC008).

## Phase 5: US4 — dirección privada (P2)

Goal FR003/008 / SC004. Sesión/anon/sin dirección/logout, API/DOM/caché y recarga.

- [ ] T016 [US4] Probar/corregir proyección privada solo con sesión válida en apps/api/src/marketplace/marketplace.service.ts y marketplace.service.spec.ts; regresión guard apps/api/src/auth/supabase-public-auth.guard.spec.ts (FR003/008, SC004).
- [ ] T017 [US4] Probar/corregir UI autenticada/anon/sin dirección/logout en apps/web/src/app/[locale]/(marketplace)/unidades/[id]/page.tsx y apps/web/e2e/beta_address_real.spec.ts; evidence/N04/ capturas/negativas (FR016/017, SC004/008).
- [ ] T018 [US4] Publicar N04 aceptado, comprobar versión/anon/no leakage en evidence/N04/deploy.md (SC008).

## Phase 6: US5 — idiomas (P2)

Goal FR009-011 / SC005/009. ES/EN/PT, real/pendiente/fallo, preservar manuales.

- [ ] T019 [US5] Probar/corregir contenido real/pendiente y adaptador existente en apps/api/src/common/services/traduccion/traduccion.service.ts y traduccion.service.spec.ts, detalle apps/web/src/app/[locale]/(marketplace)/unidades/[id]/page.tsx y WhatsAppButton.tsx (FR009-010, SC005).
- [ ] T020 [US5] Inventariar EN/PT pendientes sin tocar datos de testers en evidence/N05/catalog.md; backfill mediante scripts/backfill-beta-unit-translations.mjs solo con acceso/autorización humana específica, preservar manuales (FR011, SC009).
- [ ] T021 [US5] Verificar UI tres idiomas/pendiente/fallo mediante apps/web/e2e/beta_locale_real.spec.ts, capturas/análisis evidence/N05/; publicar fix aceptado y verificar beta en evidence/N05/deploy.md, no cerrar backfill por aceptar pendiente (FR017, SC005/008/009).

## Phase 7: US6 — perfil (P2)

Goal FR012-013 / SC006. Gestor/Buscador propios, dos recargas, otro usuario e intento
de cambiar rol/workspace/cupo denegados; nombre max120 y teléfono max40 UI vigentes.

- [ ] T022 [US6] Probar/corregir full_name/phone propios y fallos de guardado en apps/web/src/app/[locale]/(marketplace)/cuenta/page.tsx; no ampliar campos protegidos ni sustituir rol buscador por autorización gestor (FR012/016, SC006).
- [ ] T023 [US6] Ejecutar aislamiento real/perfil inválido y Playwright apps/web/e2e/beta_profile_real.spec.ts; supabase/tests/008_beta_profile.sql (nuevo si necesario) solo local/rollback; evidence/N06/ capturas/análisis (FR013/017, SC006/008).
- [ ] T024 [US6] Publicar N06 aceptado y comprobar persistencia/versión en evidence/N06/deploy.md (SC008).

## Phase 8: Polish and closure

- [ ] T025 Consolidar regresiones relevantes tipo/lint/unit/API/DB/web/build y trazabilidad FR/SC en evidence/acceptance-matrix.md; blockers no PASS; analizar capturas sin duplicar verificaciones válidas (SC008).
- [ ] T026 Reconciliar issues.md y observaciones originales con evidencia, cleanup solo temporales/procesos propios en evidence/cleanup.md; no borrar carpeta original hasta todos sus problemas cerrados (SC008).
- [ ] T027 Ejecutar converge al cierre y actualizar .specify/memory/PROJECT_STATE.md con estado compacto y evidencia aceptada; publicar reporte sin porcentaje inventado (SC008).

## Dependencies & Execution Order

T002 precede cada escritura; T001 bloquea aceptación integrada, no preparación de
regresiones unitarias. T003→T004→T005→T006→T007; T008→T009→T010→T011;
T012→publicación N02, T013→T014→publicación N03. T016→T017→T018;
T019→T020/T021 (backfill puede estar bloqueado); T022→T023→T024;
todos los criterios aceptados→T025→T026→T027. UI/groups depende del aislamiento
real pertinente. Sin ejecución concurrente en archivos compartidos. Preparación de
tests SQL y análisis de capturas puede ser paralela solo si sin archivos/entorno común.
MVP: N01a + inventario real; nunca declarar beta íntegra a partir del MVP.

## Executable Batches

Todos usan AGENT_RULES y TASK_PACKET directo, solo tareas activas al ejecutor.
Cada brief fija exactos read/write/commands y criterios del contrato, baseline y
evidence/<ID>/. No enviar este archivo entero a Agy. Perfiles separados por |.

| Batch | Tasks | RISK | EVIDENCE_PROFILE | SOL_REVIEW | Exit gate |
| --- | --- | --- | --- | --- | --- |
| B006-N01a | T002,T003,T004 + T001 API | HIGH | CODE / API / SECURITY | FULL_AFFECTED_DIFF | scope antes de count/range, rojo/verde y integración real; sin cierre completo N01 |
| B007-N01b | T001 web,T005-T007 | HIGH | API / DB / UI / SECURITY | FULL_AFFECTED_DIFF | SC001 completo, desktop/mobile, SHA/smoke |
| B008-N07 | T008-T009 | HIGH | UI / API / MONEY | FULL_AFFECTED_DIFF | cuatro combinaciones y seña consultable; no confundir mocks con persistencia |
| B009-N08 | T010-T011 | HIGH | API / DB / UI / SECURITY | FULL_AFFECTED_DIFF | SC007 real, negativas/recargas, publicación por ID |
| B010-N02 | T012 + T015 N02 | MEDIUM | UI / API | TARGETED_DIFF | SC002 dos recargas y deploy |
| B011-N03 | T013-T015 N03 | HIGH | UI / API / DB / MONEY | FULL_AFFECTED_DIFF | SC003 sin duplicados nuevos/saneamiento automático |
| B012-N04 | T016-T018 | HIGH | UI / API / SECURITY | FULL_AFFECTED_DIFF | SC004 sesión/anon/logout y deploy |
| B013-N05 | T019-T021 | MEDIUM | UI / API | TARGETED_DIFF | SC005, SC009 separado; acceso a Secret requiere HIGH dedicado |
| B014-N06 | T022-T024 | HIGH | UI / DB / SECURITY | FULL_AFFECTED_DIFF | SC006 propios/cruzados y deploy |
| B015-close | T025-T027 | HIGH | CODE / API / DB / UI / SECURITY / MONEY | FULL_AFFECTED_DIFF | matriz integrada y converge sin blockers ocultos |

## Coverage & Closure

Mapeo explícito FR/SC en cada tarea y contratos. analyze read-only antes de B006;
repetir solo si se invalidan requisitos/interfaces/plan/tasks afectados. Converge
append-only para trabajo descubierto. Historia en evidence, handoff sin diario.
