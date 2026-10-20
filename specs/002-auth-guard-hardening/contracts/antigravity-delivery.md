# Contract: Antigravity Delivery

The final response must contain these sections and must not claim success without repository
evidence.

## 1. Scope and files

- List every changed file and its purpose.
- Confirm no file outside the allowed source/docs/evidence list changed because of this batch.
- Identify any pre-existing dirty-tree file encountered but not modified.

## 2. Requirement and task status

- Map FR-001 through FR-013 to implementation and test names.
- Report every task T001 onward as complete, incomplete, blocked, or not applicable.
- Do not mark a task complete before its retained evidence exists.

## 3. Verification

For each required command, report exact command, start/end time, exit code, passed/failed/skipped
counts, and evidence path. Include the targeted regression suite, full API suite, API production
build, and source-pattern checks.

## 4. Security review

- Explain why arbitrary, decode-only, provider-failure, and demo-in-production paths fail closed.
- Confirm authorization context does not use email or provider metadata.
- Confirm no credential, secret, or provider payload appears in logs/evidence.
- Report any remaining auth/authorization risk outside this bounded feature separately.

## 5. Visual evidence disposition

State `Not applicable: no rendered or interaction surface changed`. Do not manufacture screenshots
for a server-only change.

## 6. Cleanup and final status

- List exact task-owned temporary paths/processes removed.
- List retained evidence paths.
- Return one final status: `PASS`, `PARTIAL`, or `FAIL`, with blockers and residual risks.
