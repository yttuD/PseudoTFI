# Audit Data Model

## Surface

Represents one distinct user-facing view, dialog, or responsive presentation.

Required fields:

- stable identifier
- route kind and canonical destination when the entry is an alias
- route or entry point
- source files
- audience, actors, and authentication state
- channel: desktop web, responsive web, Android-wrapper readiness, or future native Android
- locale behavior
- theme applicability
- viewport applicability
- forms, dialogs, loading, empty, success, and error states
- capability dependencies
- status and evidence identifiers

Relationships:

- has zero or more Interactions
- depends on zero or more Capabilities
- has one or more Evidence Items or one named blocker
- may have multiple Findings
- may be reached by multiple Route Entries, including redirect aliases

## Route Entry

Represents one source-discovered App Router page, layout, loading state, or redirect.

Required fields:

- stable identifier
- source path and URL pattern
- route kind
- canonical Surface or redirect destination
- audience and actors
- evidence for final URL and access behavior

Validation rules:

- redirect aliases do not count as distinct rendered Surfaces
- localized URL expansions do not create duplicate Surfaces
- protected entries require explicit anonymous and authorized actor evidence

## Interaction

Represents a user action such as submission, navigation, state change, upload, filter, or
destructive confirmation.

Required fields:

- stable identifier
- parent Surface
- actor and permission expectation
- trigger and expected outcome
- valid, invalid, boundary, cancellation, and failure scenarios as applicable
- feedback and accessibility expectations
- capability dependencies
- evidence identifiers

## Capability

Represents server or data behavior required by an Interaction.

Required fields:

- stable identifier
- controller or entry point
- service and adapter paths
- input and output contract
- authentication and authorization rules
- data tables, policies, functions, storage, and external dependencies
- error modes
- current status and evidence identifiers

## Evidence Item

Represents current proof for exactly one or more claims.

Required fields:

- evidence identifier
- evidence type: source, command, browser, screenshot, or blocker
- creation date and audit batch
- repository-relative path
- command and exit status when executable
- expected and observed result
- related inventory identifiers
- reviewer disposition

Validation rules:

- historical text cannot be the only evidence for verified status
- screenshots name surface, viewport, theme, role, and state
- desktop-web and responsive-web dispositions are recorded separately
- Android-wrapper readiness evidence cannot be labeled native Android validation
- secrets and personal data are redacted
- every retained item exists at the recorded path

## Finding

Represents one verified defect, contradiction, risk, or blocked verification.

Required fields:

- finding identifier
- severity: P0, P1, P2, or P3
- type and user impact
- expected and observed behavior
- root cause or unknown-root-cause marker
- affected inventory identifiers
- evidence identifiers
- remediation candidate identifier or blocker

State transitions:

- candidate -> verified or dismissed
- verified -> assigned to remediation candidate
- environment-blocked -> verified, dismissed, or remains blocked with prerequisite

## Remediation Candidate

Represents one bounded future Spec Kit feature.

Required fields:

- candidate identifier and title
- problem statement
- included and excluded findings
- affected journeys and actors
- dependencies and risks
- acceptance boundary
- suggested priority

## Status Taxonomy

- **implemented-verified**: current source exists and fresh behavior evidence proves the claim
- **implemented-unverified**: source appears complete but required behavior evidence is missing
- **partially-implemented**: some required behavior exists and material behavior is absent
- **placeholder-or-mock**: visible or callable structure exists but relies on substitute behavior
- **specified-only**: requirement exists in documents with no active implementation found
- **environment-blocked**: implementation may exist but required safe environment is unavailable
- **absent**: bounded source discovery found no implementation
