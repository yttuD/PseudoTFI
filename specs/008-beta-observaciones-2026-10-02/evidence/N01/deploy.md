# N01a — publicación comprobada 2026-10-04

- Commit de arreglo: 96b0b3034ce070caaa45690a2205c773105283a2, push confirmado
  a origin/codex/rendo-beta-deploy (yttuD/PseudoTFI).
- API deployment: dpl_ADgxK4hCp1Rduwa2exgYHTUhTLYT, estado READY, producción beta.
- Fuente CLI: artefacto aislado reconstruido del deployment anterior
  dpl_3i2b2EdBhpRW7aMWsZr9LoHuRL3L. Comparación de los 398 archivos:
  únicas diferencias controller/service SHA aceptados en review.md y .vercelignore
  (excluir .pi, .impeccable y scripts). No publicar árbol sucio completo.
- Se rechazó la primera publicación del árbol sucio. No fue ejecutada; alternativa
  permitida: paquete explícitamente reconciliado. Metadatos gitDirty=1 por checkout
  padre: SHA del commit NO acredita snapshot completo. Baseline y manifest sí.
- Build real Vercel: pnpm frozen lockfile, types build, turbo api/nest build verdes.
  Warnings Turbo por env runtime no declaradas en turbo.json: registrar, no ignorar
  como resueltos. Health real confirmó conexión Supabase después de build.
- Candidata health/ready=200 e inventario sin sesión=401 mediante CLI autenticada.
  CLI generó bypass de protección acotado al proyecto para esos checks; valor jamás
  mostrado, ni enviado a agentes ni guardado en Git. No desactivar protección.
- Alias rendo-beta-api.vercel.app actualizado solo después de checks. API /v4/aliases
  confirma que apunta al nuevo deployment, no al anterior.
- Enlaces públicos finales sin bypass: /health/live=200 {status:ok},
  /health/ready=200 {status:ok}, /unidades sin sesión=401; web /es=200.
- Web NO redesplegada: continúa la versión anterior. N01a es cambio API únicamente.

Límites: integración Auth/JWT/DB de dos gestores y delegado probada localmente,
no cuentas de testers modificadas ni sesión remota validada. No captura/UI requerida
por este cambio API; revisión real desktop/mobile pendiente B007b. N01 completo ABIERTO.

Git automático: proyectos Vercel aún sin link. Se solicitó decisión humana para
versionar también baseline ya publicado y luego conectar Git sin revertir cambios.
Hasta entonces publicación manual verificada, no afirmar que push causó redeploy.

B007a: primer intento no editó archivos ni amplió cobertura; bloqueado por comando
innecesario `dir specs\008-beta-observaciones-2026-10-02\evidence`. Próximo intento:
lectura/listado nativos exclusivamente, no permiso general de shell ni repetir
pruebas N01a como si completaran T005.

B007c/d (2026-10-04): Git d0cfeae y73fb1ae subidos; SQL60/60, Authdirect30/30,
gruposunit13/13 y tiposproductivos verdes LOCALMENTE (group-archive-review.md).
Consulta migration list --linked, exit0: remoto hasta20261002030000; audit
20261005010000 yarchive20261005020000 SOLOlocal, las únicas dos pendientes.
Ninguna aplicada remota en esta intervención. Autorización puntual solicitada
para ambas + API compatible. Push73fb1ae NO implica redeploy de Vercel.
# Publicación pendiente de API-B007e, 2026-10-05

Git55b8e199d51b098f0d3adea1ee6306e0f2c1fdda push confirmado con ls-remote.
Incluye únicamente findAll range/HEAD scoped, nueve pruebas unit y cuatro Auth/DB
más evidencia. No incluye otros cambios sucios del servicio ni UI no aceptada.
Sin nuevo despliegue Vercel ni migración remota; no asumir autodeploy por push.

# Lote N01 — Aceptación local de Codex y Preparación de Publicación Aislada (2026-10-07)

- Validación determinista del harness: 6/6 pruebas unitarias aprobadas en `apps/web/e2e/beta-harness-recovery.spec.ts` (timeout GoTrue con creación parcial, aparición tardía, cuenta en página 3 con paginación exhaustiva, fallo de listado con conservación de tracking, fallo de borrado con reporte de residuo y no alteración de cuentas ajenas).
- Revalidación integral de inventario y aislamiento: suite completa de 36 pruebas ejecutada con éxito (36 passed, 0 failed, 0 skipped, 0 flaky) en `apps/web/e2e/beta-real-runtime.mjs`.
- Reportes preservados:
  - `playwright-inventory-results.json` (29 pruebas históricas).
  - `playwright-real-results-35of36.json` (corrida previa 35/36).
  - `playwright-auth-results.json` (corrida de auth aislada 1/1).
  - `playwright-real-results.json` (corrida completa revalidada 36/36).
