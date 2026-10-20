# Rendo closed-beta candidate review — 2026-09-30

**Verdict: BLOCKED for deployment/tester invitations.** No web or API deployment was performed. This is a preparation and local verification report, not a release approval.

## Verified locally

- Web production-mode beta build passed with deliberately unreachable example origins; TypeScript validation passed. API build passed and all **233 API tests** passed (29 files). The compiled API also booted in beta mode and passed liveness plus exact-origin CORS smoke checks. Configuration/preflight unit tests passed. These do not prove real hosted wiring.
- Fresh isolated Rendo-only database applied **20 migrations** and passed **136 pgTAP assertions** across three files. No real customer data or external financial operation was used. The temporary database and test files were removed; original local Rendo backup remains preserved.
- Production preview passed **9 Playwright tests**: home, catalog-outage and detail-outage states at desktop/mobile widths and light/dark themes; internal mock console 404; login and registration network failures created no local success. Captures were manually inspected in `evidence/screenshots/`. The mobile home and both auth error screens were adjusted after inspection and captured again.
- Supabase Auth at the owner-supplied project URL returned HTTP 200 to a read-only health probe with the publishable key. After the owner's confirmation and authorization, all 20 application migrations and a separate pgTAP extension migration were applied to that isolated project with no seed data. Remote history matched **21/21** versions, and transactional policy tests passed **136/136**. Real-account sessions, hosted API integration and data flows remain unverified.
- Release configuration rejects missing/non-HTTPS origins, demo auth and beta payment/fiscal enables. The web and API no longer invent example listings, favorites, login success, payment success or invoice success on release-mode dependency failure.
- Stale Rendo `quick-preview.mjs` process (~1.6 GB) and isolated Next build output (~585 MB) were removed after tests. No unrelated Docker database was stopped.

## Blocking gates

1. Create/configure the Vercel web and Railway API deployments only after approval, obtain their final HTTPS origins, place the service secret privately on the API host, and run preflight against the actual settings. Set up Supabase Auth site/redirect URLs and email delivery for testers. The current build uses example origins solely to prove compilation.
2. Establish and check the hosted database backup/restore point before tester data is added. Exercise real Buscador, Gestor and delegated `ver`/`gestionar` accounts: signup, confirmation, login, favorites, group/unit creation, invitation, scope revocation, and cross-workspace direct-ID denial. Check storage policies and empty vs published catalog with persisted fictional units.
3. Close Feature 005's historical critical/high delegated findings (`FIND-005-042/043/044`) with fresh real-actor browser/API evidence, including mobile read-only UI. Its task file remains incomplete; code/tests alone are not grounds to mark these verified.
4. Re-run changed operational pages and forms in the hosted environment at desktop and mobile widths and inspect screenshots. Confirm beta payment/fiscal routes have no real side effects. Only then can the owner decide to open a small beta to testers.

## Configuration and rollback

See `handoff.md` for exact variable names, data policy, deployment sequence and rollback. Vercel/Railway accounts are available and the Supabase URL/public key were supplied; host application URLs and API secret placement are still pending. Base Git commit was `05a1f1a` on `main`, but the workspace has extensive uncommitted changes, so **no immutable release revision is pinned yet**. Before deployment, review and pin the exact source state without discarding existing user changes.

This report intentionally does not state a completion percentage or calendar ETA: remaining work depends on hosted configuration and real-role acceptance results, not on a known fixed quantity of code.
