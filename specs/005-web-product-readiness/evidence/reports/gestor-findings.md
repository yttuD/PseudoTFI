# Gestor Findings Report (`gestor-findings.md`)

Conforms strictly to `contracts/inventory-contract.md` and `data-model.md`.  
Batch: **Batch 03A — Complete Gestor Baseline Audit (T026–T030)**  
Date: **2026-09-27**  
Audited Inventory Scope: **SURF-010 through SURF-021**, **FORM-001 through FORM-007**, **FORM-013**, **CTRL-003**, **CTRL-004**, **CTRL-005**.

---

## Executive Summary

The Gestor operational baseline audit was executed across all 12 operational surfaces, 8 forms/dialogs, 4 viewports (375px, 768px, 1024px, 1440px), and 2 real themes (persisted Light and Dark).

- **Total Baseline PNG Screenshots**: 160 (20 items × 4 viewports × 2 themes)
- **Unique SHA-256 Hashes**: 150
- **Hash Collisions**: 10 (8 from SURF-014 server-side redirect to SURF-011, 2 from SURF-012 and FORM-005 rendering the same new unit form layout on 375w)
- **Identical Light/Dark Pairs**: 0 (Full theme divergence verified across all surfaces)
- **Contact Sheets Generated**: 20 PNG contact sheets + HTML review index in `specs/005-web-product-readiness/evidence/contact-sheets/gestor/baseline/`
- **Total Discovered Playwright Tests**: 181 across 2 suites (`product_readiness_gestor.spec.ts` [170 tests], `product_readiness_rentals.spec.ts` [11 tests])
- **Terminal Execution Result**: 84 passed, 97 soft assertion failures recording authentic product defects for remediation in User Stories 2–4 (T031–T054). Zero tests skipped. Zero harness crashes.

---

## Detailed Findings Register (Mapped to T031–T037)

### FIND-005-002: Reusable Default Seña Configuration Missing on Grupo
- **Inventory ID**: SURF-011, FORM-003, SURF-016
- **Category**: domain / functionality
- **Severity**: high
- **Actor**: `gestor`
- **Reproduction**:
  1. Login as Gestor and navigate to `/es/mis-unidades`.
  2. Click "Nuevo Grupo" to open `GrupoFormModal` (FORM-003).
  3. Inspect modal fields for default seña percentage or amount.
- **Expected Result (FR-020)**: Gestor can configure an optional, reusable default seña percentage (e.g., 20%) on a Grupo. Any unit assigned to that Grupo automatically inherits this default during rental creation without mutating other groups.
- **Actual Result**: `GrupoFormModal` only accepts `nombre`, `color`, and `descripcion`. No seña default field exists in the UI or entity schema.
- **Evidence**: `apps/web/e2e/product_readiness_rentals.spec.ts` (`TC-SENA-004`), `FORM-003-contact-sheet.png`.
- **Target Remediation**: **T034 (US2)**

---

### FIND-005-003: AlquilerFormModal Lacks Distinct Domain Journeys for Rental Modalities
- **Inventory ID**: SURF-016, FORM-001
- **Category**: functionality / domain
- **Severity**: high
- **Actor**: `gestor`, `delegado_manage`
- **Reproduction**:
  1. Login as Gestor and navigate to `/es/alquileres`.
  2. Click "Nuevo Alquiler" to open `AlquilerFormModal` (FORM-001).
  3. Attempt to register a Daily or Hourly rental.
- **Expected Result (FR-019, FR-021)**: The form provides explicit modality selection:
  - **Monthly**: monthly price labels and calendar date pickers.
  - **Daily**: check-in / check-out date semantics and total daily rate calculation.
  - **Hourly**: calendar date, start time, end time, and hourly total rate calculation with explicit `America/Argentina/Buenos_Aires` boundary handling.
- **Actual Result**: The form only provides generic start and end date pickers and total contract amount, lacking modality selection, check-in/check-out semantics, and hourly time pickers.
- **Evidence**: `apps/web/e2e/product_readiness_rentals.spec.ts` (`TC-RENT-001`, `TC-RENT-003`, `TC-RENT-004`), `FORM-001-contact-sheet.png`.
- **Target Remediation**: **T033 (US2)**

---

### FIND-005-030: Hourly/Daily Rental Overlap and Boundary Adjacency Enforcement
- **Inventory ID**: SURF-016, FORM-001
- **Category**: domain / validation
- **Severity**: high
- **Actor**: `gestor`, `delegado_manage`
- **Reproduction**:
  1. In `/es/alquileres`, attempt to create two overlapping bookings for the same unit.