- Estado de N01: Aceptado localmente por Codex. Publicación y verificación en producción beta PENDIENTES.
- Candidato aislado preparado:
  - API: Commit 55b8e19 (unidades.service.ts scoped findAll/range/HEAD) y 73fb1ae (grupos.service.ts archive_grupo RPC).
  - Web: Paginación de inventario (`mis-unidades/page.tsx`, `BentoGruposGrid.tsx`, `InventoryLoadError.tsx`, `inventory-loader.ts`, QuickActionsDock `hidden md:flex justify-end mt-8`, traducciones `es.json`, `en.json`, `pt.json`, exclusión de `.impeccable/`).
- Verificaciones de build previas:
  - API (`nest build`): exit 0, compilación limpia.
  - Web (`next build` con release settings): exit 0, compilación y rutas estáticas limpias.
- Preservación: Excluidos cambios sucios de N02-N08, `.env`, sesiones `.auth/user.json` y temporales de build (`.dist-beta-real`, `.tmp`, `.next-beta-real`).

# Publicación y Verificación de Candidatos N01 en Vercel (2026-10-08)

- **API Deployment**:
  - Deployment ID: `dpl_6EQBEFvG6JsUcPfJ9rFuTzcUswcm`
  - URL directa: `https://rendo-beta-64hwyrch0-dutty.vercel.app`
  - Alias de producción: `https://rendo-beta-api.vercel.app`, `https://rendo-beta-api-dutty.vercel.app`
  - Estado: `READY`
  - Compilación: Vercel Cloud Build (iad1) con variables reales, `pnpm install --frozen-lockfile && pnpm --filter @tfi/types build` y `nest build`.
  - Archivos extraídos: 399 archivos (coincidencia 100% con `MANIFEST_API_CANDIDATE.md`).
  - Verificación de endpoints:
    - `GET /health/live`: HTTP 200 `{"status":"ok"}`
    - `GET /health/ready`: HTTP 200 `{"status":"ok"}`
    - `GET /unidades` (sin sesión): HTTP 401 `{"message":"Token inválido o no autorizado","error":"Unauthorized","statusCode":401}`
  - Rollback disponible: `dpl_ADgxK4hCp1Rduwa2exgYHTUhTLYT` conservado intacto.

- **Web Deployment**:
  - Deployment ID: `dpl_CCUjNTerCxx8zhfhsT897jA96EtL`
  - URL directa: `https://rendo-beta-gvbwluonh-dutty.vercel.app`
  - Alias de producción: `https://rendo-beta-web.vercel.app`, `https://rendo-beta-web-dutty.vercel.app`
  - Estado: `READY`
  - Compilación: Vercel Cloud Build (iad1) con variables reales, `next build` (Next.js 14.2.35).
  - Archivos extraídos: 400 archivos (coincidencia 100% con `MANIFEST_WEB_CANDIDATE.md`).
  - Verificación de navegación y Playwright:
    - `GET /es`: HTTP 200. Capturas: `remote-home-desktop.png` y `remote-home-mobile.png`.
    - `GET /es/mis-unidades` (sin sesión): HTTP 307 -> `/es/auth/login`. Capturas: `remote-mis-unidades-redirect-login-desktop.png` y `remote-mis-unidades-redirect-login-mobile.png`.
    - Playwright suite `apps/web/e2e/remote-verification.spec.ts`: 2/2 tests passed (exit code 0).
  - Rollback disponible: `dpl_9KwKGgdyxdYLwGQsoBCaRfrdeMy3` conservado intacto.

- **Seguridad**:
  - Sin claves ni tokens hardcodeados en el repositorio (`remote-verification.spec.ts` utiliza endpoints limpios sobre los alias públicos).
  - Protecciones de despliegue y variables de producción preservadas.

