# Source File Denominator & Count Reconciliation

## Audit Denominator Summary

Date: 2026-09-25 (Audit Batch 1)
Source Discovery Method: Exact filesystem verification via `Get-ChildItem` and `git ls-files --cached --others --exclude-standard`.

| Category | Discovered Active Files | Excluded Files / Stems | Included in Primary Manifests | Reconciled Discrepancies |
|---|---|---|---|---|
| Routes & Surfaces (`apps/web/src/app`) | 45 total files | 4 static assets (`favicon.ico`, `globals.css`, 2 fonts) | 41 active TSX files (25 page route entries: 24 rendered destinations + 1 redirect alias; 11 loading states, 4 layouts, 1 inline form modal) | 0 |
| Components (`apps/web/src/components`) | 47 component files | 0 | 47 components analyzed (10 primary form/dialog interactions) | 0 |
| API Capabilities (`apps/api/src`) | 54 files | 1 (`src/scratch/*`) | 53 files (13 controllers, 10 services, modules, DTOs, guards) | 0 |
| Database Migrations (`supabase/migrations`) | 16 SQL migration files | 0 | 16 migrations | 0 |
| Automated Tests & Suites | 39 spec files (30 E2E in `apps/web/e2e/`, 9 API in `apps/api/src/`) | 0 | 39 test spec files (29 pre-existing E2E + 1 audit E2E + 9 API specs) | 0 |

---

## 1. Web App Router Denominator (`apps/web/src/app`)
Total files: 45. Active code files: 41.

### Page Routes (25)
1. `apps/web/src/app/[locale]/(marketplace)/page.tsx` (SURF-001)
2. `apps/web/src/app/[locale]/(marketplace)/unidades/page.tsx` (SURF-002)
3. `apps/web/src/app/[locale]/(marketplace)/unidades/[id]/page.tsx` (SURF-003)
4. `apps/web/src/app/[locale]/(marketplace)/favoritos/page.tsx` (SURF-004)
5. `apps/web/src/app/[locale]/(marketplace)/terminos/page.tsx` (SURF-005)
6. `apps/web/src/app/[locale]/(marketplace)/privacidad/page.tsx` (SURF-006)
7. `apps/web/src/app/[locale]/auth/login/page.tsx` (SURF-007)
8. `apps/web/src/app/[locale]/auth/registro/page.tsx` (SURF-008)
9. `apps/web/src/app/[locale]/auth/onboarding-gestor/page.tsx` (SURF-009)
10. `apps/web/src/app/[locale]/(gestor)/dashboard/page.tsx` (SURF-010)
11. `apps/web/src/app/[locale]/(gestor)/mis-unidades/page.tsx` (SURF-011)
12. `apps/web/src/app/[locale]/(gestor)/mis-unidades/nueva/page.tsx` (SURF-012)
13. `apps/web/src/app/[locale]/(gestor)/mis-unidades/[id]/editar/page.tsx` (SURF-013)
14. `apps/web/src/app/[locale]/(gestor)/grupos/page.tsx` (SURF-014)
15. `apps/web/src/app/[locale]/(gestor)/inquilinos/page.tsx` (SURF-015)
16. `apps/web/src/app/[locale]/(gestor)/alquileres/page.tsx` (SURF-016)
17. `apps/web/src/app/[locale]/(gestor)/facturacion/page.tsx` (SURF-017)
18. `apps/web/src/app/[locale]/(gestor)/facturacion-afip/page.tsx` (SURF-018)
19. `apps/web/src/app/[locale]/(gestor)/delegados/page.tsx` (SURF-019)
20. `apps/web/src/app/[locale]/(gestor)/metricas/page.tsx` (SURF-020)
21. `apps/web/src/app/[locale]/(gestor)/logs/page.tsx` (SURF-021)
22. `apps/web/src/app/[locale]/dev/moderacion/page.tsx` (SURF-022)
23. `apps/web/src/app/[locale]/dev/logs/page.tsx` (SURF-023)
24. `apps/web/src/app/[locale]/dev/metricas/page.tsx` (SURF-024)
25. `apps/web/src/app/[locale]/dev/auditoria-pagos/page.tsx` (SURF-025)

### Loading States (11)
1. `(gestor)/alquileres/loading.tsx`
2. `(gestor)/dashboard/loading.tsx`
3. `(gestor)/delegados/loading.tsx`
4. `(gestor)/facturacion/loading.tsx`
5. `(gestor)/facturacion-afip/loading.tsx`
6. `(gestor)/inquilinos/loading.tsx`
7. `(gestor)/logs/loading.tsx`
8. `(gestor)/metricas/loading.tsx`
9. `(gestor)/mis-unidades/loading.tsx`
10. `(marketplace)/unidades/loading.tsx`
11. `(marketplace)/unidades/[id]/loading.tsx`

### Layouts (4)
1. `[locale]/layout.tsx`
2. `[locale]/(gestor)/layout.tsx`
3. `[locale]/(marketplace)/layout.tsx`
4. `[locale]/dev/layout.tsx`

### Embedded Component in App Tree (1)
1. `apps/web/src/app/[locale]/(gestor)/delegados/DelegadoFormModal.tsx`

---

## 2. Forms and Dialogs Denominator (10)
1. `FORM-001`: `apps/web/src/components/gestor/AlquilerFormModal.tsx`
2. `FORM-002`: `apps/web/src/components/gestor/FacturacionAfipClient.tsx`
3. `FORM-003`: `apps/web/src/components/gestor/GrupoFormModal.tsx`
4. `FORM-004`: `apps/web/src/components/gestor/InquilinoFormModal.tsx`
5. `FORM-005`: `apps/web/src/components/gestor/UnidadForm.tsx`
6. `FORM-006`: `apps/web/src/components/gestor/LocationPickerMap.tsx`
7. `FORM-007`: `apps/web/src/app/[locale]/(gestor)/delegados/DelegadoFormModal.tsx` (Correct path)
8. `FORM-008`: `apps/web/src/components/marketplace/ReporteModal.tsx`
9. `FORM-009`: `apps/web/src/components/marketplace/SearchWizard.tsx`
10. `FORM-010`: `apps/web/src/components/ui/signup-form.tsx`

