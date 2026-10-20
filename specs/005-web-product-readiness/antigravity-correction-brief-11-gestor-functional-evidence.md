# Correction Brief 11 — Gestor functional evidence integrity

## Scope

Correct only the functional Playwright evidence for accepted Batch 03B2 (`T035`–`T039`). Do not start `T040+` and do not redesign accepted screens.

## Independent review findings

Focused run:

```text
product_readiness_gestor.spec.ts --grep TC-GES-00[156789]
1 passed / 5 failed
TC-GES-DASH: passed independently
```

The rendered pages in the failure snapshots are healthy. The failures come from stale or invalid test evidence:

1. `TC-GES-001`: a union locator resolves to both denial container and banner, violating Playwright strict mode.
2. `TC-GES-005`: `/delegados` mock returns obsolete snake_case/flat objects, while the canonical `DelegadoInvitation` and `DelegationSummary` contract is nested camelCase (`target`, `delegado`, `alcanceTipo`, `createdAt`, `updatedAt`). The page therefore renders `Colaborador ()`.
3. `TC-GES-007` and `TC-GES-009`: selectors such as `text=Vistas, text=Contactos` are not valid alternatives and search for a literal combined selector.
4. `TC-GES-008`: the accepted logs UI is a card/list timeline, but the old assertion only accepts a table/row.

## Required correction

- Update the mock fixture to the exact current shared DTO contract. Do not add production fallbacks for obsolete test-only payloads.
- Replace ambiguous/string CSS locators with strict `getByTestId`, `getByRole`, or exact accessible assertions.
- Assert meaningful content and behavior for each surface, including:
  - denial feedback and owner-only boundaries;
  - canonical delegate identity plus invite, permission editor, and two-step revoke controls;
  - metrics KPIs and chart container;
  - logs list entries and filters;
  - billing cupo/plan content and payment modal;
  - dashboard absence of runtime overlay.
- Remove inappropriate `expect.soft` from acceptance-critical assertions.
- Do not delete, weaken, skip, or conditionally bypass assertions.
- If a stable semantic test id is genuinely absent, adding a narrowly scoped `data-testid` is allowed; avoid product behavior changes.

## Required verification and terminal delivery

Run and report exact totals for:

1. all functional tests in `e2e/product_readiness_gestor.spec.ts`;
2. the focused cases `TC-GES-001`, `005`, `006`, `007`, `008`, `009`, and `DASH`;
3. direct web TypeScript check;
4. web production build.

Reuse the already accepted 184 visual captures; do not regenerate them unless production UI changes. If production UI changes, rerun the affected Playwright visual matrix and deliver new PNG screenshots/contact sheets.

At finish, remove task-owned `test-results`, ensure ports 3000/3001 are free, keep Docker/WSL off, and provide only the concise terminal report.

## Independent addendum — TC-GES-004

After the focused six cases passed, independent regression found `TC-GES-004` reproducibly failing: clicking `btn-nuevo-inquilino` does not open `FORM-004`. `GrupoFormModal` uses the same Base UI controlled-dialog pattern successfully, but `InquilinoFormModal` adds a redundant child `onClick={() => setOpen(true)}` inside `DialogTrigger`. Diagnose and repair the real interaction; do not hide it with waits, double-clicks, retries, or weakened assertions.

For this addendum run only `TC-GES-004`, `TC-GES-010`, `TC-GES-DASH`, direct web TypeScript, and web production build. The independent reviewer already has clean 6/6 totals for `001/005/006/007/008/009` and clean `002/003` totals. Return a terminal report immediately after cleanup; do not rerun the visual matrix or already-clean cases.
