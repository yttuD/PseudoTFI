# Visual Matrix Report (`visual-matrix.md`)

Date: 2026-09-25 (Correction Pass 02)  
Harness: Playwright 1.63 (`apps/web/e2e/brownfield_system_audit.spec.ts`)  
Resolution Widths:
- Responsive Web: 375px (mobile), 768px (tablet)
- Desktop Web: 1024px (small desktop), 1440px (wide desktop)  
Themes: Light (default/ivory), Dark (night blue `#131F3C`)

## Matrix Denominators and Totals

- Total Route Entries in Scope: 25 (24 rendered surfaces + 1 redirect alias `/[locale]/grupos` -> `/[locale]/mis-unidades`)
- Distinct Rendered Surfaces: 24
- Expected Surface Visual Cells (24 rendered surfaces × 4 viewports × 2 themes): 192
- Retained Rendered Surface Cells: 184 (23 rendered surfaces × 8 combinations)
- Blocked Surface Visual Cells: 8 (SURF-019 Delegados, blocked by `BLOCK-SUPABASE-LOCAL`)
- Redundant Alias Captures Deleted: 8 (SURF-014 PNGs were byte-identical to SURF-011 due to redirect; marked rejected/redundant and deleted)
- Retained Form / Interaction Captures: 10 (kept outside surface-cell denominator)
- Total Retained Screenshots: 194 (184 surface cells + 10 interaction captures)
- Inspected by Antigravity: 194 (100% of retained captures)

---

## Visual Matrix by Rendered Surface

| Surface ID | Surface Name | Audience | Channel | 375w L | 375w D | 768w L | 768w D | 1024w L | 1024w D | 1440w L | 1440w D | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SURF-001 | Home / Marketplace | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-002 | Catálogo Unidades | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-003 | Detalle Unidad | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-004 | Favoritos | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-005 | Términos | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-006 | Privacidad | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-007 | Login | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-008 | Registro | public | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-009 | Onboarding Gestor | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-010 | Dashboard Gestor | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-011 | Mis Unidades | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-012 | Nueva Unidad | workspace | responsive/desktop | FAIL | FAIL | PASS | PASS | PASS | PASS | PASS | PASS | verified-fail at 375w (sticky action-bar overlap); desktop renders with emoji-icon defect |
| SURF-013 | Editar Unidad | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-014 | Grupos (Redirect Alias) | workspace | redirect alias | ALIAS | ALIAS | ALIAS | ALIAS | ALIAS | ALIAS | ALIAS | ALIAS | redirect-alias -> SURF-011 (8 PNGs deleted) |
| SURF-015 | Inquilinos CRM | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass (defect: 'contratos') |
| SURF-016 | Alquileres | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass (defect: no auto-transition) |
| SURF-017 | Facturación | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-018 | Facturación AFIP | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass (live AFIP blocked) |
| SURF-019 | Delegados | workspace | responsive/desktop | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | blocked (`BLOCK-SUPABASE-LOCAL`) |
| SURF-020 | Métricas | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-021 | Logs | workspace | responsive/desktop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | verified-pass |
| SURF-022 | Dev Moderación | dev-admin | responsive/desktop | FAIL | FAIL | PASS | PASS | PASS | PASS | PASS | PASS | verified-fail at 375w (unusable compression); desktop renders with mojibake |
| SURF-023 | Dev Logs | dev-admin | responsive/desktop | FAIL | FAIL | PASS | PASS | PASS | PASS | PASS | PASS | verified-fail at 375w (unusable compression) |
| SURF-024 | Dev Métricas | dev-admin | responsive/desktop | FAIL | FAIL | PASS | PASS | PASS | PASS | PASS | PASS | verified-fail at 375w (unusable compression) |
| SURF-025 | Dev Auditoría Pagos | dev-admin | responsive/desktop | FAIL | FAIL | PASS | PASS | PASS | PASS | PASS | PASS | verified-fail at 375w (unusable compression) |

*Note on Dev Dashboard responsive presentations: On 375px mobile viewports, the fixed desktop dev sidebar and dense data tables are severely compressed, rendering the console unusable on responsive web. These cells are verified failures, not passes with caveats.

---

## Form & Dialog Interaction Verification Captures (10 Retained Captures)

These 10 captures document observed UI states; their evidence descriptions have been corrected to reflect what was actually proven (modal-open or initial states, not valid full end-to-end submissions):

1. `FORM-001__gestor__1440w__light__modal_open.png` (Modal Alquiler open state; submission unverified)
2. `FORM-002__gestor__1440w__light__validation_boundary.png` (AFIP form client boundary validation attempted; live AFIP blocked)
3. `FORM-003__gestor__1440w__light__modal_open.png` (Modal Grupo open state; submission unverified)
4. `FORM-004__gestor__1440w__light__modal_open.png` (Modal Inquilino open state; submission unverified)
5. `FORM-005__gestor__1440w__light__validation_error.png` (Unidad form submit clicked; validation error assertion unverified)
6. `FORM-006__gestor__1440w__light__map_interactive.png` (Leaflet map container visible; interaction unverified)
7. `FORM-007__gestor__1440w__light__modal_open.png` (Modal Delegado open; finding: role selector missing)
8. `FORM-008__anon__1440w__light__report_modal.png` (Reporte Modal open; captured under authenticated storage state)
9. `FORM-009__anon__1440w__light__wizard_step.png` (Search Wizard initial home state; step transition unverified)
10. `FORM-010__anon__1440w__light__validation_disabled.png` (Registration submit disabled safeguard verified)
