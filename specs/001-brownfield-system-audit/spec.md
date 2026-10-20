# Feature Specification: Brownfield System Audit

**Feature Branch**: main

**Created**: 2026-09-25

**Status**: PARTIAL audit baseline accepted; remediation required

**Input**: User description: "Inventory and verify every project surface before continuing
implementation. Audit functionality and UI/UX without assuming existing documents or tests prove
completion, and turn the evidence into prioritized, bounded remediation work."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trustworthy System Inventory (Priority: P1)

As the project owner, I need one exhaustive inventory of the existing product surfaces so I can
see what actually exists, who can use it, and whether it is functional without relying on outdated
completion claims.

**Why this priority**: Architecture and remediation decisions are unsafe until every route, form,
dialog, backend capability, data surface, and test suite has a verified disposition.

**Independent Test**: Compare the inventory against source-discovered route, form, controller,
migration, and test manifests. Every discovered item is present exactly once with an evidence path,
actor, status, and verification state.

**Acceptance Scenarios**:

1. **Given** the current repository, **When** the audit inventory is generated, **Then** every
   source-discovered public, authenticated, Gestor, and dev surface is classified with evidence.
2. **Given** an item described as complete in historical documentation, **When** current evidence
   does not prove it, **Then** the item is marked unverified, partial, blocked, mock, or absent
   instead of complete.
3. **Given** conflicting terminology or behavior, **When** the conflict is recorded, **Then** the
   canonical domain rule and the observable implementation are both identified without silently
   reconciling them.

---

### User Story 2 - Functional and Visual Proof (Priority: P2)

As the final reviewer, I need reproducible behavior checks and visual captures for every user-facing
surface so I can judge usability, correctness, accessibility, responsive behavior, and brand
consistency.

**Why this priority**: A route may compile while still being unusable, visually broken, inaccessible,
or misleading in a specific role, state, theme, or viewport.

**Independent Test**: Re-run the documented verification matrix and confirm that each row links to
a result and, where visual, to captures for every applicable viewport, theme, authentication state,
loading state, empty state, validation state, success state, and failure state.

**Acceptance Scenarios**:

1. **Given** a user-facing view, **When** it is audited at its applicable viewport and theme
   combinations, **Then** the evidence set shows the rendered result and records defects by severity.
2. **Given** a form or dialog, **When** valid, invalid, boundary, cancellation, and server-failure
   paths are exercised, **Then** the audit records both behavior and user feedback.
3. **Given** a protected capability, **When** anonymous users and each relevant role attempt it,
   **Then** the audit records the observed authorization and privacy behavior.
4. **Given** a surface that renders at desktop and mobile web widths, **When** it is audited,
   **Then** desktop web and responsive web receive separate dispositions, and neither is presented
   as native Android validation.

---

### User Story 3 - Actionable Remediation Roadmap (Priority: P3)

As the supervising architect, I need every confirmed gap converted into a prioritized and bounded
remediation candidate so Antigravity can implement one coherent batch at a time and I can validate
the final evidence.

**Why this priority**: A long defect list without dependencies, ownership, and acceptance criteria
does not produce safe progress.

**Independent Test**: Select any roadmap item and confirm it names affected user journeys, evidence,
severity, dependencies, scope exclusions, and the proposed Spec Kit feature boundary.

**Acceptance Scenarios**:

1. **Given** confirmed findings, **When** the roadmap is produced, **Then** all P0 and P1 findings are
   assigned to a bounded remediation candidate with no unowned blockers.
2. **Given** multiple findings with one root cause, **When** remediation is grouped, **Then** the
   proposed batch addresses the shared cause without combining unrelated product areas.
3. **Given** an unverified or environment-blocked item, **When** it enters the roadmap, **Then** the
   missing evidence or external dependency is explicit and it is not labeled as a confirmed defect.

### Edge Cases

- Routes or forms created dynamically, localized under multiple URLs, or reachable only through a
  dialog are counted once as a surface and mapped to all entry points.
- Redirect-only page files are inventoried as route aliases, not counted as distinct visual
  surfaces, and their final destination is asserted.
- A route that renders only with seeded accounts or external configuration is classified as
  environment-blocked until the prerequisite and result are reproduced.
- Duplicate, stale, generated, scratch, and legacy files are separated from active product
  surfaces before completeness percentages are calculated.
- Existing tests that pass without meaningful assertions, depend on order, or use mocked behavior
  inconsistent with production are recorded as insufficient evidence.
- Visual captures with missing fonts, assets, data, or hydration failures are rejected and rerun
  after the environment defect is classified.
- Role and permission combinations that cannot be exercised safely are documented as gaps rather
  than inferred.
- Historical screenshots and command outputs are not accepted as current evidence.
- A Playwright project that always loads one authenticated storage state cannot prove anonymous,
  Gestor, Delegado, or dev/admin separation; each applicable actor requires an explicit context.
- The current Capacitor wrapper and 375px responsive web captures are Android-readiness evidence
  only. Native Android validation is out of scope until a future authorized device-testing feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The audit MUST produce source-derived manifests for routes/views, forms/dialogs,
  server capabilities, data migrations, and automated tests.
- **FR-002**: Every manifest item MUST identify its user actor, entry point, purpose, dependencies,
  evidence path, and one of the constitutional implementation statuses.