- **Expected Result (FR-021)**: Overlap rejection prevents concurrent reservations for the same unit while allowing exact boundary adjacency (e.g. 10:00–12:00 and 12:00–14:00 allowed).
- **Actual Result**: Client-side validation lacks temporal collision detection; relies on generic server validation without granular hourly interval checks.
- **Evidence**: `apps/web/e2e/product_readiness_rentals.spec.ts` (`TC-RENT-002`).
- **Target Remediation**: **T033 (US2)**

---

### FIND-005-031: Horizontal Table Overflow at 375px Mobile Viewport
- **Inventory ID**: SURF-011, SURF-015, SURF-016, SURF-017, SURF-018, SURF-020, SURF-021
- **Category**: responsive / UI
- **Severity**: medium
- **Actor**: `gestor`, `delegado_read`, `delegado_manage`
- **Width / Theme**: 375w (Light and Dark)
- **Reproduction**:
  1. Open viewport 375x667 on `/es/mis-unidades`, `/es/inquilinos`, `/es/alquileres`, `/es/facturacion`, `/es/facturacion-afip`, `/es/metricas` or `/es/logs`.
  2. Inspect document scroll width.
- **Expected Result (FR-012)**: Tables must either transform into responsive cards on mobile or be wrapped in a scroll container with zero document-level horizontal overflow (`scrollWidth === innerWidth`).
- **Actual Result**: Multi-column tables force document-level horizontal scrollbar on 375px.
- **Evidence**: `apps/web/e2e/product_readiness_gestor.spec.ts` overflow checks, `SURF-015-contact-sheet.png`, `SURF-016-contact-sheet.png`, `SURF-021-contact-sheet.png`.
- **Target Remediation**: **T031 (SURF-011), T032 (SURF-015), T033 (SURF-016), T035 (SURF-020, SURF-021), T036 (SURF-017, SURF-018)**

---

### FIND-005-032: Undersized Touch Targets on Operational Action Controls (< 44x44px)
- **Inventory ID**: SURF-010, SURF-011, SURF-015, SURF-016, SURF-019, SURF-020
- **Category**: accessibility
- **Severity**: medium
- **Actor**: `gestor`, `delegado_manage`
- **Width / Theme**: 375w, 768w
- **Reproduction**:
  1. Inspect table row action buttons (edit, view, delete icons), status badge links, and secondary filters.
- **Expected Result (FR-011)**: All touch targets measure at least 44×44px or have minimum 44px touch bounding boxes.
- **Actual Result**: Dense table action icon buttons measure 32×32px or 36×36px.
- **Evidence**: `apps/web/e2e/product_readiness_gestor.spec.ts` touch target assertions.
- **Target Remediation**: **T031 (SURF-011), T032 (SURF-015), T033 (SURF-016), T035 (SURF-010, SURF-020), T037 (SURF-019)**

---

### FIND-005-033: Subtitle and Muted Text Contrast in Dark Mode (< 4.5:1)
- **Inventory ID**: SURF-010, SURF-017, SURF-018, SURF-020, SURF-021
- **Category**: accessibility / contrast
- **Severity**: medium
- **Actor**: `gestor`
- **Width / Theme**: 375w, 768w, 1024w, 1440w (Dark Theme)
- **Reproduction**:
  1. Set theme to Dark (`#101B37`).
  2. Inspect computed text contrast for `text-muted-foreground` and secondary metadata descriptions.
- **Expected Result (FR-013)**: All normal body and subtitle text meets WCAG AA 4.5:1 ratio against `#101B37`.
- **Actual Result**: `text-muted-foreground` evaluates to approximately 3.2:1–3.8:1 against `#101B37` background.
- **Evidence**: `apps/web/e2e/product_readiness_gestor.spec.ts` contrast assertions.
- **Target Remediation**: **T035 (SURF-010, SURF-020, SURF-021), T036 (SURF-017, SURF-018)**

---

### FIND-005-034: Responsive Map View Inconsistency on Mobile (< 768px)
- **Inventory ID**: SURF-012, FORM-006
- **Category**: responsive / UI
- **Severity**: low
- **Actor**: `gestor`
- **Width / Theme**: 375w
- **Reproduction**:
  1. Navigate to `/es/mis-unidades/nueva` at 375w.
  2. Map container is hidden and replaced by a modal trigger button.
- **Expected Result**: Clean mobile UX indicating location selection with map preview.
- **Actual Result**: Fullscreen modal dialog opens without inline coordinates preview on the main form.
- **Evidence**: `FORM-006-contact-sheet.png`.
- **Target Remediation**: **T031 (US2)**

---

### FIND-005-035: Delegados Statistics Array Null Safety Runtime Failure on Dashboard
- **Inventory ID**: SURF-010
- **Category**: UI / reliability
- **Severity**: high
- **Actor**: `gestor`
- **Reproduction**:
  1. Navigate to `/es/dashboard` with default Gestor session.
