# Research: Brownfield System Audit

## Decision 1: One root Spec Kit project

**Decision**: Keep one Spec Kit project at the repository root.

**Rationale**: The product is one tightly coupled system. User journeys cross Next.js routes,
NestJS capabilities, shared types, Supabase migrations, and the Android wrapper. One feature
directory preserves end-to-end traceability and a single constitution.

**Alternatives considered**: Independent Spec Kit roots for web and API. Rejected for this audit
because it would split cross-surface findings and require duplicated governance. It remains viable
if future teams release these applications independently.

## Decision 2: Source-derived completeness

**Decision**: Use repository source manifests as the audit denominator.

**Rationale**: Documentation and existing test names contain historical claims and cannot establish
that all routes, forms, or capabilities still exist. Independent source listings make exhaustive
coverage measurable.

**Alternatives considered**: Start from QA_integral.md or ESTADO-REAL.md. Rejected as the primary
denominator because both may be stale; they remain comparison inputs for contradiction reporting.

## Decision 3: Fixed status taxonomy

**Decision**: Classify items as implemented-verified, implemented-unverified,
partially-implemented, placeholder-or-mock, specified-only, environment-blocked, or absent.

**Rationale**: A binary done/not-done field hides the exact risk and encourages unsupported
completion claims.

**Alternatives considered**: Percentage-complete estimates. Rejected because they are subjective
and not reproducible.

## Decision 4: Playwright-owned visual evidence

**Decision**: Generate visual evidence through Playwright at 375, 768, 1024, and 1440 pixel widths,
in light and dark themes where supported, with role and state variants when rendering changes.

**Rationale**: The same browser harness can prove navigation, state, and screenshots. Named test
cases tie images to reproducible behavior and satisfy the requested review workflow.

**Alternatives considered**: Manual browser captures or historical screenshots. Rejected as sole
evidence because they do not prove route setup, state, or reproducibility.

## Decision 5: Evidence retained inside the feature

**Decision**: Store manifests, run summaries, final screenshots, findings, contradictions, and
roadmap under the active feature directory.

**Rationale**: Reviewers can inspect and version one complete audit package. Task-owned artifacts
are also easy to distinguish from pre-existing files during cleanup.

**Alternatives considered**: Reuse repository scratch folders or Playwright default output.
Rejected because ownership is ambiguous and routine cleanup may delete required evidence.

## Decision 6: Audit and remediation are separate

**Decision**: The audit may add narrowly scoped verification tests and documentation but does not
fix product defects.

**Rationale**: Fixing while discovering changes the system under measurement and makes the
inventory inconsistent. Separate remediation specs preserve reviewable scope and clean evidence.

**Alternatives considered**: Repair each defect immediately. Rejected because it creates an
unbounded mixed batch and prevents reliable baseline comparison.