- **FR-003**: The audit MUST map every view to its forms, dialogs, loading/empty/error states,
  protected actions, and responsive presentations.
- **FR-004**: The audit MUST map every user-facing action to the server and data capabilities it
  relies on, or explicitly record that no working capability was found.
- **FR-005**: The audit MUST verify canonical terminology, business invariants, tenant isolation,
  authorization, privacy, soft deletion, and automatic state changes wherever they apply.
- **FR-006**: The audit MUST execute current validation suites and preserve reproducible summaries
  that include command, date, exit status, pass/fail counts, skips, and blockers.
- **FR-007**: Every user-facing surface MUST receive a functional and UI/UX disposition covering
  accessibility, information hierarchy, interaction feedback, localization, responsive behavior,
  light/dark theme consistency, and Rendo brand-token use.
- **FR-008**: Visual evidence MUST cover each applicable 375, 768, 1024, and 1440 pixel viewport and
  both supported themes, with additional captures for role or state differences that change the UI.
- **FR-009**: Every form and dialog MUST be checked for valid submission, field validation,
  boundary input, cancellation, failure feedback, keyboard use, and destructive-action safeguards.
- **FR-010**: Findings MUST be deduplicated by root cause and assigned P0, P1, P2, or P3 severity
  with user impact and exact evidence.
- **FR-011**: The final audit MUST identify contradictions between current behavior, tests,
  ESTADO-REAL.md, product documents, design guidance, and the Rendo constitution.
- **FR-012**: The audit MUST produce a remediation roadmap whose items are independently
  specifiable, dependency-aware, and traceable to all affected findings.
- **FR-013**: Audit activity MUST preserve pre-existing user changes and remove only temporary
  artifacts generated by the audit after retained evidence is finalized.
- **FR-014**: No inventory item or acceptance criterion may be marked verified without evidence
  generated or inspected during this audit.
- **FR-015**: Every route entry, surface, interaction, capability, and evidence item MUST declare
  its audience (`public`, `operational-workspace`, or `dev-admin`) and relevant actor.
- **FR-016**: Route inventory MUST distinguish visual pages from redirect aliases, layouts,
  loading states, and localized URL expansions; only distinct rendered destinations count toward
  the visual surface denominator.
- **FR-017**: Authorization verification MUST use explicit anonymous, authenticated public-user,
  Gestor, Delegado, and dev/admin contexts where applicable and MUST test both navigation and
  protected API behavior without treating hidden navigation as authorization.
- **FR-018**: UI/UX results MUST report desktop web and responsive web separately. The current
  Capacitor wrapper receives an Android-readiness gap assessment only; native Android acceptance is
  deferred to a future explicitly authorized feature using a physical device over wireless
  debugging.

### Key Entities

- **Route Entry**: One source-discovered App Router page, layout, loading state, or redirect alias.
- **Surface**: A distinct rendered user-visible view or dialog with audience, actors, channels,
  states, entry points, and dependencies. Multiple aliases may resolve to one Surface.
- **Interaction**: A form submission, command, navigation, protected action, or state transition
  exercised by a user.
- **Capability**: A server or data behavior required by one or more interactions.
- **Evidence Item**: A current source path, command result, browser result, or visual capture tied
  to one audit claim.
- **Finding**: A verified defect, gap, contradiction, or blocked verification with severity, impact,
  root cause, and affected items.
- **Remediation Candidate**: A bounded future feature that resolves a coherent set of findings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of source-discovered routes, views, forms, dialogs, server controllers, database
  migrations, and automated test files appear in the final manifests or an explicitly excluded
  artifacts list.
- **SC-002**: 100% of inventory rows include actor, status, evidence, and verification date; zero
  rows use an unsupported "complete" claim.
- **SC-003**: 100% of user-facing surfaces have a functional and UI/UX disposition, and every
  applicable visual matrix cell has an inspected capture or a named blocker.
- **SC-004**: 100% of forms and destructive actions have recorded valid, invalid, boundary,
  cancellation, and failure-path results or a named blocker.
- **SC-005**: All findings are traceable to evidence and all P0/P1 findings are assigned to a
  remediation candidate with an owner, dependencies, and acceptance boundary.
- **SC-006**: A reviewer can reproduce every executable audit result from the recorded commands
  without relying on conversation history.
- **SC-007**: The audit leaves no task-owned temporary files, orphaned browser processes, or
  unclassified generated artifacts outside the retained evidence directory.
- **SC-008**: 100% of access-controlled surfaces and capabilities have an evidence-backed actor
  matrix or an explicit blocker; desktop web, responsive web, Android readiness, and future native
  Android status are never conflated.

## Assumptions

- The current working tree, including uncommitted files, is the product state to audit.
- Existing documentation is product intent and historical context, not proof of implementation.
- The audit is read-only for application behavior; audit documents, evidence, and narrowly scoped
  verification tests may be added, but product defects are remediated in later features.
- External services or production data will not be mutated during the audit.
- Visual verification covers the public marketplace, authentication, operational workspace, and
  dev/admin dashboard as desktop web and responsive web targets.
- The current Android wrapper is inspected only for architectural and configuration readiness.
  Native Android implementation, installation, and device acceptance are a future gated phase;
  Codex will notify Carlos before that phase and request wireless-debugging access to the phone.
- Spanish, Portuguese, and English are in scope for user-facing localization checks; the dev
  dashboard remains Spanish-only.
