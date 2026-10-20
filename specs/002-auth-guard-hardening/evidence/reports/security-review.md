# Security Review: Auth Guard Hardening

## 1. Audited Bypass Baseline (Pre-Remediation State)

The baseline implementation of `SupabaseAuthGuard` in `apps/api/src/auth/supabase-auth.guard.ts` contained multiple severe authentication vulnerabilities (classified as P0):

1. **Arbitrary Token Length Fallback**: Any bearer token string longer than 10 characters (`token.length > 10`) was accepted and granted a full default Gestor identity (`11111111-1111-1111-1111-111111111111`, `gestor@renda.com.ar`).
2. **Substring Role Matching**: Tokens containing substrings like `'gestor'`, `'delegado'`, `'buscador'`, or `'workspace-b'` automatically created operational identities regardless of signature, provider validity, or environment.
3. **Decode-Only Unverified Claims**: When Supabase was offline or returned an error, the guard caught the exception and executed unverified decode via `JwtService.decode()`, assigning identity and workspace from unverified claims.
4. **Email & Caller-Controlled Role Inference**: Roles were inferred from caller-controlled email text (e.g. `userEmail.includes('delegado')`) and `user_metadata.role`/`user_metadata.rol`.
5. **No Fail-Closed on Provider Errors/Timeouts**: When authoritative validation failed or timed out, the guard fell through to synthetic or decode-based identities instead of rejecting the request.
6. **Information Disclosure in Logs**: The guard caught errors and executed `console.error('JWT Verification Error:', e.message)`, potentially exposing sensitive token or provider internals.

## 2. Protected-Controller Consumer Inventory

An inspection of `apps/api/src` identified exactly 12 protected controller surfaces relying on `SupabaseAuthGuard`:

1. `apps/api/src/app.controller.ts` (`@UseGuards(SupabaseAuthGuard)`)
2. `apps/api/src/alquileres/alquileres.controller.ts`
3. `apps/api/src/afip/afip.controller.ts`
4. `apps/api/src/delegados/delegados.controller.ts`
5. `apps/api/src/grupos/grupos.controller.ts`
6. `apps/api/src/inquilinos/inquilinos.controller.ts`
7. `apps/api/src/favoritos/favoritos.controller.ts`
8. `apps/api/src/metricas/metricas.controller.ts`
9. `apps/api/src/pagos/pagos.controller.ts`
10. `apps/api/src/cupo/cupo.controller.ts`
11. `apps/api/src/unidades/unidades.controller.ts`
12. `apps/api/src/reportes/reportes.controller.ts`

Existing unit test suites for controllers mock or override `SupabaseAuthGuard`. Deployed and integration execution rely directly on the guard.

## 3. JwtModule / JwtService Dependency Analysis

- `apps/api/src/auth/auth.module.ts` imported `JwtModule.registerAsync` and re-exported `JwtModule`.
- `apps/api/src/auth/supabase-auth.guard.ts` injected `JwtService` solely to call `jwtService.decode(token)`.
- A repository-wide search in `apps/api/src` for `JwtModule` and `JwtService` confirmed that **zero** other modules, controllers, or services depend on or consume `JwtModule` or `JwtService`.
- Conclusion: `JwtModule` has been completely removed from `AuthModule` and `SupabaseAuthGuard`, replaced with explicit `SupabaseModule` and `SupabaseService`.

## 4. Hardening Architecture & Invariants (Incorporating Codex Review 01)

Under the hardened and corrected design:
- **Fail-Closed Authenticator**: Deployed credentials require authoritative validation via `supabase.auth.getUser(token)` from `SupabaseService.getClient(token)`. Any error, timeout, non-UUID account ID, or missing account immediately throws HTTP 401 Unauthorized.
- **Canonical Profile Authority**: Role and workspace are sourced exclusively from an active `public.users` database record (`rol`, `workspace_id`, `deleted_at IS NULL`). Metadata and email naming have zero authority.
- **Strict Role & Workspace Semantics**:
  - `gestor`: workspace must be null or equal to own account ID; workspace resolves to account ID. Cross-workspace links are rejected.
  - `delegado`: must have an active, distinct owning Gestor workspace ID. Self-workspace or missing workspace is rejected.
  - Other roles (including `buscador`) in `public.users` are rejected for operational access.
- **Doubly Gated Local Demo Tokens**:
  - Gated by `AUTH_ALLOW_DEV_TOKENS === 'true'` AND (`NODE_ENV === 'development'` OR `NODE_ENV === 'test'`).
  - Production or any other environment rejects all demo credentials.
  - Compatibility tokens (`dev-access-token*`) require exact match.
  - Generated demo tokens require exact lowercase prefix `dev-token-` and role `(gestor|delegado|buscador)`. Regex: `/^dev-token-(gestor|delegado|buscador)-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/`. Uppercase or mixed-case prefixes and roles are rejected. UUID hex digits remain case-insensitive and are normalized to canonical lowercase.
  - No provider calls are made for valid demo tokens or local-space rejected tokens.
