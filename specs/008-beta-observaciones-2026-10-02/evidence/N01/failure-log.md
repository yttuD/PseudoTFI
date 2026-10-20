# B007b — Failure Log y Diagnóstico de Ejecución

## 1. Historial de Comandos de la Sesión
- **Comando 1 (tsc inicial):** `node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json` → Exit 1 (TS18047: dbB1, dbA3, dbA2 possibly null). Corregido.
- **Comando 1b (tsc corregido):** `node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json` → Exit 0 (Limpio).
- **Comando 2 (Runner Real Run 1 - task-110):** `node apps/web/e2e/beta-real-runtime.mjs` → Exit 1 (Playwright Exit 1).
  - Tests totales: 29
  - Passed: 14 (Escenario 1 y 1b en los 7 viewports y temas visuales).
  - Failed: 15 (Escenario 2 x1, Escenario 3 x7, Escenario 4 x7).
  - Capturas generadas: 35 capturas reales en `specs/008-beta-observaciones-2026-10-02/evidence/N01/captures/`.
  - Cleanup verificado: `Todos los puertos quedaron verificados y libres (3200, 3201, 3202)`.
- **Comando 2b (Runner Real Run 2 - task-170):** Cancelado por reinicio de CLI antes de iniciar suite de tests (Web dev server aún compilando rutas).

## 2. Diagnóstico Técnico de Fallos en Run 1
1. **Escenario 2 (auth-matrix-1440-light):**
   - Fallo: `strict mode violation: locator('a[href*="/mis-unidades/${unitA1Id}/editar"]') resolved to 2 elements` (título de tarjeta y botón de edición con tooltip).
   - Diagnóstico: Requiere `.first()` o selector de botón explícito `a[title="Editar Unidad"]`.
2. **Escenario 3 (visual-1440, 1024, 768, 375):**
   - Fallo 1: En `page=9999&limit=12`, PostgREST arrojó HTTP 416/422 (Range Not Satisfiable), lo que provocó que `fetchMisUnidades` emitiera error HTTP en vez de conteo con array vacío.
   - Fallo 2 (viewport 768): `nextBtn.click()` interceptado por el dock flotante inferior de acciones rápidas (`QuickActionsDock` en `fixed bottom-6 right-8`).
3. **Escenario 4 (visual-1440, 1024, 768, 375):**
   - Fallo: `strict mode violation: locator('[role="alert"]') resolved to 2 elements` debido a que Next.js App Router inyecta automáticamente `<div role="alert" id="__next-route-announcer__">`.
   - Diagnóstico: Requiere filtrar por texto del componente real: `page.getByRole('alert').filter({ hasText: 'Error de carga de inventario' })`.

## 3. Resoluciones de Preparación — B007e
1. **Fallback loader rechazado eliminado:** `inventory-loader.ts` ya no enmascara 422/416 con consultas artificiales a page=1. La API (`unidades.service.ts`) maneja `PGRST103` cuando `offset > 0` mediante consulta HEAD idénticamente filtrada (`gestor_id`, `deleted_at`, y `scope` de grupo o IDs). Retorna HTTP 200 con `data: []` y `count` real exclusivamente si `from >= count`. Si count es null, error o `from < count`, falla con HTTP 422 (fail-closed).
2. **UI out-of-range:** En `BentoGruposGrid.tsx`, cuando `currentPage > totalPages`, se explica el estado (`paginaFueraDeRango`), se conserva el contador de unidades autorizadas y se provee enlace directo a primera página (`irAPrimeraPagina`), suprimiendo botones ciegos de página anterior.
3. **Dock overlay eliminado:** `QuickActionsDock` pasa de posición `fixed` solapante a flujo natural (`mt-8 flex justify-end`), permitiendo click real sobre `nextBtn` sin `{ force: true }` a 768px y en todos los viewports.
4. **Selectores:** Locators de edición IDs usan `.first()` y filtros de alerta filtran por texto exacto del componente sin tocar `__next-route-announcer__`.
5. **Contraste de badge y corrección terminal:** Badge de solo lectura actualizado a `text-[#131F3C]` (azul de paleta oficial aprobada) en light mode y `dark:text-[#B89355]` en dark mode. Los ratios nominales son estimaciones teóricas y no mediciones reales; la verificación AA real queda pendiente de ejecución mediante Canvas 2D sRGB con composición alpha de ancestros.

## 4. Lote b008_1791497007632 — Borrado Lógico de Unidades y Expectativas de Harness

