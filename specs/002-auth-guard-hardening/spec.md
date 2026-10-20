# Feature Specification: Auth Guard Hardening

**Feature Branch**: main

**Created**: 2026-09-25

**Status**: Ready for planning

**Input**: User description: "Remove the audited P0 authentication bypass before continuing UI/UX work. Authentication must fail closed, preserve the public/operational boundary, and retain local demo access only as an explicit non-production capability."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reject Untrusted Credentials (Priority: P1)

As the product owner, I need protected server capabilities to reject forged, malformed, expired,
or unverifiable credentials so that an anonymous caller can never gain Gestor, Delegado, or
workspace access by choosing a convenient token string.

**Why this priority**: The current fallback can grant full Gestor identity to an arbitrary bearer
value. This crosses the public/operational trust boundary and is the highest-severity audit finding.

**Independent Test**: Submit missing, malformed, arbitrary long, role-containing, decode-only, and
expired bearer values to a protected capability. Every request is denied, no operational identity
is attached, and no protected handler runs.

**Acceptance Scenarios**:

1. **Given** no bearer credential, **When** a caller requests a protected capability, **Then** the
   request is denied without invoking the capability.
2. **Given** an arbitrary string longer than ten characters or containing a privileged role name,
   **When** authoritative identity validation rejects it, **Then** the request is denied and no
   fallback identity is created.
3. **Given** a structurally decodable but unverified credential, **When** it is presented, **Then**
   its claims are not trusted for identity, role, or workspace assignment.
4. **Given** the authoritative identity service is unavailable or times out, **When** a non-demo
   credential is presented, **Then** the request fails closed rather than degrading into local or
   heuristic authentication.

---

### User Story 2 - Resolve Canonical Operational Identity (Priority: P2)

As a valid Gestor or Delegado, I need my authenticated identity, role, and workspace to come from
the authoritative account and canonical profile so that tenant isolation and actor permissions do
not depend on email text or caller-controlled profile metadata.

**Why this priority**: Valid authentication is useful only when authorization context is sourced
from trusted records and preserves the Gestor/Delegado workspace boundary.

**Independent Test**: Validate a real identity against controlled authoritative responses for a
Gestor and a Delegado. The resulting request context exactly matches the canonical profile. Missing,
deleted, malformed, or unsupported profiles are denied.

**Acceptance Scenarios**:

1. **Given** a valid Gestor identity and active canonical Gestor profile, **When** a protected
   request is made, **Then** the request context contains that account identifier, Gestor role, and
   the Gestor's own workspace.
2. **Given** a valid Delegado identity and active canonical Delegado profile, **When** a protected
   request is made, **Then** the request context contains that account identifier, Delegado role,
   and the owning Gestor workspace.
3. **Given** a valid identity but no active canonical operational profile, **When** a protected
   request is made, **Then** access is denied and neither metadata nor email naming supplies a role.
4. **Given** a canonical profile with an unsupported role or an invalid workspace relationship,
   **When** a protected request is made, **Then** access is denied.

---

### User Story 3 - Use Explicit Local Demo Authentication (Priority: P3)

As a developer or tester, I need deterministic local demo identities for Gestor, Delegado, and
Buscador flows without weakening deployed environments, so that offline UI and API verification
remain possible while production stays fail-closed.

**Why this priority**: Existing local flows depend on synthetic credentials, but that convenience
must be an intentional test capability rather than an implicit production fallback.

**Independent Test**: Exercise the documented exact demo credential formats with the demo feature
disabled, enabled in development/test, and requested in production. Only the enabled non-production
case succeeds, and each accepted value maps to one deterministic actor and workspace.

**Acceptance Scenarios**:

1. **Given** demo authentication is not explicitly enabled, **When** an exact demo credential is
   presented, **Then** it is denied.
2. **Given** demo authentication is explicitly enabled in development or test, **When** a documented
   exact demo credential is presented, **Then** it maps to the documented deterministic identity.
3. **Given** a demo-like credential with added, missing, reordered, or unsupported content,
   **When** it is presented, **Then** it is denied rather than partially matched.
4. **Given** a production runtime, **When** demo authentication is requested by configuration or by
   credential value, **Then** the credential is denied and no demo identity is created.

### Edge Cases

- Authorization headers with the wrong scheme, empty values, extra segments, or surrounding
  whitespace do not create an identity.
