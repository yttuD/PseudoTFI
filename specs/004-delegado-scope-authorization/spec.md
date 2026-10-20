# Feature Specification: Delegado Scope and Granular Authorization

**Feature Branch**: `004-delegado-scope-authorization`

**Created**: 2026-09-25

**Status**: Clarified and ready for planning

**Input**: User description: "Implement the missing Delegado authorization foundation before
continuing modality-aware availability: the Gestor owner configures account, Grupo, or selected
Unidad scope and Ver or Gestionar permission; Delegados never access Facturación, Cupo, or the full
Log de acciones. Validate functionality and UI/UX separately on desktop and responsive web."

## Clarifications

### Session 2026-09-25

- Q: ¿Una misma cuenta puede colaborar con varios Gestores o tener además su propio espacio como Gestor? → A: En V1 cada cuenta puede pertenecer a un solo espacio operativo: puede ser Gestor o Delegado de un único Gestor, pero no ambas cosas ni Delegado de varios Gestores simultáneamente.
- Q: ¿Qué puede modificar un Delegado Gestionar dentro del alcance que le asignó el Gestor? → A: Puede recibir prácticamente todos los derechos operativos del Gestor dentro de ese alcance, pero nunca acceder a datos o facultades sensibles; además, no puede ampliar ni redefinir su propio alcance.
- Q: ¿Cómo se limita el acceso a datos personales de Inquilinos cuando el Delegado sólo tiene algunas Unidades? → A: Sólo puede acceder a Inquilinos vinculados con Alquileres dentro de su alcance; otros Alquileres y relaciones del mismo Inquilino permanecen ocultos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invite and Configure a Delegado Safely (Priority: P1)

As a Gestor owner, I need to invite an already registered and verified account, receive an explicit
acceptance, and configure exactly one access scope and permission so that no collaborator receives
implicit workspace-wide access.

**Why this priority**: The current all-or-nothing access is a high-risk privacy and authorization
gap. A safe delegation lifecycle is the prerequisite for every later Delegado operation.

**Independent Test**: Invite eligible and ineligible accounts, accept or reject the invitation as
the invitee, configure each scope type with both permissions, and verify that access remains absent
until acceptance and configuration are both complete.

**Acceptance Scenarios**:

1. **Given** a registered and verified account with no conflicting membership, **When** the Gestor
   sends an invitation, **Then** the invitee receives the required in-app and email notification and
   can accept or reject it from their own authenticated session.
2. **Given** an unknown, unverified, self-owned, duplicate, or otherwise ineligible account,
   **When** the Gestor attempts to invite it, **Then** the invitation is rejected with a direct,
   non-sensitive explanation and creates no access.
3. **Given** an accepted invitation with no access configuration, **When** the invitee enters the
   operational workspace, **Then** no private operational data is exposed and the UI explains that
   access is awaiting configuration by the Gestor.
4. **Given** an accepted invitation, **When** the Gestor selects full account, one Grupo, or selected
   Unidades and chooses Ver or Gestionar, **Then** that configuration becomes the sole active
   authorization boundary for the relationship.
5. **Given** an active Delegado, **When** the Gestor changes or revokes access, **Then** the new
   boundary applies on the next protected request, stale screens cannot mutate data, and the change
   is retained in the owner-visible Log de acciones.

---

### User Story 2 - Work in Ver Mode Without Mutating Data (Priority: P1)

As a Delegado with Ver permission, I need to inspect only the operational records covered by my
scope while every mutation remains unavailable and rejected.

**Why this priority**: Read-only access must be genuinely read-only at every authorization layer,
not merely represented by hidden buttons.

**Independent Test**: Exercise list, detail, direct URL, crafted request, and stale-session paths for
account, Grupo, and selected-Unidad scopes. Only covered records can be read and every create,
update, state change, publication, archive, or delete attempt is denied without side effects.

**Acceptance Scenarios**:

