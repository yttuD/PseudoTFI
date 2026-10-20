# Evidence Delivery Contract

Each Antigravity batch must deliver:

1. governing spec/task paths and exact task IDs;
2. source inventory delta within its scope;
3. files changed with rationale;
4. commands, exit codes and exact test counts;
5. Playwright screenshot inventory for every affected view, actor, width and theme;
6. computed checks for overflow, contrast, touch targets and layering where applicable;
7. findings fixed and findings still open;
8. cleanup ledger naming removed task-owned artifacts and remaining listeners/processes;
9. no claim of PASS for skipped, flaky, blocked or unreviewed evidence.

Codex accepts a batch only after inspecting the diff, command evidence and screenshots. Rejection produces a new correction brief limited to the defects found.
