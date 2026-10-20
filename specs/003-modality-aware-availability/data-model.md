# Phase 1 Data Model: Modality-Aware Availability

## Modeling rules

1. Unidad is the only owner of occupancy. Grupo supplies reusable configuration, never blocks.
2. Every active block has one normalized absolute interval with inclusive start and exclusive end.
3. Monthly/daily inputs preserve local dates; hourly inputs preserve exact instants and timezone.
4. The exclusion constraint, not application code, is the final overlap authority.
5. Availability history is released or soft-deleted, never physically deleted.
6. Effective Seña state is explicit and is not inferred from amount alone.
7. Unidad.estado is not read or mutated by availability lifecycle functions.

## Enumerations

### disponibilidad_precision

| Value | Meaning |
|---|---|
| fecha_mensual | Local-date period selected through a monthly Modalidad de precio |
| fecha_diaria | Local-date period selected through a daily Modalidad de precio |
| instante_horario | Exact timestamp period selected through an hourly Modalidad de precio |

### disponibilidad_origen

| Value | Meaning |
|---|---|
| sena | Automatic block created by an effective optional Seña |
| mantenimiento | Manual maintenance closure |
| uso_privado | Manual private-use closure |

### disponibilidad_estado_bloqueo

| Value | Meaning |
|---|---|
| activo | Participates in overlap exclusion and public projection |
| liberado | Retained history that no longer blocks |

### disponibilidad_modo_regla

| Value | Meaning |
|---|---|
| propia | Unidad uses its own timezone, schedule and buffer |
| heredar_grupo | Unidad resolves the active rule from its current Grupo |

### disponibilidad_estado_revision

| Value | Meaning |
|---|---|
| pendiente | Historical/configuration review is incomplete; public result is unknown |
| activa | Rule and historical disposition were explicitly validated |

### estado_sena

| Value | Meaning |
|---|---|
| sin_sena | Alquiler intentionally has no Seña |
| pendiente | Optional amount proposed but not collected |
| cobrada | Authorized Gestor/Delegado marked the positive Seña collected |
| reintegrada | Previously collected Seña was reversed/refunded |

## Entity: configuraciones_disponibilidad_grupo

One optional reusable hourly rule per active Grupo.

| Field | Type | Required | Rule |
|---|---|---:|---|
| id | UUID | yes | Primary key |
| gestor_id | UUID | yes | Must equal Grupo owner/workspace |
| grupo_id | UUID | yes | FK Grupo; one non-deleted configuration per Grupo |
| activa | BOOLEAN | yes | Explicit switch; default false |
| zona_horaria | TEXT | yes | Must exist in PostgreSQL pg_timezone_names |
| horario_semanal | JSONB | yes | Seven-day map; arrays of ordered, non-overlapping local-time intervals |
| buffer_minutos | INTEGER | yes | 0 through 1440 |
| created_by | UUID | yes | Authenticated actor |
| updated_by | UUID | yes | Last actor |
| created_at | TIMESTAMPTZ | yes | Audit |
| updated_at | TIMESTAMPTZ | yes | Audit |
| deleted_at | TIMESTAMPTZ | no | Borrado lógico |

### Weekly schedule shape

The JSON object has keys 1 through 7 (ISO Monday through Sunday). Each value is an array of
objects with desde and hasta in 24-hour HH:mm format. Empty array means closed. Intervals must have
desde earlier than hasta and may not overlap. Overnight intervals are represented as two intervals
on adjacent days.

### Update invariant

Changing an active Grupo rule is one transaction. It resolves all inheriting Unidades and rejects
the complete update if any future active block falls outside the proposed schedule or if the new
buffer creates a conflict. Unidad overrides are excluded from this validation and remain unchanged.

## Entity: configuraciones_disponibilidad_unidad

One explicit availability configuration and review state per Unidad.

| Field | Type | Required | Rule |
|---|---|---:|---|
| unidad_id | UUID | yes | Primary key and FK Unidad |
| gestor_id | UUID | yes | Must equal Unidad owner/workspace |
| modo_regla | disponibilidad_modo_regla | yes | propia or heredar_grupo |
| zona_horaria | TEXT | conditional | Required only for propia |
| horario_semanal | JSONB | conditional | Required for hourly propia; empty/not applicable for date-only |
| buffer_minutos | INTEGER | conditional | Required for propia; 0 through 1440 |
| estado_revision | disponibilidad_estado_revision | yes | Starts pendiente for migrated Units |
| revisada_at | TIMESTAMPTZ | conditional | Required when activa |
| revisada_por | UUID | conditional | Authorized actor who completed review |
| created_by | UUID | yes | Audit |
| updated_by | UUID | yes | Audit |
| created_at | TIMESTAMPTZ | yes | Audit |
| updated_at | TIMESTAMPTZ | yes | Audit |
| deleted_at | TIMESTAMPTZ | no | Borrado lógico |

