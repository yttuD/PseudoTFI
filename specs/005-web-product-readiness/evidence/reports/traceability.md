# Traceability Matrix (`traceability.md`)

Bidirectional traceability between **Functional Requirements (FR-001 to FR-031)**, **Tasks (T001 to T066)**, **Inventory Items**, **Test Suites**, and **Evidence Artifacts**.

## Traceability Mapping

| Req ID | Requirement Description | Governing Phase & Tasks | Affected Inventory Items | Test Suite / Verification Seam | Fresh Evidence Path |
|---|---|---|---|---|---|
| **FR-001** | Maintain single source of truth inventory | Phase 1 & 2 (T001–T011) | All (SURF, FORM, CAP, MIG, TEST) | `manifests/*.md` | `manifests/` |
| **FR-002** | Stable ID, actor, status, dependencies for items | Phase 1 & 2 (T002, T007–T011) | All inventory items | `contracts/inventory-contract.md` | `manifests/` |
| **FR-003** | Explicit delta against Feature 001 | Phase 2 (T012) | All inventory items | `reports/audit-001-delta.md` | `reports/audit-001-delta.md` |
| **FR-004** | Public surface isolation from operational space | Phase 3 (T017–T025) | SURF-001–008, SURF-026 | `product_readiness_public.spec.ts` | `screenshots/public/` |
| **FR-005** | Distinguish Gestor owner vs delegable actions | Phase 4 & 5 (T026–T047) | SURF-010–021, CAP-004, CAP-014 | `delegado_scope_authorization.spec.ts` | `screenshots/delegado/` |
| **FR-006** | Delegado read vs manage and scope representation | Phase 5 (T040–T047) | SURF-010–016, FORM-013, CAP-004 | `delegado_scope_authorization.spec.ts` | `screenshots/delegado/` |
| **FR-007** | Internal dev console strict isolation | Phase 6 (T048–T054) | SURF-022–025, LAY-004 | `product_readiness_dev.spec.ts` | `screenshots/dev/` |
| **FR-008** | Sensitive owner billing/fiscal hidden from delegates | Phase 5 (T041, T045) | SURF-017, SURF-018, FORM-002 | `owner-only-authorization.spec.ts` | `screenshots/delegado/` |
| **FR-009** | Intentional loading, empty, error states | Phase 3–7 (T021, T035, T052, T059) | LOAD-001–011, all SURF | Playwright visual suites | `screenshots/` |
| **FR-010** | Form validation, anti-double submit, preserved input | Phase 3 & 4 (T022, T031–T034) | FORM-001–015 | Form interaction tests | `reports/findings.md` |
| **FR-011** | Keyboard, visible focus, 44x44 touch targets | Phase 7 (T055, T056) | All forms and interactive controls | `product-readiness.ts` helpers | `reports/findings.md` |
| **FR-012** | No horizontal overflow across 375/768/1024/1440 | Phase 7 (T055) | All surfaces | `product-readiness.ts` helpers | `reports/findings.md` |
| **FR-013** | WCAG AA contrast in light and dark themes | Phase 7 (T057) | All surfaces | `product-readiness.ts` helpers | `reports/findings.md` |
| **FR-014** | Brand colors applied consistently | Phase 7 (T057) | All surfaces | Playwright visual inspection | `contact-sheets/` |
| **FR-015** | Marketplace catalog, search, and detail journeys | Phase 3 (T017–T025) | SURF-001–004, FORM-009, FORM-015 | `product_readiness_public.spec.ts` | `screenshots/public/` |
| **FR-016** | Contextual authentication and onboarding | Phase 3 (T022) | SURF-007, SURF-008, SURF-009 | `auth_register_login_flow.spec.ts` | `screenshots/public/` |
| **FR-017** | Gestor unit and group CRUD with pricing | Phase 4 (T031) | SURF-011–013, FORM-003, FORM-005 | `product_readiness_gestor.spec.ts` | `screenshots/gestor/` |
| **FR-018** | Gestor tenant CRM with guarantor and consent | Phase 4 (T032) | SURF-015, FORM-004, CAP-007 | `product_readiness_gestor.spec.ts` | `screenshots/gestor/` |
| **FR-019** | Distinct monthly, daily, hourly rental rules | Phase 4 (T027, T033) | SURF-016, FORM-001, CAP-002 | `product_readiness_rentals.spec.ts` | `screenshots/gestor/` |
| **FR-020** | Optional seña and reusable Grupo configuration | Phase 4 (T028, T034) | SURF-016, FORM-001, CAP-002 | `product_readiness_rentals.spec.ts` | `screenshots/gestor/` |
| **FR-021** | Availability and overlap checks per modality | Phase 4 (T027, T033) | SURF-016, CAP-002 | `product_readiness_rentals.spec.ts` | `screenshots/gestor/` |
| **FR-022** | Interpretable metrics and empty states | Phase 4 (T035) | SURF-020, CAP-012 | `metricas_dashboard_analytics.spec.ts` | `screenshots/gestor/` |
| **FR-023** | Actionable billing, payments, and fiscal states | Phase 4 (T036) | SURF-017, SURF-018, FORM-002 | Playwright test suites | `screenshots/gestor/` |
| **FR-024** | Scoped delegate invitations and lifecycle | Phase 4 & 5 (T037, T040–T047) | SURF-019, SURF-026, FORM-013, 014 | `delegado_scope_authorization.spec.ts` | `screenshots/delegado/` |
| **FR-025** | Audit logging of sensitive actions & denials | Phase 5 & 6 (T045, T052) | SURF-021, SURF-023, CAP-014 | `authorization-matrix.spec.ts` | `test-results/` |
| **FR-026** | Independent desktop and responsive verification | Phase 7 (T055) | All surfaces | Playwright matrix at 4 widths | `manifests/acceptance-matrix.md` |
| **FR-027** | Named visual proof for every reviewed cell | Phase 3–7 (T024, T038, T046, T053) | All surfaces | Playwright screenshot engine | `screenshots/` |
| **FR-028** | Test matrix includes positive, error, denial | Phase 3–7 | All surfaces | Playwright functional assertions | `manifests/acceptance-matrix.md` |
| **FR-029** | Bidirectional traceability across artifacts | Phase 1 & 8 (T004, T065) | All artifacts | `reports/traceability.md` | `reports/traceability.md` |
| **FR-030** | Zero critical/high defects at final gate | Phase 8 (T063) | All findings | `reports/findings.md` | `reports/findings.md` |
| **FR-031** | Accepted medium exceptions explicitly justified | Phase 8 (T063) | All findings | `reports/findings.md` | `reports/findings.md` |
