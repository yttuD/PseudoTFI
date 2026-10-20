# Validation Quickstart: Modality-Aware Availability

This guide validates the completed feature. It is not implementation evidence by itself.

## 1. Prerequisites

- Work from the repository root.
- Preserve the existing dirty worktree; do not reset or clean unrelated files.
- Use Node.js 22 and the project lockfile. The repository declares pnpm 9, while the current global
  binary reports pnpm 11; record the executable/version used and do not reinstall dependencies
  without authorization.
- Install or otherwise provide the official Supabase CLI compatible with the project. It is not
  currently available on this host.
- Start Docker/local Supabase and verify ports 54321/54322 are healthy.
- Set the normal local Supabase and API/web environment values. Never print secrets in evidence.
- Complete REMED-004 before running the Delegado acceptance matrix. Before that dependency, all new
  Delegado mutation attempts must return 403.

## 2. Static design checks

Confirm:

- The migration creates RLS/grants for every new exposed object.
- No public response schema contains gestor_id, grupo_id, alquiler_id, inquilino_id, actor IDs,
  source, reason, payment state, Seña amount or notes.
- No availability code reads or writes Unidad.estado.
- CardUnidad contains no Math.random or unverified availability labels.
- Alquiler mutations that can affect a Seña block call one transactional database function.
- Authoritative paths do not call resilientStore.

Suggested searches:

    rg -n "Math.random|Disponible ahora|Próximamente" apps/web/src/components/marketplace
    rg -n "resilientStore" apps/api/src/disponibilidad apps/api/src/alquileres
    rg -n "estado" apps/api/src/disponibilidad supabase/migrations

The last search requires manual inspection; legitimate block/review state is allowed, Unidad.estado
mutation is not.

## 3. Reset and validate the database

Use the installed official Supabase CLI:

    supabase start
    supabase db reset
    supabase test db
    supabase db lint

Expected:

- All migrations apply from zero.
- The btree_gist extension and exclusion constraint exist.
- RLS tests cover anonymous, public authenticated, Gestor owner, foreign Gestor, Delegado ver,
  Delegado gestionar and dev/admin where applicable.
- Public projection execution is granted only to intended roles and raw availability tables are not
  directly readable by anon/public users.

## 4. Database acceptance scenarios

### A. Global overlap and boundaries

For one Unidad, create:

1. Monthly active block.
2. Daily block partially overlapping it.
3. Hourly block contained within it.
4. Boundary-adjacent block.
5. Two simultaneous transactions attempting the same period.

Expected:

- Steps 2 and 3 fail with the named exclusion constraint.
- Step 4 succeeds only when the effective buffer allows it.
- Exactly one concurrent write succeeds.
- The same ranges on a different Unidad succeed.

### B. Hourly schedule and buffer

Create a Grupo rule, two inheriting courts and one court with its own override.

Expected:

- Inheriting courts resolve the Grupo timezone/schedule/buffer.
- Override remains unchanged after a Grupo update.
- Blocks remain independent between sibling Unidades.
- A Grupo update that invalidates any inheriting future block fails entirely.
- Moving a Unidad between Grupos validates the prospective effective rule before changing grupo_id.

### C. Optional Seña

Create Alquileres in these states:

- No Seña.
- Proposed/pending Seña.
- Positive Seña marked collected.
- Fully paid without Seña.
- Collected Seña later fully paid.

Expected:

- Only the effective collected-Seña cases create an automatic block.
- Fully paying a Seña-backed Alquiler keeps its block.
- Fully paying an Alquiler that never had a Seña creates no automatic block.
- Reintegrating Seña, cancelling or soft-deleting releases the block and retains audit history.
- A conflict fails both Seña transition and block creation; neither partial change persists.
- Unidad.estado is byte-for-byte unchanged in all cases.

### D. Backfill

Seed unambiguous and ambiguous legacy rows.

Expected:

