# Implementation Plan: Auth Guard Hardening

**Branch**: main | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-auth-guard-hardening/spec.md`

## Summary

Replace the shared API guard's decode-and-heuristic fallback with a fail-closed authentication
flow. Deployed credentials are validated by Supabase and then enriched only from the active
canonical `users` profile. Existing local demo credentials remain available solely through an
explicit `AUTH_ALLOW_DEV_TOKENS=true` switch in `development` or `test`, using an anchored parser
and deterministic actor/workspace mappings. Regression tests are written before implementation
and must prove the audited bypass cannot return.

Antigravity performs the implementation and all test/build execution as one bounded batch using
`gemini-3.8-flash-medium` at medium effort. Codex reviews the final diff, evidence, and security
matrix rather than monitoring intermediate work.

## Technical Context

**Language/Version**: TypeScript 6 on Node.js, ECMAScript modules

**Primary Dependencies**: NestJS 12, `@nestjs/config`, Supabase JavaScript client 2.115 through the
existing `SupabaseService`; remove this guard's dependency on `@nestjs/jwt`

**Storage**: Existing Supabase Auth plus PostgreSQL `public.users`; no migration

**Testing**: Vitest 4 unit tests with mocked `ConfigService`, `SupabaseService`, execution context,
and Supabase query chain; existing API suite and Nest production build

**Target Platform**: NestJS API service in development, test, and production runtimes

**Project Type**: pnpm/Turborepo web application with a shared NestJS API

**Performance Goals**: One authoritative `auth.getUser` call and one canonical profile lookup per
accepted deployed request; rejected local-format credentials require no network call when the demo
path is disabled

**Constraints**: Fail closed on every provider/profile error; no token or provider-payload logging;
no role inference from email or user metadata; no endpoint, UI, schema, RLS, or mobile changes;
preserve unrelated dirty-tree changes

**Scale/Scope**: One shared guard used by 12 protected controller surfaces, its module wiring,
focused regression tests, API documentation, and feature-scoped evidence

## Constitution Check

*GATE: Passed before research and passed again after design.*

- **Evidence before claims**: PASS. Acceptance requires fresh targeted tests, full API tests, a
  production build, source-pattern checks, and retained run summaries.
- **Canonical domain and architecture**: PASS. Gestor/Delegado role and workspace come from the
  canonical profile and remain aligned with `get_workspace_id()` semantics and RLS.
- **Bounded Spec-Driven Work**: PASS. Only REMED-001/P0 identity establishment is changed; granular
  authorization and UI work remain separate features.
- **Supervised delegation**: PASS. The implementation brief pins model, effort, files, commands,
  invariants, evidence, and structured delivery; Codex reviews only the terminal delivery.
- **Verification and visual proof**: PASS. This server-only behavior has no visual or interaction
  delta, so Playwright screenshots are non-applicable; unit, regression, full-suite, build, and
  source evidence are mandatory.
- **Audience and platform separation**: PASS. The public/operational boundary is strengthened;
  local Buscador compatibility is not promoted into a canonical operational role; no responsive,
  Capacitor, or native-mobile claim is made.
- **Safe workspace stewardship**: PASS. Only exact feature-owned evidence and listed source files
  may change; cleanup is limited to task-owned temporary artifacts.

Post-design re-check: the auth behavior contract, request-context model, quickstart, and tasks
preserve all gates. No constitutional exception is required.

## Project Structure

### Documentation and Evidence

```text
specs/002-auth-guard-hardening/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-behavior.md
│   └── antigravity-delivery.md
├── checklists/
│   └── requirements.md
├── evidence/
│   ├── runs/
│   └── reports/
└── tasks.md
```

### Source Code

```text
apps/api/
├── src/auth/
│   ├── auth.module.ts
│   ├── supabase-auth.guard.ts
│   └── supabase-auth.guard.spec.ts
├── src/supabase/
│   ├── supabase.module.ts
│   └── supabase.service.ts
└── README.md
```

**Structure Decision**: Keep the change inside the existing API auth seam. The guard consumes the
already shared `SupabaseService` so production code and tests exercise the same interface. No new
adapter, package, database object, or frontend seam is introduced.

## Implementation Design

1. Parse exactly one `Bearer <credential>` header and reject all other shapes.
2. Before any provider call, allow the local demo parser only when both conditions are true:
   `AUTH_ALLOW_DEV_TOKENS` is exactly `true`, and `NODE_ENV` is `development` or `test`.
3. Parse only the anchored formats in `contracts/auth-behavior.md`; reject partial/substr matches.
4. For every other credential, use `SupabaseService.getClient(credential).auth.getUser(credential)`.
5. Reject provider errors, missing accounts, and malformed account identifiers.
6. Query that same authenticated client for `rol`, `workspace_id`, and `deleted_at` on the exact
   account identifier; reject query errors, absent/deleted profiles, unsupported roles, or invalid
   workspace relationships.
7. Attach a minimal request context (`id`, optional `email`, canonical `rol`, `workspace_id`) and do
   not spread provider metadata into authorization context.
8. Catch unexpected errors at the guard boundary and return one generic unauthorized response
   without logging credential values or internal provider details.

## Regression Surface

- All controllers guarded by `SupabaseAuthGuard`, especially operational data, payments, metrics,
  AFIP, reports, and Delegado management.
- Favoritos currently uses an authenticated Buscador-like local flow; production public-user
  account modeling remains outside this feature and must not be silently inferred.
- Existing controller unit tests override the guard and must remain green.
- API module construction must continue without `JwtModule` exported by `AuthModule`; repository
  search confirms no other source imports that export.
- Local scripts using documented demo tokens require explicit opt-in after this change.

## Complexity Tracking

No constitution violations or additional architectural abstractions are required.