1. **Given** account-wide Ver access, **When** the Delegado browses the operational workspace,
   **Then** all permitted operational records in that Gestor account are readable but immutable.
2. **Given** Grupo-scoped Ver access, **When** a Unidad enters or leaves that Grupo, **Then** the
   Delegado's read access follows current Grupo membership without retaining stale access.
3. **Given** selected-Unidad Ver access, **When** the Delegado requests an unselected record or a
   related record belonging only to another Unidad, **Then** the system reveals neither the record
   nor whether it exists.
4. **Given** any Ver scope, **When** the Delegado submits a mutation through the UI, a direct request,
   or a stale page, **Then** it is denied and no partial change is committed.

---

### User Story 3 - Operate in Gestionar Mode Within Scope (Priority: P1)

As a Delegado with Gestionar permission, I need to perform the allowed day-to-day work only on the
configured scope so that I can help the Gestor without gaining ownership powers.

**Why this priority**: Feature 003 and other operational workflows depend on a reusable, precise
answer to whether a Delegado may manage a specific Unidad or related record.

**Independent Test**: For each scope type, create and edit permitted operational records, attempt
equivalent actions outside scope, and verify that direct and indirect references cannot cross the
authorization boundary.

**Acceptance Scenarios**:

1. **Given** full-account Gestionar access, **When** the Delegado creates or updates an operational
   Unidad, Alquiler, Pago, availability record, or other allowed related record, **Then** the action
   succeeds inside that Gestor account and is attributed to the Delegado.
2. **Given** Grupo-scoped Gestionar access, **When** the Delegado operates on a member Unidad or its
   related records, **Then** the operation succeeds only while that Unidad remains in scope.
3. **Given** selected-Unidad Gestionar access, **When** the Delegado operates on an unselected
   Unidad or submits a selected Unidad with a related record from outside scope, **Then** the whole
   action is denied without partial writes.
4. **Given** an authorized operation, **When** it completes, **Then** the owner-visible Log de
   acciones identifies the acting Delegado, affected object, action, and time without exposing the
   full Log to that Delegado.
5. **Given** Grupo-scoped Gestionar access, **When** the Delegado changes operational Grupo settings,
   shared availability rules, or creates a new Unidad directly inside that Grupo, **Then** the action
   succeeds; changing Grupo membership, deleting the Grupo, or importing an out-of-scope Unidad
   remains reserved to the Gestor because it would redefine the authorization boundary.
6. **Given** an Inquilino linked to both in-scope and out-of-scope Alquileres, **When** an authorized
   Delegado reads or manages the in-scope Alquiler, **Then** only the necessary Inquilino record and
   in-scope relationship are available; every out-of-scope Alquiler remains undisclosed.

---

### User Story 4 - Preserve Owner-Only Boundaries (Priority: P1)

As a Gestor owner, I need billing, Cupo, delegation administration, and the complete Log de acciones
to remain owner-only regardless of a Delegado's scope or permission.

**Why this priority**: These capabilities affect money, account control, and sensitive activity
history and are explicitly excluded from delegation.

**Independent Test**: Attempt each owner-only page and action as anonymous, public-account,
Delegado Ver, Delegado Gestionar, and Gestor actors through navigation, direct URLs, and direct
requests. Only the Gestor owner succeeds.

**Acceptance Scenarios**:

1. **Given** any Delegado configuration, **When** the Delegado requests Facturación, AFIP, Cupo,
   subscription payment, full Log de acciones, or Delegado administration, **Then** access is denied
   and no private summary from those areas is returned.
2. **Given** a Delegado session, **When** navigation and dashboard summaries render, **Then** they
   contain no owner-only links, calls to action, totals, or fallback data.
3. **Given** a Gestor owner, **When** the same capabilities are used, **Then** the existing owner
   access remains intact and all delegation changes are auditable.

---

### User Story 5 - Understand Access Across Desktop and Responsive Web (Priority: P2)

