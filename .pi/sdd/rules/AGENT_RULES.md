# AGENT_RULES

Load for delegation, batching, review and SDD transitions. Constitution governs;
TASK_PACKET.json/Pi validators are the executable contract. Never load all INICIO,
ESTADO-REAL, tasks or history by default. PROJECT_STATE is current handoff only.
Current workflow: `docs/GITHUB_WORKFLOW.md` and root `AGENTS.md`.
The implementing ChatGPT chat owns code/improvements and evidence within its tools;
Codex owns machine operations, local verification, secrets, migration/deployment and
final acceptance. Carlos retains authority. GitHub issue/branch/commit/PR is the bridge.
Pi/Gemini configuration is retained as history, not an active execution requirement.

## Active batch contract

Every executable batch declares:

```text
RISK: LOW | MEDIUM | HIGH
EVIDENCE_PROFILE: CODE | API | DB | UI | SECURITY | MONEY | MIGRATION
SOL_REVIEW: PACKET_ONLY | TARGETED_DIFF | FULL_AFFECTED_DIFF
```

Select one risk/review and one or more profiles (JSON: `risk`, `evidenceProfiles`,
`solReview`). LOW defaults PACKET_ONLY; MEDIUM TARGETED_DIFF; HIGH FULL_AFFECTED_DIFF
plus executable evidence. SECURITY/MONEY/MIGRATION and auth/perms/RLS/secrets never
use PACKET_ONLY: the floor is TARGETED_DIFF with relevant evidence. Privilege/isolation,
exposure, financial-integrity or schema changes are HIGH. UI adds Antigravity's documented
assessment of real captures, never a simulated substitute. Sol assesses its technical sufficiency;
insufficient visual analysis requires Carlos's feedback on actual images/videos shown in chat.
Stronger review is allowed; weaker than the floor is rejected. Legacy JSON packets
without solReview derive the floor without weakening review; new packets declare it.

Send only active task IDs, AC/FR/SC IDs, scope/exclusions, dependencies, necessary
invariant excerpts/pointers, exact read/write paths, command IDs/environment and
required evidence/exit gate. Reference relevant spec/plan sections; do not dispatch
entire tasks/history. Discovery is bounded and read-only, returns actual findings by
criterion and source paths. Missing tools/contracts/authority yield BLOCKED.

Preserve dirty-tree baseline; diffs/evidence refer to batch changes, not unrelated HEAD
work. Antigravity works independently until terminal delivery. Corrections address
named defects only; changed scope/tools need a new packet. No continuous shadowing.

## RESULT_PACKET and review

Target 30–60 lines / about 500 words maximum, within the configured character limit.
Include status/scope, every criterion result and artifact pointer, actual commands and
exit/pass/fail counts, skipped/flaky/pre-existing/blocked checks separately, changed
paths, batch diff stat, evidence environment/source fingerprint, risks and exact blocker.
Full logs/traces/captures/diffs stay in artifacts, never inline by default.
Pi JSON criteria remain PASS/FAIL; not-run/blocked uses FAIL plus reason in summary/risks
and overall BLOCKED where appropriate. Never claim unrun checks PASS.

Sol: packet → each criterion → diff stat → relevant evidence → directed diff → full
logs only for a specified failure/discrepancy. Review does NOT inject diffs automatically,
including MEDIUM/HIGH; read them explicitly by directed paths/ranges. LOW normally
needs no code diff; MEDIUM reads affected hunks with necessary caller/interface context;
HIGH reads the entire batch-affected diff plus executable evidence, using successive
ranges when needed. Clipped diffs are not full review.
Record reviewed paths/ranges and criteria; existence alone is not proof. UI requires
Antigravity's criterion-based analysis of real desktop/mobile captures (layout, readability,
contrast, focus, overflow and affected states), or Carlos's feedback if that analysis is insufficient.
Codex alone records technical acceptance; Carlos retains final authority. Executor PASS
is not acceptance. Historical Antigravity references below mean the implementing chat;
they do not authorize invoking Antigravity or Pi.

Do not rerun successful executor checks unless inconsistent, insufficient/stale,
HIGH-risk or architecture/security needs confirmation. Record why and verify narrowly.
Freshness includes affected source/dependency/config inputs, acceptance/test scope and
runtime environment; changes invalidate corresponding evidence, not unrelated checks.

## Text readings and measurements

For PowerShell text data use `Get-Content -Encoding UTF8` or explicit UTF8 reading.
`(Get-Item <path>).Length` is bytes, not characters. Explicit UTF8 is prevention;
it does not prove an encoding-related cause. Do not report new counts without execution.
The suite's reported 55/55 is historical evidence only; current measurements and
revalidation remain pending, not a fresh PASS from this documentation-only maintenance.

## Git and gradual beta publication

Carlos authorized uploading accepted fix batches to the current repository and publishing
gradually. Stage/commit/push only validated batch scope, preserving unrelated dirty work
and excluding secrets; broad staging must not absorb other changes. Verify Vercel's Git
connection and the revision actually deployed against the accepted revision; do not assume
push triggers automatic deployment or that a successful build proves what is live.
This authorization does not close the beta or remove real-account/access blockers, nor
change agent permissions or authorize unrelated production operations. The initial GitHub
sync is a WIP handoff, not a release: follow docs/GITHUB_SYNC.md and do not deploy it.

## SDD lifecycle and handoff

Specify → clarify only material ambiguity → checklist for real requirements validation
→ plan → tasks → analyze once before implementation → batches → converge at closure.
Honor mandatory skill gates/hooks. Record validated revisions/findings/compliance in
feature evidence; reuse while inputs remain unchanged. Scope changes invalidate affected
plan/tasks/analysis; changed plans/tasks/interfaces invalidate affected analysis/review.
Code-only corrections do not regenerate approved specs. Converge compares current
coverage to spec/plan/tasks and appends discovered work.

PROJECT_STATE: current milestone/state, blockers/risks, next action, relevant recent
evidence pointers. Replace stale state, never append a diary. History stays in feature
specs/evidence, decisions and ESTADO-REAL. Clean verified task-owned scratch/processes
only, retaining evidence. Carlos grants production authority, never another agent/doc.