- **Expected Result**: Dashboard renders KPI cards and shell safely without runtime crashes.
- **Actual Result**: Uncaught runtime exception `TypeError: Cannot read properties of undefined (reading 'length')` at `dashboard/page.tsx:444` (`delegadosData.activos.length`). Entire surface crashes on default load.
- **Evidence**: Visible in all 8 baseline cells of `SURF-010__*`; confirmed by Playwright assertion in `apps/web/e2e/product_readiness_gestor.spec.ts` (`TC-GES-DASH`).
- **Target Remediation**: **T035 (US2)**

---

## Classification Summary by Target Remediation Task

| Finding ID | Inventory ID | Severity | Category | Target Task | Status after Batch 03B2 |
|---|---|---|---|---|---|
| **FIND-005-002** | SURF-011, FORM-003, SURF-016 | High | domain / functionality | **T034** | **VERIFIED / FIXED** (Grupo default seña config + Alquiler choices) |
| **FIND-005-003** | SURF-016, FORM-001 | High | functionality / domain | **T033** | **VERIFIED / FIXED** (Monthly, Daily, Hourly modalities & time pickers) |
| **FIND-005-030** | SURF-016, FORM-001 | High | domain / validation | **T033** | **VERIFIED / FIXED** (Half-open [inicio_at, fin_at) 409 conflict & boundary adjacency) |
| **FIND-005-031** | SURF-011, 015, 016, 017, 018, 020, 021 | Medium | responsive / overflow | **T031, T032, T033, T035, T036** | **VERIFIED / FIXED** (Zero document overflow at 375w across all Gestor operations tables & cards) |
| **FIND-005-032** | SURF-010, 011, 015, 016, 017, 018, 019, 020, 021 | Medium | accessibility / touch | **T031, T032, T033, T035, T036, T037** | **VERIFIED / FIXED** (All interactive targets, links, inputs & action buttons >= 44x44px bounding box) |
| **FIND-005-033** | SURF-010, 017, 018, 020, 021 | Medium | accessibility / contrast | **T035, T036** | **VERIFIED / FIXED** (WCAG AA compliant contrast with #AEB7C7 and theme-aware cards/badges) |
| **FIND-005-034** | SURF-012, FORM-006 | Low | responsive / UI | **T031** | **VERIFIED / FIXED** (Mobile location preview outside map dialog) |
| **FIND-005-035** | SURF-010 | High | UI / reliability | **T035** | **VERIFIED / FIXED** (Null safety on delegados array, typed data mappings & API error fallback) |

---

## Batch 03B2 Operations Acceptance Status (T035–T039)

- **FIND-005-031**: Remediated across all operational surfaces. Multi-column tables and filters on SURF-017, SURF-018, SURF-020, and SURF-021 wrapped with responsive overflow containers and card transforms; zero document-level horizontal overflow confirmed across all 375w viewports.
- **FIND-005-032**: Remediated across all operational surfaces. Interactive controls, filter selects, and action buttons in Dashboard (SURF-010), Facturación (SURF-017), Facturación AFIP (SURF-018), Delegados (SURF-019), Métricas (SURF-020), and Logs (SURF-021) meet or exceed the 44×44px minimum touch target requirement.
- **FIND-005-033**: Remediated across all operational views. Dark mode tokens, text descriptions, table headers, and badges satisfy WCAG AA contrast thresholds (>= 4.5:1 for normal text).
- **FIND-005-035**: Remediated in T035. Added defensive null safety on `delegados`, typed data mappings without `any`, and honest API error fallback banner (`data-testid="dashboard-api-error"`). Dashboard loads cleanly in all 8 viewport/theme cells without uncaught runtime errors.
- **FORM-002, FORM-007, FORM-013**: Native dialogs eliminated. Added 2-step confirmation modal for delegation revocation (`FORM-013`), accessible Cupo payment modal (`FORM-002`), and Delegado invitation modal (`FORM-007`) with deterministic loading, validation error, API error, and success testids. Verified across 184 Playwright captures and 23 contact sheets.

---

## Evidence Completeness and State Coverage Scope

The 160 baseline PNG screenshots cover the canonical default surface and form/dialog cells (12 surfaces + 8 forms/dialogs across 4 viewports and 2 themes). Material state coverage (fail-closed denied states, 403 banners, server-side redirects, and boundary conditions) is verified within the functional journey suites (`product_readiness_gestor.spec.ts` and `product_readiness_rentals.spec.ts`).

Granular visual state captures for intermediate dynamic states (loading skeletons, empty tables, in-flight form validations, success toasts, and error boundaries) are explicitly deferred to the remediation acceptance phase (**T038**).

No product code was modified during this audit batch. All findings are verified and assigned for remediation in T031–T037.
