# Implementation Plan: Delegado Scope and Granular Authorization

**Branch**: `004-delegado-scope-authorization` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-delegado-scope-authorization/spec.md`

## Summary

Replace the current workspace-wide Delegado access with an explicit invitation, acceptance,
configuration, and revocation lifecycle. Persist one active scope (`cuenta`, one `grupo`, or selected
`unidades`) and one permission (`ver` or `gestionar`) per Gestor–Delegado relationship. Enforce the
same decision at database policies, API authorization, and role-aware UI boundaries. Owner-only
personal, security, Cupo, platform payment, AFIP, delegation-administration, and complete Log de
acciones data remain inaccessible to every Delegado.

The design introduces one shared authorization seam consumed by existing operational modules and by
feature 003. It removes authorization-dependent resilient fallbacks, adds auditable lifecycle and
action records, and updates the web experience for Gestor configuration, invitee acceptance,
Delegado read-only/management states, and responsive presentation.

## Technical Context

**Language/Version**: TypeScript 6.0 in NestJS API; TypeScript 5 and React 18 in Next.js 14.2

**Primary Dependencies**: NestJS 12, Supabase JS 2.115, Next.js App Router 14.2, next-intl 4.14,
React Hook Form 7.87, Zod 4.5, Base UI/Shadcn primitives, Tailwind CSS 3.4

**Storage**: Supabase PostgreSQL with Row Level Security; Supabase Auth; Supabase Storage for
contracts; persistent in-app notification and email-delivery records

**Testing**: Vitest 4.1 for API unit/integration tests; Supabase local database policy tests;
Playwright 1.63 for functional and visual web evidence

**Target Platform**: NestJS service on Railway and Next.js web on Vercel; desktop web at 1024/1440
and responsive web at 375/768. Capacitor/native Android is readiness-only and excluded.

**Project Type**: pnpm monorepo web application with API, web client, shared types, and database
migrations

**Performance Goals**: Authorization adds no more than one bounded access-context lookup per API
request; operational lists remain visibly interactive within two seconds in acceptance fixtures;
scope selection remains usable with at least 500 Unidades.

**Constraints**: Fail closed on missing/invalid authorization data; one operational workspace per
account in V1; no client-supplied workspace authority; no owner-only data in Delegado fallbacks;
soft deletion and action attribution are mandatory; all security-definer database functions set an
empty search path and schema-qualify references.

**Scale/Scope**: Three scope modes, two permissions, seven principal actor/session states, eleven
operational/owner routes, four responsive widths, and light/dark visual evidence. Existing public
marketplace and dev/admin behavior are regression surfaces, not redesign targets.

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1.*

| Principle | Plan disposition |
|---|---|
| Evidence Before Claims | Source inventory below identifies current routes, forms, policies, and fallbacks. Acceptance requires fresh API, database, build, Playwright, and screenshot evidence. |
| Canonical Domain and Architecture | Uses Unidad, Grupo, Gestor, Delegado, Inquilino, Cupo, Alquiler, Pago, and Log de acciones. Scope and permission are enforced at RLS, API, and UI. |
| Bounded Spec-Driven Work | Feature 004 is isolated from availability implementation. It exposes authorization decisions that feature 003 consumes. |
| Supervised Delegation Contract | Codex owns this plan and final review. Antigravity receives one complete implementation batch with pinned model/effort and terminal evidence requirements. |
| Verification and Visual Proof | Vitest, local database policy tests, builds, Playwright interactions, and retained 375/768/1024/1440 light/dark captures are mandatory. |
| Audience and Platform Separation | Public marketplace, operational workspace, and dev/admin remain distinct. Native Android is explicitly excluded. |
| Safe Workspace Stewardship | Only feature-owned evidence and temporary outputs may be removed; unrelated dirty-tree work is preserved. |

No constitutional exception is required.

## Brownfield Inventory and Change Surface

### Existing behavior that must be replaced

| Layer | Current source | Observed behavior | Planned disposition |
|---|---|---|---|
| Database identity | `supabase/migrations/20260905062000_rbac_delegados.sql` | `users.rol` plus one `workspace_id`; signup-time invitation automatically converts a new user | Existing registered/verified account accepts explicitly; profile changes only in the acceptance transaction |
| Invitations | same migration; `apps/api/src/delegados/*` | Global unique email, boolean `usada`, no invitee id, acceptance, rejection, cancellation, scope, or permission | Auditable invitation and relationship lifecycle with target account identity |
| Workspace RLS | same migration | `FOR ALL` on Unidades, Grupos, Inquilinos, and Alquileres for every workspace member | Split SELECT/INSERT/UPDATE policies using scope and permission decisions |
| API authorization | operational controllers/services | Mostly forwards user token and relies on broad RLS; some owner-only role checks are incomplete | Central authorization service plus database enforcement; every endpoint declares audience/action/target |
| Fallbacks | `resilient-store.ts` and operational services | Some database failures fall back to workspace-wide mock data or mutations | No protected Delegado authorization or private data may fall back; errors fail closed |
| Gestor UI | `(gestor)/layout.tsx`, `Sidebar.tsx`, dashboard and operational pages | Role-only navigation; Delegado may receive owner summaries/actions | Server-resolved access context drives routes, navigation, summaries, and mutation controls |
| Delegado UI | `(gestor)/delegados/*` | Email-only invite form and active/pending table | Full lifecycle, scope/permission editor, confirmations, owner-only route |
| Invitee UI | absent | No in-app acceptance/rejection surface | Authenticated `/[locale]/cuenta/invitaciones` surface outside the operational route group |
| Audit UI/data | `(gestor)/logs/page.tsx` | Owner route exists but underlying complete action contract is not authoritative | Owner-only persisted action records; Delegados never query the complete log |

### API resource disposition

| Resource | Reads | Mutations | Required authorization |
|---|---|---|---|
| `delegados` | owner list; actor access context; invitee inbox | invite, accept/reject/cancel, configure, revoke | Lifecycle-specific owner/invitee rules |
| `unidades` and Modalidades de precio | Scoped by Unidad | Gestionar only; creation depends on scope mode | `canReadUnidad` / `canManageUnidad` / `canCreateUnidadInGrupo` |
| `grupos` | Account/full, assigned Grupo, or groups containing selected Units | Full-account Gestionar may create/membership/delete; Grupo Gestionar may rename/configure but not redefine membership/delete | `canReadGrupo`, `canManageGrupo`, `canManageGrupoMembership` |
| `alquileres` | Derived from Unidad scope | Gestionar derived from referenced current Unidad | `canReadUnidad` / `canManageUnidad` |
| `inquilinos` | Only through at least one in-scope Alquiler | Gestionar through in-scope Alquiler; destructive action denied if active out-of-scope relation exists | Scoped Inquilino projection, no workspace-wide list |
| `metricas` and exports | Only aggregates of readable Unidades | N/A | Scope-filtered aggregation; no hidden totals |
| `cupo`, platform `pagos`, AFIP | Owner only | Owner only | Explicit Gestor-owner authorization, never `workspace_id` alone |
| complete `logs` | Owner only | System append only | Owner read; authenticated actor attribution on write |

The current `apps/api/src/pagos` resource represents platform Cupo payments, not the domain Pago of
an Alquiler. It remains owner-only. Future Alquiler Pago records will inherit their Alquiler's
Unidad decision through the shared authorization interface.

### Web views, forms, and states in scope

- Owner-only: `/delegados`, `/facturacion`, `/facturacion-afip`, `/logs`; owner-only Cupo and
  delegation cards/actions on `/dashboard`.
- Scoped operational: `/dashboard`, `/metricas`, `/mis-unidades`, `/mis-unidades/nueva`,
  `/mis-unidades/[id]/editar`, `/inquilinos`, `/alquileres`, and `/grupos` alias behavior.
- Invitee: `/cuenta/invitaciones` pending, accept, reject, empty, loading, and error states.
- Forms/dialogs: `DelegadoFormModal`, new permission editor, `UnidadForm`, `GrupoFormModal`,
  `InquilinoFormModal`, and `AlquilerFormModal`.
- Shared navigation: `(gestor)/layout.tsx`, `Sidebar.tsx`, and quick actions.

## Technical Design

### Authorization seam

Create `apps/api/src/authorization/` with one `AuthorizationService` that consumes authenticated
actor identity and target identifiers. Its public methods mirror SQL policy semantics:

- owner and capability checks;
- access-context resolution;
- read/manage Unidad;
- read/manage Grupo and manage Grupo membership;
- read/manage Alquiler through Unidad;
- scoped Inquilino projection and mutation checks.

Controllers pass `req.user`; services never accept a body-provided Gestor/workspace as authority.
The service uses the actor-scoped database client for ordinary reads and narrowly scoped
authoritative queries for precondition checks. RLS remains the final enforcement layer, so a missed
controller check cannot broaden access.

Feature 003 may import the shared capability names and MUST NOT introduce a second authorization
model.

### Persistence and rollout

Add a forward-only migration after `20260913090000_alquileres_senas_depositos.sql` that:

1. Adds invitation identity and lifecycle state while migrating legacy pending rows safely.
2. Creates Delegado relationship, selected-Unidad, notification, email-delivery, and action-record
   tables with indexes, check constraints, unique active-membership constraints, and RLS.
3. Adds schema-qualified, `SECURITY DEFINER SET search_path = ''` helper functions for owner,
   read, manage, and invitation transitions.
4. Replaces broad workspace policies on users, Grupos, Unidades, Modalidades de precio,
   Inquilinos, Alquileres, analytics, platform Pagos, AFIP, and contract storage.
5. Preserves public published-Unidad reads and public analytics writes without exposing private
   metrics.
6. Leaves legacy Delegados without an explicit valid relationship with zero operational access and
   emits a migration report/query for manual reconciliation; it does not invent full-account grants.

### Invitation and membership transaction

- Owner submits normalized email.
- Authoritative lookup resolves an existing verified account and rejects self, deleted, unverified,
  duplicate, multi-workspace, or existing-Unit ownership conflicts.
- Invitation records target account id and email snapshot; both in-app and email channel records are
  created. A seven-day expiry is the default security window; cancel/reject/expiry are terminal.
- Invitee accepts from their own session. One transaction rechecks eligibility, marks accepted,
  changes the profile to Delegado/workspace membership, and creates an accepted-but-unconfigured
  relationship with no data access.
- Owner configures scope and permission in one transaction. Scope replacement deletes/replaces
  selected-Unit links atomically.
- Revocation closes the relationship and clears current membership immediately while preserving
  history. The former account returns to a non-owning Gestor-capable profile with no inherited
  workspace access.

### Group and Inquilino boundaries

- Full-account Gestionar can operate all non-sensitive workspace resources and change Grupo
  membership because this does not enlarge an already account-wide scope.
- Grupo-scoped Gestionar can rename/configure the assigned Grupo, create a Unidad directly within
  it, and manage current members. It cannot add an external Unidad, move members, delete the Grupo,
  or otherwise redefine scope.
- Selected-Unidad Gestionar cannot create a new Unidad or manage Grupo membership.
- An Inquilino is visible only through an active in-scope Alquiler. Out-of-scope Alquileres are never
  joined into the response. Gestionar may create an Inquilino only in the atomic in-scope Alquiler
  flow. Updating is allowed when an in-scope link exists; soft deletion is denied if any active
  out-of-scope Alquiler exists.

### Owner-only and fail-closed behavior

Facturación, AFIP, tax identity, payment instruments, Cupo, platform Pagos, account security/profile,
Delegado administration, and the complete Log de acciones require explicit Gestor ownership.
Delegado navigation does not request or render these resources. Database/service timeouts,
notification failures, stale pages, malformed scope, and unavailable authorization data return a
safe error and never invoke `resilientStore` for protected private reads or writes.

### UI/UX and localization

- Use the Rendo token palette already governed by the constitution; do not copy the supplied example
  home composition.
- Replace alert-based invitation feedback with inline validation, status banners, and accessible
  confirmation dialogs.
- The Gestor sees lifecycle status and a human-readable access summary. Scope selection uses a
  segmented choice and searchable selected-Unidad list.
- The Delegado sees current workspace, scope, permission, and pending configuration. Ver mode has a
  persistent read-only indicator and no mutation affordances.
- Owner-only direct routes return a localized forbidden/redirect state without briefly rendering
  protected content.
- Add ES/PT/EN messages for all new operational copy.

## Verification Strategy

1. **Static and unit**: lint/type/build; Vitest for DTO validation, invitation lifecycle,
   authorization decisions, owner-only guards, stale/revoked requests, and no protected fallback.
2. **Database policy**: local Supabase tests execute as anonymous, public account, Gestor,
   Delegado Ver, Delegado Gestionar, revoked Delegado, and cross-workspace actor for every affected
   table and storage policy.
3. **API contract**: success and denial cases for all new lifecycle endpoints plus representative
   reads/mutations of each protected resource.
4. **Playwright functional**: owner invitation/configuration/revocation, invitee acceptance/rejection,
   Ver read-only, Gestionar in-scope, out-of-scope denial, owner-only route denial, stale page, and
   public/dev regression.
5. **Visual evidence**: default, loading, empty, validation, service error, pending, active,
   read-only, denied, edit-confirmation, and revoke-confirmation states at 375, 768, 1024, and 1440
   in light/dark where supported. Captures live under
   `specs/004-delegado-scope-authorization/evidence/screenshots/` with a manifest.
6. **Codex review**: inspect final diff, command logs, Playwright report, and every retained image in
   one batched pass; re-dispatch only bounded defects.

## Project Structure

### Documentation (this feature)

```text
specs/004-delegado-scope-authorization/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml
│   ├── authorization-matrix.md
│   └── ui-state-matrix.md
├── checklists/requirements.md
├── tasks.md
└── evidence/
    ├── reports/
    ├── screenshots/
    └── test-results/
```

### Source Code (repository root)

```text
apps/api/src/
├── authorization/                 # shared actor/scope/action decisions
├── delegados/                     # invitation, acceptance, configuration, revocation
├── unidades/ grupos/              # scoped reads and mutations
├── alquileres/ inquilinos/        # Unidad-derived access and privacy projection
├── metricas/                      # scope-filtered aggregates
├── cupo/ pagos/ afip/             # explicit owner-only resources
└── common/                        # remove private authorization fallbacks

apps/web/src/
├── app/[locale]/(marketplace)/cuenta/invitaciones/page.tsx
├── app/[locale]/(gestor)/         # role-aware operational and owner-only routes
├── components/gestor/             # permission-aware forms/navigation
├── components/delegados/          # lifecycle, scope, permission UI
└── lib/access-context.ts

packages/types/src/delegados.ts
supabase/migrations/<timestamp>_delegado_scope_authorization.sql
supabase/tests/004_delegado_scope_authorization.sql
apps/api/src/**/*.spec.ts
apps/web/e2e/delegado_scope_authorization.spec.ts
```

**Structure Decision**: Extend the existing monorepo and existing domain modules. The authorization
module is a stable shared seam with two real enforcement consumers—API checks and database policy
semantics—and a documented near-term consumer in feature 003.

## Post-Design Constitution Re-check

Phase 1 artifacts preserve all gates. The data model encodes single membership and auditable
lifecycle; contracts declare actors and projections; the quickstart requires layered denial and
visual proof. No complexity exception or ADR amendment is needed.

## Complexity Tracking

No constitutional violations require justification.
