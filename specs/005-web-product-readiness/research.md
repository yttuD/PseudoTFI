# Research: Web Product Readiness

## Decision 1 — Current source is the audit denominator

**Decision**: Rediscover active routes, components, controllers, migrations, policies and tests from the filesystem, then record a delta against Feature 001.

**Rationale**: Features 002–004 added routes, authorization behavior, evidence and a migration after the original audit. Reusing its counts would violate evidence-before-claims.

**Alternatives considered**: Treat Feature 001 as final (rejected as stale); inspect only changed Git files (rejected because the baseline worktree is already dirty and would omit unchanged but incomplete surfaces).

## Decision 2 — One inventory, independent verdicts

**Decision**: Each item has separate functional, desktop visual, responsive visual, accessibility and authorization dispositions.

**Rationale**: A route can be functionally correct but unusable on mobile, or visually polished while exposing the wrong actor data.

**Alternatives considered**: One overall PASS per route (rejected because it hides channel-specific defects).

## Decision 3 — Actor matrix is explicit

**Decision**: Evidence declares anonymous, public authenticated user, Gestor, Delegado-read, Delegado-manage and dev/admin where applicable.

**Rationale**: One authenticated fixture cannot prove audience separation or scoped delegation.

**Alternatives considered**: Gestor versus anonymous only (rejected because it misses public accounts, delegated scopes and internal console isolation).

## Decision 4 — Rental modalities are distinct journeys

**Decision**: Monthly, daily and hourly Alquileres receive separate field, validation, overlap, availability and display cases. Optional seña is tested absent/present and inherited from an explicitly chosen Grupo.

**Rationale**: Their units and temporal boundaries differ; one generic rental test produces false confidence.

**Alternatives considered**: Parameterize only labels over one flow (rejected unless the resulting assertions still prove modality-specific rules).

## Decision 5 — Visual proof uses stable browser states

**Decision**: Playwright waits for fonts, animations and theme transitions to settle; screenshots use 375/768/1024/1440 widths and light/dark themes, with named interaction state and actor.

**Rationale**: Feature 004 showed that a passing functional test can capture an intermediate, low-contrast frame.

**Alternatives considered**: Manual screenshots (rejected as non-reproducible); class-name assertions alone (rejected because computed output can differ).

## Decision 6 — Remediation is severity-batched

**Decision**: Inventory and baseline evidence precede code changes. Findings are grouped into bounded batches: trust/security, public UX, operational workflows, internal console, then cross-cutting polish.

**Rationale**: This preserves reviewability and prevents a global redesign from masking authorization or domain regressions.

**Alternatives considered**: One unlimited implementation pass (rejected as incompatible with supervised delegation and safe workspace stewardship).

## Decision 7 — Local resources are demand-started

**Decision**: Docker/Supabase remain off during documentation and web-mock work, start only for database/integration gates and final handoff, and auxiliary processes are stopped between batches.

**Rationale**: The complete local stack retained about 8 GB in WSL; the user explicitly requested minimal project-only memory usage.

**Alternatives considered**: Keep all services always on (rejected due unnecessary RAM); replace Supabase with another local database (rejected because it changes the closed architecture).

## Decision 8 — Native Android and deployment remain future gates

**Decision**: Inspect Capacitor wrapper readiness only. Do not claim native acceptance, install on a device or deploy.

**Rationale**: The user will authorize a dedicated native phase with wireless debugging after web approval; deployment follows manual approval.

**Alternatives considered**: Treat responsive screenshots as native evidence (constitutionally prohibited).
