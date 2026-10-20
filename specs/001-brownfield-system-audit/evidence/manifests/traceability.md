# Traceability Matrix and Inventory Reconciliation (`traceability.md`)

## Total Counts Reconciliation

| Manifest | Source Denominator Item Count | Manifest Row Count | Unmapped / Excluded |
|---|---|---|---|
| Routes & Surfaces | 45 App Router files (25 page route entries) | 25 primary rows (24 rendered surfaces + 1 redirect alias) | 0 unexplained |
| Forms & Dialogs | 10 primary form/dialog components | 10 interaction rows | 0 unexplained |
| API Capabilities | 13 `@Controller` decorators in source | 13 capability rows | 0 unexplained |
| Database Migrations | 16 SQL migrations | 16 migration rows | 0 unexplained |
| Automated Tests & Specs | 39 test spec files (30 E2E, 9 API) | 39 test rows (1:1 mapping) | 0 unexplained |
| **Total Inventory Items** | **123 source-discovered artifacts** | **103 unique inventory rows** | **0 unexplained** |

### Status Reconciliation Breakdown (Sum = 103)
- **implemented-verified**: 45 (24 surfaces/alias, 1 form, 10 capabilities, 10 tests)
- **partially-implemented**: 7 (5 forms: FORM-001, 003, 004, 007, 008; 2 capabilities: CAP-001, CAP-004)
- **implemented-unverified**: 48 (3 forms: FORM-005, 006, 009; 16 migrations; 29 pre-existing tests)
- **environment-blocked**: 3 (1 surface: SURF-019; 1 form: FORM-002; 1 capability: CAP-013)
- **placeholder-or-mock**: 0
- **specified-only**: 0
- **absent**: 0

---

## Surface to Interaction and Capability Traceability Map