As a Gestor or Delegado, I need a clear, accessible permissions experience on desktop and responsive
web so that I can understand what is selected, what is inherited, and why an action is unavailable.

**Why this priority**: Authorization that is technically correct but visually ambiguous causes
dangerous configuration mistakes and support burden.

**Independent Test**: Complete invitation, scope selection, permission selection, acceptance,
editing, revocation, empty, loading, error, and denied states at 375, 768, 1024, and 1440 pixels in
light and dark themes where supported, using keyboard and touch-sized controls.

**Acceptance Scenarios**:

1. **Given** the Gestor configures access, **When** each scope type is selected, **Then** the UI shows
   a plain-language summary of included records and requires explicit confirmation before saving.
2. **Given** selected-Unidad scope, **When** many Unidades exist, **Then** the Gestor can search,
   select, review, and remove items without losing prior selections or causing horizontal overflow.
3. **Given** a Delegado, **When** a page is read-only or outside scope, **Then** the UI distinguishes
   read-only access from absent access and does not offer controls that will predictably fail.
4. **Given** any supported viewport and theme, **When** the affected states render, **Then** text,
   focus, contrast, touch targets, dialogs, tables/cards, and overflow meet the project's UI/UX and
   accessibility standards.

### Edge Cases

- An invitation is accepted after the Gestor cancels or replaces it; the stale invitation grants no
  access.
- The invited account changes its email after invitation creation; acceptance remains bound to the
  intended authenticated account, not to user-supplied request data.
- A Grupo-scoped Delegado is using a Unidad while the owner moves it out of the Grupo; the next
  protected request is denied and no stale update commits.
- A selected Unidad is archived or soft-deleted; the authorization configuration preserves
  auditability but no longer exposes the record in normal operational views.
- A Gestor changes Gestionar to Ver while the Delegado has an edit form open; submission is denied
  without overwriting newer data.
- A Delegado guesses identifiers from another Gestor account or another scope; responses do not
  leak existence, names, counts, or personal data.
- Account, Grupo, and selected-Unidad configurations with zero currently visible records show an
  explicit empty state and never broaden access by fallback.
- Concurrent configuration edits resolve deterministically and cannot produce a transient union of
  old and new scope.
- Public marketplace behavior and authenticated public-user favorites remain independent from
  operational delegation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only the Gestor owner MUST be able to create, change, cancel, or revoke a Delegado
  relationship for that Gestor account.
- **FR-002**: An invitation MUST target an existing, registered, and verified account; unknown or
  unverified emails MUST fail directly without creating a usable pending relationship.
- **FR-003**: The invitee MUST explicitly accept or reject the invitation in their own authenticated
  session, and acceptance MUST be bound to that authenticated account.
- **FR-004**: Invitations MUST be single-use, cancellable by the Gestor, resistant to replay, and
  incapable of granting access before both acceptance and owner configuration are complete.
- **FR-005**: The relationship MUST support exactly one active scope definition at a time: complete
  Gestor account, one Grupo, or one or more explicitly selected Unidades.
- **FR-006**: The relationship MUST support exactly one active permission at a time: Ver or
  Gestionar.
- **FR-007**: Changing scope or permission MUST replace the prior authorization atomically; no
  request may observe or receive an unintended union of old and new access.
- **FR-008**: Grupo scope MUST resolve against current Grupo membership: newly added member Unidades
  enter scope and removed Unidades leave scope immediately on the next protected request.
- **FR-009**: Selected-Unidad scope MUST include only the explicit active selections and their
  authorized related operational records; shared identifiers MUST NOT broaden access to sibling or
  unrelated Unidades.
- **FR-010**: Ver MUST permit only authorized reads and MUST deny every create, update, publication,
  state transition, archive, restore, delete, upload, payment registration, and other mutation.
- **FR-011**: Gestionar MUST permit allowed day-to-day operational mutations within scope and MUST
  deny equivalent mutations outside scope.
