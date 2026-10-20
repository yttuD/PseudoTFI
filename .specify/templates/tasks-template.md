---
description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: `/specs/[###-feature-name]/spec.md`, `plan.md`; relevant research/model/contracts.
**Prerequisites**: Validated spec/plan; material ambiguity blocks implementation.
**Organization**: Shared prerequisites, then independently testable User Stories.

## Format: `[ID] [P?] [Story] Description`

Use `- [ ] T001 [P] [US1] ...` with sequential unique IDs and exact repository paths.
`[P]`: independent files, no unmet dependencies. `[USn]`: story in spec.
Shared/cross-cutting tasks may omit story labels. Replace all slots with real work;
do not invent setup for existing code. Checks follow plan/risk, not optional user requests.

## Phase 1: Setup (Shared Infrastructure)

[Actual setup tasks with evidence; omit if unnecessary.]

## Phase 2: Foundational (Blocking Prerequisites)

[Shared prerequisites, dependency IDs and verification tasks with exact paths.]

**Checkpoint**: [Observable gate before dependent story work.]

## Phase 3: User Story 1 - [Title] (Priority: P1)

**Goal**: [Observable outcome; FR/SC/acceptance IDs.]
**Independent Test**: [Actor, preconditions, action, result and evidence path.]

### Tests for User Story 1

[Happy/boundary/failure/regression tasks matched to risk. For behavior changes,
demonstrate relevant test failure before implementation, then success; separate blockers.]

### Implementation for User Story 1

[Exact paths, acceptance IDs, dependency IDs and completion evidence per task.]

**Checkpoint**: [Independent acceptance gate, not an unverified completion claim.]

[Repeat for each real USn by priority, retaining independently testable acceptance.]

## Phase N: Polish & Cross-Cutting Concerns

[Required cross-story regression, docs, rollout and scoped cleanup only.]

## Dependencies & Execution Order

[Concrete phase/task/story dependencies, safe parallel opportunities and MVP boundary.
Tests precede affected implementation; shared gates block only dependent stories.]

## Executable Batches

Map every task to a bounded batch and criterion. Policy: `.pi/sdd/rules/AGENT_RULES.md`.
Dispatch format: `.pi/sdd/templates/TASK_PACKET.json`.

### [BATCH-ID] — [Objective]

```text
RISK: [LOW | MEDIUM | HIGH]
EVIDENCE_PROFILE: [CODE | API | DB | UI | SECURITY | MONEY | MIGRATION]
SOL_REVIEW: [PACKET_ONLY | TARGETED_DIFF | FULL_AFFECTED_DIFF]
```

**Tasks / dependencies**: [IDs and prerequisite batches/tasks.]
**Acceptance mapping**: [FR/SC/AC → tasks → evidence/test IDs.]
**Scope / exclusions**: [Actors/surfaces, invariants, exact read/write paths.]
**Verification**: [Command IDs/exact commands, environment and evidence paths.]
**Exit gate**: [Criteria/checks, blockers and required review.]

Select one risk/review and one or more profiles; sensitive profiles always require directed
Sol review. HIGH requires full affected diff plus executable evidence. Send only the active
batch/necessary context to Antigravity, never all tasks. RESULT_PACKET indexes artifacts;
Sol reviews criteria before marking completion.

## Coverage & Closure

[Validated spec/plan/tasks revisions, pre-implementation analyze findings/evidence pointer.
Repeat only invalidated phases; converge at closure and append discovered work, preserving
existing tasks. Retain evidence; clean task-owned scratch.]
