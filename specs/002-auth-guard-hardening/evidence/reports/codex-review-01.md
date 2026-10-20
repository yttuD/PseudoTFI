# Codex Review 01: Rejected Pending Corrections

**Date**: 2026-09-25
**Reviewed delivery**: Antigravity PASS at 2026-09-25T17:55:00-03:00
**Disposition**: REJECTED pending T016-T019

The code-review skill could not use a clean Git fixed point because this repository began with a
dirty working tree and the target guard was already modified before this batch. Review therefore
used the captured pre-dispatch source snapshot, current allowed-file diff, governing feature
artifacts, source inspection, and retained executable evidence.

## Findings

### CR-001 — Authentication denial is not uniform

**Severity**: HIGH  
**Locations**: `apps/api/src/auth/supabase-auth.guard.ts:133`,
`apps/api/src/auth/supabase-auth.guard.ts:138`, `spec.md` FR-010,
`contracts/auth-behavior.md` Protected request header

Missing authorization returns `Token no proporcionado`, malformed authorization returns
`Formato de token inválido`, and other failures return `Token inválido o no autorizado`. This
contradicts the requirement for one generic authentication denial and makes the security report's
"uniform generic 401" claim inaccurate.

**Required correction**: Use one constant generic 401 message for every guard rejection, including
header parsing, provider/profile failure, and demo-token failure. Assert exact message equality for
all representative rejection classes.

### CR-002 — Generated demo role grammar is not exact

**Severity**: MEDIUM  
**Locations**: `apps/api/src/auth/supabase-auth.guard.ts:26-27`,
`apps/api/src/auth/supabase-auth.guard.ts:190`, `apps/api/README.md:147`,
`contracts/auth-behavior.md` Exact generated format

The generated-token regular expression uses the case-insensitive flag and lowercases the captured
role. Values such as `dev-token-GESTOR-<uuid>` are therefore accepted even though the contract
defines exact lowercase actor names. The README explicitly documents this unapproved expansion as
case-insensitive.

**Required correction**: Require exact lowercase prefix and role names. UUID hexadecimal digits may
remain case-insensitive without making the role grammar case-insensitive. Add negative mixed/upper
case tests and align README wording.

### CR-003 — Avoidable `any` weakens the security regression suite

**Severity**: LOW  
**Location**: `apps/api/src/auth/supabase-auth.guard.spec.ts`

The suite uses `any` for request state, all mocks, context methods, constructor invocation, thrown
errors, and request assertions. Most are avoidable with small test-only interfaces, `unknown`
narrowing, and a minimal execution-context cast.

**Required correction**: Remove avoidable explicit `any` from the new test file without weakening
coverage or adding dependencies. Any unavoidable framework generic must be narrowly justified.

## Evidence corrections

The current security review and delivery claim FR-010 PASS and uniform denial despite CR-001. After
code/test correction, rerun all required commands and regenerate counts, security review,
cleanup report, and delivery JSON from actual output. Do not edit historical timestamps/counts to
simulate a run.