- Unambiguous rows receive deterministic configuration/block disposition.
- Ambiguous rows produce review records.
- Affected public availability remains unknown until all required reviews are resolved.
- Migration/report counts reconcile to the seeded source rows.

## 5. API tests

Run:

    pnpm --filter api test
    pnpm --filter api test:e2e
    pnpm --filter api lint
    pnpm --filter api build

If pnpm is blocked only by the existing store/runtime mismatch, use the already-installed project
binaries directly and record the exact command. Do not reinstall or rewrite the lockfile merely to
obtain evidence.

Expected API matrix:

| Case | Expected |
|---|---|
| Invalid/missing token on operational route | Generic 401 |
| Gestor on own Unidad/Grupo | Allowed |
| Foreign Gestor | 403 or non-enumerating 404, consistently |
| Delegado ver read assigned calendar | Allowed after REMED-004 |
| Delegado ver mutation | 403 |
| Delegado gestionar assigned mutation | Allowed after REMED-004 |
| Delegado outside scope | 403 or non-enumerating 404 |
| Overlap | 409 AVAILABILITY_CONFLICT |
| Invalid schedule/minimum | 422 stable domain code |
| Database unavailable | 503 AVAILABILITY_UNAVAILABLE, no fallback success |
| Public unknown | 200 status unknown, no optimistic availability |
| Public database failure | 503 localized retry path |

Assert the public DTO contains exactly the allowlisted fields in contracts/openapi.yaml.

## 6. Web and Playwright tests

Start API and web with deterministic seeded data, then run:

    pnpm --filter web exec playwright test e2e/modality_aware_availability.spec.ts
    pnpm --filter web build

The Playwright test must:

- Prove each named state before capture.
- Capture 375, 768, 1024 and 1440 widths.
- Capture light and dark themes.
- Report 375/768 as responsive web and 1024/1440 as desktop web.
- Exercise keyboard navigation, visible focus, inline errors, retry, unknown and conflict states.
- Compare anonymous/authenticated public calendar payload/visibility.
- Confirm no horizontal overflow and 44 by 44 touch targets at responsive widths.

Use the required matrix and filenames in contracts/ui-state-matrix.md.

## 7. Privacy and regression checks

Run the complete existing API and relevant web suites, then verify:

- Existing marketplace search/detail still works.
- Existing Alquiler, Unidad and Grupo paths remain available.
- Exact location/contact behavior is not widened by the calendar endpoint.
- Public calendar never leaks private source or reason.
- Unidad state transitions are unchanged.
- Capacitor wrapper receives only regression/build readiness; do not claim native Android evidence.

## 8. Performance check

Seed at least 10,000 active/historical blocks across multiple Unidades and request a bounded window.

Expected:

- EXPLAIN shows the GiST range/index path for intersection/overlap.
- Public query p95 is at most 500 ms in the recorded local environment.
- Marketplace list does not make one calendar request per card.
- Response rejects windows greater than 366 days.

Record fixture size, machine/environment and query plan with the result.

## 9. Required evidence

Retain only intentional evidence under:

    specs/003-modality-aware-availability/evidence/
    ├── reports/
    │   ├── database-validation.md
    │   ├── api-validation.md
    │   ├── visual-validation.md
    │   ├── privacy-actor-matrix.md
    │   └── codex-final-acceptance.md
    └── screenshots/

Antigravity delivery must include:

- Changed-file inventory.
- Requirement-to-test/evidence mapping.
- Exact commands, exit codes and failure separation.
- Database migration/RLS/constraint evidence.
- Playwright report and named screenshot manifest.
- Known blockers and intentionally deferred work.
- Exact list of temporary files/processes cleaned.

Codex acceptance requires source/diff review, one batched screenshot inspection, independent
high-risk command verification and a final constitution check.

## 10. Cleanup

Stop only servers/processes started by this task. Remove only task-owned transient Playwright videos,
traces, downloads, temporary databases and scratch output after deciding what evidence to retain.
Do not delete repository-wide caches, user Downloads, unrelated test-results, existing screenshots
or other dirty-worktree content.