- **FR-012**: Gestionar MUST grant nearly all day-to-day operational capabilities of the Gestor
  within the assigned scope. A Grupo-scoped Gestionar Delegado MAY manage current member Unidades,
  create a new Unidad directly within that Grupo, rename the Grupo, and change its operational
  settings and shared availability rules. Only the Gestor owner MAY add an existing external Unidad,
  move a Unidad into or out of the Grupo, delete the Grupo, or otherwise redefine the scope boundary.
- **FR-013**: A Delegado MUST see an Inquilino only when that Inquilino is linked to at least one
  in-scope Alquiler, and MUST see only the fields needed for authorized operational work. Ver MAY
  read that projection. Gestionar MAY create or edit the Inquilino while creating or managing an
  in-scope Alquiler. Other Alquileres, Unidades, and relationships of the same Inquilino MUST remain
  hidden; an unlinked Inquilino MUST NOT appear in Delegado lists or searches. Creation of a new
  Inquilino by a Delegado MUST commit together with an in-scope Alquiler link or leave no accessible
  orphan record.
- **FR-014**: Alquiler, Pago, availability, modality, and other Unidad-related authorization MUST be
  derived from the referenced Unidad at the time of each protected action; request-supplied Gestor,
  Grupo, or workspace identifiers MUST NOT be trusted as authority.
- **FR-015**: A Delegado MUST never access the Gestor's personal or security settings, Facturación,
  tax identity or AFIP configuration and receipts, payment instruments, Cupo, subscription payments,
  delegation administration, or the complete Log de acciones, regardless of scope or Gestionar
  permission.
- **FR-016**: Owner-only data MUST be absent from Delegado navigation, dashboards, rendered pages,
  exports, and error fallbacks, while authoritative enforcement independently denies direct access.
- **FR-017**: Every protected read and mutation MUST enforce actor, Gestor account, scope, and
  permission at all authoritative boundaries; hiding or disabling a client control MUST NOT be the
  sole protection.
- **FR-018**: Unauthorized object access MUST fail without revealing whether the object exists or
  exposing names, counts, contact details, financial data, or other private fields.
- **FR-019**: Revocation, permission downgrade, scope removal, and Grupo membership changes MUST
  affect the next protected request, including requests submitted from already-open pages.
- **FR-020**: The system MUST retain an owner-visible, tamper-resistant record of invitation,
  acceptance, rejection, configuration, revocation, and every Delegado mutation with actor, action,
  affected object, and time.
- **FR-021**: Delegados MUST NOT be able to view the complete Log de acciones; user-facing errors
  may include only enough information to understand a denial safely.
- **FR-022**: In V1, each account MUST belong to at most one operational workspace: it may own its
  Gestor workspace or be a Delegado of exactly one Gestor, but MUST NOT hold both positions or be a
  Delegado for multiple Gestores simultaneously. A conflicting invitation MUST be rejected before
  creating a pending relationship.
- **FR-023**: Public marketplace, authenticated public-user, operational Gestor/Delegado, and
  restricted dev/admin surfaces MUST remain separate; a delegation MUST never elevate public or
  dev/admin privileges.
- **FR-024**: All affected routes, forms, lists, detail views, dashboard summaries, exports, and
  error states MUST declare and test their allowed actor, scope, permission, and data projection.
- **FR-025**: The Gestor UI MUST provide complete invitation status, acceptance status, active scope,
  active permission, last change, edit, cancel, and revoke controls with explicit confirmation for
  access-reducing or access-expanding changes.
- **FR-026**: The Delegado UI MUST clearly communicate active workspace context, scope summary, Ver
  versus Gestionar mode, read-only controls, denied access, and pending-configuration state without
  exposing owner-only information.
- **FR-027**: A failed or unavailable authorization check MUST fail closed; mock, resilient,
  fallback, timeout, or offline behavior MUST NOT broaden access or fabricate an authorized owner.
