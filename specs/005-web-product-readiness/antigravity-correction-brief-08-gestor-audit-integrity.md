# Correction Brief 08 — Gestor audit integrity

## Decision

Batch 03A is **not accepted yet**. Preserve the existing 160 PNGs and 20 PNG contact sheets. Do not rerun the full visual matrix and do not modify product code. Correct T026–T030 evidence/test integrity only; stop before T031.

## 1. Dashboard runtime failure must not be recorded as PASS

All eight `SURF-010` baseline cells visibly show the Next.js runtime error `Cannot read properties of undefined (reading 'length')` at `dashboard/page.tsx:444`. This is a whole-surface functional failure, not merely a contrast issue.

- Classify FIND-005-035 as **high** severity.
- Map it to **T035**, because T035 owns dashboard/metrics/logs. Do not map it to T031.
- In the acceptance matrix, mark Gestor default Dashboard functionality as `BL-FAIL:runtime` and visual acceptance as baseline failure. Do not state PASS for the normal Dashboard journey.
- Add an explicit Playwright assertion that a Gestor Dashboard default load has no Next.js error overlay/runtime error and renders the expected main heading/KPI shell. It is expected to fail now and should cite FIND-005-035.
- Run only this focused assertion and record its expected baseline failure separately; do not rerun all 160 visual cells.

## 2. Correct remediation-task ownership

Use the canonical tasks literally:

- T031: Grupo/Unidad/Location Picker workflows.
- T032: Inquilino workflows.
- T033: monthly/daily/hourly Alquiler and overlap/availability.
- T034: optional and Grupo-configurable seña.
- T035: Dashboard/Métricas/Logs.
- T036: Facturación/AFIP/Pagos.
- T037: Delegados UX.

Correct every broad responsive/touch/contrast finding so affected inventory maps to all and only the owning tasks. In particular:

- SURF-011/012/013 and FORM-003/005/006 -> T031.
- SURF-015 and FORM-004 -> T032.
- SURF-016 and FORM-001 -> T033/T034 according to defect.
- SURF-010/020/021 -> T035.
- SURF-017/018 and FORM-002 -> T036.
- SURF-019 and FORM-007/013 -> T037.
- FIND-005-034 (map/mobile) -> T031, not T035.

Split an over-broad finding if necessary to retain exact ownership and reproducible evidence.

## 3. Rental and seña assertions must match their claims

In `product_readiness_rentals.spec.ts`:

- TC-RENT-002 must assert both an allowed exact-boundary adjacency request/result and a rejected true-overlap request/result. A forced `?overlap-error=true` response alone is insufficient. Extend deterministic mock behavior only as needed.
- TC-RENT-004 must assert a concrete Buenos Aires conversion/boundary value, not only that `Intl` returned a non-empty string.
- TC-RENT-005 must validate cross-midnight interval behavior in `America/Argentina/Buenos_Aires`, not merely compare two UTC timestamps.
- TC-SENA-005 must not claim inheritance-source visibility, override and opt-out isolation from only filling `0`. Assert the required controls/source and unaffected Grupo state. Because Grupo defaults are missing, record an expected baseline product failure tied to FIND-005-002.
- Remove the nonexistent `TC-RENT-006` citation from reports.

Run only the 11 rental/seña tests after correcting them. Report exact focused totals honestly; baseline product failures are expected.

## 4. Reconcile execution language

- Preserve the original full baseline terminal record as: 181 discovered/executed, 84 passed, 97 failed, 0 skipped, if and only if that is the retained actual run result.
- Add a clearly separate supervisor-integrity focused run section for the Dashboard assertion and corrected 11 rental/seña tests. Do not merge focused reruns into the original full-run totals.
- “Soft assertion failures” are failed Playwright tests. Use `failed tests` in user-facing totals; describe soft assertions only as implementation detail.
- Correct any summary typo claiming identifiers other than canonical SURF-010–021 and FORM-001–007/013.

## 5. Evidence completeness wording

The 160-image matrix covers the canonical default surface/form cells. Do not claim it captures every loading/empty/success/error state if it does not. Record material state coverage in the functional journey section and explicitly list any state evidence deferred to remediation acceptance T038.

## Terminal delivery

Return:

1. files changed;
2. exact corrected focused Playwright results;
3. corrected findings-to-task map;
4. confirmation Dashboard is baseline high failure, not PASS;
5. original 160/150-hash/20-sheet evidence preserved;
6. direct TypeScript result and cleanup;
7. confirmation no product code and no T031+ were changed.
