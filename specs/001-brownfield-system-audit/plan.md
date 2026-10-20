# Implementation Plan: Brownfield System Audit

**Branch**: main | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from specs/001-brownfield-system-audit/spec.md

## Summary

Build a reproducible audit package for the current dirty working tree. Source discovery produces
complete manifests for product surfaces and supporting capabilities. Fresh builds, tests, browser
flows, and screenshots establish what works now. Findings are deduplicated and converted into
bounded remediation candidates; application defects are not fixed in this feature.

Antigravity performs the inventory and evidence generation as one independently executed batch.
Codex reviews the final diff, run summaries, and visual evidence before accepting or issuing one
bounded correction brief.

## Technical Context

**Language/Version**: TypeScript 5 for web, TypeScript 6 for API, SQL migrations, Java/Gradle shell
for the Capacitor Android wrapper

**Primary Dependencies**: Next.js 14 App Router, React 18, NestJS 12, Supabase clients, Tailwind,
shadcn/ui, next-intl, Leaflet, Recharts, Capacitor 8

**Storage**: Supabase PostgreSQL and Storage; audit outputs are repository files under the feature
evidence directory

**Testing**: Vitest 4, Playwright 1.63, Next.js and NestJS production builds, targeted database
verification when a configured local or safe test database is available

**Target Platform**: Desktop web at 1024 and 1440 pixels; responsive web at 375 and 768 pixels;
Chromium baseline; Capacitor Android wrapper readiness. Native Android device validation is a
future gated feature and is not inferred from responsive Playwright evidence.

**Project Type**: pnpm/Turborepo monorepo containing a public marketplace, an authenticated
Gestor/Delegado operational workspace, a restricted dev/admin console, NestJS API, shared
packages, Supabase migrations, and Android wrapper

**Performance Goals**: Audit commands finish deterministically; user-facing surfaces have no
blocking runtime error; browser observations include actionable timing or instability notes

**Constraints**: Preserve all pre-existing changes; do not mutate production or external accounts;
do not repair product defects during the audit; retain only evidence required by the spec; use
Rendo light and dark palette as the visual source of truth

**Scale/Scope**: Entire current repository, all source-discovered routes, forms, dialogs,
controllers, migrations, and automated tests

## Constitution Check

*GATE: Passed before research and passed again after design.*

- **Evidence before claims**: PASS. Every status requires a current source path plus fresh
  executable or visual evidence; historical documents cannot prove completion.
- **Canonical domain and architecture**: PASS. Inventories include terminology, invariant,
  authorization, RLS, soft-delete, and state-transition checks.
- **Bounded Spec-Driven Work**: PASS. This feature produces audit evidence and remediation
  candidates only; product fixes become separate specs.
- **Supervised delegation**: PASS. One Antigravity batch uses Gemini 3.8 Flash Medium at medium
  effort, followed by final Codex review rather than continuous monitoring.
- **Verification and visual proof**: PASS. Playwright captures every applicable surface matrix cell
  and all forms receive behavior-path coverage or a named blocker.
- **Audience and platform separation**: PASS by design. Route and capability inventories classify
  public, operational-workspace, and dev/admin audiences. Desktop and responsive web are evaluated
  separately; Android receives readiness-only treatment until the future physical-device phase.
- **Safe workspace stewardship**: PASS. Cleanup is limited to task-owned paths and exact temporary
  directories; existing scratch and user changes are classified but not deleted.

Post-design re-check: the evidence contract, audit entities, and quickstart preserve every gate.
No constitutional exception is required.

## Project Structure

### Documentation and Evidence

~~~text
specs/001-brownfield-system-audit/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── audit-delivery.md
│   └── inventory-row.md
├── checklists/
│   └── requirements.md
├── evidence/
│   ├── manifests/
│   ├── runs/
│   ├── screenshots/
│   └── reports/
└── tasks.md
~~~

### Audited Source

~~~text
apps/web/
├── src/app/                 # App Router layouts, pages, loading states
├── src/components/          # marketplace, Gestor, metrics, providers, UI primitives
├── messages/                # ES, PT, EN catalogs
├── e2e/                     # existing and audit Playwright coverage
├── public/brand/            # Rendo assets
└── android/                 # Capacitor Android wrapper

apps/api/
├── src/                     # controllers, services, DTOs, auth and adapters
└── test/                    # API end-to-end tests

packages/
├── types/
├── ui/
└── database/

supabase/migrations/         # physical schema, functions, policies, storage
~~~

**Structure Decision**: Keep one root Spec Kit project because product behavior crosses web, API,
shared types, database, and Android shell. Add only audit-specific tests where current evidence
cannot be produced safely by existing suites. All reports and retained screenshots live inside the
feature directory.

## Audit Design

### Discovery pass

1. Enumerate active source files and exclude generated build output, dependencies, and Git data.
2. Derive route entries from App Router page, layout, loading, dynamic-segment, and redirect files;
   resolve aliases before counting distinct rendered surfaces.
3. Derive forms and dialogs from semantic form elements, form libraries, modal components, and
   submit handlers; link each to all route entry points.
4. Derive API capabilities from controllers, guards, DTOs, services, and external adapters.
5. Derive data capabilities from migrations, RLS policies, storage rules, functions, and seeds.
6. Derive current verification surface from unit, integration, end-to-end, and build configuration.

### Evidence pass

1. Run builds and automated suites without changing product behavior.
2. Add one Playwright audit specification only when existing tests cannot generate the required
   route/state/viewport/theme screenshots, using explicit actor contexts rather than one shared
   authenticated storage state.
3. Store command summaries and screenshots under evidence; never rely on terminal scrollback.
4. Classify each item using the exact status taxonomy in the inventory contract.
5. Record blockers separately from defects and separate fresh evidence from historical claims.

### Review pass

1. Validate manifest completeness against independent file listings.
2. Inspect every retained screenshot for runtime errors, clipping, overflow, contrast, hierarchy,
   focus, touch targets, feedback states, localization, and brand token drift.
3. Report desktop web and responsive web separately and record Capacitor/native-mobile gaps as
   readiness findings, not as completed native validation.
4. Reproduce suspicious results with at most one bounded confirmation pass.
5. Deduplicate findings by root cause and map each P0/P1 finding to a remediation candidate.
6. Verify cleanup against the task-owned artifact ledger.

## Risk Controls

- Authentication fixtures may contain user-owned data; never print credentials and never overwrite
  existing fixtures without preserving their behavior.
- External Supabase, Mercado Pago, AFIP, Nominatim, email, or push calls stay read-only or mocked
  unless a safe test environment is already configured.
- Large screenshot matrices are batched by surface and only final evidence is retained.
- A passing test that does not assert the claimed behavior is recorded as insufficient evidence.
- Existing repository scratch and generated assets are inventoried as pre-existing; only artifacts
  created by this feature are eligible for cleanup.

## Complexity Tracking

No constitution violations or added architectural abstractions are required.