- **Corrección Acotada de N01 — Reconciliación y Matriz RLS (2026-10-08)**:
  - **Reconciliación Exhaustiva de Fixtures**:
    - Intento 1 (`beta-probe.spec.ts`, 2026-10-08T04:39:52Z): cuenta creada `test_gestor_1791434382116@example.com` (residuo en Auth).
    - Intento 2 (`beta-remote-n01-suite.spec.ts`, 2026-10-08T05:10:10Z): cuenta creada `b008_1791436199542_ga@example.com` (residuo en Auth).
    - Intento 3 (`beta-remote-n01-suite.spec.ts`, 2026-10-08T05:12:07Z): cuenta creada `b008_1791436312158_ga@example.com` (UUID `7e83511a-0172-4ef1-9e1c-2c7e3e3c8c20`), 2 grupos creados.
    - Datos en API purgados: Grupo `c493f205-adeb-4599-bc3e-f3496e8c8381` archivado vía `archive_grupo`; Grupo `b691c4d5-5685-4071-b520-d8e08987f37d` eliminado. Residuos en DB de negocio: 0 grupos activos, 0 unidades.
    - Residuos en Supabase Auth: 3 cuentas de usuario persisten debido a que la auto-eliminación o borrado de Auth requiere privilegios `service_role` no disponibles para el cliente de prueba. Estado: `cleaned: false` (declarado con honestidad en `remote-fixtures-tracking.json`).
  - **Seguridad**:
    - Retiro de todas las contraseñas hardcodeadas y de diagnósticos sensibles (tokens, claims, cookies, contraseñas en logs).
    - Generación aleatoria de contraseñas seguras en memoria (`crypto.randomBytes(16).toString('hex') + '!Aa1'`) sin imprimirlas.
  - **Corrección de Métodos HTTP de Unidades a PATCH**:
    - Modificaciones de unidades corregidas de `PUT` a `PATCH` conforme a `apps/api/src/unidades/unidades.controller.ts`.
    - Pruebas de denegación verifican además la ausencia de cambios persistidos (`expect(unit.titulo_es).not.toBe(...)`).
    - Paginación ajustada a `limit=2` con 3 unidades para generar 2 páginas completas sin necesidad de doce unidades.
  - **Diagnóstico Reproducible Local de RLS**:
    - Reproducido localmente con JWT autenticado estándar (`sub: gestor_id`, role: `authenticated`):
      - `INSERT` sin `.select()`: **ÉXITO (HTTP 201)**. La política de inserción `can_create_unidad(gestor_id, grupo_id)` es válida.
      - `INSERT` con `.select().single()`: **FALLO (HTTP 403/422: new row violates row-level security policy)**. La política de lectura `can_read_unidad(id)` no encuentra la fila en vuelo durante `RETURNING *`.
  - **Propuesta de Migración Mínima**: `supabase/migrations/20261008030000_unidades_select_returning.sql` (análoga a `20261002030000_grupos_select_returning.sql`).
  - **Matriz de Pruebas Positivas y Negativas (5/5 Verificada)**:
    - Caso 1 (Propietario): Creación con RETURNING (201), lectura (200), actualización PATCH (200) -> APROBADO.
    - Caso 2 (Otro Gestor): Inserción cruzada denegada por RLS, lectura cruzada denegada (0 rows), actualización cruzada denegada (0 rows) -> APROBADO.
    - Caso 3 (Delegado con `gestionar`): Creación en grupo con RETURNING (201), lectura (200), actualización PATCH (200) -> APROBADO.
    - Caso 4 (Delegado Solo Lectura `ver`): Lectura permitida (200), creación denegada por RLS, actualización PATCH denegada por RLS -> APROBADO.
    - Caso 5 (Delegado Fuera de Alcance): Lectura denegada (0 rows), creación denegada por RLS, actualización PATCH denegada por RLS -> APROBADO.
  - **Estado**: N01 permanece ABIERTO para revisión y evaluación de Codex. Sin migraciones remotas ni redespliegues aplicados.

# Corrección de Harness y Evidencia de N01 (2026-10-08)

- **Assertions Obligatorias y Salida No Cero**:
  - En `apps/api/test/test-rls-reproduce.mjs` y `apps/api/test/unidades-rls-comprehensive.mjs`, reemplazados todos los mensajes blandos PASS/FAIL por aserciones estrictas obligatorias (`node:assert/strict`).
  - Cada denegación comprueba explícitamente el código de error RLS (`42501` o mensaje de violación de Row-Level Security), no un error cualquiera.
  - Verificación de ausencia de cambios persistidos para cada escritura denegada, comparando valores originales exactos.
  - Confirmación explícita de persistencia en cada escritura autorizada.
- **Sombreado de Identificadores y Fixtures Dedicados**:
  - Corregido sombreado de identificadores en `unidades-rls-comprehensive.mjs` (variables declaradas a nivel superior con `let`, sin redeclaración interna).
  - Fixtures generados de manera aislada por lote (`rls_val_...`) sin reutilizar usuarios preexistentes.
  - Registro de IDs reales de todos los recursos (incluso si una inserción resultara inesperadamente permitida).
  - Limpieza en bloque `finally` con verificación obligatoria de ausencia (0 residuos comprobados en base de datos local).
- **Suite Remota sin Saltos Condicionales**:
  - En `apps/web/e2e/beta-remote-n01-suite.spec.ts`, eliminados todos los saltos condicionales (`if (!token)`, `if (resU.status === 201)`, `if (nextBtn.isVisible)`).
  - Creación obligatoria de las 3 unidades, obtención obligatoria de tokens, aceptación de invitación y permisos configurados.
  - Verificación obligatoria de paginación a 768px (`limit=2` sobre 3 unidades genera 2 páginas; botón "Siguiente" verificado sin forceclick).
- **Preservación de Historial y Retiro de Probe Inseguro**:
  - Conservado el archivo `remote-fixtures-tracking.json` con reconciliación acumulativa de intentos previos (probe inicial, intento 1 y suite principal).
  - Eliminado el archivo `apps/web/e2e/beta-probe.spec.ts`.
  - Corregido `apps/web/e2e/beta-remote-archive-and-clean.spec.ts` para actuar únicamente sobre IDs comprobados, no sobrescribir tracking ni marcar `cleaned: true` sin verificación.
