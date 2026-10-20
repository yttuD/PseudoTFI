# DIRECT-005 — entrega y revisión técnica (2026-10-04)

## Ejecución

- Agy directo, sin Pi: gemini-3.8-flash-medium, effort medium, sesión
  `9bf8bd49-513c-42e2-8f31-de3133410d22`.
- Alcance y criterios: `../antigravity-direct-discovery-005.md`.
- Primer intento: RunCommand denegado, response vacío. SUCCESS del CLI no se aceptó.
- Reanudación con lectura nativa, sin shell ni MCP no autorizado: entregó diagnóstico.
- Corrección terminal acotada: explicitó policies/pgTAP, retiró la falsa ausencia
  global de tests de Delegado y la recomendación de firmar JWT manualmente.
- Logs locales retenidos (ignorados por Git): `.pi/local/agy-direct-005*.log`.
- Ningún comando de pruebas, build, SQL, DB remota o deploy ejecutado por Agy.
  Ningún cambio de código reportado; contraste `git diff --stat` en grupos API y
  BentoGruposGrid sin cambios respecto de HEAD para esos paths. No se infiere de
  esto un inventario exhaustivo de modificaciones fuera del alcance.

## Hechos contrastados por Codex

| Criterio | Fuente / resultado / límite |
| --- | --- |
| AC1 | package.json raíz/API/web contrastados: pnpm 9, scripts dev/build/lint/test; Next 14.2.35 exacto, Nest/Vitest/Playwright/TypeScript con rangos declarados. Versiones instaladas no comprobadas por Agy. Node v22.16.0 comprobado independientemente por Codex. |
| AC2 | GruposController.findAll/create/update/remove, GruposService.findAll/findOne/create/update/remove y CreateGrupoDto contrastados por lectura directa. No GET por id en controller; el service conserva soft delete. Campos nombre max100 y descripcion opcional max500, seña opcional. BentoGruposGrid.GrupoItem y tarjeta no presentan sena_default_*. Esto es ausencia de presentación en ese componente, no ausencia de persistencia en DB. |
| AC3 | Policies "Grupos insert policy" y "Grupos select policy" contrastadas enteras en 20261002020000_grupos_insert_scope.sql y 20261002030000_grupos_select_returning.sql. Correlación explícita grupos.gestor_id; owner/cuenta activa para INSERT y lectura de fila propuesta RETURNING. Policies unidad SELECT/INSERT/UPDATE/DELETE y grupos UPDATE/DELETE contrastadas en tramos dirigidos de 20260925120000_delegado_scope_authorization.sql. No acredita estado remoto ni aislamiento runtime. |
| AC4 | 008_beta_group_description.sql define plan(7), identidades sintéticas transaccionales, casos dueño/otro espacio/delegado y ROLLBACK; no se ejecutó. delegado_scope_authorization.spec.ts y product_readiness_delegado.spec.ts sí existen y usan mock API/actores. La configuración API e2e incluye **/*.e2e-spec.ts. Auth real por signIn en entorno aislado, no por tokens dev ni lectura/exportación de secretos. Disponibilidad operativa de servicios e identidades no comprobada en este discovery. |
| AC5 | Propuesta de Agy NO aprobada como implementación: agregar GET por id no es requisito por sí mismo; unit tests mock no cierran cuatro combinaciones reales. GrupoFormModal actual solo hace POST: tampoco debe afirmarse que ya abre/edita un Grupo existente. Diseñar presentación de datos existentes/listado antes de ampliar contratos. |

Las herramientas de grafo/coverage no estaban disponibles al revisor en esta sesión;
se usó lectura directa dirigida. No se acredita cobertura exhaustiva del grafo,
de todo el repositorio, de helpers no leídos íntegramente ni de suites no ejecutadas.

## Decisión

**ACCEPT del inventario contrastado AC1–AC3; AC4 parcialmente determinado; AC5
requiere diseño del supervisor. No aceptación integral del lote ni de N01–N08.**
El informe inicial excedía el tamaño objetivo y contenía una afirmación negativa
incorrecta; se corrigió por entrega terminal, sin vigilancia continua.

## Siguiente paso y gates

Completar plan, contratos y tareas de feature008 con estos hechos; analyze antes
de implementación. Priorizar N01 aislamiento y N07/N08 grupos. Para cierre funcional
requerir Auth/DB real y Playwright desktop/mobile, análisis visual de Agy o devolución
de Carlos si insuficiente. No considerar esta entrega arreglo ni deploy. No tocar
datos de testers, backfill, migraciones remotas nuevas o Android implícitamente.
