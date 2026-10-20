# Cleanup Ledger — Brownfield System Audit

Date: 2026-09-25 (Correction Pass 02)

## 1. Pre-Existing Working-Tree Baseline (Preserved Unconditionally)
All pre-existing modified and untracked files identified prior to the audit (listed in git baseline snapshot) have been preserved without modification or deletion.

---

## 2. Retained Task-Owned Artifacts (Feature Evidence)

### Specifications & Normative Governance
- `specs/001-brownfield-system-audit/antigravity-correction-brief-02.md`
- `specs/001-brownfield-system-audit/architecture-boundaries.md`
- `specs/001-brownfield-system-audit/contracts/inventory-row.md`
- `specs/001-brownfield-system-audit/contracts/audit-delivery.md`
- `specs/001-brownfield-system-audit/tasks.md`

### Test Harness
- `apps/web/e2e/brownfield_system_audit.spec.ts`

### Manifests & Traceability
- `specs/001-brownfield-system-audit/evidence/README.md`
- `specs/001-brownfield-system-audit/evidence/manifests/README.md`
- `specs/001-brownfield-system-audit/evidence/manifests/source-denominator.md`
- `specs/001-brownfield-system-audit/evidence/manifests/excluded-artifacts.md`
- `specs/001-brownfield-system-audit/evidence/manifests/routes-and-surfaces.md`
- `specs/001-brownfield-system-audit/evidence/manifests/forms-and-dialogs.md`
- `specs/001-brownfield-system-audit/evidence/manifests/api-capabilities.md`
- `specs/001-brownfield-system-audit/evidence/manifests/data-and-migrations.md`
- `specs/001-brownfield-system-audit/evidence/manifests/automated-tests.md`
- `specs/001-brownfield-system-audit/evidence/manifests/traceability.md`

### Execution Logs & Environment
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-environment.md`
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-api.md`
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-api-test.log` (Exit code 0, 39 passed)
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-api-build.log` (Exit code 0)
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-web-build.md`
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-web-build.log` (Exit code 0)
- `specs/001-brownfield-system-audit/evidence/runs/2026-09-25-playwright-targeted.log` (Exit code 0, 6 targeted passed)

### Reports & Delivery Summary
- `specs/001-brownfield-system-audit/evidence/reports/visual-matrix.md`
- `specs/001-brownfield-system-audit/evidence/reports/form-behavior.md`
- `specs/001-brownfield-system-audit/evidence/reports/role-and-privacy.md`
- `specs/001-brownfield-system-audit/evidence/reports/ui-ux-audit.md`
- `specs/001-brownfield-system-audit/evidence/reports/findings.md`
- `specs/001-brownfield-system-audit/evidence/reports/contradictions.md`
- `specs/001-brownfield-system-audit/evidence/reports/remediation-roadmap.md`
- `specs/001-brownfield-system-audit/evidence/reports/final-validation.md`
- `specs/001-brownfield-system-audit/evidence/reports/cleanup-ledger.md`
- `specs/001-brownfield-system-audit/evidence/delivery.json`

### Retained Screenshots (194 Total PNGs)
- 184 rendered surface captures (23 rendered surfaces × 4 viewports × 2 themes)
- 10 interaction captures (`FORM-001` through `FORM-010`)
- Located under `specs/001-brownfield-system-audit/evidence/screenshots/`

---

## 3. Removed Task-Owned Artifacts

### Deleted Redundant Screenshots (8 Files)
Marked rejected/redundant and removed because SURF-014 (`/[locale]/grupos`) is a redirect alias to SURF-011 (`/[locale]/mis-unidades`) and produced byte-identical images:
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__375w__dark__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__375w__light__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__768w__dark__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__768w__light__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__1024w__dark__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__1024w__light__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__1440w__dark__default.png`
- `specs/001-brownfield-system-audit/evidence/screenshots/SURF-014__gestor__1440w__light__default.png`

### Removed Temporary Directories & Runners
- `apps/web/run_audit_targeted.js` (temporary execution runner)
- `apps/web/test-results/` (Playwright run test results)
- `apps/web/playwright-report/` (Playwright HTML report directory)

### Terminated Background Processes
- Next.js development server process spawned on port 3000 during targeted Playwright execution (terminated and verified released).

### Codex Final-Review Cleanup

Removed exact task-owned review/install temporaries after independent screenshot inspection and
Spec Kit setup:

- `C:/Users/carlo/.codex/visualizations/2026/09/25/01a0d932-9d7a-7650-8ccb-6840911c72cb/audit-contact-sheets/`
- `C:/Users/carlo/AppData/Local/Temp/codex-speckit-preview/`
- `C:/Users/carlo/AppData/Local/Temp/codex-specify-cache/`
- `C:/Users/carlo/AppData/Local/Temp/codex-uv-python/`
- `C:/Users/carlo/AppData/Local/Temp/antigravity-install.ps1`

`apps/web/.next/` and `apps/api/dist/` were preserved because they are generated outputs but their
exclusive ownership by this audit could not be proven from the pre-audit baseline. The pre-existing
root `test-results/` directory was also preserved. No listeners remained on ports 3000, 3001, 3005,
or 54321.
