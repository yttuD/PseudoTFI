# Form and Dialog Behavior Report (`form-behavior.md`)

Date: 2026-09-25 (Correction Pass 02)  
Harness: Playwright 1.63 (`apps/web/e2e/brownfield_system_audit.spec.ts`)

## Executive Summary & Methodology Correction
The initial audit run primarily opened modals/routes and captured single static images, erroneously asserting full coverage across valid submission, boundary values, cancellation, server failure feedback, and keyboard traps. This report corrects the disposition of each form and interaction independently based strictly on executable evidence.

---

## Detailed Status of All 10 Forms and Dialogs

| Form ID | Component / Name | Valid Submission | Invalid / Required Checks | Boundary Input | Cancellation / Close | Server Failure Feedback | Keyboard & Safeguards | Observed Evidence & Real Disposition |
|---|---|---|---|---|---|---|---|---|
| FORM-001 | `AlquilerFormModal` | Unverified | Unverified | Unverified | Observed (close button clicked) | Unverified | Unverified | **partially-implemented**: Modal-open visual evidence only (`FORM-001__gestor__1440w__light__modal_open.png`). No valid submission or failure path executed. |
| FORM-002 | `FacturacionAfipClient` | Blocked (`BLOCK-AFIP-001`) | Attempted | Attempted (invalid CUIT string) | N/A (page form) | Unverified | Unverified | **environment-blocked**: Invalid CUIT attempted (`FORM-002__gestor__1440w__light__validation_boundary.png`); live AFIP CAE issuance blocked by missing homologation certificates. |
| FORM-003 | `GrupoFormModal` | Unverified | Unverified | Unverified | Observed (close button clicked) | Unverified | Unverified | **partially-implemented**: Modal-open visual evidence only (`FORM-003__gestor__1440w__light__modal_open.png`); full behavior matrix unproven. |
| FORM-004 | `InquilinoFormModal` | Unverified | Unverified | Unverified | Observed (close button clicked) | Unverified | Unverified | **partially-implemented**: Modal-open visual evidence only (`FORM-004__gestor__1440w__light__modal_open.png`); tenant/garante submission unproven. |
| FORM-005 | `UnidadForm` | Unverified | Submit clicked | Unverified | Redirects on cancel | Unverified | Unverified (375w sticky bar overlap) | **implemented-unverified**: Submit button clicked and captured (`FORM-005__gestor__1440w__light__validation_error.png`), but no explicit assertion verifies the expected validation error text. |
| FORM-006 | `LocationPickerMap` | Unverified | Unverified | Unverified | N/A | Unverified | Leaflet zoom controls rendered | **implemented-unverified**: Retained screenshot (`FORM-006__gestor__1440w__light__map_interactive.png`) shows map container rendered, but does not visibly prove map drag/click/geocoding interaction. |
| FORM-007 | `DelegadoFormModal` | Unverified | Unverified | Unverified | Observed (close button clicked) | Unverified | Defect: Missing role selector ('ver' vs 'gestionar') | **partially-implemented**: Modal-open visual evidence only (`FORM-007__gestor__1440w__light__modal_open.png`); invitation submission unverified; role selector absent (FIND-001/FIND-011). |
| FORM-008 | `ReporteModal` | Unverified | Unverified | Unverified | Unverified | Unverified | Requires auth token (guarded) | **partially-implemented**: Modal-open visual evidence only (`FORM-008__anon__1440w__light__report_modal.png`); captured while authenticated storage state was loaded (actor is authenticated, not anonymous). |
| FORM-009 | `SearchWizard` | Unverified | Unverified | Unverified | N/A | Unverified | Unverified | **implemented-unverified**: Retained capture (`FORM-009__anon__1440w__light__wizard_step.png`) shows homepage initial state, not proof of a wizard step transition. |
| FORM-010 | `SignupForm` | Unverified | Submit disabled when empty | Unverified | Link to login | Unverified | Verified: Submit button disabled | **implemented-verified**: Disabled-submit assertion is verified via Playwright (`expect(submitBtn).toBeDisabled()`). Screenshot duplicates registration visual; valid submission and server error unverified. |
