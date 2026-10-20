# Quickstart: Validate Auth Guard Hardening

Run from the repository root. Do not display or copy values from `apps/api/.env`.

## 1. Focused security regression suite

```powershell
pnpm --filter api exec vitest run src/auth/supabase-auth.guard.spec.ts
```

Expected: all guard cases pass with zero skipped tests. The suite includes every row in
`contracts/auth-behavior.md`, including provider failures and production demo denial.

## 2. Full API regression suite

```powershell
pnpm --filter api test
```

Expected: all existing and new API tests pass; any pre-existing failure is reported separately and
cannot be relabeled as success.

## 3. Production build

```powershell
pnpm --filter api build
```

Expected: exit code 0 with no TypeScript or Nest module-resolution error.

## 4. Prohibited-pattern review

```powershell
rg -n "jwtService\.decode|token\.length|token\.includes|user_metadata.*rol|email.*includes" apps/api/src/auth
```

Expected: no authentication/authorization fallback matching these patterns. Test descriptions may
name bypass cases but production guard code may not use them to grant access.

```powershell
rg -n "JwtModule|JwtService|SUPABASE_JWT_SECRET" apps/api/src/auth
```

Expected: no remaining guard/module dependency when no other API source consumer exists.

## 5. Evidence review

Confirm these retained artifacts exist and agree:

- `evidence/runs/targeted-tests.md`
- `evidence/runs/full-api-tests.md`
- `evidence/runs/api-build.md`
- `evidence/reports/security-review.md`
- `evidence/reports/cleanup.md`
- `evidence/delivery.json`

No Playwright capture is required because no rendered or interaction surface is modified.
