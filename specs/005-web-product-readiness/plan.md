# Implementation Plan: Web Product Readiness

**Branch**: `005-web-product-readiness` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-web-product-readiness/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Reconcile the current Rendo source into a complete product inventory, exercise every public,
Gestor, Delegado and dev/admin surface independently across desktop and responsive web, remediate
all critical/high and unaccepted medium defects, then leave a reproducible local acceptance
environment. Existing audits are historical inputs only. Execution uses deterministic actor
fixtures, a current browser matrix, source-linked findings and evidence packs; remediation is
split into bounded batches so authorization, domain rules and user work remain protected.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5/6, SQL/PostgreSQL 17, PowerShell and Python only for evidence tooling

**Primary Dependencies**: Next.js 14 App Router, React 18, NestJS 12, Supabase Auth/Postgres/Storage, next-intl, Playwright 1.63, Vitest 4, Capacitor 8 readiness only

**Storage**: Supabase PostgreSQL with RLS and soft deletion; feature evidence stored under `specs/005-web-product-readiness/evidence/`

**Testing**: Playwright functional/visual browser suites, Vitest API tests, pgTAP database policies, lint, production builds, source/evidence reconciliation

**Target Platform**: Desktop web and responsive web at 375/768/1024/1440 px; local Windows host with Docker-backed Supabase for final integration

**Project Type**: Monorepo web application plus API and managed local database

**Performance Goals**: User-visible navigation and primary interaction feedback within 1.2 seconds under local seeded conditions; no unbounded waits; local startup ready for manual testing in under 10 minutes

**Constraints**: Preserve dirty worktree; no production mutations; WCAG 2.1 AA; 44 px controls; ES/PT/EN except Spanish-only dev console; no native Android claim; Playwright screenshots mandatory; Antigravity pinned to `gemini-3.8-flash-medium` medium; shut down task-owned auxiliary processes between batches

**Scale/Scope**: All active app routes, layouts, loading states, forms/dialogs, API controllers, migrations, RLS policies and automated suites discovered from current source; baseline presently exceeds 25 rendered destinations and 10 primary forms

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Evidence Before Claims**: PASS. Historical audit 001 is input only; current source inventory and fresh runs decide status.
- **Canonical Domain and Architecture**: PASS. No ADR change is planned; Unidad, Grupo, Gestor, Delegado, Inquilino, Cupo, Modalidad de precio, Alquiler, Pago, Depósito and Log de acciones remain canonical.
- **Bounded Spec-Driven Work**: PASS. Feature 005 owns the convergence audit and remediation; every implementation batch will reference its tasks and evidence.
- **Supervised Delegation Contract**: PASS. Codex owns architecture/review; Antigravity receives bounded briefs and terminal review only.
- **Verification and Visual Proof**: PASS. Every changed or audited view receives Playwright evidence at four widths and both themes where supported.
- **Audience and Platform Separation**: PASS. Public, operational and dev/admin matrices are independent; desktop and responsive verdicts are independent; native Android is excluded.
- **Safe Workspace Stewardship**: PASS. Only task-owned artifacts/processes may be removed; dirty user work is preserved.

Post-design re-check: PASS. Contracts below require audience, actor, channel, scope, evidence,
cleanup and independent responsive disposition. No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-web-product-readiness/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/
├── web/
│   ├── src/app/              # public, operational, auth and dev/admin routes
│   ├── src/components/       # forms, dialogs, navigation and shared UI
│   └── e2e/                  # Playwright functional/visual suites and fixtures
└── api/
    └── src/                  # controllers, services, authorization and API tests

packages/
└── types/                    # shared canonical contracts

supabase/
├── migrations/               # schema, policies, functions and seed behavior
└── tests/                     # pgTAP policy/domain validation

specs/005-web-product-readiness/
├── evidence/manifests/       # current denominators and delta from audit 001
├── evidence/screenshots/     # named Playwright evidence
├── evidence/contact-sheets/  # compact visual review matrices
├── evidence/test-results/    # human-readable command results
└── evidence/reports/         # findings, traceability, review and local handoff
```

**Structure Decision**: Keep the established monorepo and add only feature-scoped audit/evidence
artifacts. Product changes occur in the existing owner module; no parallel application, generic
repository layer or native-mobile implementation is introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
No constitution violations or complexity exceptions.