- **FR-028**: Automated acceptance coverage MUST include anonymous users, authenticated public
  users, Gestor owners, Delegado Ver, Delegado Gestionar, revoked Delegados, and dev/admin actors
  where applicable, across in-scope, out-of-scope, cross-account, stale-session, and crafted-request
  cases.
- **FR-029**: Every affected visual state MUST be verified separately for desktop web and responsive
  web at 375, 768, 1024, and 1440 pixels in light and dark themes where supported, with retained
  screenshots and interaction assertions.
- **FR-030**: Native Android implementation and physical-device validation are explicitly out of
  scope for this feature; this feature MUST leave a clear authorization contract for that later app.

### Key Entities

- **Delegado Relationship**: The auditable relationship between one Gestor account and one invited
  account, including lifecycle state, active permission, active scope type, and revocation state.
- **Delegado Invitation**: A single-use request sent by a Gestor owner to an already registered and
  verified account, accepted or rejected by that exact account before access can be configured.
- **Scope Definition**: The current account-wide, one-Grupo, or selected-Unidades boundary attached
  to a Delegado Relationship. It is replaced atomically when edited.
- **Permission**: Ver or Gestionar. Ver is strictly read-only; Gestionar adds bounded operational
  mutations but never owner-only capabilities.
- **Authorization Decision**: The result for one authenticated actor, action, and target record,
  derived from current relationship, scope, permission, ownership, and record lifecycle.
- **Delegado Action Record**: Owner-visible evidence of lifecycle and operational actions attributed
  to the real actor without granting the Delegado access to the complete Log de acciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across the full actor-by-action-by-scope acceptance matrix, 100% of authorized cases
  succeed and 100% of unauthorized, out-of-scope, cross-account, revoked, or stale cases are denied
  without data mutation.
- **SC-002**: A newly accepted but unconfigured Delegado can retrieve zero private operational
  records until the Gestor saves an explicit scope and permission.
- **SC-003**: Revocation, downgrade, and scope removal block 100% of subsequent protected requests,
  including submissions from pages opened before the change.
- **SC-004**: Delegado responses and rendered screens contain zero Facturación, AFIP, Cupo,
  subscription-payment, full-Log, or delegation-administration data and controls.
- **SC-005**: Gestores can invite, review status, configure, change, and revoke a Delegado without
  ambiguity in under three minutes during an acceptance test, with a confirmation summary before
  each access change.
- **SC-006**: 100% of Delegado mutations retained for acceptance testing are attributable to the
  authenticated Delegado and visible to the Gestor owner, while the Delegado cannot retrieve the
  complete Log de acciones.
- **SC-007**: Every affected default, loading, empty, validation-error, service-error, denied,
  read-only, pending, active, and revoked visual state passes interaction and screenshot review at
  375, 768, 1024, and 1440 pixels with no horizontal overflow, clipped controls, unreadable text,
  or inaccessible primary action.
- **SC-008**: Public marketplace journeys and dev/admin restrictions show zero authorization
  regression after delegation is enabled.

## Assumptions

- One active Delegado Relationship between the same Gestor and invited account is sufficient; a new
  invitation cannot coexist with an active or pending duplicate relationship.
- The Gestor configures scope and permission after explicit invitee acceptance, matching the
  canonical product flow. Until configuration is saved, access is empty.
- Scope changes replace the previous scope rather than accumulating hidden grants. Selected-Unidad
  scope may contain multiple explicit Unidades.
- Invitation cancellation and revocation preserve history through non-destructive lifecycle states.
- Notification delivery failures are visible and retryable but never grant access by themselves.
- Metrics and exports available to a Delegado use only records already authorized by scope and never
  include account-wide totals that could reveal out-of-scope activity.
- The existing verified-session authentication foundation from feature 002 is a prerequisite.
- Feature 003 consumes this feature's authorization decisions and does not create a second,
  availability-specific permission system.
- The current task covers the operational web application. Responsive web is validated separately
  from desktop web; the future native Android application will be specified and tested later on a
  real device.
