# Closed-beta deployment handoff — 2026-09-30

Status: candidate preparation only. **No public deployment authorized or performed.** Target: a small Rendo-only tester cohort, no real payment or fiscal issuance, no native Android installation yet.

## Owner inputs

1. Vercel (web) and Railway (API) accounts were confirmed by Carlos. Platform-provided HTTPS subdomains are sufficient for this beta; custom domains are optional. The specific app deployments and final origins have not yet been created/approved.
2. The Supabase Project URL and publishable key were supplied; the Auth health endpoint responded HTTP 200. Carlos confirmed the project is new, empty and exclusively for Rendo beta. The 20 application migrations plus one pgTAP extension migration are already applied, with 21/21 history and 136/136 remote pgTAP tests passing. Keep its secret (`service_role`) key in Railway's private environment settings; never post it in chat or commit it.
3. Supply the beta web and API HTTPS origins once hosting creates them. Select a small, named tester cohort: at least one Gestor owner, one invited Delegado with `ver`, one with `gestionar`, and one ordinary Buscador. Use fictional listing and tenant data only.
4. Decide email delivery. `INVITATION_EMAIL_SINK=test` records an outbox but does not deliver invitations. If invite email is part of acceptance, configure a real sender privately and verify delivery. Configure Supabase Auth site URL/allowed redirect URLs and email confirmation for the web origin. Phone OTP is not a release gate without a configured SMS provider.

## Required environment settings

Web host, build and runtime: `NODE_ENV=production`, `RENDO_BETA_MODE=true`, `NEXT_PUBLIC_API_URL=<API HTTPS origin>`, `API_ORIGIN=<same API origin>`, `WEB_PUBLIC_URL=<web HTTPS origin>`, `NEXT_PUBLIC_SUPABASE_URL=<isolated Supabase Project URL>`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>`, `NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS=false`. The `NEXT_PUBLIC_*` values are compiled into browser output; never place the secret key there. Build web from the monorepo with pnpm workspace dependencies available.

API host, private runtime: `NODE_ENV=production`, `RENDO_BETA_MODE=true`, `SUPABASE_URL=<same isolated Project URL>`, `SUPABASE_ANON_KEY=<same publishable/anon key>`, `SUPABASE_SERVICE_ROLE_KEY=<secret/service_role key>`, `WEB_ORIGINS=<exact web HTTPS origin>`, `WEB_PUBLIC_URL=<same web origin>`, `AUTH_ALLOW_DEV_TOKENS=false`, `PAYMENTS_ENABLED=false`, `FISCAL_ENABLED=false`, `PORT=<provider-assigned port>`. Never set `MP_ACCESS_TOKEN` or live fiscal credentials for this beta. Do not commit `.env` files. Run `scripts/closed-beta-preflight.ps1` with these values in a private environment; it prints setting names but not values.

`SUPABASE_JWT_SECRET` is present in the development example but is not consumed by current application code. Do not copy it solely for this beta. Current application variable names say `ANON_KEY` and `SERVICE_ROLE_KEY`; Supabase's publishable and secret key types are candidates for those slots, but confirm them against the real hosted project before opening tester access.

## Deployment sequence once Carlos approves

1. Pin a reviewed source revision and retain the previous deploy artifacts. Verify the isolated beta database backup/restore capability before tester data is added; never use `db reset` against hosted data.
2. Do **not** reapply the schema or import local `seed.sql`: the isolated beta project already has all **21** migrations (20 application + pgTAP-only) and all three transactional policy suites passed remotely. Do not add hard-coded demo users, customer data, payment identifiers or fiscal identifiers.
3. Build the monorepo workspace packages before their consumers: `pnpm --filter @tfi/types build`, then API and web builds, or use the root Turbo build that respects `^build`. The API must use the compiled `@tfi/types/dist` package at runtime; `scripts/tests/api-runtime-smoke.mjs` verifies actual process startup. Build/deploy API and web using the matching origins. Check `GET /health/live` (process) and `GET /health/ready` (Supabase Auth + database) on the API; readiness must return unavailable when dependency is unavailable. Verify CORS only admits the exact web origin.
4. Configure Supabase Auth site URL and redirect URLs, then create confirmed tester identities and a few clearly marked fictional published units using authorized flows. Test Buscador catalog/favorites, Gestor group/unit creation, Delegado scope and owner-only denials on desktop and mobile web separately. Re-run Playwright and inspect screenshots.
5. Confirm beta payment and fiscal actions produce no external transactions or invoices. Give testers a feedback channel and publish the beta links only after the final gate has zero critical/high findings and Carlos's explicit approval.

## Rollback

Stop inviting testers, revert web and API together to the previous pinned artifacts, and recheck `/health/ready`. If a database change itself must be reverted, use the isolated project's verified pre-migration backup or a reviewed forward migration; do not run a destructive reset. Rotate any credential accidentally exposed, and invalidate tester sessions if the identity boundary changed.
