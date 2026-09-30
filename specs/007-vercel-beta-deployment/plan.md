# Implementation Plan: Vercel Closed Beta Deployment

**Branch**: `codex/rendo-beta-deploy` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

## Summary

Publish the already reviewed beta candidate from the existing Git repository to two isolated Vercel projects, reusing the dedicated migrated Supabase beta database. Treat the first deployment as restricted until hosted security and role checks pass. Do not commercialize or enable payments, fiscal issuance, or native Android.

## Technical Context

**Language/Version**: TypeScript 5/6, Node.js 22 or 24  
**Primary Dependencies**: Next.js 14, NestJS 12, pnpm 9, Turbo, Vercel, Supabase  
**Storage**: Existing dedicated Supabase beta project; 21 applied migrations; no seed  
**Testing**: API Vitest, production builds, Supabase pgTAP, hosted HTTP smoke, Playwright for public and role-specific web views  
**Target Platform**: Vercel Functions and Next.js hosting; desktop and responsive browser only  
**Project Type**: Existing pnpm monorepo, two hosted projects  
**Performance Goals**: Health and public page respond within a bounded browser timeout  
**Constraints**: No real charges/fiscal issuance, no dev tokens, no private keys in Git or client code, no unrelated Vercel projects  
**Scale/Scope**: Invited small tester cohort; restricted release pending hosted actor evidence

## Constitution Check

- Evidence Before Claims: hosted readiness and actor tests must precede tester-ready verdict; an empty database is not a passing functional journey.
- Canonical Domain and Architecture: no domain change; RLS, actor scope and soft deletion remain release gates.
- Bounded Spec-Driven Work: this Feature 007 owns the deployment only; Feature 006 remains an honest pre-deployment readiness record and Feature 005 retains open visual findings.
- Supervised Delegation: Carlos authorized Codex to continue alone while Antigravity has no quota; verification quality is unchanged.
- Verification and Visual Proof: hosted Playwright screenshots and separate desktop/responsive results are required for changed presentation or tester acceptance.
- Audience and Platform Separation: public, Gestor, Delegado and internal access must be distinguished; native Android is out of scope.
- Safe Workspace Stewardship: review staged diff and secrets; keep user work and unrelated services intact; remove only task-owned temporary files.

Post-design check: no constitution amendment or closed ADR change required. Carlos explicitly approved Git publication and Vercel deployment; credentials remain privately entered by him.

## Project Structure and Interfaces

```text
apps/api/src/main.ts                     # API entry, exact-origin CORS, release guard
apps/api/src/config/release-readiness.ts # required settings
apps/web/next.config.mjs                 # API proxy/rewrite
apps/web/release-config.mjs              # web release guard
apps/web/e2e/                            # browser acceptance
packages/types/                          # shared build dependency
supabase/migrations/ and tests/          # already applied beta schema and verification
specs/007-vercel-beta-deployment/         # deployment evidence and rollback
```

Vercel project `rendo-beta-api`: root `apps/api`, NestJS Function, exact `WEB_ORIGINS`, private `SUPABASE_SERVICE_ROLE_KEY`; `PAYMENTS_ENABLED=false`, `FISCAL_ENABLED=false`, `AUTH_ALLOW_DEV_TOKENS=false`. Vercel project `rendo-beta-web`: root `apps/web`, Next.js, public Supabase key only, exact API and web origins. Both use `RENDO_BETA_MODE=true`. Neither service may access another Supabase project. Deployment can be direct from reviewed local Git revision before optional Git auto-deploy is enabled; do not connect an old `main` release accidentally.

## Risk and Rollout

1. Verify project identity, URL, environment scopes and private key presence without reading the key.
2. Review and commit only intended source/evidence on the beta branch; scan staged content for secrets; push the reviewed revision.
3. Deploy API and web, inspect build output, health, CORS and public fail-state.
4. Configure Supabase Auth redirect/site URLs for the actual web origin, then run real-role hosted checks and Playwright screenshots.
5. Mark release tester-ready only if all gates pass; otherwise keep restricted, record blockers and request exact missing input.
6. Roll back application versions through Vercel deployment history; never roll back by deleting beta data.
