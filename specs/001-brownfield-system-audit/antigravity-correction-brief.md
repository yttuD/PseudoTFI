# Antigravity Correction Brief 01

**Status of first delivery**: REJECTED / PARTIAL  
**Conversation to resume**: `d0f7be74-3955-42b4-9587-949b48b6e850`  
**Required model**: `gemini-3.8-flash-medium` with medium effort  
**Scope**: Correct and complete T012-T029. Preserve valid T001-T011 work, but repair any inventory
claim contradicted by this brief or by reproducible source counts.

## Operating constraints

1. Resume the existing work; do not restart the audit or rewrite valid evidence without cause.
2. Work directly in this resumed turn. Do not launch a background subagent/process that outlives
   the turn or substitute progress messages for the final delivery contract.
3. Product defects are reported, not fixed. The only product-tree file allowed to change remains
   `apps/web/e2e/brownfield_system_audit.spec.ts`.
4. Preserve the dirty tree and every pre-existing user file. Delete only exact task-owned paths
   recorded in the cleanup ledger.
5. Playwright is mandatory for every visual or browser interaction claim. Retained screenshots are
   evidence and are not trash. Rejected, superseded, or invalid task-owned captures must be removed
   after their replacements and recorded in the cleanup ledger.
6. Do not expose credentials, tokens, stable user UUIDs, or exact private locations in evidence.
7. A task checkbox may be marked complete only when its named artifact is present and satisfies its
   independent test.

## Review findings that must be corrected

### A. Incomplete delivery

- Only T001-T011 are complete. Complete T012-T029.
- The following required artifacts are absent: `visual-matrix.md`, `form-behavior.md`,
  `role-and-privacy.md`, `ui-ux-audit.md`, `findings.md`, `contradictions.md`,
  `remediation-roadmap.md`, `final-validation.md`, and `evidence/delivery.json`.
- The previous response did not return the contract required by
  `contracts/audit-delivery.md`. The final response must be the completed structured delivery, not a
  list of launched commands.

### B. Playwright audit is not acceptable yet

Repair `apps/web/e2e/brownfield_system_audit.spec.ts` and rerun it.

- The surface matrix is hard-coded and incomplete. Reconcile it to the source-derived inventory and
  cover all 22 declared surfaces, including dynamic routes with safe fixture IDs or an exact named
  blocker. Current retained captures omit SURF-003, SURF-004, SURF-013, and SURF-019.
- Do not swallow failures with broad `try/catch` plus logging. Unexpected navigation, rendering,
  interaction, console, page, or screenshot failures must fail the test. Expected blockers must use
  an explicit blocker registry and appear in the matrix and delivery totals.
- Add meaningful assertions for final URL/redirect, expected page identity, final rendered state,
  absence of unexpected `pageerror` and console errors, horizontal overflow, and applied theme.
- Do not label a skeleton or transient loading view as `default`. Wait for the final page state.
  Capture loading separately only when it is an intentional state. The existing
  `SURF-001__anon__375w__dark__default.png` is invalid and must be replaced or rejected explicitly.
- Prove actor prerequisites and authentication state. A screenshot after an unnoticed redirect does
  not verify a protected surface.
- Exercise every one of the 10 inventoried forms/dialogs for applicable valid, invalid, boundary,
  cancellation, failure, keyboard, and destructive-safeguard behavior, or record a precise blocker.
  Only FORM-003 and FORM-005 currently have captures; attempted-but-missing evidence is not a pass.
- Record every expected/captured/rejected/replaced/blocked matrix cell. Do not infer visual quality
  from a successful screenshot call.

### C. Inventories contain unreconciled counts and paths

Regenerate counts from exact source file lists and reconcile them before claiming zero unexplained
items.

- `source-denominator.md` claims 24 Playwright E2E files but its list contains 29 before the audit
  spec; it claims 32 total tests while the listed 29 E2E plus 9 API files already total 38.
- It labels the API controller denominator as 10 but lists 12 and omits or miscounts active
  controllers such as AFIP. Derive the exact number from source.
- `automated-tests.md` collapses multiple source test files into fewer rows yet claims zero
  unexplained files. Inventory each source item exactly once or explicitly document a valid
  one-to-many rule consistent with the contract.
- `forms-and-dialogs.md` references the nonexistent
  `apps/web/src/components/gestor/DelegadoFormModal.tsx`; use the actual source path.
- Reconcile route-file, active-route, and surface totals with the web build output. Do not mix route
  files, locale expansions, and user-facing surfaces as if they were the same denominator.
- Correct traceability totals only after the underlying rows reconcile exactly.

### D. Confirmed domain corrections

Use these source-backed facts in capability, contradiction, and finding records:

- Reports are authenticated, not anonymous: `ReportesController` has
  `@UseGuards(SupabaseAuthGuard)` and the service resolves the authenticated user.
- The initial trial quota is 3, not 5: migration
  `20260904042700_cupo_and_seeds.sql` assigns `cupo_maximo = 3`; `CupoService` also falls back to 3.
- Creating an `Alquiler` does not automatically change `Unidad.estado`: neither
  `AlquileresService.create` nor the active migrations implement that transition. If another
  document claims otherwise, record a contradiction; do not normalize the implementation claim.
- Preserve canonical domain vocabulary: `Unidad`, `Alquiler`, `Inquilino`, `Gestor`, `Delegado`,
  `Cupo`, `Seña`. Distinguish a user-facing colloquial label from an incorrect domain claim.

### E. Evidence and UI/UX review requirements

- Save raw stdout/stderr and exit code for API tests, API production build, web production build,
  and Playwright runs. A prose-only statement is not raw verification evidence.
- Self-inspect every retained final screenshot. Record evidence-linked findings for, at minimum:
  the mobile-home loading capture mislabeled as default, mojibake such as `ModeraciÃ³n` on SURF-022,
  and any emoji used as an interface icon such as the package symbol on SURF-012. Verify whether
  these repeat before deduplicating by root cause.
- Review all final captures at 375, 768, 1024, and 1440 widths in light and dark themes where
  applicable. Check runtime failure, overflow, clipping, hierarchy, contrast, focus, touch targets,
  feedback, localization, and use of the approved Rendo palette.
- The reference image supplies colors only; do not treat its home composition as a required layout.
- Distinguish `verified-pass`, `verified-fail`, `blocked`, and `not-applicable`. Never promote an
  unexecuted or silently caught step to verified.

## Required final self-check

Before returning:

1. Run every quickstart scenario.
2. Confirm T001-T029 checkboxes reflect actual artifacts and evidence.
3. Validate `evidence/delivery.json` against `contracts/audit-delivery.md` and reconcile all totals.
4. Confirm only the allowed Playwright spec and audit artifacts changed during this audit.
5. Stop task-owned servers/processes and remove only recorded task-owned temporary artifacts.
6. Return the exact structured summary required by the delivery contract, including remaining
   blockers and command exit codes. Do not return progress narration as the final answer.