- **Validación Exhaustiva Local de Migración Propuesta contra Política Original (10/10)**:
  - Fase Baseline: Acreditado fallo de `INSERT ... RETURNING *` con 403 / RLS `42501`.
  - Fase Propuesta: Validación exhaustiva cubriendo:
    1. Propietario (Gestor A): INSERT RETURNING (201), SELECT (200), PATCH (200) con persistencia verificada.
    2. Cross-Tenant (Gestor B): Inserción denegada (403/RLS 42501), SELECT denegado (0 rows), PATCH denegado (0 rows), propietario comprueba no alteración.
    3. Delegado Cuenta: INSERT RETURNING (201), SELECT (200), PATCH (200) con persistencia verificada.
    4. Delegado Grupo: En grupo asignado (201, 200, 200); fuera de grupo denegado (403, 0 rows, 0 rows) y propietario comprueba no alteración.
    5. Delegado Unidad (`delegacion_unidades`): Lectura permitida de unidad asignada (200), unidad no asignada denegada (0 rows), inserción denegada (403), PATCH permitido de unidad asignada (200) con persistencia.
    6. Delegado Solo Lectura (`permiso: ver`): SELECT (200), INSERT denegado (403), PATCH denegado (0 rows).
    7. Delegación Pendiente: SELECT (0 rows), INSERT denegado (403), PATCH denegado (0 rows).
    8. Delegación Revocada: SELECT (0 rows), INSERT denegado (403), PATCH denegado (0 rows).
    9. Registros Eliminados (`deleted_at IS NOT NULL`): Ocultos tanto para propietario como delegado (0 rows).
    10. Lectura Pública (`estado = 'publicada' AND deleted_at IS NULL`): Visible para usuario ajeno (200); modificación denegada (0 rows).
  - Teardown y Restauración Acreditada: Política baseline original restaurada en `finally`, acreditada en `pg_policies` y revalidada con prueba determinista de fallo de INSERT RETURNING.
- **Estado**: N01 permanece ABIERTO. Sin migraciones remotas ni redespliegues aplicados.

# Corrección de Defectos Residuales de N01 (2026-10-08)

- **Tipado Estricto y Definición de API_URL**:
  - `apps/web/e2e/beta-remote-n01-suite.spec.ts`: `API_URL` definida explícitamente (`process.env.API_URL || 'https://rendo-beta-api.vercel.app'`).
  - Eliminados todos los `any` añadidos en el harness y tracking; tipado con interfaces explícitas (`Page`, `BrowserContext`, `RemoteAttempt`, `TrackingFile`).
  - Verificación estricta de tipos: `pnpm --filter web exec tsc --noEmit` completó con **cero errores** (exit code 0).
  - En `apps/web/e2e/beta-remote-archive-and-clean.spec.ts`: eliminación completa de `any` en favor de interfaces tipadas.
- **Validación Estricta de Baseline por Igualdad Completa y Restauración Exacta**:
  - En `apps/api/test/unidades-rls-comprehensive.mjs`: Fase 0 valida el objeto completo de baseline (`policyname`, `permissive`, `roles`, `cmd`, `qual`, `with_check`). Si no coincide exactamente, aborta sin modificar políticas ni tocar la base de datos.
  - Flag `migrationApplied`: la restauración se ejecuta únicamente si el harness aplicó cambios.
  - La restauración aplica la política idéntica capturada y valida por igualdad estricta de objeto posterior (`assert.deepStrictEqual(restoredPolicy, initialPolicyCaptured)`), revalidando el rechazo determinista (HTTP 403 / RLS 42501).
- **Limpieza Resiliente y Verificación de Ausencia Contractual**:
  - En ambos scripts locales (`test-rls-reproduce.mjs` y `unidades-rls-comprehensive.mjs`), se revisan las respuestas de Supabase (`error`), acumulando fallos sin interrumpir la limpieza de las demás entidades (`delegacion_unidades`, `unidades`, `delegaciones`, `invitaciones_delegados`, `grupos`, `public.users`, `auth.users`).
  - Verificación obligatoria de ausencia contractual: solo se acepta HTTP 200 con `error: null` y 0 filas (o 404/not found en Auth); los errores de infraestructura son detectados y acumulados como fallos.
- **Eliminación de Secretos Literales y Verificación de Host Local**:
  - En ambos scripts locales eliminadas todas las claves y tokens hardcodeados, así como alternativas `||`.
  - Carga segura de entorno desde `apps/api/.env`, exigiendo variables de entorno y verificando que `SUPABASE_URL` apunte a `127.0.0.1`/`localhost`.
  - En `test-rls-reproduce.mjs`: contraseñas aleatorias en memoria, tracking previo de IDs y limpieza resiliente.
