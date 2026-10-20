# Evidence Directory Index: Web Product Readiness (Feature 005)

## Overview

This directory contains the authoritative audit, verification, and regression evidence for **Feature 005 (Web Product Readiness)**. Every active user-facing surface, form, API capability, database migration, and automated test suite is inventoried and tracked here.

No claims of completion or production readiness may be made without linking fresh evidence stored within this directory tree.

## Directory Structure

```text
specs/005-web-product-readiness/evidence/
├── README.md                      # This index and evidence governance rules
├── manifests/                     # Authoritative denominator catalogs conforming to contracts/inventory-contract.md
│   ├── README.md                  # Manifest index and denominator totals
│   ├── routes-and-states.md       # Every active Next page, redirect alias, layout, and loading skeleton (T007)
│   ├── interactions.md            # Every form, modal/dialog, and critical interactive control (T008)
│   ├── api-capabilities.md        # API controllers, services, and authorization seams (T009)
│   ├── data-and-policies.md       # Supabase migrations, RLS policies, trigger functions, and pgTAP suites (T010)
│   ├── automated-tests.md         # Active Playwright, Vitest API, and database test suites (T011)
│   ├── actor-surface-matrix.md    # Audience, allowed actors, denied actors, and channels mapping (T013)
│   └── acceptance-matrix.md       # Cell-by-cell acceptance matrix conforming to contracts/acceptance-matrix.md (T003)
├── review-tools/                  # Deterministic screenshot & contact-sheet tooling (T005)
│   ├── README.md                  # Screenshot capture rules and contact sheet generator usage
│   └── generate-contact-sheets.js # Reusable HTML/Markdown contact sheet generator
├── test-results/                  # Command execution outputs, test logs, and environment baselines
│   ├── environment-baseline.md    # Local system baseline (Docker off, ports, RAM, processes) (T006)
│   └── helper-validation.md       # TypeScript compilation & validation evidence for E2E helpers (T015)
├── reports/                       # Defect registers, traceability, deltas, and handoff ledgers
│   ├── findings.md                # Comprehensive baseline finding register with severity and lifecycle (T016)
│   ├── audit-001-delta.md         # Reconciled denominator delta comparing Feature 001 vs current source (T012)
│   ├── traceability.md            # Bidirectional requirement (FR) to task, test, and evidence mapping
│   ├── cleanup-ledger.md          # Task-owned process, listener, and temporary file accounting
│   ├── public-findings.md         # Public journey (US1) defect register shell
│   ├── gestor-findings.md         # Gestor operation (US2) defect register shell
│   ├── delegado-findings.md       # Scoped delegation (US3) defect register shell
│   └── dev-findings.md            # Internal console (US4) defect register shell
├── screenshots/                   # Named deterministic Playwright captures by audience
│   ├── public/                    # Marketplace, auth, favorites, invitations captures
│   ├── gestor/                    # Inventory, rentals, CRM, billing, metrics captures
│   ├── delegado/                  # Scoped delegation and authorization boundary captures
│   └── dev/                       # Internal admin/operator console captures
└── contact-sheets/                # Compact visual matrices for fast human review
    ├── public/
    ├── gestor/
    ├── delegado/
    └── dev/
```

## Governing Contracts

- **Inventory Contract**: [`../contracts/inventory-contract.md`](../contracts/inventory-contract.md)
  Schema: `ID | Kind | Name | Audience | Allowed actors | Denied actors | Channel | Entry point | Source paths | Dependencies | Current status | Evidence | Notes`
- **Acceptance Matrix Contract**: [`../contracts/acceptance-matrix.md`](../contracts/acceptance-matrix.md)
  Schema: `Case ID | Inventory ID | Actor | State | 375 light | 375 dark | 768 light | 768 dark | 1024 light | 1024 dark | 1440 light | 1440 dark | Functional | Authorization | Accessibility | Evidence`
- **Evidence Delivery Contract**: [`../contracts/evidence-delivery.md`](../contracts/evidence-delivery.md)
  Delivery requirements for each Antigravity batch.

## Naming & Verification Rules

1. **Deterministic Screenshot Filenames**:
   `{SURFACE_OR_CONTROL_ID}__{ACTOR}__{STATE}__{WIDTH}w__{THEME}.png`
   Example: `SURF-001__anonymous__default__375w__dark.png`
2. **Actor Set**:
   - `anonymous` (unauthenticated)
   - `public_user` (authenticated marketplace user / tenant)
   - `gestor` (property manager owner)
   - `delegado_read` (collaborator with read-only scope)
   - `delegado_manage` (collaborator with operational manage scope)
   - `dev_admin` (internal platform operator)
3. **Width Matrix**:
   - `375px` (mobile viewport)
   - `768px` (tablet viewport)
   - `1024px` (small desktop / landscape tablet)
   - `1440px` (desktop viewport)
4. **Theme Matrix**:
   - `light`
   - `dark`
5. **Fresh Evidence Invariant**:
   - Historical audit 001 statuses are obsolete. Every status in Feature 005 must cite executable logs, test results, or Playwright screenshots produced in the current worktree.
