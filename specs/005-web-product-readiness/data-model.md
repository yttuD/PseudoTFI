# Data Model: Audit and Readiness Evidence

Feature 005 introduces no product database entity by default. Its entities describe audit state and evidence. Any product migration discovered as necessary must be specified in a bounded remediation task and reviewed separately.

## InventoryItem

- `id`: stable prefix and sequence (`SURF`, `FORM`, `CAP`, `DATA`, `TEST`, `STATE`).
- `kind`: route, redirect, loading state, form, dialog, control, endpoint, policy, migration or suite.
- `name`: canonical human-readable name.
- `sourcePaths`: one or more current repository paths.
- `audience`: public, operational or dev/admin.
- `actors`: allowed and denied actors.
- `channels`: desktop-web, responsive-web, Capacitor-readiness when applicable.
- `dependencies`: linked inventory IDs.
- `baselineStatus`: historical state before Feature 005.
- `currentStatus`: discovered, verified, partial, placeholder, blocked, absent or excluded.

Validation: every active source item maps to at least one inventory item; every inventory source path exists or is explicitly marked removed.

## TestCase

- `id`: stable test identifier.
- `inventoryIds`: items proven by the case.
- `actor`: exact fixture identity.
- `preconditions`: session, data and scope.
- `steps`: observable interaction sequence.
- `expectedOutcome`: success, validation, empty, error or denial.
- `viewports`: required widths.
- `themes`: supported themes.
- `evidenceIds`: screenshots and command result records.

Validation: a case may not use a generic authenticated actor when actor-specific behavior differs.

## Finding

- `id`: stable finding identifier.
- `inventoryId`: affected item.
- `category`: functionality, authorization, privacy, domain, UI, responsive, accessibility, performance, localization, documentation or cleanup.
- `severity`: critical, high, medium or low.
- `reproduction`: deterministic steps and evidence.
- `expected`: governing requirement or contract.
- `actual`: observed behavior.
- `status`: open, assigned, fixed, verified, accepted-exception or not-reproducible.
- `ownerBatch`: remediation batch/brief.

State transitions: `open -> assigned -> fixed -> verified`; `open -> accepted-exception` requires explicit user acceptance for medium or higher; `not-reproducible` requires fresh contrary evidence.

## EvidenceArtifact

- `id`: stable evidence identifier.
- `type`: screenshot, contact sheet, command result, trace, manifest or report.
- `path`: feature-relative path.
- `generatedAt`: timestamp.
- `producer`: test case or command.
- `dimensions`: required for images.
- `hashOrFreshness`: integrity/freshness record.
- `disposition`: pass, fail, blocked or informational.

Validation: screenshots encode case, actor, state, width and theme in filename; retained evidence is never deleted as trash.

## AcceptanceCell

- `inventoryId`
- `actor`
- `channel`
- `viewport`
- `theme`
- `functionalStatus`
- `visualStatus`
- `accessibilityStatus`
- `authorizationStatus`
- `evidenceIds`
- `reviewedBy`

Validation: PASS requires all applicable statuses PASS; unsupported combinations are explicit exclusions with rationale, not blank cells.

## LocalRuntime

- `service`: web, API, database gateway, studio or mail catcher.
- `requiredForManualTest`: boolean.
- `startCommand`: reproducible command reference.
- `healthCheck`: URL or observable status.
- `localUrl`: user-facing link.
- `processOwnership`: Rendo or external.
- `shutdownCommand`: cleanup reference.

Validation: final handoff lists only healthy Rendo services and reports remaining non-project services separately.
