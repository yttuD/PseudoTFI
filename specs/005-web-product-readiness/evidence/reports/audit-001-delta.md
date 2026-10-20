# Reconciliation Delta Report: Feature 001 vs Current Source (T012)

**Report Date**: 2026-09-26  
**Auditor**: Antigravity (Batch 01 Foundation)  
**Governing Rule**: FR-003 — Fresh source discovery from active filesystem; historical audit 001 statuses are not current truth.

---

## 1. High-Level Denominator Comparison

| Category | Feature 001 Denominator | Feature 005 Current Denominator | Net Delta | Primary Drivers |
|---|---|---|---|---|
| **Routes & Surfaces** | 25 | **41** | **+16** | +1 Route (`/cuenta/invitaciones`), +4 Layouts, +11 Loading states |
| **Interactions (Forms/Controls)** | 10 | **20** | **+10** | +5 Inline forms/dialogs, +5 Critical interactive controls |
| **API Capabilities** | 13 | **15** | **+2** | +1 Granular Authorization & Logging, +1 Translation Service |
| **Data & Migrations** | 16 | **18** | **+2** | +1 Delegation RLS migration (`MIG-017`), +1 pgTAP suite (`TEST-DB-001`) |
| **Automated Test Suites** | 39 | **54** | **+15** | +2 E2E specs, +12 API auth/delegation specs, +1 DB suite |
| **Total Tracked Items** | **103** | **148** | **+45** | Comprehensive brownfield & Feature 002–005 additions |

---

## 2. Category Breakdown & Detailed Reconciliation

### 2.1 Routes, Redirects, Layouts and Loading States
- **Feature 001 Baseline**: 25 surfaces (`SURF-001` to `SURF-025`). Included 24 rendered pages and 1 redirect alias (`SURF-014`: `/[locale]/grupos` -> `/mis-unidades`).
- **Feature 005 Additions**:
  - `SURF-026`: `/[locale]/cuenta/invitaciones` (`apps/web/src/app/[locale]/(marketplace)/cuenta/invitaciones/page.tsx`). Introduced in Feature 004 to provide the collaborator invitation inbox for registered users.
  - `LAY-001` to `LAY-004`: Formally cataloged 4 structural layouts (`[locale]/layout.tsx`, `(marketplace)/layout.tsx`, `(gestor)/layout.tsx`, `dev/layout.tsx`).
  - `LOAD-001` to `LOAD-011`: Formally cataloged 11 active loading skeleton files (`loading.tsx`) across public and operational routes.
- **Removals**: None.
- **Status Reconciliation**: All statuses reset from historical `implemented-verified` to `unverified` pending fresh executable Playwright evidence in Feature 005 batches. `SURF-016` retained as `partial` (seña/modality rules need validation); `SURF-018` retained as `blocked` (AFIP certificate dependency); `SURF-014` retained as `redirect`.

### 2.2 Interactions, Forms and Controls
- **Feature 001 Baseline**: 10 items (`FORM-001` to `FORM-010`). Focused on primary modals and standalone forms.
- **Feature 005 Additions**:
  - `FORM-011`: Inline Login Form (`apps/web/src/app/[locale]/auth/login/page.tsx`).
  - `FORM-012`: Onboarding Form for Gestores (`apps/web/src/app/[locale]/auth/onboarding-gestor/page.tsx`).
  - `FORM-013`: Delegation Scope & Permissions Modal (`apps/web/src/components/delegados/DelegationAccessEditor.tsx` from Feature 004).
  - `FORM-014`: Invitation Action Controls (`apps/web/src/components/delegados/InvitationInbox.tsx` from Feature 004).
  - `FORM-015`: Marketplace Filter Sidebar (`apps/web/src/components/marketplace/MarketplaceFiltrosSidebar.tsx`).
  - `CTRL-001`: Favorite Toggle Control (`apps/web/src/components/marketplace/FavoritoButton.tsx`).
  - `CTRL-002`: WhatsApp Contact Redirection Control (`apps/web/src/components/marketplace/WhatsAppButton.tsx`).
  - `CTRL-003`: Language Selector Dropdown (`apps/web/src/components/marketplace/LanguageSelector.tsx`).
  - `CTRL-004`: Theme Toggle Switcher (`apps/web/src/components/ui/skiper4.tsx`).
  - `CTRL-005`: Bento Groups Navigation Grid (`apps/web/src/components/gestor/BentoGruposGrid.tsx`).
