# Implementation Plan: Closed Beta Deployment Readiness

**Branch**: `main` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

## Summary

Prepare, but do not publish, a provider-neutral Rendo release candidate for a small closed beta. Fail closed when required configuration or Supabase is unavailable; remove synthetic success paths from release builds; block real financial/fiscal operations; verify audience isolation and produce a deploy/rollback handoff. Feature 005's unfinished product-quality gates remain dependencies rather than being silently marked complete.

## Technical Context

**Language/Version**: TypeScript 5/6, PostgreSQL 17, PowerShell

**Primary Dependencies**: Next.js 14, NestJS 12, Supabase Auth/Postgres/Storage, Playwright, Vitest

**Storage**: An isolated beta Supabase project with its own Auth, database and storage; no production customer data

**Testing**: Configuration unit checks, API authorization/security tests, production builds, migration/pgTAP checks, Playwright functional/visual cases

**Target Platform**: Hosted web/API plus hosted Supabase; browser desktop and responsive web only

**Project Type**: Existing monorepo web application and API

**Performance Goals**: Actionable failure response within normal request timeout; no indefinite loading during dependency outage

**Constraints**: No actual deployment, payment, fiscal issuance or native Android work; no demo tokens in beta; preserve dirty workspace and existing Feature 005 evidence

**Scale/Scope**: Small invited tester cohort; all three trust surfaces and their release-critical integrations

## Constitution Check

- Evidence Before Claims: PASS as a design constraint; implementation must still prove every gate.
- Canonical Domain and Architecture: PASS; no ADR or stack change. Existing RLS/soft deletion remain mandatory.
- Bounded Spec-Driven Work: PASS; this feature owns beta-specific hardening, while Feature 005 owns unfinished UI coverage.
- Supervised Delegation: Carlos authorized Codex to implement alone while Antigravity has no quota; exception applies to delegation only, not verification quality.
- Verification and Visual Proof: PASS as a planned gate; changed UI must receive Playwright screenshots and Codex review.
- Audience and Platform Separation: PASS as a planned gate; beta is web-only and native Android remains later.
- Safe Workspace Stewardship: PASS; preserve other services, user changes and evidence.

Post-design check: no constitution exception or closed ADR change is required.

## Project Structure

```text
apps/api/src/main.ts                         # CORS and bootstrap checks
apps/api/src/supabase/supabase.service.ts    # dependency behavior
apps/api/src/marketplace/                  # release data fallback
apps/api/src/favoritos/                    # release data fallback
apps/api/src/pagos/                        # non-commercial gate
apps/web/next.config.mjs                   # API routing
apps/web/src/app/[locale]/                 # public, operational and internal states
apps/web/e2e/                              # browser acceptance
supabase/migrations/ and supabase/tests/   # data readiness
specs/006-closed-beta-readiness/           # spec, plan, tasks, evidence and handoff
```

**Structure Decision**: Keep the current monorepo. Do not add a new hosting platform, database abstraction or parallel application before the provider is chosen.

## Risk and Rollout

1. Audit and test current fallback/config behavior before changing it.
2. Add fail-closed release configuration and non-commercial controls with focused regression tests.
3. Validate authorization and browser states separately for public, Gestor, Delegado and internal actors.
4. Run production build and database migration checks against isolated Rendo resources; never reset an existing non-Rendo database.
5. Produce a release-candidate verdict, exact required settings, tester-account policy and rollback steps. Carlos chooses the provider and approves actual deployment later.
