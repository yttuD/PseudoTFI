# Tasks: Vercel Closed Beta Deployment

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [contracts/release-contract.md](contracts/release-contract.md)

## Phase 1: Setup

- [x] T001 Create isolated `rendo-beta-api` and `rendo-beta-web` Vercel projects; record identities in `evidence/deployment.md`.
- [x] T002 Confirm private API credential exists in Production (and Preview if used) without reading it; record only scope in `evidence/deployment.md`.

## Phase 2: Foundation

- [x] T003 Review intended source and repository paths, scan staged diff for credentials, then commit `apps/`, `packages/types/`, `supabase/`, release docs and lockfile on the beta branch.
- [x] T004 Push the reviewed beta branch to the existing Git remote and record its commit ID in `evidence/deployment.md`.
- [x] T005 Configure exact hosted origins and non-commercial release flags in both Vercel projects; never copy the API service credential to web.

## Phase 3: User Story 1 — Reach a real beta (P1)

**Independent test**: Hosted web loads, API liveness/readiness reflect real dependency state.

- [x] T006 [US1] Deploy `apps/api` and `apps/web` from the reviewed revision and record URLs/build results in `evidence/deployment.md`.
- [ ] T007 [US1] Verify hosted `/health/live`, `/health/ready`, catalog and dependency-failure behavior; record results in `evidence/deployment.md`.

## Phase 4: User Story 2 — Protect tester boundaries (P1)

**Independent test**: Hosted actor allow/deny checks and beta money gates, with browser evidence.

- [ ] T008 [US2] Configure Supabase Auth site/redirect URLs and real isolated tester accounts; record only non-sensitive setup in `evidence/deployment.md`. Dashboard URLs and disabled Confirm Email are user-reported; tester-account verification remains pending.
- [ ] T009 [US2] Run public, Gestor, Delegado, cross-tenant and internal-denial hosted checks; preserve redacted evidence in `evidence/deployment.md`.
- [ ] T010 [US2] Verify payment/fiscal/dev-token gates and inspect Playwright screenshots for desktop and responsive web in `evidence/`.

## Phase 5: User Story 3 — Invite and recover (P2)

**Independent test**: Owner receives honest release verdict and runnable rollback.

- [ ] T011 [US3] Record release verdict, known risks, exact tester URLs and previous-good revision in `evidence/deployment.md`.
- [ ] T012 [US3] Confirm rollback procedure in `quickstart.md` against the deployed project controls without deleting data.

## Final Phase: Stewardship

- [x] T013 Remove only verified task-owned temporary tools/build artifacts; leave unrelated projects, databases and user files intact.

**Dependencies**: T003–T005 precede T006; T006 precedes T007–T010; T007–T010 precede tester-ready T011. T008 needs Carlos's private credential and Auth dashboard access. T009–T010 require real-role accounts and seeded test data; do not mark them done from mock sessions.

**Parallel opportunities**: T002 and staged-source review can proceed independently. Public and authenticated hosted checks can be separate once both deployments are healthy.

**MVP**: US1 produces restricted technical links; US2 is mandatory before tester invitations.