- **Removals**: None.

### 2.3 API Capabilities
- **Feature 001 Baseline**: 13 capabilities (`CAP-001` to `CAP-013`).
- **Feature 005 Additions**:
  - `CAP-014`: Fine-grained RBAC Authorization & Action Logging (`apps/api/src/authorization/authorization.service.ts`, `action-log.service.ts`, `logs.controller.ts`). Added during Feature 004.
  - `CAP-015`: Multilingual Translation Service (`apps/api/src/common/services/traduccion/traduccion.service.ts`). Added during Feature 003.
- **Removals**: None.

### 2.4 Database Migrations & Policies
- **Feature 001 Baseline**: 16 migrations (`MIG-001` to `MIG-016`).
- **Feature 005 Additions**:
  - `MIG-017`: `supabase/migrations/20260925120000_delegado_scope_authorization.sql`. Added in Feature 004. Implements account/group/unit scopes, `ver` vs `gestionar` permission constraints, and updated RLS policies.
  - `TEST-DB-001`: `supabase/tests/004_delegado_scope_authorization.sql`. Active pgTAP regression test suite for RLS policies.
- **Removals**: None.

### 2.5 Automated Test Suites
- **Feature 001 Baseline**: 39 suites (9 API, 30 E2E).
- **Feature 005 Additions**:
  - **E2E (+2)**:
    - `apps/web/e2e/delegado_scope_authorization.spec.ts` (`TEST-E2E-031`), 1323 lines of authorization tests.
    - `apps/web/e2e/fixtures/product-readiness.spec.ts` (`TEST-E2E-032`), deterministic unit validation for readiness helpers and actor definitions.
  - **API (+12)**:
    - `alquileres/alquileres.authorization.spec.ts` (`TEST-API-010`)
    - `auth/supabase-auth.guard.spec.ts` (`TEST-API-011`)
    - `authorization/authorization-matrix.spec.ts` (`TEST-API-012`)
    - `authorization/authorization.service.spec.ts` (`TEST-API-013`)
    - `authorization/delegado-manage-authorization.spec.ts` (`TEST-API-014`)
    - `authorization/delegado-read-authorization.spec.ts` (`TEST-API-015`)
    - `authorization/owner-only-authorization.spec.ts` (`TEST-API-016`)
    - `authorization/test-adapter.spec.ts` (`TEST-API-017`)
    - `delegados/delegados.controller.spec.ts` (`TEST-API-018`)
    - `delegados/delegados.service.spec.ts` (`TEST-API-019`)
    - `delegados/delegation-notification.service.spec.ts` (`TEST-API-020`)
    - `inquilinos/inquilinos.authorization.spec.ts` (`TEST-API-021`)
  - **Database (+1)**: `supabase/tests/004_delegado_scope_authorization.sql` (`TEST-DB-001`).
- **Removals**: None.

---

## 3. Discrepancy & Gap Summary

1. **Status Reset Rationale**:
   Feature 001 claimed visual verification on many surfaces using fast targeted passes or light-only checks. Feature 005 strictly mandates Playwright evidence across 4 viewports (375w, 768w, 1024w, 1440w) and 2 themes (light, dark) with computed contrast and 44px touch checks. Therefore, all visual statuses are unverified until fresh runs occur.
2. **Scratch Files**:
   `apps/api/src/scratch/test_afip_fiscal_config.cjs` was identified during source discovery. It is classified under T016/T062 and will be retained without deletion until remediation phase T062.