### Effective rule resolution

1. If modo_regla is propia, return the Unidad fields with origin unidad.
2. If modo_regla is heredar_grupo, require a current non-deleted Grupo and active Grupo rule; return
   that rule with origin grupo and grupo_id.
3. Otherwise return unknown with a stable reason code. Never fall back to a global schedule.
4. Moving a Unidad to another Grupo resolves and validates the prospective rule before changing
   grupo_id. A failed validation leaves the old Grupo and rule unchanged.

Date-only Unidades still require a timezone and active review state, but their effective weekly
schedule may be empty and their buffer is zero.

## Entity: bloqueos_disponibilidad

Authoritative non-overlapping history for one physical Unidad.

| Field | Type | Required | Rule |
|---|---|---:|---|
| id | UUID | yes | Primary key |
| gestor_id | UUID | yes | Denormalized owner for RLS/indexing |
| unidad_id | UUID | yes | FK Unidad; occupancy owner |
| modalidad_precio_id | UUID | no | Required for Seña blocks; optional for manual blocks |
| alquiler_id | UUID | no | Required only when origin is sena |
| origen | disponibilidad_origen | yes | sena, mantenimiento or uso_privado |
| precision | disponibilidad_precision | yes | Snapshot of selected modality semantics |
| zona_horaria | TEXT | yes | IANA timezone snapshot |
| fecha_inicio_local | DATE | conditional | Required for monthly/daily |
| fecha_fin_local | DATE | conditional | Required for monthly/daily; exclusive and later |
| inicio_at | TIMESTAMPTZ | yes | Normalized occupied lower bound |
| fin_at | TIMESTAMPTZ | yes | Normalized occupied upper bound; greater than start |
| buffer_minutos_aplicado | INTEGER | yes | Snapshot; zero for date precision |
| bloqueado_hasta_at | TIMESTAMPTZ | yes | fin_at plus applied buffer |
| periodo_ocupado | TSTZRANGE | generated | tstzrange(inicio_at, fin_at, inclusive/exclusive) |
| periodo_bloqueado | TSTZRANGE | generated | tstzrange(inicio_at, bloqueado_hasta_at, inclusive/exclusive) |
| estado | disponibilidad_estado_bloqueo | yes | activo or liberado |
| motivo_operativo | TEXT | no | Private; manual blocks only; never public |
| created_by | UUID | yes | Authenticated actor |
| released_by | UUID | no | Required when released manually/lifecycle |
| released_at | TIMESTAMPTZ | no | Required when released |
| release_reason | TEXT | no | Stable internal code |
| created_at | TIMESTAMPTZ | yes | Audit |
| updated_at | TIMESTAMPTZ | yes | Audit |
| deleted_at | TIMESTAMPTZ | no | Borrado lógico |

### Constraints and indexes

- CHECK fin_at > inicio_at.
- CHECK bloqueado_hasta_at >= fin_at.
- CHECK date fields are both present only for date precision and absent for hourly precision.
- CHECK Seña origin has alquiler_id and modalidad_precio_id.
- Partial unique index: one active, non-deleted Seña block per alquiler_id.
- Partial GiST exclusion constraint on equal unidad_id and overlapping periodo_bloqueado for active,
  non-deleted rows.
- GiST index supports public/operational window intersection.
- B-tree indexes on gestor_id, alquiler_id, modalidad_precio_id and active unidad_id.

An exclusion violation maps to the stable domain code AVAILABILITY_CONFLICT and HTTP 409. Raw
database details and conflicting private row IDs are not returned publicly.

## Changes to alquileres

Existing columns remain for compatibility. New writes use the modality-aware database functions.

| Field | Type | Required | Rule |
|---|---|---:|---|
| modalidad_precio_id | UUID | new records | FK active Modalidad de precio owned by same Unidad |
| modalidad_unidad_tiempo | TEXT | new records | Snapshot: mes, día or hora |
| modalidad_cantidad_tiempo | INTEGER | new records | Positive minimum-duration snapshot |
| modalidad_precio | NUMERIC(12,2) | new records | Non-negative commercial snapshot |
| inicio_at | TIMESTAMPTZ | hourly | Exact start |
| fin_at | TIMESTAMPTZ | hourly | Exact end |
| zona_horaria | TEXT | new records | Effective IANA timezone snapshot |
| estado_sena | estado_sena | yes | Default sin_sena |
| sena_cobrada_at | TIMESTAMPTZ | when collected | Audit |
| sena_cobrada_por | UUID | when collected | Authorized actor |
| sena_reintegrada_at | TIMESTAMPTZ | when refunded | Audit |
| sena_reintegrada_por | UUID | when refunded | Authorized actor |

### Shape rules

- Monthly/daily: fecha_inicio and fecha_fin are exclusive local-date boundaries; hourly exact fields
  are null.