- An authoritative identity response with no user, an explicit error, a timeout, or a thrown error
  produces the same fail-closed outcome without exposing sensitive details.
- A deleted canonical profile is not active for operational access.
- A Gestor profile with no explicit workspace uses only its own account identifier; a Delegado must
  have an owning Gestor workspace.
- A caller-controlled email or metadata value containing `gestor`, `delegado`, or `buscador` never
  changes the canonical role.
- Multiple simultaneous requests do not share or mutate authentication context.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every protected capability MUST deny a request that lacks one well-formed bearer
  credential.
- **FR-002**: The system MUST accept a deployed credential only after authoritative validation
  confirms the account represented by that exact credential.
- **FR-003**: The system MUST NOT use decode-only claims, credential length, substring matching,
  email naming, caller-controlled metadata, or fixed fallback users to establish deployed identity,
  role, or workspace.
- **FR-004**: Authoritative validation errors, timeouts, and service unavailability MUST fail closed.
- **FR-005**: An operational identity MUST obtain its role and workspace from an active canonical
  profile linked to the validated account.
- **FR-006**: Supported canonical operational roles MUST be limited to Gestor and Delegado for this
  feature; an absent, deleted, or unsupported operational profile MUST be denied.
- **FR-007**: A Gestor's workspace MUST resolve to its own account identifier when the canonical
  profile has no owning workspace; a Delegado MUST have a valid owning Gestor workspace.
- **FR-008**: Local demo authentication MUST be disabled by default, require an explicit opt-in, and
  remain unavailable in production even when the opt-in is present.
- **FR-009**: Local demo authentication MUST accept only documented exact formats and supported
  actors, with deterministic account and workspace assignments.
- **FR-010**: Authentication failures MUST return a generic denial and MUST NOT expose credentials,
  provider responses, secrets, or internal stack details.
- **FR-011**: Automated tests MUST cover happy, boundary, and failure behavior for all three user
  stories, including regression tests for the audited arbitrary-token bypass.
- **FR-012**: Existing protected controllers and their public exceptions MUST retain their current
  route exposure; this feature changes identity establishment, not endpoint audience design.
- **FR-013**: The project MUST document the local demo opt-in and exact accepted formats without
  storing real credentials or production secrets.

### Key Entities

- **Presented Credential**: The single bearer value supplied with a protected request; it is
  untrusted until an allowed authentication path validates it.
- **Validated Account**: The authoritative account identifier and non-authorization account fields
  confirmed for the presented credential.
- **Canonical Operational Profile**: The active server-controlled record that assigns Gestor or
  Delegado role and workspace membership to a validated account.
- **Authenticated Request Context**: The identity, canonical role, and workspace attached to one
  accepted request for downstream authorization.
- **Local Demo Identity**: A deterministic, non-production-only identity created from an exact
  documented demo credential while the explicit demo capability is enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the audited bypass variants—arbitrary long value, privileged-role substring,
  decode-only credential, provider error, and provider timeout—are denied in automated tests.
- **SC-002**: 100% of accepted deployed identities derive actor and workspace from an active
  canonical profile; zero accepted tests rely on email or caller-controlled metadata.
- **SC-003**: Demo credentials succeed in 100% of documented enabled non-production cases and fail
  in 100% of disabled, malformed, unsupported, and production cases.
- **SC-004**: All existing API tests and the API production build complete without a new failure.
- **SC-005**: A reviewer can reproduce the security regression suite and confirm the P0 bypass is
  closed using only repository documentation and commands.
- **SC-006**: No real credential, secret, provider payload, or task-owned temporary artifact remains
  in source, logs, or evidence after validation.

## Assumptions

- This feature hardens the shared server authentication guard; granular Delegado permissions and
  dev/admin role separation remain in their already identified remediation features.
- The existing canonical profile currently models operational Gestor and Delegado actors. A future
  authenticated public-user model is separate work and is not synthesized from untrusted metadata
  here.
- Local demo compatibility is required for current offline development and browser verification,
  but its activation is an explicit developer action rather than a default runtime behavior.
- No database migration, public route redesign, UI change, or native Android work is required.
- Because no visual or interaction surface changes, Playwright screenshots are not acceptance
  evidence for this feature; API behavior, tests, build output, and source review are the applicable
  evidence types.