- **Evidencia Local de Comprobaciones Ejecutadas**:
  1. Tipos correctos: `pnpm --filter web exec tsc --noEmit` -> Exit 0 (0 errores).
  2. Ejecución normal: `node apps/api/test/unidades-rls-comprehensive.mjs` -> Exit 0 (10/10 casos + anónimo, baseline restaurado y verificado, 0 residuos).
  3. Falla controlada: `node apps/api/test/unidades-rls-comprehensive.mjs --fail-controlled` -> Exit 1 (asserción fallida capturada, teardown completo exitoso con baseline restaurado y 0 residuos).
  4. Error de limpieza detectado: `node apps/api/test/unidades-rls-comprehensive.mjs --fail-cleanup` -> Exit 1 (fallo de limpieza detectado y reportado en teardown).
  5. Baseline inesperada rechazada: `node apps/api/test/unidades-rls-comprehensive.mjs --fail-baseline-mismatch` -> Exit 1 (abortó en Fase 0 sin aplicar migraciones ni modificar políticas).
  6. Reproductor RLS local: `node apps/api/test/test-rls-reproduce.mjs` -> Exit 0.
- **Hashes SHA-256 de Archivos Afectados (Actualizados)**:
  - `apps/web/playwright.remote.config.ts`: `C825C9DAAF96977F43864C3734C177CEF5FEC6DF7757A31A6E2488BDB2EF702B`
  - `apps/web/e2e/beta-remote-n01-suite.spec.ts`: `A6E94133950ADEBFEB16DDA38E9A53CB9F588D5B51AB6123C2062972206B859D`
  - `apps/web/e2e/beta-remote-archive-and-clean.spec.ts`: `3DD05CA34AF3131971A8C46E8DCC5EF30DDC33BAF086011D5862A8EE526E816C`
  - `apps/web/e2e/beta-harness-recovery.spec.ts`: `3869A5FE79F48E69FA913185065CF1DD62ADD516FC61EA91FBB3E4C8AF98A4E2`
  - `apps/web/e2e/test-tracking-deterministic.mjs`: `3DD67AEC65ACE2366E528DA470D683C3B6906C82ADCA789CB0E982BA4B145BE6`
  - `apps/api/test/test-rls-reproduce.mjs`: `83738C197658138A4F95F5F192E8F2B18B7253DC09769B2A0608065AC3C946B2`
  - `apps/api/test/unidades-rls-comprehensive.mjs`: `FBCEB4EAFDF1A64083A89F5609B89614E72F4B0C0E9B9F0861CC1AD58AE4CF25`
  - `apps/api/.env`: `C563648B139DC357A50D40BC899FE8AA8192CDAF8DBBDCE8189EB4BDCF7A0703`
- **Configuración Single-Run y Verificación Determinista**:
  - `playwright.remote.config.ts`: configuración con un único proyecto ('Remote Single Run'), eliminando duplicación de proyectos. Listado acreditado vía `playwright test --config playwright.remote.config.ts --list` (2 tests en 2 files).
  - `saveTracking`: preserva y reconcilia tanto `account` histórico como `accounts`. IDs reales extraídos del token JWT (`sub`). Intentos no confirmados excluidos de listas confirmadas/residuales.
  - Prueba determinista: `apps/web/e2e/test-tracking-deterministic.mjs` y Test 7 en `beta-harness-recovery.spec.ts` acreditan la preservación estricta de las 3 cuentas residuales históricas (`test_gestor_1791434382116@example.com`, `b008_1791436199542_ga@example.com`, `7e83511a-0172-4ef1-9e1c-2c7e3e3c8c20`).
  - Limpieza remota en suite: acumula fallos, cierra contextos y lanza error si hubo recursos sin verificar o fallos.
  - Auxiliar de limpieza: exige encontrar intento y respuestas válidas; distingue archivado lógico vs inaccesibilidad (403/404) y declara ausencia física como `PENDING_ADMIN_ACCESS`.
  - Reproductor local: valida status 200, error null y array vacío en comprobación posterior a denegación de RLS.
- **Corrección de Falsos Negativos y Teardown Compartido en N01 (2026-10-08)**:
  - **Corrección de Tres Falsos Negativos en `reconcileTrackingSummary`**:
    1. Invitaciones sin verificación contractual (`!inv.verifiedContractual`) ahora cuentan estrictamente como residuos no verificados (`unverifiedDataResiduals++`).
    2. Grupos archivados sin comprobación `verifiedArchived` (`!g.verifiedArchived`) ahora cuentan como residuos no verificados.
    3. Delegaciones marcadas eliminadas sin comprobación contractual (`!d.verifiedContractual`) ahora cuentan como residuos no verificados.
    - Se agregaron 6 pruebas unitarias deterministas en `apps/web/e2e/tracking-implementation.spec.ts` (Casos 7, 8 y 9) verificando tanto el residuo pendiente en ausencia de confirmación como la aprobación limpia en caso afirmativo verificado.