- Hourly: inicio_at and fin_at are required. Existing date fields remain populated with corresponding
  local calendar dates for backward-compatible reporting but are not the overlap authority.
- estado_sena cobrada requires monto_sena greater than zero and collection audit fields.
- estado_sena sin_sena requires no automatic block even when estado_pago is cobrado_total.
- estado_pago may remain for collection summaries but no longer drives availability by itself.
- Updating or deleting the selected Modalidad de precio does not rewrite snapshots.

## Entity: revisiones_disponibilidad_legacy

Retained migration work queue for ambiguous historical Alquileres.

| Field | Type | Required | Rule |
|---|---|---:|---|
| id | UUID | yes | Primary key |
| gestor_id | UUID | yes | Workspace |
| unidad_id | UUID | yes | Affected Unidad |
| alquiler_id | UUID | yes | Unique historical Alquiler |
| reason_code | TEXT | yes | Missing modality, ambiguous Seña, invalid period, or missing timezone |
| estado | TEXT | yes | pendiente, resuelta or descartada |
| resolution_note | TEXT | no | Private required explanation |
| resolved_by | UUID | no | Authorized actor |
| resolved_at | TIMESTAMPTZ | no | Audit |
| created_at | TIMESTAMPTZ | yes | Audit |

An Unidad cannot move to estado_revision activa while unresolved review rows remain.

## State transitions

### Seña and automatic block

| From | Command | To | Availability effect |
|---|---|---|---|
| sin_sena | Propose optional amount | pendiente | None |
| pendiente | Mark collected | cobrada | Create active block atomically |
| sin_sena | Mark collected with positive amount | cobrada | Create active block atomically |
| cobrada | Alquiler date/time update | cobrada | Replace block atomically; old block remains if conflict |
| cobrada | Mark fully paid | cobrada | Keep block; payment summary changes separately |
| cobrada | Refund/reverse Seña | reintegrada | Release block atomically |
| any | Cancel Alquiler | unchanged/audited | Release active Seña block atomically |
| any | Soft-delete Alquiler | unchanged/audited | Release active Seña block atomically |
| sin_sena or pendiente | Full payment | same | No automatic block; manual block remains available |

### Manual block

| From | Command | To | Effect |
|---|---|---|---|
| absent | Create valid manual block | activo | Participates in global exclusion |
| activo | Release with reason | liberado | Stops blocking; history retained |
| activo | Soft-delete | liberado plus deleted_at | Stops blocking; history retained |

Past active blocks need no scheduled state transition; window queries naturally exclude them.

## Database function interfaces

Exact SQL names may be finalized in implementation, but the responsibilities and transaction
boundaries are fixed:

1. resolver_regla_disponibilidad(unidad_id): returns effective rule, origin and review status.
2. guardar_regla_grupo(...): authorize, validate inheritors/future blocks, then write atomically.
3. guardar_regla_unidad(...): authorize, validate own future blocks, then write atomically.
4. guardar_alquiler_con_disponibilidad(...): validate actor, Unidad, modality, period and Seña;
   insert/update Alquiler and synchronize its block in one transaction.
5. cancelar_o_eliminar_alquiler(...): mutate Alquiler and release its block in one transaction.
6. crear_bloque_manual(...): authorize, normalize, snapshot buffer and insert.
7. liberar_bloque_manual(...): authorize and retain release audit.
8. obtener_disponibilidad_publica(...): bounded privacy-safe projection for published Unidad only.

Operational functions are SECURITY INVOKER. Private RLS helpers live outside exposed schemas with a
pinned empty search path. The public projection function exposes only its declared scalar/JSON return
shape and receives explicit execution grants for anon and authenticated roles.

## RLS and grants matrix

| Resource | Anonymous | Public authenticated | Gestor owner | Delegado ver | Delegado gestionar |
|---|---:|---:|---:|---:|---:|
| Raw rule tables | deny | deny | read/write own | read assigned | read/write assigned |
| Raw block table | deny | deny | read/write own | read assigned | read/write assigned |
| Legacy review table | deny | deny | read/write own | read assigned | read/write assigned |
| Public projection function | execute safe output | execute same output | execute same output | execute same output | execute same output |
| Operational calendar | deny | deny | read own | read assigned | read assigned |
| Operational mutations | deny | deny | write own | deny | write assigned |

RLS uses the shared REMED-004 authorization helpers. API checks provide early 403 responses, but RLS
is the non-bypassable enforcement layer.

## Public projection

The public result always contains unidadId, status and generatedAt. A configured result additionally
contains mode, precision, timezone, modality minimum quantity/time unit, the effective public weekly
schedule for hourly mode, and blocked periods intersecting the requested window. An unknown result
contains only a stable unknownReason and does not invent a timezone, rule or empty/free calendar.

It never contains block IDs, source category, reason, actor, gestor_id, grupo_id, alquiler_id,
inquilino_id, payment state, Seña amount or operational notes.
