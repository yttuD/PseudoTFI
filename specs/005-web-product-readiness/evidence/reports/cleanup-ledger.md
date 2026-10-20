# Cleanup and Resource Ledger (`cleanup-ledger.md`)

Tracks all task-owned processes, network listeners, temporary files, and candidate scratch artifacts.

## 1. Process & Listener State

| Target Batch | Service / Process | PID | Port | Action | Completed At |
|---|---|---|---|---|---|
| **Batch 01 (Foundation)** | Docker Desktop | None | N/A | Kept STOPPED | 2026-09-26T21:03 |
| **Batch 01 (Foundation)** | WSL 2 | None | N/A | Kept STOPPED | 2026-09-26T21:03 |
| **Batch 01 (Foundation)** | Next.js Web Dev Server | None | 3000 | Never started | 2026-09-26T21:03 |
| **Batch 01 (Foundation)** | NestJS API Server | None | 3001 | Never started | 2026-09-26T21:03 |
| **Batch 01 (Foundation)** | Browser Subprocess | None | N/A | Never started | 2026-09-26T21:03 |

---

## 2. Temporary & Scratch Files Classification

| File Path | Description / Purpose | Category | Lifecycle / Remediation Plan |
|---|---|---|---|
| `apps/api/src/scratch/test_afip_fiscal_config.cjs` | Scratch test script for AFIP fiscal config | Stale Scratch Candidate | Preserved in Batch 01 per instructions; scheduled for deletion in T062 |
| `apps/web/e2e/.auth/` | Playwright test auth storage state dir | Test Fixture Cache | Retained; contains mock test state |
| `specs/005-web-product-readiness/evidence/` | Feature 005 audit manifests and evidence | Retained Evidence | Permanent project evidence; never delete |

---

## 3. Local Resource Stewardship Rules

1. Any background server started for test execution (e.g. Playwright test server) must register PID and unregister upon teardown.
2. No dangling node processes, orphaned playwright browsers, or zombie listeners on ports 3000 or 3001 may remain when a batch completes.
3. Docker, WSL, and Supabase must be cleanly confirmed offline at the end of each non-database batch.
