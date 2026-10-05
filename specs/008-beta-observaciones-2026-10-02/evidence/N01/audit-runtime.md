# Evidencia de Auditoría y Corrección de Runtime (B007c / N01 / T005)

> Preparación histórica. Ejecuciones locales actuales: audit-review.md y
> group-archive-review.md. Beta aún pendiente de aplicación/publicación.

- **Fecha**: 2026-10-04
- **Lote**: `specs/008-beta-observaciones-2026-10-02/antigravity-batch-007c-audit.md`
- **Perfil de Evidencia**: DB | SECURITY | MIGRATION
- **Estado**: PREPARED (Archivos generados para revisión de Codex, sin ejecución SQL previa).

---

## 1. Análisis de Causa Raíz (SQLSTATE 42703)

- **Falla Observada en B007a**:
  `UnprocessableEntityException: record "old" has no field "estado"` al ejecutar `UPDATE public.grupos`.
- **Puntero de Origen**:
  `supabase/migrations/20260925120000_delegado_scope_authorization.sql:1122`
- **Mecanismo del Fallo**:
  El trigger `trg_audit_grupos` está declarado `AFTER UPDATE ON public.grupos` y ejecuta la función `public.audit_operational_mutation()`.
  En la línea 1122 de dicha función:
  ```sql
  ELSIF TG_TABLE_NAME = 'unidades' AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
  ```
  En PL/pgSQL, las variables `OLD` y `NEW` se tipifican dinámicamente con la estructura de la tupla de la tabla que disparó el trigger (en este caso, `public.grupos`).
  El intérprete de expresiones PL/pgSQL resuelve los accesos a campos de registro (`OLD.estado`) contra el descriptor de columnas de la tupla. Dado que la tabla `public.grupos` carece de una columna `estado`, la evaluación lanza un error irrecuperable de catálogo `SQLSTATE 42703 (undefined_column: record "old" has no field "estado")` antes de que el condicional lógico pueda evitar la evaluación.
  También se reprodujo en inquilinos y modalidades_precio. Alquileres tiene
  columna estado y no reprodujo42703; no generalizar ese defecto a esa tabla.

---

## 2. Diseño de la Solución (20261005010000_operational_audit_record_fields.sql)

La migración de reemplazo `supabase/migrations/20261005010000_operational_audit_record_fields.sql`:
1. **Preserva Invariantes de Dominio**:
   - Misma firma: `public.audit_operational_mutation() RETURNS trigger`.
   - `SECURITY DEFINER` con `SET search_path = ''`.
   - Mismo esquema de auditoría en `public.log_acciones` (`gestor_id`, `actor_id`, `actor_rol`, `accion`, `recurso_tipo`, `recurso_id`, `metadata`, `created_at`).
   - Mismas acciones operativas: `crear_<tabla>`, `actualizar_<tabla>`, `eliminar_<tabla>` (SOFT_DELETE), `cambiar_estado_unidad`, y `eliminar_fisico_<tabla>`.
2. **Eliminación de la Dependencia de Columnas Inexistentes**:
   - Emplea conversión segura a JSONB mediante `to_jsonb(OLD)` y `to_jsonb(NEW)`.
   - La evaluación de cambio de estado se anida exclusivamente dentro de una rama condicional explícita `ELSIF TG_TABLE_NAME = 'unidades' THEN`.
   - La extracción de `estado` utiliza `v_old_json->>'estado'` y `v_new_json->>'estado'`, que retornan `NULL` de manera segura sin arrojar excepciones de catálogo si un campo no existe.
3. **No Debilitamiento**:
   - No se alteran ni eliminan triggers existentes (`trg_audit_unidades`, `trg_audit_grupos`, `trg_audit_alquileres`, `trg_audit_inquilinos`, `trg_audit_modalidades_precio`).
   - No se añaden bloques `EXCEPTION WHEN OTHERS` que enmascaren fallos.
   - Atomicidad completa: si la auditoría falla, la mutación operativa aborta.

