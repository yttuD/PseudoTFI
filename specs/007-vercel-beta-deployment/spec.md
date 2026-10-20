# Feature Specification: Vercel Closed Beta Deployment

**Feature Branch**: `codex/rendo-beta-deploy`  
**Created**: 2026-09-30  
**Status**: Approved for implementation  
**Input**: Carlos authorized publishing the existing Rendo beta from the same Git repository, using Vercel for both web and API and the dedicated Supabase beta project. It is for a small tester group, with no commercialization, real payments, or fiscal issuance.

## User Scenarios & Testing

### User Story 1 - Reach a real beta (Priority: P1)

As Carlos, I can open separate hosted web and API endpoints and know whether each is healthy without relying on a local computer.

**Independent Test**: Open the hosted web and health endpoints from an external network; a database outage is reported as an outage, never as success.

**Acceptance Scenarios**:

1. **Given** the beta services are configured, **when** I open the links, **then** the web loads and the API readiness check reports its actual dependency state.
2. **Given** an unavailable dependency, **when** I use the beta, **then** the failure is visible and no fabricated listing or saved action appears.

### User Story 2 - Protect tester boundaries (Priority: P1)

As a tester, I can access only data and actions permitted to my role; beta cannot create a real payment or fiscal document.

**Independent Test**: Exercise anonymous, public user, Gestor, Delegado and internal access against hosted endpoints and check both allowed and denied actions.

**Acceptance Scenarios**:

1. **Given** a Delegado without a permission, **when** they request an owner-only or cross-tenant action, **then** access is denied without private data.
2. **Given** beta mode, **when** a tester reaches payment or billing controls, **then** real transactions and fiscal issuance remain disabled.

### User Story 3 - Invite and recover (Priority: P2)

As Carlos, I can invite testers after an evidence-based go/no-go review and roll back a bad deployment without losing beta data.

**Independent Test**: Record the deployed revision, smoke-test public and authenticated flows, then document an exact rollback and tester-account procedure.

**Acceptance Scenarios**:

1. **Given** incomplete hosted checks, **when** I ask for tester links, **then** the release is marked restricted or blocked rather than falsely approved.
2. **Given** a failed release, **when** I roll back, **then** the previous working application version is restored without resetting Supabase data.

### Edge Cases

- Missing secret, wrong origin, expired login, unavailable database and malformed requests fail closed.
- Preview and production URLs may differ; each must use the correct exact allowed origins and redirect configuration.
- An empty beta database is not a reason to fabricate listings or tester accounts.
- Desktop and responsive web are separate acceptance targets; native Android is outside this feature.

## Requirements

### Functional Requirements

- **FR-001**: Provide separate, working hosted links for the public web and API.
- **FR-002**: Keep private service credentials inaccessible to browsers and repository readers.
- **FR-003**: Only explicitly configured web origins can call the API from a browser.
- **FR-004**: Keep real payments, fiscal issuance and development tokens disabled in beta.
- **FR-005**: Show real empty/error states when beta data or dependencies are missing.
- **FR-006**: Verify public, Gestor, Delegado and internal access independently before tester invitation.
- **FR-007**: Record the deployed revision, environment scope, health evidence, known risks and rollback steps.
- **FR-008**: Do not publish real customer data or alter unrelated hosted projects.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Both hosted links respond from outside the development computer.
- **SC-002**: All required release settings are present and no private key appears in the repository or browser bundle.
- **SC-003**: All defined hosted health and smoke scenarios have recorded pass/fail results; zero unexplained successes during dependency failure.
- **SC-004**: One anonymous, one Gestor, one Delegado and one internal-denial scenario are recorded before tester invitations.
- **SC-005**: Carlos can follow documented rollback steps in under 10 minutes without database deletion.

## Assumptions

- Carlos chose the existing GitHub repository and Vercel account; no Railway service is used.
- Supabase beta schema is already migrated and isolated; no seed or real data is assumed.
- Tester recruitment and native Android installation are later decisions.
- The private Supabase service credential is entered directly in the API host by Carlos, not shared in chat.