- **Uniform Authentication Denial (CR-001 Correction)**:
  - In initial delivery, header parsing errors returned distinct messages (`Token no proporcionado`, `Formato de token inválido`), violating the uniform-denial requirement.
  - Correction: `AUTH_UNAUTHORIZED_MESSAGE = 'Token inválido o no autorizado'` is now the single constant message used for every denial (missing header, malformed header, provider failure, profile failure, demo token error).
  - Automated tests assert exact equality against `AUTH_UNAUTHORIZED_MESSAGE` across all rejection classes.
- **Information Protection**: No token values, payloads, internal error strings, or secrets are logged.
- **Strict Typing in Tests (CR-003 Correction)**: All explicit `any` usage in `supabase-auth.guard.spec.ts` was eliminated (0 occurrences).

## 5. Requirement Mapping (FR-001 through FR-013)

| Requirement | Implementation Seam | Test Coverage | Result |
|---|---|---|---|
| **FR-001** | `SupabaseAuthGuard.extractTokenFromHeader` | Tests 1–4 (uniform 401 message) | PASS |
| **FR-002** | `SupabaseAuthGuard.canActivate` (`getUser`) | Tests 9–12 | PASS |
| **FR-003** | `SupabaseAuthGuard.canActivate` (no fallback) | Tests 5–8 | PASS |
| **FR-004** | `SupabaseAuthGuard.canActivate` (`try/catch`) | Tests 9–11 | PASS |
| **FR-005** | `SupabaseAuthGuard.canActivate` (`users` query) | Tests 14, 15, 17, 21–23 | PASS |
| **FR-006** | `SupabaseAuthGuard.canActivate` (role validation) | Tests 21–23 | PASS |
| **FR-007** | `SupabaseAuthGuard.canActivate` (workspace rules) | Tests 14–20 | PASS |
| **FR-008** | `SupabaseAuthGuard.isDemoAuthAllowed` | Tests 25–30 | PASS |
| **FR-009** | `SupabaseAuthGuard.parseLocalDemoToken` | Tests 31–49 (exact grammar) | PASS |
| **FR-010** | `SupabaseAuthGuard.canActivate` (generic 401) | Tests 1–13, 16, 18–23, 25–30, 39–49 | PASS |
| **FR-011** | `supabase-auth.guard.spec.ts` (49 tests) | All 49 tests (0 any) | PASS |
| **FR-012** | `app.module.ts`, all controllers unchanged | Full 88 API tests | PASS |
| **FR-013** | `apps/api/README.md` documentation | Source inspection (lowercase role) | PASS |

## 6. Mandatory Regression Matrix Verification

| Case | Expected | Actual | Evidence |
|---|---|---|---|
| No header / wrong scheme / malformed header | 401 (`AUTH_UNAUTHORIZED_MESSAGE`) | 401 (`Token inválido o no autorizado`) | Tests 1–4 |
| Arbitrary value longer than ten characters | 401 | 401 | Test 5 |
| Arbitrary value containing `gestor`, `delegado`, `buscador` | 401 | 401 | Tests 6, 7 |
| Decodable but unverified JWT-shaped value | 401 | 401 | Test 8 |
| Supabase error, no user, throw, or timeout | 401 | 401 | Tests 9–11 |
| Valid account, missing/deleted/invalid profile | 401 | 401 | Tests 21–23 |
| Valid active Gestor profile | accepted | accepted | Tests 14, 15 |
| Valid active Delegado profile | accepted | accepted | Test 17 |
| Exact demo credential, flag absent/false | 401 | 401 | Tests 25–27 |
| Exact demo credential, flag true, prod/other env | 401 | 401 | Tests 28–30 |
| Exact demo credential, flag true, dev/test | accepted | accepted | Tests 31–38 |
| Demo-like but non-exact value | 401 | 401 | Tests 39–43 |
| Uppercase/mixed-case demo role or prefix (CR-002) | 401 | 401 | Tests 44–49 |

## 7. Residual Risks & Out-of-Scope Items

1. **Granular Delegado Permissions**: This feature hardens identity establishment (`request.user`), establishing canonical role and workspace. Downstream granular permission gating (per-controller / per-endpoint action rules for delegados) is governed by separate Spec Kit remediation features.
2. **Dedicated Dev/Admin Console Authorization**: dev/admin authorization requires an explicit privileged role beyond Gestor/Delegado, which will be implemented in its designated feature.
3. **Environment Hygiene**: Local demo tokens must strictly remain disabled (`AUTH_ALLOW_DEV_TOKENS=false` or absent) in all deployed environments. The double-gate ensures that even if accidentally set to `true`, a production `NODE_ENV` will reject them.