---

## 3. Suite de Verificación pgTAP (010_beta_operational_audit.sql)

La suite de pruebas en `supabase/tests/010_beta_operational_audit.sql` define 36 aserciones transaccionales (`BEGIN ... ROLLBACK` con `plan(36)`):
- **Existencia de función**: `has_function` para `public.audit_operational_mutation`.
- **UPDATE en tablas sin columna `estado`** (resuelve SQLSTATE 42703 bajo `ROLE authenticated`):
  - `grupos`: actualiza nombre y registra `actualizar_grupos` (`op: UPDATE`).
  - `inquilinos`: actualiza teléfono y registra `actualizar_inquilinos` (`op: UPDATE`).
  - `modalidades_precio`: actualiza precio y registra `actualizar_modalidades_precio` (`op: UPDATE`).
  - `alquileres`: actualiza `estado_pago` (columna real confirmada por schema; no posee `estado`) y registra `actualizar_alquileres` (`op: UPDATE`).
- **UPDATE en `unidades`** (tabla con columna `estado`):
  - Mutación ordinaria (`titulo_es`) -> registra `actualizar_unidades` (`op: UPDATE`).
  - Transición de estado (`publicada` -> `pausada`) -> registra `cambiar_estado_unidad` con metadata `{"estado_anterior": "publicada", "nuevo_estado": "pausada"}`.
- **INSERT de registros**:
  - `grupos`: inserción autenticada registra `crear_grupos` con `recurso_id` y `op: INSERT`.
- **DELETE físico**:
  - `grupos`: borrado físico de registro registra `eliminar_fisico_grupos` (`op: PHYSICAL_DELETE`).
- **SOFT_DELETE (Seam B007d)**:
  - `grupos`: Direct UPDATE de `deleted_at` es denegado bajo RLS (SQLSTATE 42501); el archivado autorizado vía RPC `archive_grupo` ejecuta soft-delete y registra `eliminar_grupos` (`op: SOFT_DELETE`).
- **Aislamiento Multi-Workspace**:
  - Gestor B intentando modificar `grupos` de Gestor A afecta 0 filas; no genera registros en `log_acciones`.
- **Atribución de Actores**:
  - Mutaciones de Gestor A registran `actor_id = v_gestor_a`, `actor_rol = 'gestor'`.
  - Mutaciones de Delegado A registran `actor_id = v_delegado_a`, `actor_rol = 'delegado'`, `gestor_id = v_gestor_a`.
- **Inmutabilidad de `log_acciones` bajo RLS para clientes**:
  - Direct INSERT es rechazado (`throws_ok`, código de violación de permisos).
  - Direct UPDATE y Direct DELETE retornan 0 filas afectadas (`results_eq` contra 0) y el contenido permanece inmutable (conforme a políticas RLS existentes).
- **Alcance y Limitaciones**:
  - No se prueba atomicidad ante falla de auditoría inducida artificialmente (requeriría corromper triggers internos de `log_acciones` o violar FK deliberadamente dentro del trigger).

---

## 4. Archivos Afectados y Hashes de Preparación

- `supabase/migrations/20261005010000_operational_audit_record_fields.sql`: Migración de reemplazo puntual.
- `supabase/tests/010_beta_operational_audit.sql`: Suite de validación pgTAP.
- `apps/api/test/beta-isolation.e2e-spec.ts`: Harness de integración real (reafirma update de grupos sin debilitar aserciones).
- `specs/008-beta-observaciones-2026-10-02/evidence/N01/audit-runtime.md`: Este documento de especificación y evidencia.

---

## 5. Próximos Pasos

1. Revisión de Codex del código SQL de migración y suite pgTAP.
2. Aplicación local controlada de la migración por parte de Codex.
3. Ejecución de la suite pgTAP `010_beta_operational_audit.sql` y del harness e2e `beta-isolation.e2e-spec.ts` para verificar la resolución de 27/27 tests en verde.