- **Corrección de Limpieza de Invitaciones y Delegaciones en N01 (2026-10-08)**:
  - **Contratos Exactos de Invitaciones y Delegaciones**:
    1. `GET /delegados` conserva invitaciones históricas en la base de datos. Se cancelan exclusivamente las invitaciones pendientes (`status === 'creada' || status === 'pendiente'`) y se verifica que figuren en estado «cancelada» en la respuesta, no su desaparición.
    2. Tras aceptar una invitación, la suite actualiza su estado en tracking a `'aceptada'` y vincula `delegacionId`; nunca intenta cancelarla posteriormente (evitando ConflictException 409).
    3. Para invitaciones aceptadas, se comprueba la revocación de su delegación asociada (ausencia en el array `delegaciones`). Se conserva explícitamente el registro histórico y la eliminación física pendiente (`physicalAbsence: 'PENDING_ADMIN_ACCESS'`), sin marcar erróneamente como eliminado.
    4. Para delegaciones, se comprueba su ausencia tras revocar (`DELETE /delegados/:id`), dado que `listDelegados` excluye contractualmente las revocadas (`.neq('estado', 'revocada')`).
    5. Validación estructural estricta: un HTTP 200 sin arreglos `invitaciones` y `delegaciones` falla de inmediato por recurso y nunca acredita limpieza.
  - **Resiliencia en Suite Auxiliar (`beta-remote-archive-and-clean.spec.ts`)**:
    - Registra errores por recurso, continúa procesando las demás entidades y persiste el estado `CLEANUP_FAILED_WITH_ERRORS` antes de delegar en `finalizeRunAndCleanupContexts`.
  - **Pruebas Offline de Contratos Acreditadas (21/21 Tests Passed)**:
    - 5 nuevas pruebas offline unitarias sobre la función real compartida `cleanAndVerifyInvitacionesYDelegaciones`:
      1. Invitación cancelada presente con estado `'cancelada'` en `GET /delegados` (aprobada).
      2. Invitación aceptada con delegación asociada revocada (ausente en `delegaciones`), conservando registro histórico intacto (aprobada).
      3. Delegación todavía activa tras intento de revocación (error registrado por recurso, no acredita limpieza).
      4. Respuesta incompleta sin arreglos contractuales (falla y registra errores por recurso).
      5. Fallo de red/transporte (captura excepción y registra errores por recurso).
    - Ejecución desde raíz: `node apps/web/node_modules/@playwright/test/cli.js test --config apps/web/playwright.harness.config.ts` -> 21 passed (3.1s).
    - Ejecución desde web: `pnpm --filter web exec playwright test --config playwright.harness.config.ts` -> 21 passed (3.5s).
    - Tipos: `pnpm --filter web exec tsc --noEmit` -> Exit 0 (0 errores).
  - **Hashes SHA-256 Actualizados**:
    - `BDB6FDB01D6BEC9F1854B49524142B9B151DE540FA3C57A20D7F7E20B2B8C05B  remote-tracking.ts`
    - `3FD4E7F5F9823E8751DA5C33AFB9A3A50BFAAF1D4D609AB0E762C8ED5EC3C272  playwright.harness.config.ts`
    - `C825C9DAAF96977F43864C3734C177CEF5FEC6DF7757A31A6E2488BDB2EF702B  playwright.remote.config.ts`
    - `97E2780225BCE2EBC7153FF18564D51877F9AFABF4D4EC48C652E6C0BBC28FB5  beta-remote-n01-suite.spec.ts`
    - `655E28DA7F1A4CA26B5E183561938F8A2FAEB3826122083FBD2CE404A1040293  beta-remote-archive-and-clean.spec.ts`
    - `CFB7BBA9E993F8CA930AEE93A5861632DBD90E382F66D57F6689B3E4B2DCA92B  beta-harness-recovery.spec.ts`
    - `649D324770A34BA1DDC7D4D87F115C57076888E06C37EE9B9C6EE5F5B0BC467D  tracking-implementation.spec.ts`
    - `83738C197658138A4F95F5F192E8F2B18B7253DC09769B2A0608065AC3C946B2  test-rls-reproduce.mjs`
    - `FBCEB4EAFDF1A64083A89F5609B89614E72F4B0C0E9B9F0861CC1AD58AE4CF25  unidades-rls-comprehensive.mjs`
    - `100FB7BA1F86DF41D9F0A6AEB3E25FE4A167AC6C60FD8E4703A0ECD493426731  remote-fixtures-tracking.json`
- **Estado**: N01 permanece ABIERTO sin nuevas cuentas, migraciones remotas ni redespliegues.

### Actualización Batch Corrección Validación GET /grupos (2026-10-08)
- **Defectos Corregidos**:
  1. **Validación estricta de GET /grupos**: Se exige un array cuyos elementos sean objetos con `id` de tipo string no vacío (`isValidGrupoItem`). `[{}]`, `[null]` o IDs inválidos fallan de forma cerrada y registran error, nunca acreditando ausencia.
  2. **Reinicio de `verifiedArchived`**: `verifiedArchived` se reinicia a `false` antes de comprobar cada recurso; respuestas inválidas, falta de autorización o fallos de red no conservan verificaciones anteriores.
  3. **Adopción en suite principal**: `beta-remote-n01-suite.spec.ts` adopta la misma función `cleanAndVerifyGrupos` en el paso 6 y en el bloque `finally`, eliminando bucles manuales no verificados contractualmente.
  4. **Regresiones deterministas offline**: 4 nuevas pruebas en `tracking-implementation.spec.ts` (total 29/29 passed en 3.6s desde raíz y 3.2s desde web) cubriendo elementos inválidos (`[{}]`, `[null]`, `{id: ''}`), array vacío válido (`[]`), grupo todavía presente en catálogo y continuación con los recursos restantes.
