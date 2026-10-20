# B006-N01a — alcance antes de paginación

MODE: IMPLEMENT
RISK: HIGH
EVIDENCE_PROFILE: CODE | API | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
Tasks activos: T002/T003/T004 y T001 solo harness API. No leer todo tasks.md/historia.
Modelo gemini-3.8-flash-medium, effort medium. Agy directo, sin Pi/rendo_sdd.
Codex decide/revisa; Carlos autorizó código/pruebas de aislamiento a Gemini Google.

## Decisión de arquitectura (obligatoria)

Controller.findAll aplica filtro canReadUnidad después de paginar y usa filtered.length
como count. Resolver resolveAccessContext una vez para delegado. Reutilizar
DelegationConfiguration de authorization.types.ts como scope interno opcional del
service.findAll; siempre mantener eq gestor_id del workspace autenticado.
Aplicar scope cuenta/grupo/unidades ANTES de count/range. IDs vacíos y contexto
pendiente/revocado devuelven data[]/count0 con page/limit correctos. Scope solo servidor,
nunca query del cliente. No N+1 canRead por fila ni count basado en una página.
No cambiar roles/permisos/políticas/DTO/query público. Mantener orden estable.
Gestor sigue workspace propio. No cambiar findOne/create/update/modalidades aquí.

## Archivos

LECTURA: solo este brief, spec US1/FR001-003/SC001, plan US1, contrato Inventario,
reglas SECURITY_RULES; código relevante de unidades, tipos authz/guard/SupabaseService,
tests existentes unidades.observaciones.spec.ts/authorization.service.spec.ts,
API vitest config, y migraciones/008_beta_group_description.sql pertinentes para fixtures.
No buscar todo el repo ni hacer otro diagnóstico genérico. Grafo si disponible con
coverage por archivo; sin permiso, lectura directa dirigida y declarar el límite.

ESCRITURA exacta:
- apps/api/src/unidades/unidades.controller.ts (findAll únicamente)
- apps/api/src/unidades/unidades.service.ts (findAll únicamente y import type necesario)
- apps/api/src/unidades/unidades.isolation.spec.ts (nuevo)
- apps/api/test/beta-isolation.e2e-spec.ts (nuevo, solo N01a)
- specs/008-beta-observaciones-2026-10-02/evidence/N01/pagination.md

Baseline ya guardado por Codex en .tmp/rendo-b006-baseline, NO editarlo. Preserve
todos los cambios anteriores en esos archivos; diff de lote no es diff completo HEAD.
No editar any preexistentes fuera de findAll; no añadir any nuevos. Ediciones con
herramientas de patch, nunca cat/echo/script para escribir código.

## Criterios

- AC1: Regresiones unitarias rojo ANTES del arreglo y verde después: Gestor A/B,
  delegado cuenta/grupo/IDs explícitos, pendiente/revocado/IDs vacíos; páginas limit1
  con total del scope constante, IDs fuera de alcance nunca devueltos. Testeá controller
  y query service, no un helper aislado ni mocks que pasan con el código viejo.
- AC2: Implementación acotada a findAll, filtros SQL antes de range/count,
  DelegationConfiguration reutilizada, sin permisos nuevos/any/N+1 ni modificar marketplace.
- AC3: Ejecutar regresiones unitarias + suite API relevante y typecheck después de
  última edición. Reportar preexistentes aparte; no PASS por solo escribir tests.
- AC4: Harness REAL contra Supabase local Rendo (Auth signIn, JWT real y PostgREST),
  dos Gestores y delegado; comprobar páginas/count y recurso público de otro workspace
  excluido del inventario. Usar guard/controller/services reales de alcance, declarar
  si no se usa AppModule completo. SQL mock/dev-token NO acredita integración.
- AC5: Evidencia redactada con resultados por AC, firmas de fuentes y entorno, cleanup
  de fixtures locales propias y rutas. No credentials/logs de Auth/Supabase status en artifacts.
  Si falta entorno/permiso, BLOCKED con comando exacto y checks no ejecutados.

## Entorno y comandos

Docker Desktop abierto y Supabase start local minimal terminó exit0. No reiniciar
servicios ajenos. Para keys locales el harness puede CAPTURAR supabase status -o json
como subprocess y usar resultados SOLO en memoria: NO mostrarlos ni abrir .env.
Confirmar host localhost/127.0.0.1 ANTES de seed/cleanup. Crear identidades temporales
locales por Auth admin/signIn; eliminar solo sus IDs al terminar. Jamás DB beta remota,
cuentas de testers ni firma manual JWT. Si fixture Delegado necesita SQL con sesión,
solo conexión local verificada; no cambiar policies para hacer pasar tests.

Comandos directos permitidos por alcance (sin encadenar ni wrappers shell):
- unit: node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.ts apps/api/src/unidades/unidades.isolation.spec.ts
- regression: node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.ts apps/api/src/unidades apps/api/src/authorization
- real: node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.e2e.ts apps/api/test/beta-isolation.e2e-spec.ts
- types: node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json

Usá lectura nativa. Si RunCommand se deniega, reportá comando exacto y no loops/no
modo irrestricto. No MCP Pi. No instalar paquetes, settings globales, git/push/deploy,
supabase remoto, Android, backups ajenos, cleanup amplio ni carpetas de observaciones.

## Entrega terminal

RESULT_PACKET <=3000 caracteres/40 líneas: status, cada AC (PASS/FAIL/BLOCKED),
paths cambiados, rojo/verde/comandos reales exit/count, preexistentes/skips, evidencia,
riesgos. Logs/diffs largos como artifacts seguros, no respuesta. No afirmar N01 cerrado:
faltan accesos directos/escrituras/UI de B007. No screenshots aquí porque no se cambia
UI; futura revisión visual obligatoria Playwright desktop/mobile y análisis real por vos.
