# Research: Auth Guard Hardening

## Decision 1: Validate remotely and fail closed

**Decision**: A deployed credential is accepted only when Supabase `auth.getUser` validates that
exact value. Provider error, timeout, absence, or exception results in unauthorized access.

**Rationale**: The audited vulnerability exists because provider failure currently falls through
to decode-only and heuristic identities. Treating availability failure as authentication failure
removes that privilege-escalation path.

**Alternatives considered**:

- Decode the JWT locally without signature verification: rejected because decoded claims are not
  proof of authenticity.
- Verify locally with a shared JWT secret: not selected for this bounded fix because provider
  validation is already the project's active authority and key rotation/issuer validation would
  add a second authentication policy.
- Keep the heuristic fallback only on provider outage: rejected because outage is precisely when
  the current bypass activates.

## Decision 2: Use the canonical profile for authorization context

**Decision**: After account validation, read the matching active `public.users` profile through the
user-authenticated client. Accept only `gestor` and `delegado`; validate workspace relationships.

**Rationale**: Email and `user_metadata` are not the canonical authorization store. The database
profile and existing RLS function already define operational role/workspace membership.

**Alternatives considered**:

- Trust `user_metadata.role`: rejected because it is not the server-controlled canonical record.
- Infer role from email or account ID: rejected because names are not authorization evidence.
- Default an unknown profile to Gestor: rejected because it converts missing data into privilege.

## Decision 3: Preserve demo flows behind two independent gates

**Decision**: Accept exact demo formats only when `AUTH_ALLOW_DEV_TOKENS=true` and `NODE_ENV` is
`development` or `test`. Production always refuses this path.

**Rationale**: The current UI and verification scripts use local identities when Supabase is
offline. Explicit opt-in preserves that workflow while default-deny plus a production environment
gate prevents accidental deployment exposure.

**Alternatives considered**:

- Remove demo authentication immediately: secure but would unnecessarily block current offline
  development and later Playwright UI remediation.
- Gate only on credential prefix: rejected because a caller controls the credential.
- Gate only on one environment variable: rejected because a production misconfiguration could
  re-enable the bypass.

## Decision 4: Keep parsing inside the existing guard

**Decision**: Implement small private parsing/validation helpers in `SupabaseAuthGuard` and consume
the existing `SupabaseService`; do not add a new authentication abstraction.

**Rationale**: There is one active provider and one bounded local compatibility path. A new
pass-through provider interface would add a seam without two real adapters or a near-term need.

**Alternatives considered**:

- Introduce provider strategy classes: rejected as unnecessary abstraction for this feature.
- Dynamically create a Supabase client in the guard: rejected because it duplicates configured
  client construction and makes deterministic testing harder.

## Decision 5: Prove security with negative-first tests

**Decision**: Write focused guard tests before implementation, covering header parsing, audited
bypass variants, provider failures, canonical roles/workspaces, exact demo formats, runtime gates,
and sensitive-error handling. Then run the full API suite and production build.

**Rationale**: Positive authentication alone cannot prove the vulnerability is closed. The failure
matrix is the security contract and prevents recurrence.

**Alternatives considered**:

- Rely only on existing controller tests: rejected because they override the guard.
- Use Playwright screenshots: rejected because this change has no rendered or interaction delta.