| Surface ID | Surface Name | Route Kind | Audience | Forms / Interactions | Capabilities | Verified Status | Evidence Key | Notes / Blockers |
|---|---|---|---|---|---|---|---|---|
| SURF-001 | Home / Marketplace Search | rendered page | public | FORM-009 (SearchWizard) | CAP-008 | implemented-verified | EVID-SURF-001, EVID-RUN-PLAYWRIGHT-TARGETED | Full 4-viewport light/dark matrix verified; anonymous access verified. |
| SURF-002 | Catálogo de Unidades | rendered page | public | FORM-009 (SearchWizard) | CAP-008 | implemented-verified | EVID-SURF-002, EVID-RUN-PLAYWRIGHT-TARGETED | Full 4-viewport light/dark matrix verified; anonymous access verified. |
| SURF-003 | Detalle de Unidad | rendered page | public | FORM-008 (ReporteModal) | CAP-008, CAP-010, CAP-011 | implemented-verified | EVID-SURF-003 | Verified on seed unit u0000000-0000-0000-0000-000000000001. |
| SURF-004 | Favoritos del Usuario | rendered page | public | - | CAP-005 | implemented-verified | EVID-SURF-004, EVID-RUN-PLAYWRIGHT-TARGETED | Full 4-viewport matrix verified; anonymous access redirects to login. |
| SURF-005 | Términos y Condiciones | rendered page | public | - | - | implemented-verified | EVID-SURF-005 | Full 4-viewport light/dark matrix verified. |
| SURF-006 | Política de Privacidad | rendered page | public | - | - | implemented-verified | EVID-SURF-006 | Full 4-viewport light/dark matrix verified. |
| SURF-007 | Inicio de Sesión | rendered page | public | - | CAP-001 | implemented-verified | EVID-SURF-007 | Full 4-viewport light/dark matrix verified. |
| SURF-008 | Registro de Usuario | rendered page | public | FORM-010 (SignupForm) | CAP-001 | implemented-verified | EVID-SURF-008, EVID-RUN-PLAYWRIGHT-TARGETED | Full 4-viewport matrix verified; disabled submit assertion verified. |
| SURF-009 | Onboarding Gestor | rendered page | operational-workspace | - | CAP-001, CAP-003 | implemented-verified | EVID-SURF-009 | Full 4-viewport light/dark matrix verified. |
| SURF-010 | Panel de Control Gestor | rendered page | operational-workspace | - | CAP-012, CAP-003 | implemented-verified | EVID-SURF-010, EVID-RUN-PLAYWRIGHT-TARGETED | Anonymous rejection verified; full 4-viewport matrix verified. |
| SURF-011 | Mis Unidades | rendered page | operational-workspace | - | CAP-011 | implemented-verified | EVID-SURF-011, EVID-RUN-PLAYWRIGHT-TARGETED | Anonymous rejection verified; destination of SURF-014. |
| SURF-012 | Nueva Unidad | rendered page | operational-workspace | FORM-005 (UnidadForm), FORM-006 (LocationPickerMap) | CAP-011, CAP-003 | implemented-verified | EVID-SURF-012 | Findings: emoji interface icons; mobile 375w sticky bar overlap. |
| SURF-013 | Editar Unidad | rendered page | operational-workspace | FORM-005 (UnidadForm), FORM-006 (LocationPickerMap) | CAP-011 | implemented-verified | EVID-SURF-013 | Verified on seed unit u0000000-0000-0000-0000-000000000001. |
| SURF-014 | Grupos de Unidades (Redirect Alias) | redirect alias | operational-workspace | FORM-003 (GrupoFormModal) | CAP-006 | implemented-verified | EVID-RUN-PLAYWRIGHT-TARGETED | Redirect alias to SURF-011 proven by targeted test; redundant captures deleted. |
| SURF-015 | Inquilinos CRM | rendered page | operational-workspace | FORM-004 (InquilinoFormModal) | CAP-007 | implemented-verified | EVID-SURF-015 | Finding: non-canonical 'contratos' label. |
| SURF-016 | Gestión de Alquileres | rendered page | operational-workspace | FORM-001 (AlquilerFormModal) | CAP-002, CAP-011 | partially-implemented | EVID-SURF-016 | Corrected FIND-002: Seña lacks public-calendar date blocking; no automatic Unidad state transition is allowed by ADR 0004. |
| SURF-017 | Planes y Facturación | rendered page | operational-workspace | - | CAP-003, CAP-009 | implemented-verified | EVID-SURF-017 | Full 4-viewport light/dark matrix verified. |
| SURF-018 | Facturación AFIP | rendered page | operational-workspace | FORM-002 (FacturacionAfipClient) | CAP-013 | implemented-verified | EVID-SURF-018 | AFIP config form rendered; live WSFE issuance is blocked. |
| SURF-019 | Delegados y Permisos | rendered page | operational-workspace | FORM-007 (DelegadoFormModal) | CAP-004 | environment-blocked | EVID-RUN-PLAYWRIGHT-TARGETED, BLOCK-SUPABASE-LOCAL | Reproducible SSR timeout/failure when local Supabase (127.0.0.1:54321) is offline. 8 visual cells blocked. |
| SURF-020 | Métricas y Analítica Gestor | rendered page | operational-workspace | - | CAP-012 | implemented-verified | EVID-SURF-020 | Full 4-viewport light/dark matrix verified. |
| SURF-021 | Logs de Auditoría | rendered page | operational-workspace | - | CAP-012 | implemented-verified | EVID-SURF-021 | Full 4-viewport light/dark matrix verified. |
| SURF-022 | Dev Moderación | rendered page | dev-admin | - | CAP-010 | implemented-verified | EVID-SURF-022, EVID-RUN-PLAYWRIGHT-TARGETED | Findings: UTF-8 mojibake; P1 auth gap (gestor admitted); responsive 375w unusable. |
| SURF-023 | Dev Logs | rendered page | dev-admin | - | CAP-012 | implemented-verified | EVID-SURF-023 | Full 4-viewport matrix verified; responsive 375w layout compressed. |
| SURF-024 | Dev Métricas | rendered page | dev-admin | - | CAP-012 | implemented-verified | EVID-SURF-024 | Full 4-viewport matrix verified; responsive 375w layout compressed. |
| SURF-025 | Dev Auditoría Pagos | rendered page | dev-admin | - | CAP-009 | implemented-verified | EVID-SURF-025 | Full 4-viewport matrix verified; responsive 375w layout compressed. |
