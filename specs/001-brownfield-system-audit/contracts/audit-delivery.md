# Antigravity Audit Delivery Contract

Antigravity MUST finish the batch with the following repository artifacts:

1. manifests for routes/surfaces, forms/dialogs, server capabilities, migrations/data, and tests
2. command run summaries with command, date, exit status, counts, skips, and blockers
3. final Playwright screenshots named by surface, viewport, theme, role, and state
4. findings report with P0-P3 severity, impact, root cause, and evidence
5. contradiction report comparing implementation, tests, documents, and constitution
6. remediation roadmap with bounded feature candidates
7. cleanup ledger listing created, retained, and removed task-owned artifacts
8. machine-readable delivery summary at evidence/delivery.json

The final response MUST state:

- terminal status: SUCCESS, PARTIAL, BLOCKED, or ERROR
- files added or modified
- commands executed and exact exit results
- inventory totals by kind and status
- visual matrix totals: expected, captured, inspected by Antigravity, and blocked
- findings totals by severity
- unresolved blockers and the exact prerequisite for each
- cleanup result

Acceptance rules:

- SUCCESS means every specification success criterion is met.
- PARTIAL means useful evidence exists but at least one criterion is unmet.
- BLOCKED means an external prerequisite prevents meaningful progress and is proven.
- ERROR means the batch failed before producing a reviewable package.
- Narrative claims never override missing repository evidence.
- Product defects are reported, not fixed, in this feature.