### 4.1 Causa Raíz en `DELETE /unidades/:id` — Precisión Técnica y Evidencia Empírica
Diferenciación entre causas observadas empíricamente y análisis del flujo de servicio:
1. **Prueba Directa contra PostgREST (`apps/api/test/reproduce-unit-delete.mjs`):**
   - Esta prueba firma un JWT localmente con `SUPABASE_JWT_SECRET` y se conecta directamente al endpoint PostgREST vía cliente `@supabase/supabase-js` (no pasa por el servidor HTTP NestJS ni evalúa `JwtAuthGuard`).
   - **Causa Observada (Fallo 1):** PostgREST retorna `HTTP 403 Forbidden` (`code: '42501'`, `message: 'new row violates row-level security policy for table "unidades"'`).
   - **Causa Demostrada:** La política `Unidades update policy` impone `WITH CHECK (public.can_manage_unidad(id))`. La función `can_manage_unidad(p_unidad_id)` contiene `IF NOT FOUND OR v_unidad.deleted_at IS NOT NULL THEN RETURN FALSE;`. Al intentar realizar un soft-delete (`UPDATE public.unidades SET deleted_at = NOW()`), la fila resultante tiene `deleted_at IS NOT NULL`, violando la cláusula `WITH CHECK`.
2. **Análisis de SELECT / RETURNING (Causa Secundaria Concurrente):**
   - La llamada de `@supabase/supabase-js` `update().select().single()` solicita la proyección de la fila modificada mediante la cláusula `RETURNING`.
   - Bajo `Unidades authenticated select policy`, la lectura exige `deleted_at IS NULL`. Incluso si el `UPDATE` fuera admitido, la proyección no devolvería filas (`PGRST116`).
3. **Mapeo en NestJS (`unidades.service.ts`):**
   - En el controlador/servicio de NestJS, el método `remove(id, token)` ejecutaba `update({ deleted_at: ... }).select().single()`. Al fallar PostgREST con 403 o no retornar datos, la sentencia `if (error || !data) throw new NotFoundException('Unidad no encontrada')` transformaba el fallo en `HTTP 404`.
   - **Estado persistido en base de datos:** Cero cambios (`deleted_at` permanecía `NULL`, unidad activa).
   - **Resultados crudos archivados:** `specs/008-beta-observaciones-2026-10-02/evidence/N01/unit-delete-reproduction.json` contiene la traza exacta de las variantes A (solo UPDATE), B (UPDATE + .select().single()) y C (UPDATE + .select() array).

### 4.2 Ampliación de Alcance y Protocolo Común de Bloqueo
Para resolver la condición de carrera donde un alquiler podría crearse o activarse entre la consulta de alquileres y el borrado de la unidad, y para prevenir oráculos de información en actores no autorizados:
1. **Reorganización de Autorización en `archive_unidad`:**
   - La autorización del actor (Gestor propietario o Delegado dentro de alcance) y el bloqueo exclusivo de la fila (`SELECT ... FROM public.unidades WHERE id = p_unidad_id ... FOR UPDATE`) se ejecutan estrictamente **antes** de cualquier consulta a la tabla `public.alquileres`.
   - Si un actor ajeno llama al RPC sobre una unidad con alquiler activo, recibe `Unidad no encontrada` de forma fail-closed, sin divulgar la existencia de alquileres.
2. **Coordinación Concurrente en `public.alquileres` (Ampliación de Alcance):**
   - No basta mover la consulta si el flujo de creación/activación de alquileres no participa en la serialización.
   - Se incorpora a `supabase/migrations/20261008040000_unit_archive_rpc.sql` la función trigger `public.check_unidad_active_for_rental()` y el trigger `trg_check_unidad_active_for_rental` en `public.alquileres` (`BEFORE INSERT OR UPDATE OF estado, unidad_id, deleted_at`).
   - Cuando un alquiler entra en `estado = 'activo'` y `deleted_at IS NULL`, el trigger ejecuta `SELECT id, deleted_at FROM public.unidades WHERE id = NEW.unidad_id FOR SHARE`.
   - **Interacción de Locks:**
     - Si `archive_unidad` adquiere `FOR UPDATE` sobre la unidad, cualquier inserción/activación concurrente de alquiler espera (lock wait) y, tras el commit del archivado, lee `deleted_at IS NOT NULL` y es rechazada.
     - Si la creación/activación del alquiler adquiere `FOR SHARE` sobre la unidad, `archive_unidad` espera; al completarse el alquiler, `archive_unidad` evalúa la existencia de alquileres activos y aborta sin borrar la unidad.

