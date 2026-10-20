# Targeted Test Run: SupabaseAuthGuard Regression Suite

## Execution Details

- **Command**: `pnpm --filter api exec vitest run src/auth/supabase-auth.guard.spec.ts`
- **Working Directory**: `D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI`
- **Start Time**: 2026-09-25T18:00:42.3219293-03:00
- **End Time**: 2026-09-25T18:00:46.2291757-03:00
- **Exit Code**: 0
- **Test Files**: 1 passed (1)
- **Tests**: 49 passed | 0 failed | 0 skipped (Total: 49)
- **Duration**: 1.82s (runner elapsed)

## Red Phase Evidence (Historical)

Before the implementation of T004, T007, T009, T016, and T017, the test suite demonstrated genuine red-phase failures against the old guard implementation:
- **US1 Red Phase**: 10 tests failed out of 13. The baseline guard allowed arbitrary tokens longer than 10 characters, substring matching on `gestor`/`delegado`, decodable unverified JWTs, and provider errors/timeouts to succeed and grant full Gestor identity.
- **US2 Red Phase**: 11 tests failed out of 24. The baseline guard failed to resolve canonical database profiles, did not enforce workspace ownership rules, and inferred roles from caller-controlled email text.
- **US3 Red Phase**: 17 tests failed out of 42. Local demo tokens were not gated by `AUTH_ALLOW_DEV_TOKENS=true` AND `NODE_ENV in (development, test)`.
- **Codex Review 01 Corrections (T016, T017)**:
  - Header parsing previously returned non-uniform denial messages (`Token no proporcionado`, `Formato de token inválido`).
  - Generated demo tokens previously accepted uppercase/mixed-case role names via case-insensitive regex (`dev-token-GESTOR-...`).

## Green Phase Test Inventory (49 Cases)

### User Story 1: Reject Untrusted Credentials (13 Cases)
1. `FR-001: denies access with uniform message when Authorization header is missing` - PASS
2. `FR-001: denies access with uniform message when scheme is not Bearer (e.g. Basic)` - PASS
3. `FR-001: denies access with uniform message when Bearer token is empty` - PASS
4. `FR-001: denies access with uniform message when header contains extra space-delimited segments` - PASS
5. `FR-003: denies arbitrary token longer than 10 characters without fallback identity` - PASS
6. `FR-003: denies token containing "gestor" substring without fallback identity` - PASS
7. `FR-003: denies token containing "delegado" substring without fallback identity` - PASS
8. `FR-003: denies decodable JWT-shaped token without authoritative validation` - PASS
9. `FR-002, FR-004: denies access when Supabase returns an explicit error` - PASS
10. `FR-002, FR-004: denies access when Supabase returns no user and no explicit error` - PASS
11. `FR-002, FR-004: denies access when Supabase auth.getUser throws an exception or network timeout` - PASS
12. `FR-002, FR-004: denies access when authenticated user ID is not a valid UUID` - PASS
13. `FR-010: returns generic denial message without exposing internal provider error message or token` - PASS

### User Story 2: Resolve Canonical Operational Identity (11 Cases)
14. `accepts valid Gestor with null workspace_id and resolves workspace_id to own id` - PASS
15. `accepts valid Gestor with workspace_id explicitly matching own id` - PASS
16. `denies Gestor whose profile points to a different workspace_id (cross-workspace link)` - PASS
17. `accepts valid Delegado with distinct owning Gestor workspace_id` - PASS
18. `denies Delegado with missing/null workspace_id` - PASS
19. `denies Delegado whose workspace_id equals own id (self-workspace)` - PASS
20. `denies Delegado whose workspace_id is not a valid UUID` - PASS
21. `denies access when canonical profile does not exist or query fails` - PASS
22. `denies access when canonical profile is soft-deleted (deleted_at is set)` - PASS
23. `denies access when canonical profile has unsupported role (e.g. buscador or admin in public.users)` - PASS
24. `never uses caller-controlled metadata or email to infer role or attach extra properties` - PASS

### User Story 3: Explicit Local Demo Authentication (25 Cases)
25. `FR-008: denies exact demo token with uniform message when AUTH_ALLOW_DEV_TOKENS is not set` - PASS
26. `FR-008: denies exact demo token with uniform message when AUTH_ALLOW_DEV_TOKENS is "false"` - PASS
27. `FR-008: denies exact demo token when AUTH_ALLOW_DEV_TOKENS is not exact lowercase "true" (e.g. "True", "1")` - PASS
28. `FR-008: denies exact demo token in production with uniform message even if AUTH_ALLOW_DEV_TOKENS is "true"` - PASS
29. `FR-008: denies exact demo token in other/staging environments even if AUTH_ALLOW_DEV_TOKENS is "true"` - PASS
30. `FR-008: denies exact demo token when NODE_ENV is undefined even if AUTH_ALLOW_DEV_TOKENS is "true"` - PASS
31. `FR-009: accepts exact "dev-access-token" as gestor with fixed id/workspace and no provider call` - PASS
32. `FR-009: accepts exact "dev-access-token-gestor" as gestor with fixed id/workspace` - PASS
33. `FR-009: accepts exact "dev-access-token-delegado" as delegado linked to fixed Gestor workspace` - PASS
34. `FR-009: accepts exact "dev-access-token-buscador" as buscador with fixed id/workspace` - PASS
35. `FR-009: accepts generated "dev-token-gestor-<uuid>" format` - PASS
36. `FR-009: accepts generated "dev-token-gestor-<uuid>" format with uppercase UUID hex digits and normalizes id to lowercase` - PASS
37. `FR-009: accepts generated "dev-token-delegado-<uuid>" format linked to fixed gestor workspace` - PASS
38. `FR-009: accepts generated "dev-token-buscador-<uuid>" format` - PASS
39. `FR-009: denies generated token with unsupported role (e.g. dev-token-admin-<uuid>) with uniform message` - PASS
40. `FR-009: denies generated token with invalid non-UUID identifier with uniform message` - PASS
41. `FR-009: denies demo-like token with prefix (e.g. prefix-dev-access-token) with uniform message` - PASS
42. `FR-009: denies demo-like token with suffix (e.g. dev-access-token-extra) with uniform message` - PASS
43. `FR-009: denies generated token with extra trailing segment with uniform message` - PASS
44. `CR-002: denies uppercase role in generated token (e.g. dev-token-GESTOR-<uuid>)` - PASS
45. `CR-002: denies mixed-case role in generated token (e.g. dev-token-Gestor-<uuid>)` - PASS
46. `CR-002: denies uppercase role in delegado token (e.g. dev-token-DELEGADO-<uuid>)` - PASS
47. `CR-002: denies mixed-case role in delegado token (e.g. dev-token-Delegado-<uuid>)` - PASS
48. `CR-002: denies uppercase role in buscador token (e.g. dev-token-BUSCADOR-<uuid>)` - PASS
49. `CR-002: denies uppercase prefix in generated token (e.g. DEV-TOKEN-gestor-<uuid>)` - PASS

## Result Summary

All 49 tests passed cleanly with 0 failures, 0 errors, and 0 skipped tests. The mandatory regression matrix is 100% satisfied. All rejection classes assert exact message equality against `AUTH_UNAUTHORIZED_MESSAGE` (`Token inválido o no autorizado`).
