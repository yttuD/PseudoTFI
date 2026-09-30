# Feature Specification: Closed Beta Deployment Readiness

**Feature Branch**: `main` (feature directory independent of branch)

**Created**: 2026-09-29

**Status**: Ready for planning

**Input**: Carlos wants Rendo ready for a production-like deployment for a small group of testers to find defects, without commercialization, real payments, or deploying yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Honest public beta (Priority: P1)

As a tester, I can browse, search, and inspect the public catalog and reliably distinguish empty/error states from real content.

**Why this priority**: Fake content or silent fallback invalidates tester feedback.

**Independent Test**: With the data service healthy and unavailable, check catalog, detail, contact and favorites; no synthetic listing or success is presented as persisted data.

**Acceptance Scenarios**:

1. **Given** a healthy isolated beta environment, **when** a tester searches, **then** results reflect only its persisted test data.
2. **Given** an unavailable data service, **when** a tester searches or saves a favorite, **then** the action fails visibly without claiming success or exposing private data.

### User Story 2 - Safe operational beta (Priority: P1)

As a Gestor or Delegado tester, I can exercise permitted workflows without reaching another actor's data or initiating a real charge or fiscal action.

**Why this priority**: Authorization and money-related mistakes cannot be tolerated even in a beta.

**Independent Test**: Exercise owner, delegate-read, delegate-manage, public and internal roles against the same seeded data; prove denied actions and non-commercial controls.

**Acceptance Scenarios**:

1. **Given** an out-of-scope identifier, **when** a Delegado requests it, **then** no resource details are disclosed.
2. **Given** beta mode, **when** anyone attempts a payment or fiscal issuance, **then** the action is unavailable with an explicit explanation and no transaction is created.
3. **Given** non-privileged credentials, **when** internal destinations are requested directly, **then** access is denied without displaying mock internal data.

### User Story 3 - Reproducible release handoff (Priority: P2)

As the owner, I can configure a separate beta environment, know whether each service is healthy, invite testers, inspect sanitized failures, and decide when to deploy or roll back.

**Why this priority**: A public URL is not useful if failures are hidden or environment boundaries are unclear.

**Independent Test**: From documented configuration and an isolated dataset, perform a clean build and release preflight; verify required settings, service health and a rollback procedure without deploying.

**Acceptance Scenarios**:

1. **Given** a missing or local-only release setting, **when** preflight runs, **then** it fails with a precise setting name and no secret value.
2. **Given** a configured beta, **when** a service fails, **then** operators can distinguish web, API and data failures from sanitized logs and health checks.
3. **Given** a release candidate, **when** the owner reviews it, **then** the remaining risks, tester accounts, seed-data policy and deployment/rollback steps are explicit.

### Edge Cases

- A locally cached session or demonstration token must not authenticate in beta.
- Missing API, expired credentials, unavailable database and network timeouts must not yield fake success.
- A beta payment link or fiscal action must not become available merely because a credential exists.
- Test data must contain no real tenant, payment or tax information.
- Desktop and responsive web must receive separate acceptance; Android native remains out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Release configuration MUST reject missing required settings and loopback-only destinations before a candidate can be declared deployable.
- **FR-002**: Beta and live customer data, identities, credentials and storage MUST be isolated.
- **FR-003**: Demo authentication and synthetic in-memory business results MUST be unavailable in beta; failures MUST be explicit and must not masquerade as saved data.
- **FR-004**: Public, Gestor, Delegado and internal access MUST preserve the actor/scope boundaries defined in Features 004 and 005, including direct-ID denials.
- **FR-005**: Beta payment and fiscal issuance MUST be disabled by default and require an explicit later authorization to enable.
- **FR-006**: The owner MUST have non-sensitive health and failure signals for web, API and data dependencies; logs MUST not disclose secrets or private payloads.
- **FR-007**: The beta release MUST have a reproducible migration, safe seed-data, backup and rollback procedure without destructive production operations.
- **FR-008**: Operational testers MUST use individually attributable invited accounts; no shared privileged demo password or token may be published.
- **FR-009**: Every changed visual or interaction surface MUST have reviewed desktop and responsive browser evidence, including light/dark where supported.
- **FR-010**: Release handoff MUST identify exact configuration requirements, provider-dependent decisions, known limitations and a PASS/BLOCKED verdict before deployment.

### Key Entities

- **Beta environment**: Isolated configuration, data, identities, storage and public destinations used by invited testers.
- **Release candidate**: A fixed build with preflight results, migration state, known risks and rollback instructions.
- **Tester account**: Individual identity with a declared actor and permitted scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All release preflight checks pass with zero missing settings, loopback destinations or demo-auth flags.
- **SC-002**: In all tested dependency-failure cases, zero synthetic listings, favorites, payments or fiscal successes appear.
- **SC-003**: All required public, Gestor, Delegado and internal authorization cases pass with zero out-of-scope data disclosures.
- **SC-004**: Payment and fiscal issuance attempts in beta produce zero external transactions.
- **SC-005**: Every changed view has named browser evidence for desktop and responsive widths, reviewed before release readiness is declared.
- **SC-006**: The owner can execute the documented deploy and rollback checklist without relying on an undocumented environment value or real customer record.

## Assumptions

- This feature prepares a release candidate but does not deploy it; Carlos will select/approve the hosting target and deployment moment.
- The marketplace may be publicly viewable, while operational beta access is limited to invited tester accounts.
- Beta uses isolated synthetic but persisted data, never real customer or fiscal data.
- Native Android acceptance and commercialization are separate future gates.
