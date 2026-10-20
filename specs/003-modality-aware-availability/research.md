# Phase 0 Research: Modality-Aware Availability

## Repository findings

- The alquileres table currently stores DATE boundaries only and has no modalidad_precio_id, exact
  hourly timestamps, timezone or availability-block relation.
- estado_pago mixes pending, collected Seña and fully collected outcomes. It does not preserve
  whether a Seña was once collected after the Alquiler later becomes fully paid.
- AlquileresService performs separate Data API writes and silently falls back to resilientStore
  after database errors. That behavior cannot be authoritative for availability.
- CardUnidad.tsx currently uses Math.random() to claim “Disponible ahora” or “Próximamente”.
- Grupo configuration currently contains only a name; there is no availability rule.
- Existing RLS grants a Delegado workspace-wide access and has no ver/gestionar scope. This is the
  recorded REMED-004 dependency.
- Supabase local configuration targets PostgreSQL 17. The Supabase CLI is not installed on the
  current host, so database execution evidence remains an implementation prerequisite.

## Decision 1: One canonical timestamp range per physical Unidad

**Decision**: Normalize every active block to an absolute half-open tstzrange and enforce one global
timeline per unidad_id. Preserve the original local date/time fields and the IANA timezone for
display and audit.

**Rationale**: Cross-modality conflicts cannot be guaranteed by separate daterange and tstzrange
constraints. One absolute range lets a daily block conflict with an hourly block for the same
physical Unidad. PostgreSQL range types natively model half-open boundaries and overlap.

**Alternatives considered**:

- Separate date and timestamp tables: rejected because cross-type overlap would require triggers or
  application checks and would be race-prone.
- Store UTC timestamps only: rejected because local-date intent and DST interpretation would become
  impossible to audit reliably.
- Store only date ranges: rejected because hourly turns lose required precision.

**Primary references**:

- PostgreSQL 17 range types and overlap constraints:
  <https://www.postgresql.org/docs/17/rangetypes.html>
- PostgreSQL exclusion constraints:
  <https://www.postgresql.org/docs/17/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION>

## Decision 2: Database exclusion constraint is the concurrency authority

**Decision**: Enable btree_gist and add a partial GiST exclusion constraint equivalent to:
unidad_id WITH =, periodo_bloqueado WITH &&, limited to active and non-deleted rows.

**Rationale**: UI validation and read-before-write checks cannot prevent two concurrent requests
from accepting the same period. PostgreSQL evaluates the constraint in the write transaction.

**Alternatives considered**:

- Serializable application transactions: rejected because the current Supabase Data API does not
  expose a multi-request transaction and retry logic would be duplicated.
- Advisory locks: rejected because exclusion constraints express the invariant directly and produce
  a deterministic conflict.
- Application-only overlap query: rejected because it has a race window.

## Decision 3: Distinguish occupied period from blocked period

**Decision**: Store the requested occupancy interval and a generated/effective blocked interval. For
hourly blocks, blocked_end equals occupied_end plus the snapshotted buffer; monthly/daily buffer is
zero. The exclusion constraint uses the blocked interval.

**Rationale**: A turnaround buffer prevents an adjacent booking without changing what was actually
rented. Snapshotting the applied buffer prevents later rule changes from rewriting historical terms.

**Alternatives considered**:

- Expand the stored rental end: rejected because it misrepresents the Alquiler.
- Evaluate the current buffer dynamically: rejected because changing a rule would retroactively
  alter conflict behavior without an auditable migration.

## Decision 4: Transactional database functions own Alquiler/Seña/block changes

**Decision**: Use narrowly granted PostgreSQL functions for create/update/cancel/refund/soft-delete
operations that can affect an Availability Block. Operational functions run as SECURITY INVOKER
under the caller's JWT and RLS. A separate public projection function may use SECURITY DEFINER only
with an empty search_path, fully qualified objects, strict argument bounds, explicit REVOKE/GRANT,
and a fixed privacy-safe return shape.

**Rationale**: One function call is one database transaction. It can validate the effective rule,
write the Alquiler lifecycle and mutate its block atomically.

**Alternatives considered**:

- NestJS compensation after two writes: rejected because a crash can leave Seña and block out of
  sync.
- Database trigger on every Alquiler update: rejected because not every payment-state change means
  an effective optional Seña, and explicit commands produce clearer authorization/error behavior.
- Service-role writes from NestJS: rejected for user operations because they bypass RLS.

**Primary references**:

- Supabase database functions and function security:
  <https://supabase.com/docs/guides/database/functions>
- Supabase grants and RLS:
  <https://supabase.com/docs/guides/api/securing-your-api>

## Decision 5: Seña gets an explicit lifecycle marker

**Decision**: Extend Alquiler with an explicit Seña lifecycle (sin_sena, pendiente, cobrada,
reintegrada) plus actor/time audit fields. Automatic blocking begins only on the transition to
cobrada with a positive amount. Moving later to fully paid does not erase the fact that the Seña was
effective. Reintegrating the Seña, cancelling or soft-deleting the Alquiler releases the block
atomically and retains its row/history.

**Rationale**: Current estado_pago cannot answer whether a fully paid Alquiler previously had a
collected Seña. Inferring from amount alone would violate the clarification that Seña is optional
and pending/omitted values do not block.

**Alternatives considered**:

