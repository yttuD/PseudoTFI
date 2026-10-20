# Validation Quickstart

## Prerequisites

- Run from the repository root.
- Use the current working tree; do not stash, reset, or discard user changes.
- Required local environment variables may be present, but their values must never be printed.
- External production services remain read-only.

## 1. Confirm the active feature

Read .specify/feature.json and confirm it points to specs/001-brownfield-system-audit.

Expected result: all audit artifacts are written under that feature directory except a narrowly
scoped Playwright audit specification when needed.

## 2. Reconcile discovery manifests

Compare each manifest count against an independent source file listing.

Expected result: every active route, form/dialog, server controller, migration, and test appears
once or is named in the exclusions report.

## 3. Run technical verification

~~~powershell
pnpm --filter api test
pnpm --filter api build
pnpm --filter web build
pnpm --filter web exec playwright test
~~~

If the full browser suite is too broad for the first evidence run, execute the audit specification
first and record the full-suite command as pending. A final SUCCESS still requires the complete
applicable suite.

Expected result: evidence/runs contains one dated summary per command with real exit status and
test counts. Failures remain failures and are mapped to findings.

## 4. Review visual evidence

For each user-facing surface, inspect captures at applicable 375, 768, 1024, and 1440 pixel widths,
in light and dark themes, plus role/state variants.

Reject captures with browser errors, missing assets, missing fonts, clipped content, unintended
horizontal scrolling, unreadable contrast, or fixture failures. One confirmation pass may replace
rejected captures after the environment issue is classified.

## 5. Validate reports

Confirm:

- all P0/P1 findings link to current evidence and a remediation candidate
- blockers name an exact missing prerequisite
- contradictions quote both sides and identify the governing source
- delivery.json totals match the human-readable manifests and reports

## 6. Validate cleanup

Compare the cleanup ledger with files and processes created by this feature.

Expected result: retained evidence remains under the feature directory; task-owned temporary
directories, default browser traces, downloads, caches, and test servers are removed. Pre-existing
workspace files are untouched.