---

## 3. API Controllers Denominator (13)
All verified via `@Controller` decorators in source:
1. `apps/api/src/app.controller.ts` (`/`)
2. `apps/api/src/afip/afip.controller.ts` (`/afip`)
3. `apps/api/src/alquileres/alquileres.controller.ts` (`/alquileres`)
4. `apps/api/src/cupo/cupo.controller.ts` (`/cupo`)
5. `apps/api/src/delegados/delegados.controller.ts` (`/delegados`)
6. `apps/api/src/favoritos/favoritos.controller.ts` (`/favoritos`)
7. `apps/api/src/grupos/grupos.controller.ts` (`/grupos`)
8. `apps/api/src/inquilinos/inquilinos.controller.ts` (`/inquilinos`)
9. `apps/api/src/marketplace/marketplace.controller.ts` (`/marketplace`)
10. `apps/api/src/metricas/metricas.controller.ts` (`/metricas`)
11. `apps/api/src/pagos/pagos.controller.ts` (`/pagos`)
12. `apps/api/src/reportes/reportes.controller.ts` (`/reportes`)
13. `apps/api/src/unidades/unidades.controller.ts` (`/unidades`)

---

## 4. Database Migrations Denominator (16)
1. `supabase/migrations/20260903202800_core_domain_v1.sql`
2. `supabase/migrations/20260903204800_auth_trigger_and_rls.sql`
3. `supabase/migrations/20260904042700_cupo_and_seeds.sql`
4. `supabase/migrations/20260904045400_marketplace_fields.sql`
5. `supabase/migrations/20260904122400_favoritos_reportes.sql`
6. `supabase/migrations/20260905005500_storage_fotos.sql`
7. `supabase/migrations/20260905051150_crm_inquilinos_alquileres.sql`
8. `supabase/migrations/20260905062000_rbac_delegados.sql`
9. `supabase/migrations/20260905074300_pagos_facturacion.sql`
10. `supabase/migrations/20260905163100_suscripcion_expira_en.sql`
11. `supabase/migrations/20260905191306_fix_auth_trigger_phone.sql`
12. `supabase/migrations/20260905193300_fix_auth_trigger_again.sql`
13. `supabase/migrations/20260913050000_marketplace_analytics.sql`
14. `supabase/migrations/20260913070000_crm_garantes_consentimiento_afip.sql`
15. `supabase/migrations/20260913080000_gestor_afip_config.sql`
16. `supabase/migrations/20260913090000_alquileres_senas_depositos.sql`

---

## 5. Automated Tests Denominator (39)
### Playwright E2E Specs (30)
1. `apps/web/e2e/afip_config_fiscal.spec.ts`
2. `apps/web/e2e/alquiler_sena_metricas.spec.ts`
3. `apps/web/e2e/auth.spec.ts`
4. `apps/web/e2e/auth_register_login_flow.spec.ts`
5. `apps/web/e2e/brownfield_system_audit.spec.ts` (Audit spec added)
6. `apps/web/e2e/city_background_theme.spec.ts`
7. `apps/web/e2e/contextual_auth_flow.spec.ts`
8. `apps/web/e2e/demo_accounts_validation.spec.ts`
9. `apps/web/e2e/favoritos_flow.spec.ts`
10. `apps/web/e2e/full_system_audit.spec.ts`
11. `apps/web/e2e/full_system_lifecycle.spec.ts`
12. `apps/web/e2e/gestion_bento_nominatim.spec.ts`
13. `apps/web/e2e/gestor.spec.ts`
14. `apps/web/e2e/hero_contrast_light.spec.ts`
15. `apps/web/e2e/i18n.spec.ts`
16. `apps/web/e2e/impeccable_audit.spec.ts`
17. `apps/web/e2e/kpi_cards_visual.spec.ts`
18. `apps/web/e2e/loading_skeletons.spec.ts`
19. `apps/web/e2e/marketplace.spec.ts`
20. `apps/web/e2e/metricas_dashboard_analytics.spec.ts`
21. `apps/web/e2e/modal_alquiler_afip.spec.ts`
22. `apps/web/e2e/multidevice_matrix.spec.ts`
23. `apps/web/e2e/performance_and_native_experience.spec.ts`
24. `apps/web/e2e/qa_integral.spec.ts`
25. `apps/web/e2e/qa_suite.spec.ts`
26. `apps/web/e2e/theme.spec.ts`
27. `apps/web/e2e/ui_corrections.spec.ts`
28. `apps/web/e2e/ux_audit.spec.ts`
29. `apps/web/e2e/visual_corrections.spec.ts`
30. `apps/web/e2e/wizard_check.spec.ts`

### API Unit & Integration Specs (9)
1. `apps/api/src/app.controller.spec.ts`
2. `apps/api/src/favoritos/favoritos.controller.spec.ts`
3. `apps/api/src/favoritos/favoritos.service.spec.ts`
4. `apps/api/src/grupos/grupos.controller.spec.ts`
5. `apps/api/src/grupos/grupos.service.spec.ts`
6. `apps/api/src/pagos/pagos.service.spec.ts`
7. `apps/api/src/pagos/pricing.spec.ts`
8. `apps/api/src/reportes/reportes.controller.spec.ts`
9. `apps/api/src/reportes/reportes.service.spec.ts`
