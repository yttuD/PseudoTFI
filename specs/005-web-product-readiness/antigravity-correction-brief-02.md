# Antigravity correction brief 02 — foundation accuracy

## Governing scope

Correct only the rejected portions of Feature 005 T011, T012, T014 and T015. Read Batch 01 delivery plus current source. Docker/Supabase/WSL and all browser/web servers must remain off.

Allowed writes:

- `apps/web/e2e/fixtures/actors.ts`
- `apps/web/e2e/fixtures/product-readiness.ts`
- `apps/web/e2e/fixtures/product-readiness.spec.ts`
- `specs/005-web-product-readiness/evidence/manifests/automated-tests.md`
- `specs/005-web-product-readiness/evidence/reports/audit-001-delta.md`
- any Feature 005 manifest/report that repeats the rejected counts or actor role
- `specs/005-web-product-readiness/tasks.md` only to preserve correct T001–T016 state after revalidation

No product code, mock API behavior, migrations or other feature documents may change.

## Rejected defects to correct

### 1. Exact denominator

The filesystem currently contains:

- 32 `apps/web/e2e/**/*.spec.ts`, including the newly created `apps/web/e2e/fixtures/product-readiness.spec.ts`;
- 21 `apps/api/src/**/*.spec.ts`;
- 1 `supabase/tests/*.sql`;
- total automated suites: 54.

Therefore current tracked denominator is 148, and delta versus Feature 001 is +45, assuming the other categories remain 41/20/15/18. Add a stable inventory row for the fixture/helper test and correct every repeated total/delta. Recompute rather than blindly copying these numbers.

### 2. Canonical public role

`apps/web/src/lib/supabase/client-auth.ts`, middleware and API guard identify the authenticated public/search role as `buscador`, not `inquilino`. Keep the audit actor label `public_user`, but set its auth role and session metadata to canonical `buscador`. Update descriptions/manifests that state otherwise. An Inquilino is a CRM domain entity, not an authentication role.

### 3. Contrast helper false positives

`checkElementContrast` currently stops at a partially transparent ancestor and blends it against a fixed default base rather than recursively composing all visible ancestor backgrounds to the canvas. Correct it to compute the effective background through the ancestor chain, including every alpha layer and the actual document/body canvas. The optional base may be the final fallback only. Add deterministic unit-style assertions using pure exported color functions or a DOM-free test path; do not launch a browser.

### 4. Focus helper false positives

`checkVisibleFocus` currently treats any pre-existing box shadow as a focus indicator. Measure styles before focus and after keyboard-equivalent focus, and pass only when a visible outline/ring is newly present or materially changes. Return before/after diagnostic values. Keep behavior browser-callable, and test pure comparison logic without launching a browser.

### 5. Touch-target helper false negatives

The blanket exclusion `a` inside `p, span` can ignore real navigation/actions. Exclude only genuine inline prose links when their computed display is inline and their context is a text paragraph; never exclude links with button/navigation semantics, test IDs, icons, classes indicating controls, or standalone span wrappers. Also detect elements protruding left of the viewport in overflow diagnostics.

### 6. Fixture test quality

The fixture spec currently only checks that functions exist. Extend it with deterministic assertions for:

- public actor session metadata role `buscador`;
- denominator helper test naming if applicable;
- recursive alpha composition math;
- focus-style comparison behavior;
- touch/prose-link classification behavior where factored into pure functions.

Run `pnpm --filter web exec tsc --noEmit` and the narrow test only if it can run without starting a web server/browser; otherwise run a Node/TypeScript unit path that proves the pure functions. Do not falsely call compile-only checks behavioral validation.

## Delivery

Return once with exact corrected counts, files changed, validation commands/results, explanation of each helper correction and confirmation Docker/WSL stayed off, ports 3000/3001 are free and no temporaries/processes remain.