- Treat monto_sena greater than zero as effective: rejected by the accepted clarification.
- Treat estado_pago cobrado_total as Seña: rejected because full payment can occur without Seña.
- Delete a released block: rejected because the feature requires audit history and borrado lógico.

## Decision 6: Explicit Grupo inheritance with Unidad precedence

**Decision**: Keep separate Grupo and Unidad configuration records. Every Unit configuration has a
mode: propia or heredar_grupo. An effective-rule query returns the resolved values and their origin.
A Unidad override wins. A Grupo never owns blocks.

**Rationale**: The user can configure four or five courts once while retaining a specific exception.
An explicit mode avoids treating a missing row as accidental inheritance.

**Alternatives considered**:

- Copy the Grupo rule into every Unidad: rejected because later edits drift and bulk changes become
  ambiguous.
- Rule per Modalidad de precio: rejected because operating hours belong to the physical resource and
  multiple prices share its occupancy.
- Global hourly rule: rejected because different complexes and courts need different hours.

## Decision 7: Weekly schedule JSON plus manual exception blocks

**Decision**: Represent the weekly schedule as validated JSON containing ISO weekday and one or more
non-overlapping local-time intervals. Use manual maintenance/private-use blocks for closures and
exceptions. Rules include IANA timezone and a non-negative integer turnaround buffer.

**Rationale**: A weekly schedule is compact and reusable at Grupo level. Manual blocks already
participate in global overlap checks and avoid a second exception subsystem in this bounded feature.

**Alternatives considered**:

- One row per weekly interval: viable but produces a larger public/operational interface without a
  current query need.
- Arbitrary recurrence rules: rejected as excessive scope.

## Decision 8: Date and duration semantics

**Decision**:

- Daily: arrival date at local midnight through departure date at local midnight, end-exclusive;
  departure must be later and minimum duration is cantidad_tiempo calendar days.
- Monthly: same local-date conversion; minimum end is start plus cantidad_tiempo calendar months.
- Hourly: exact instants plus IANA timezone; minimum duration is cantidad_tiempo hours and the
  interval must fit the effective weekly schedule.
- The selected modalidad_precio_id is stored on Alquiler and its commercial values are snapshotted
  so later price edits do not rewrite history.

**Rationale**: Calendar-month and calendar-day meanings match user intent and avoid treating every
month as a fixed number of seconds.

**Alternatives considered**:

- Fixed 30-day month: rejected because it is not a calendar month.
- Inclusive end dates: rejected because adjacent valid periods would overlap.

## Decision 9: Public projection fails closed

**Decision**: The public endpoint returns configured, unknown or error, a bounded effective rule,
and normalized blocked periods only. It never returns source, reason, actor, Alquiler, Inquilino,
payment, Seña amount or workspace fields. The card listing removes random availability and makes no
availability claim; the detail page owns the calendar.

**Rationale**: A truthful unknown state is safer than optimistic availability. Keeping calendar
fetches on detail avoids an N+1 query on marketplace lists.

**Alternatives considered**:

- Fetch availability for every marketplace card: rejected for latency and payload cost.
- Return raw block rows and hide fields in React: rejected because private data would already have
  crossed the public interface.
- Use resilientStore when Supabase is offline: rejected because fake data cannot make a booking
  claim.

## Decision 10: Historical records use a review gate

**Decision**: Backfill automatically only when modality, period and effective Seña are unambiguous.
All ambiguous existing Alquileres produce a retained review item, and the affected Unidad's public
availability remains unknown until a Gestor resolves it. The migration emits counts and IDs for
verification; it never assumes ambiguous periods are free.

**Rationale**: Existing records lack modality and hourly precision. Silent conversion would create
false availability or incorrect blocks.

**Alternatives considered**:

- Ignore old rows: rejected by the specification.
- Block every historical Alquiler regardless of Seña: rejected by the optional-Seña rule.
- Guess the first modality: rejected because Unidades can have multiple modalities.

## Decision 11: Delegado authorization is a prerequisite, not duplicated scope

**Decision**: Availability consumes the shared granular authorization interface from REMED-004.
Before that exists, only the Gestor owner may mutate new availability resources; Delegados receive
403. The feature cannot be accepted complete until ver and gestionar assignments pass API and RLS
tests for account, Grupo and selected-Unidad scopes.

**Rationale**: Existing workspace-wide Delegado access violates the constitution. Building a second,
availability-only permission table would fragment authorization and create conflicting truths.

**Alternatives considered**:

- Trust rol delegado: rejected because it grants all actions on all Unidades.
- Implement a private calendar-only permission field: rejected as duplicate REMED-004 architecture.
- Let NestJS alone enforce scope: rejected because direct Data API access would bypass it.

**Primary reference**:

- Supabase RLS and security-definer helper guidance:
  <https://supabase.com/docs/guides/database/postgres/row-level-security>

## Decision 12: Module seam and failure translation

**Decision**: Add one disponibilidad module with public, operational, rule and manual-block methods.
Use named domain results/errors (AvailabilityConflict, RuleInvalid, BackfillPending,
AvailabilityUnavailable) and translate them once to HTTP 409, 422 and 503. Do not create a generic
repository interface.

**Rationale**: This seam concentrates substantial behavior for Marketplace, Alquileres, Grupos and
Unidades. A generic repository would merely mirror Supabase and remain shallow.

**Alternatives considered**:

- Put logic in each existing module: rejected because timezone and conflict behavior would diverge.
- Create repository abstractions for every table: rejected because there is only one real adapter
  and no demonstrated variation.
