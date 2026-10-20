# Antigravity Batch 01 — Feature 005 foundation (T001–T016)

## Governing artifacts

Read completely before acting:

- `.specify/memory/constitution.md`
- `specs/005-web-product-readiness/spec.md`
- `specs/005-web-product-readiness/plan.md`
- `specs/005-web-product-readiness/tasks.md`
- `specs/005-web-product-readiness/research.md`
- `specs/005-web-product-readiness/data-model.md`
- `specs/005-web-product-readiness/contracts/*.md`
- `specs/001-brownfield-system-audit/evidence/manifests/*.md`
- `specs/001-brownfield-system-audit/evidence/reports/{findings,remediation-roadmap,final-validation}.md`

## Exact scope

Execute T001 through T016 only. This is discovery/foundation, not product remediation.

Allowed writes:

- `specs/005-web-product-readiness/evidence/**`
- `specs/005-web-product-readiness/tasks.md` only to check T001–T016 after evidence proves completion
- `apps/web/e2e/fixtures/**` for T014–T015

Protected: do not modify product source, API source, migrations, existing feature evidence, package versions, configuration, `.env*`, `ESTADO-REAL.md` or any other tasks.

## Runtime/resource constraints

- Do not start Docker, Supabase, WSL, web/API dev servers or browsers.
- Source inspection only. If a lightweight static command starts a service, stop it immediately and report it.
- Preserve all unrelated dirty work.
- Do not delete `apps/api/src/scratch/`; classify it for T062.

## Required work

1. Create the complete Feature 005 evidence structure and contract-conforming shells.
2. Rediscover from current filesystem (tracked plus active untracked source):
   - all Next app pages, redirects, layouts and loading states;
   - all forms, dialogs and critical interactive controls, including inline route forms;
   - all API controllers, services and authorization seams;
   - all Supabase migrations, policies, functions and pgTAP files;
   - every active Playwright, API and database suite.
3. Reconcile exact counts and paths against Feature 001. Do not copy its statuses as current truth.
4. Declare audience, allowed and denied actors, and desktop/responsive channels for every relevant item.
5. Inspect existing E2E fixtures. Add only the minimum deterministic actor fixture metadata/helpers needed for anonymous, public authenticated, Gestor, Delegado-read, Delegado-manage and dev/admin. Never add a production auth bypass.
6. Add `apps/web/e2e/fixtures/product-readiness.ts` with reusable helpers for:
   - stable theme and settled animation/font state;
   - width/theme screenshot naming;
   - horizontal overflow;
   - effective computed contrast including alpha;
   - 44x44 touch targets;
   - accessible name/visible focus checks where applicable.
   Helpers must be imported by a tiny compile-only or fixture-focused Playwright test if needed to prove they load; do not capture product screenshots in this batch.
7. Create the baseline source-inspection finding register. Every finding needs severity, exact source/evidence, expected/actual and target story/batch. Label unverified visual suspicions as unverified; do not state them as reproduced.
8. Include likely stale/removed artifacts and scratch/trash candidates without deleting them.
9. Validate TypeScript/lint for changed E2E helper files using the narrowest reliable command. Do not run full browser suites.
10. Check T001–T016 only when their evidence exists.

## Accuracy rules

- Exact denominators must reconcile: active files, exclusions and included rows.
- Distinguish rendered destinations from redirect aliases and loading/layout files.
- Distinguish components containing real forms/dialogs from decorative components.
- A role inferred only from navigation is not authorization proof; mark unverified until runtime evidence.
- Current Feature 004 evidence may be cited as fresh evidence for its exact scope, but do not expand its claims.
- Native Android is readiness-only and must not be counted as a verified native surface.

## Terminal delivery format

Return once, after completion:

1. task status T001–T016;
2. exact current counts by category and delta versus Feature 001;
3. files created/changed;
4. helper/fixture validation command and result;
5. findings summary by severity and audience, with IDs;
6. explicit unknowns/blockers;
7. confirmation Docker/WSL stayed off, ports 3000/3001 free and no task-owned processes/temporaries remain.
