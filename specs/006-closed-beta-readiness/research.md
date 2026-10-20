# Research: Closed Beta Deployment Readiness

## Decision 1 — Hosted data must be authoritative

**Decision**: Release builds fail visibly when hosted Supabase cannot be reached; in-memory stores and example listings are development/test-only.

**Rationale**: Testers cannot report reliable defects if outages look like saved data or published inventory.

**Alternatives considered**: Keep resilient fallback in beta (rejected because it masks outages and loses data).

## Decision 2 — Separate environments without provider lock-in

**Decision**: Web, API and data endpoints are explicit release settings; provider-specific domains and credentials are deployment inputs.

**Rationale**: Hosting has not been selected and the existing stack supports separate managed hosts.

**Alternatives considered**: Hard-code one provider or a loopback rewrite (rejected because the target is not approved and loopback is host-local).

## Decision 3 — Financial and fiscal actions stay off

**Decision**: Beta defaults to no real payment preference, webhook side effect or fiscal issuance. A later explicit authorization is required to enable them.

**Rationale**: Carlos asked for defect discovery, not commercialization.

**Alternatives considered**: Rely on dummy payment tokens (rejected because they can produce misleading successes or break unexpectedly).

## Decision 4 — Keep Feature 005 gate visible

**Decision**: This release feature cannot declare PASS while Feature 005 has open critical/high authorization or visual findings.

**Rationale**: A deployable configuration is not equivalent to an accepted product.

**Alternatives considered**: Label incomplete UI as ready because testers will find bugs (rejected for security/accessibility gates).