- **Evidencia Ejecutable**:
  - `pnpm --filter web exec tsc --noEmit` -> Exit 0.
  - `node apps/web/node_modules/@playwright/test/cli.js test --config apps/web/playwright.harness.config.ts` -> 29 passed (3.6s).
  - `pnpm --filter web exec playwright test --config playwright.harness.config.ts` -> 29 passed (3.2s).
- **Hashes SHA-256 Actualizados**:
  - `E08F094B6DE2ACE418F130E9CA09CE53F7AD94C3C2CA67C4C981C8107E579BF8  remote-tracking.ts`
  - `3CE8537E93D2364C8BE0F6B144132B4DF600BCAC64209DCC0FF56A216EDD10FD  beta-remote-n01-suite.spec.ts`
  - `6E0D9D9A2C8B97B734FD8A5DD0BDB5F4A5B852C99278A156B414D9B22891842E  beta-remote-archive-and-clean.spec.ts`
  - `6A4689C781622A9B49DABF9F6C121E29A4E89C195CAD4937C8220D5E5A00B853  tracking-implementation.spec.ts`
- **Diferenciación de Alcance**:
  - Efectivamente probado: Lógica de validación estricta de grupos, reinicio de verificación, contratos offline y resiliencia en 29 pruebas deterministas.
  - Pendiente remoto: Purga física administrativa de identidades Auth y migración RLS remota de unidades sujeta a autorización de Carlos/Codex.

### Actualización Migración Remota Supabase Beta (2026-10-08)
- **Autorización**: Carlos autorizó la aplicación exclusiva de `20261008030000_unidades_select_returning.sql` en el Supabase beta.
- **Proyecto Remoto Confirmado**: `maeiuaketocznpogmtic` (organización `snpjqinernydjtlzfoug`).
- **Archivo y Huella SHA-256 Verificados**:
  - `AE72CBE9341E5751F4A43E765CDF8E17C8164D053A4296F6269948A5B408D6FF  supabase/migrations/20261008030000_unidades_select_returning.sql`
- **Verificación Pre-aplicación de Historial Remoto**:
  - `npx supabase migration list --linked` confirmó que todas las 28 migraciones previas estaban aplicadas y en paridad; la única migración pendiente era `20261008030000`. Sin discrepancias en el esquema.
- **Dry-run**:
  - `npx supabase db push --linked --dry-run` confirmó que únicamente se aplicaría `20261008030000_unidades_select_returning.sql`.
- **Aplicación Versionada y Transaccional**:
  - Comando: `npx supabase db push --linked --yes` -> Exit 0 (`Applying migration 20261008030000_unidades_select_returning.sql...`).
- **Verificaciones Post-aplicación**:
  1. *Historial remoto registrado*: `npx supabase migration list --linked` confirmó `local: "20261008030000", remote: "20261008030000", time: "2026-10-08 03:00:00"`.
  2. *Definición efectiva de la política*: Consulta directa vía `npx supabase db query --linked` confirmó la política activa en `public.unidades`:
     - `policyname`: `Unidades authenticated select policy`
     - `cmd`: `SELECT`
     - `roles`: `{authenticated}`
     - `qual`: `(((deleted_at IS NULL) AND (is_gestor_owner(gestor_id) OR (EXISTS ( SELECT 1 FROM delegaciones d WHERE ((d.delegado_id = auth.uid()) AND (d.gestor_id = unidades.gestor_id) AND (d.estado = 'activa'::text) AND (d.alcance_tipo = 'cuenta'::text)))) OR ((grupo_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM delegaciones d WHERE ((d.delegado_id = auth.uid()) AND (d.gestor_id = unidades.gestor_id) AND (d.estado = 'activa'::text) AND (d.alcance_tipo = 'grupo'::text) AND (d.grupo_id = unidades.grupo_id))))) OR can_read_unidad(id))) OR ((estado = 'publicada'::unidad_estado) AND (deleted_at IS NULL)))`