### 4.3 Ajustes de Harness
1. **Paginación (`beta-remote-n01-suite.spec.ts`):** Expectativas alineadas al contrato real `ORDER BY created_at DESC, id ASC` (`Depto A_3` y `A_2` en pág 1; `Depto A_1` en pág 2; sin duplicados y recuperación limpia).
2. **Preservación de Errores (`remote-tracking.ts`):** `finalizeRunAndCleanupContexts` recibe `testError?: unknown`, conservando tanto el fallo original como los errores de finalización en un error combinado `TEST_AND_CLEANUP_FAILED`, sin enmascarar fallos de negocio.

### 4.4 Corrección de Seguridad del Trigger y Verificación Concurrente
1. **Protección Anti-Oráculo en `check_unidad_active_for_rental`:**
   - La función trigger fue endurecida para evitar comportarse como un oráculo de información privilegiada.
   - En funciones `SECURITY DEFINER`, `current_user` retorna el owner (`postgres`), por lo que la comprobación previa privilegiaba indebidamente a todos los actores autenticados.
   - Se ajustó para evaluar prioritariamente `auth.uid()`: si el actor no es el dueño ni delegado con permiso/alcance sobre la unidad referenciada, el trigger retorna `NEW` inmediatamente sin inspeccionar la unidad ni lanzar excepciones específicas.
   - La denegación queda delegada por completo a la política RLS de `public.alquileres` (`WITH CHECK (public.can_manage_unidad(unidad_id))`), produciendo un rechazo uniforme y cerrado (`SQLSTATE 42501`) indistinguible entre unidades activas ajenas, unidades eliminadas ajenas y unidades inexistentes, sin revelar estado privado ni persistir cambios.
   - Las operaciones administrativas legítimas (`session_user = 'postgres'` o `auth.role() = 'service_role'`) conservan bypass.
2. **Pruebas Concurrentes con Identidad Autenticada Real y `pg_locks`:**
   - En `apps/api/test/test-concurrent-rental-archive.mjs`, se eliminó la simulación por bloques y se invoca directamente `public.archive_unidad` con claims JWT del actor autenticado.
   - Se agregaron los 4 escenarios de serialización:
     - 1A: `archive_unidad` primero $\rightarrow$ INSERT activo espera y falla con mensaje exacto (`No se puede crear ni activar un alquiler en una unidad eliminada o archivada`).
     - 1B: `archive_unidad` primero $\rightarrow$ UPDATE de activación espera y falla con el mismo mensaje exacto.
     - 2A: INSERT activo primero en transacción abierta $\rightarrow$ `archive_unidad` espera y falla con mensaje exacto (`La unidad tiene alquileres activos y no se puede eliminar`).
     - 2B: UPDATE de activación primero en transacción abierta $\rightarrow$ `archive_unidad` espera y falla con el mismo mensaje exacto.
   - Detección fehaciente de bloqueo mediante consulta directa a `pg_locks WHERE NOT granted AND pid = <pid>`.
   - Preflight estricto: rechaza destinos no locales y comprueba mediante usuario de prueba testigo que PostgREST y las sesiones SQL apuntan al mismo entorno físico.
   - Limpieza robusta: cierre previo de sesiones psql, verificación de ausencia física por IDs exactos en tablas y Auth, y preservación de fallos originales del test si ocurre error de limpieza.

### 4.5 Endurecimiento Determinista y Cierre de Falsos Positivos
1. **Preflight sin Falsos Positivos:** `parseCountScalar` descarta encabezados/pies de psql (evitando que `(1 row)` acredite falsamente un COUNT=0), extrae el entero escalar exacto y rechaza activamente cualquier error SQL. El usuario testigo se registra de inmediato para garantizar purga en `finally` incluso si el preflight falla.
2. **Cierre y Desaparición Acreditada de Backends:** `PsqlSession.close()` espera la finalización del proceso de Node y `verifyBackendClosed(pid)` acredita mediante consulta a `pg_stat_activity` que el backend de PostgreSQL dejó de existir antes de iniciar la limpieza de fixtures.
3. **Anti-Oráculo Estricto:** Se exige estrictamente `code === '42501'` tanto en INSERT como en UPDATE para unidad activa ajena, eliminada ajena e inexistente, descartando aserciones de texto (`includes('violates')`) que habrían admitido errores de clave foránea `23503`.
4. **Validación Estricta de Ausencia en Auth:** `checkAuthAbsenceStrict` rechaza errores de red, permisos o 500 y presencia de `user`, aceptando de forma cerrada únicamente el `404 Not Found` documentado (`user_not_found`).
5. **Comprobaciones Negativas Deterministas:** Ambas suites incluyen tests negativos previos que demuestran el rechazo de COUNT=0, errores SQL, errores 500 en Auth, errores de FK 23503 y leaks simulados de backend. Residuales al finalizar: 0 en todas las tablas y Auth.


