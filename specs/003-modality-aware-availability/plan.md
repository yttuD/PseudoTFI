# Implementation Plan: Modality-Aware Availability

**Branch**: `003-modality-aware-availability` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-modality-aware-availability/spec.md`

## Summary

Add authoritative calendar availability without changing the manual `Unidad.estado`. PostgreSQL
stores one global, half-open blocked timeline per physical Unidad and rejects overlaps with a GiST
exclusion constraint. Monthly and daily inputs retain local-date semantics; hourly inputs retain
exact instants and an IANA timezone. A collected optional Seña creates or updates its block in the
same database transaction as the Alquiler change. Manual maintenance/private-use blocks use the
same conflict path.

Hourly operating rules are effective per Unidad. A Unidad can explicitly inherit an enabled Grupo
rule or override it. A new deep `disponibilidad` module resolves inheritance, validates modality,
normalizes periods, coordinates atomic database functions, and emits either an operational view or
a privacy-safe public projection. Public and operational interfaces stay separate, and absence or
failure of authoritative data is reported as unknown rather than replaced by demo/random data.

## Technical Context

**Language/Version**: Node.js 22.16; TypeScript 6 in `apps/api`, TypeScript 5 in `apps/web`; SQL for
PostgreSQL 17

**Primary Dependencies**: NestJS 12, Next.js 14.2 App Router, React 18, Supabase JS 2.115,
PostgreSQL `tstzrange` + `btree_gist`, React Hook Form 7, Zod 4, date-fns 4, next-intl 4

**Storage**: Supabase PostgreSQL 17 with RLS; migrations in `supabase/migrations/`

**Testing**: Vitest 4 API/unit tests, Supabase database tests for constraints/RLS/transactions,
Playwright 1.63 functional and screenshot tests

**Target Platform**: NestJS API on Railway; Next.js responsive web on Vercel; current Capacitor
wrapper receives regression-only coverage. Native Android implementation is explicitly out of scope.

**Project Type**: pnpm/Turborepo web application with separate Next.js frontend, NestJS backend,
shared packages, and Supabase database

**Performance Goals**: A bounded public availability query should complete at p95 <= 500 ms against
10,000 active blocks in the database test fixture; overlap checks must use the GiST constraint/index,
and list pages must not issue one availability request per card.

**Constraints**: One physical Unidad has one global occupancy timeline; half-open intervals; all
authoritative mutations are atomic and fail closed; no automatic `Unidad.estado` changes; no private
Alquiler/Inquilino/payment data in public responses; WCAG 2.1 AA; ES/PT/EN public copy; four-width
light/dark Playwright evidence; preserve unrelated dirty-worktree changes.

**Scale/Scope**: One migration, one new API module, five affected existing API modules/interfaces,
four operational UI surfaces/states, two public marketplace surfaces, and one bounded 366-day public
query window. Database design must remain efficient with at least 100,000 historical blocks while
queries filter active/intersecting periods.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle / gate | Pre-design | Post-design disposition |
|---|---|---|
| Evidence before claims | PASS | Plan requires database, API, build, Playwright, screenshot, and Codex inspection evidence; no implementation is claimed here. |
| Canonical domain and ADRs | PASS | Uses Unidad, Grupo, Gestor, Delegado, Inquilino, Modalidad de precio, Alquiler, Seña and borrado lógico. `Unidad.estado` remains manual. |
| Bounded spec-driven work | PASS | Scope is isolated in `specs/003-modality-aware-availability`; tasks and implementation are not folded into this planning phase. |
| Deep module / stable seam | PASS | One `disponibilidad` interface hides normalization, inheritance, conflict rules and projections; no pass-through repository layer is introduced. |
| Supervised delegation | PASS | Implementation brief must pin `gemini-3.8-flash-medium`, medium effort, exact file bounds and terminal delivery format. |
| Verification and visual proof | PASS | Quickstart and UI contract define separate 375/768 responsive and 1024/1440 desktop captures in light/dark. |
| Audience/platform separation | PASS | Public projection is a separate contract with no direct table access; operational mutations require actor/scope authorization; native Android is excluded. |
| Safe workspace stewardship | PASS | Only feature-owned files/evidence may be created or cleaned; existing modified/untracked files are preserved. |

### Mandatory dependency gate

`REMED-004 — Delegado Scope & Granular Permission Architecture` is not implemented: current RLS
grants every Delegado workspace-wide `FOR ALL` access. This feature MUST NOT recreate or bypass that
model. Before availability mutations can be accepted for Delegados, the shared authorization
interface (`can_read_unidad`, `can_manage_unidad`, `can_manage_grupo`) and its RLS-backed assignments
must exist. Until then, the new mutation routes remain Gestor-owner-only and Delegados receive 403.
The feature cannot be declared fully complete against FR-011 until the dependency is available and
its `ver`/`gestionar` actor matrix passes. This is an implementation ordering gate, not an unresolved
product requirement.

## Project Structure

### Documentation (this feature)

```text
specs/003-modality-aware-availability/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   └── ui-state-matrix.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # generated by speckit-tasks, not this phase
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 20260925*_modality_aware_availability.sql
└── tests/
    ├── availability_constraints.sql
    ├── availability_lifecycle.sql
    └── availability_rls.sql

apps/api/src/
├── disponibilidad/                 # new deep module and public/operational projections
│   ├── disponibilidad.module.ts
│   ├── disponibilidad.controller.ts
│   ├── disponibilidad.service.ts
│   ├── disponibilidad.service.spec.ts
│   └── dto/
├── alquileres/                     # modality-aware DTO and atomic RPC usage
├── grupos/                         # group rule endpoints delegated to disponibilidad
├── unidades/                       # effective rule and manual block access
├── marketplace/                    # privacy-safe public availability route
├── auth/                           # consumes shared actor/scope result; no new token parsing
└── app.module.ts