- **Estado**: Migración RLS aplicada exitosamente. Sin cuentas nuevas, sin purga de datos y sin redespliegues. Pruebas funcionales remotas ejecutadas según autorización en el siguiente lote.
- **Artifacts de Evidencia de Solo Lectura (Proyecto `maeiuaketocznpogmtic`)**:
  - [specs/008-beta-observaciones-2026-10-02/evidence/N01/migration-history-remote.md](file:///d:/Programacion-Cosas/Proyecto_inmobiliaria/TFI/specs/008-beta-observaciones-2026-10-02/evidence/N01/migration-history-remote.md) (`2062104379B03108261F2D3101CFB81CE0E8D9410D54F6721864D0904AE4B8EE`): Historial completo de 29 migraciones remotas en paridad local/remota.
  - [specs/008-beta-observaciones-2026-10-02/evidence/N01/effective-policy-unidades.md](file:///d:/Programacion-Cosas/Proyecto_inmobiliaria/TFI/specs/008-beta-observaciones-2026-10-02/evidence/N01/effective-policy-unidades.md) (`7906275C38A606DBFF93576A8B9477550BF357D9954CE71DB357E5CE98EE25F6`): Definición efectiva en `pg_policies` para `Unidades authenticated select policy`.
  - *Aclaración documental*: La paridad del historial no demuestra por sí sola igualdad completa del esquema.

### Verificación Funcional Remota de N01 (2026-10-08)
- **Harness ejecutado**: `apps/web/e2e/beta-remote-n01-suite.spec.ts` con `apps/web/playwright.remote.config.ts` (1 worker, 0 reintentos).
- **Entornos**: Web (`https://rendo-beta-web.vercel.app`), API (`https://rendo-beta-api.vercel.app`), Supabase (`maeiuaketocznpogmtic`).
- **Comando**: `node apps/web/node_modules/@playwright/test/cli.js test apps/web/e2e/beta-remote-n01-suite.spec.ts --config apps/web/playwright.remote.config.ts --workers=1 --retries=0` (Exit code: 1).
- **Resultados de Ejecución**:
  1. *Creación de entidades*:
     - Gestor A (`b008_1791497007632_ga@example.com`, ID: `b24659ce-9268-4831-9989-a4fb759e047a`) registrado y autenticado.
     - Grupos creados: `Grupo_Archivar_b008_1791497007632` (`2a5b8b2c-72da-4c43-84b3-029d80c9e4cc`) y `Grupo_Paginacion_b008_1791497007632` (`5debeba4-0783-4424-9d7e-5231527497bf`).
     - Creación de 3 unidades obligatorias con `POST /unidades`: 201 Created para las 3 unidades (`afbd7d16-6eb8-4768-8c07-3563fb8eb55a`, `c56502e5-1a17-465c-a3b5-f294dad1a10a`, `6f16f044-f827-4a7a-9b49-151e02551b36`) validando la migración RLS `20261008030000`.
  2. *Inventario y Paginación UI*:
     - Captura obtenida en `specs/008-beta-observaciones-2026-10-02/evidence/N01/captures-remote/b008_1791497007632/remote-gestorA-mis-unidades-desktop.png`.
     - Carga efectiva de UI con Bento Grid mostrando "MOSTRANDO 2 DE 3 UNIDADES AUTORIZADAS EN 2 GRUPOS".
     - Orden de listado: Las unidades se ordenan descendentemente por fecha de creación, mostrando `Depto A_3` y `Depto A_2` en la página 1.
  3. *Limpieza y Finalización*:
     - Grupos: Ambos grupos archivados lógicamente con éxito (`verifiedArchived: true`).
     - Unidades: `DELETE /unidades/:id` retornó HTTP 404 para las 3 unidades, y `GET /unidades/:id` permaneció en HTTP 200 OK.
     - Fallo en finalizador: `FINALIZE_SUITE_RUN_FAILED` con 6 errores acumulados de unidades.
     - Contextos cerrados correctamente y tracking persistido como `CLEANUP_FAILED_WITH_ERRORS`.
- **Causa Probable del Fallo de Limpieza**:
  - En la API (`UnidadesService.remove`), el borrado lógico ejecuta `supabase.from('unidades').update({ deleted_at: new Date().toISOString() }).eq('id', id).select().single()`. La cláusula `WITH CHECK (can_manage_unidad(id))` de la política `Unidades update policy` o la política de SELECT en el `RETURNING` fallan porque `can_manage_unidad` y `can_read_unidad` comprueban `deleted_at IS NOT NULL` y retornan `FALSE`, haciendo que el UPDATE devuelva 0 filas o falle, provocando `NotFoundException` (HTTP 404).
- **Residuos Registrados**:
  - 3 unidades activas en base de datos (`afbd7d16-6eb8-4768-8c07-3563fb8eb55a`, `c56502e5-1a17-465c-a3b5-f294dad1a10a`, `6f16f044-f827-4a7a-9b49-151e02551b36`).
  - 2 grupos archivados lógicamente (`2a5b8b2c-72da-4c43-84b3-029d80c9e4cc`, `5debeba4-0783-4424-9d7e-5231527497bf`).
  - 1 cuenta de Auth residual (`b008_1791497007632_ga@example.com`, ID: `b24659ce-9268-4831-9989-a4fb759e047a`).
- **Estado de N01**: N01 permanece ABIERTO. Sin reintentos, sin nuevas cuentas y sin migraciones adicionales.





