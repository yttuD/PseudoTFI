# Quickstart: Web Product Readiness Validation

## Resource policy

Keep Docker/Supabase off for source inventory and mock-backed web checks. Start it only for database/integration gates and the final local handoff. Stop task-owned browsers, servers and auxiliary agents after each batch.

## 1. Confirm feature context

Run the Spec Kit prerequisite check and confirm it resolves `specs/005-web-product-readiness` with `spec.md`, `plan.md` and `tasks.md`.

## 2. Reconcile source inventory

Enumerate current web app routes/layouts/loading states, components with interactions, API controllers/services, database migrations/policies and all test suites. Compare with Feature 001 manifests and record additions, removals and changed ownership.

Expected: zero active source files omitted and zero inventory paths missing without an explicit removed status.

## 3. Run static and service gates

- Web lint and production build.
- API lint, complete unit/integration suite and production build.
- Start local Supabase only for reset/seed and pgTAP/database policy verification.

Expected: exact counts and exit codes recorded; skipped or blocked work remains non-PASS.

## 4. Run actor and visual matrix

Execute Playwright by bounded audience batch: public, Gestor, Delegado-read/manage, dev/admin. Capture 375, 768, 1024 and 1440 pixels in light/dark for each required state.

Expected: screenshots and contact sheets use stable case IDs and satisfy `contracts/acceptance-matrix.md`.

## 5. Remediate and reconfirm

Fix findings in severity order through bounded Antigravity briefs. After each batch, rerun focused tests, inspect screenshots, then run only the necessary regression surface. Do not merge all findings into one unrestricted pass.

Expected: zero open critical/high findings; medium exceptions require explicit acceptance.

## 6. Final local handoff

Start only Rendo services, verify health, seed deterministic manual-test actors and publish the exact local URLs in the final report. Keep them running for the user's manual review.

Expected: web/API/data links respond; accounts and limitations are documented; native Android and deploy are labeled as later phases.

## 7. Cleanup rule

Retain feature evidence. Remove task-owned `test-results`, traces, temporary downloads, PID files and stopped server artifacts. Never clean unrelated dirty work or personal processes.
