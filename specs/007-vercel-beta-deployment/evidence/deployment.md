# Deployment evidence

**Date**: 2026-09-30  
**Status**: In progress. No URL is tester-ready yet.

- Vercel account: `dutty` (authenticated as `yttud`).
- API project: `rendo-beta-api`, ID `prj_dL8gNB3eb3ePfOI9NBoE1GbRLtVB`.
- Web project: `rendo-beta-web`, ID `prj_ccBNuSoRrobUZtTwY8PpsYr8PlHR`.
- API secret variable `SUPABASE_SERVICE_ROLE_KEY`: present as Vercel Secret in Production only; value not read. Preview remains unset, so use Production only until separately configured.
- Web project root `apps/web`, Next.js, Node 22, monorepo build command; API root `apps/api`, Node 22, shared package install/build command.
- Both projects have Production-only release variables. Exact origins currently target `https://rendo-beta-web.vercel.app` and `https://rendo-beta-api.vercel.app`; these must be checked against actual assigned aliases after first deployment. Beta, payment, fiscal and dev-token switches are configured to fail closed.
- Supabase beta: 21 applied migrations and 136/136 pgTAP assertions from Feature 006 evidence; hosted app behavior not yet verified.
- Git revision, hosted URLs, builds, health, actor tests, visual evidence, rollback target: pending.