apps/web/
├── messages/{es,pt,en}.json
├── src/app/[locale]/(gestor)/
│   ├── alquileres/page.tsx
│   └── mis-unidades/[id]/editar/page.tsx
├── src/app/[locale]/(marketplace)/unidades/[id]/page.tsx
├── src/components/gestor/
│   ├── AlquilerFormModal.tsx
│   ├── GrupoFormModal.tsx
│   └── DisponibilidadPanel.tsx      # new
├── src/components/marketplace/
│   ├── CardUnidad.tsx
│   └── AvailabilityCalendar.tsx     # new
└── e2e/modality_aware_availability.spec.ts

packages/types/src/
└── availability.ts                 # transport/domain result types shared by API and web
```

**Structure Decision**: Preserve the existing monorepo. Put complex calendar behavior behind the
new NestJS `disponibilidad` module and PostgreSQL transactional functions. Existing Alquileres,
Grupos, Unidades and Marketplace modules call that interface rather than implementing period logic.
No generic repository or speculative adapter is added. Shared package types contain data shapes only,
not business decisions.

## Architecture and Interfaces

### Deep module interface

Callers learn four operations, while timezone conversion, inherited-rule resolution, minimum
duration, buffer snapshots, RLS-aware persistence and conflict translation remain internal:

1. `getPublicProjection(unidadId, window, modalidadId)`
2. `getOperationalCalendar(actor, unidadId, window)`
3. `saveRule(actor, target, rule)`
4. `createOrReleaseManualBlock(actor, command)`

Alquiler creation/update keeps its existing module interface but changes persistence to one atomic
database function that owns the Seña/block lifecycle. Tests exercise the HTTP/module interfaces,
not private normalization helpers.

### Data authority and concurrency

- `bloqueos_disponibilidad.periodo_bloqueado` is a canonical `tstzrange` generated from exact
  instants and the snapshotted turnaround buffer.
- A partial GiST exclusion constraint on `(unidad_id =, periodo_bloqueado &&)` rejects every active
  positive overlap, including concurrent requests and cross-modality attempts.
- Monthly/daily local dates are converted at the effective IANA timezone before persistence but are
  also retained as local input values for faithful display/audit.
- Database functions perform Alquiler + effective-Seña + block changes atomically. NestJS never
  attempts a read-then-write overlap check as the authority.
- Resilient/demo storage is forbidden for authoritative availability mutations and public claims.
  Database failure maps to an explicit 503/unknown state.

### Audience and authorization

- Anonymous/public: may call only the bounded privacy-safe projection. It contains effective rule,
  modality minimums and blocked periods, never source IDs/reasons, actor IDs, Alquiler, Inquilino,
  payment, Seña amount or workspace data.
- Gestor owner: may configure own Grupo/Unidad rules and manage blocks in the own workspace.
- Delegado `ver`: may read only assigned Grupo/Unidad operational calendars.
- Delegado `gestionar`: may read and mutate only assigned scope.
- Ordinary authenticated public user: same availability projection as anonymous; authentication does
  not expand calendar data.
- Dev/admin: no special mutation path is introduced by this feature.

## Migration and Rollout

1. Add enums, rule tables, block table, `btree_gist`, indexes, grants, RLS and database functions.
2. Extend Alquiler with `modalidad_precio_id`, hourly instant/timezone fields and an auditable Seña
   lifecycle marker; preserve legacy date columns for date-based records.
3. Generate a deterministic backfill report. Auto-create blocks only for records that are
   unambiguous (`monto_sena > 0`, collected Seña marker inferable, valid Unidad/period, one compatible
   modality). Mark every other affected Unidad `pendiente_revision`; public availability stays
   `unknown` until reviewed.
4. Deploy API reads first, then operational mutations, then web controls. Keep the public calendar
   disabled for an individual Unidad until its configuration/backfill status is active.
5. Roll back application exposure by feature flag if needed; never drop block/history columns in a
   rollback. Schema rollback is forward-only remediation because accepted bookings are audit data.

## Verification Strategy

- Database: half-open boundary, all overlap shapes, mixed modalities, buffers, concurrent inserts,
  group inheritance/override, group-change validation, atomic Seña transitions, release history,
  RLS actor matrix and public-function output.
- API: DTO unions, error mapping (400/403/404/409/422/503), no resilient fallback, tenant isolation,
  bounded windows and zero private fields in public responses.
- Web: modality-driven inputs, optional Seña behavior, inherited/override indicators, manual blocks,
  unknown/loading/error/empty/conflict states, keyboard/focus/touch targets and localized public copy.
- Visual: Playwright screenshots for every affected state at 375, 768, 1024 and 1440 pixels in light
  and dark themes; responsive and desktop results reported separately.
- Regression: API full suite, production builds, existing marketplace/alquiler/grupo journeys and
  explicit assertion that `Unidad.estado` is unchanged.

## Post-Design Constitution Re-check

The design passes all architectural gates. The only execution hold is the already-recorded REMED-004
dependency for granular Delegado authorization. Implementing availability before that dependency may
proceed only for Gestor-owner paths and cannot be accepted as complete. No constitution exception is
requested or justified.

## Complexity Tracking

No constitution violation is accepted. The PostgreSQL function layer is not a pass-through: it owns
the transaction and concurrency invariant that cannot be safely implemented by separate Data API
calls. The `disponibilidad` module earns its seam by providing distinct public and operational
projections over the same normalization and conflict rules.
