# Role, Authorization, and Privacy Audit Report (`role-and-privacy.md`)

Date: 2026-09-25 (Correction Pass 02)  
Normative Reference: `specs/001-brownfield-system-audit/architecture-boundaries.md`

## 1. Trust Surfaces Architecture

The Rendo architecture establishes three non-negotiable trust surfaces. Hidden navigation links do not constitute authorization. Every protected action must be enforced at the rendered route, API guard, and Supabase RLS layers.

| Boundary | Intended Actors | Allowed Data and Actions | Observed Source Enforcement & Discrepancies |
|---|---|---|---|
| **Public Marketplace** | anonymous, authenticated public users | Discover published Unidades, public filters, fuzzed coordinates, manage own favorites, submit guarded reports | **Enforced**: Public views render anonymously (verified via empty storage state context). Coordinate fuzzing active on API `/marketplace/unidades`. |
| **Operational Workspace** | Gestor owner, authorized Delegados | Manage owner's workspace per actor, scope, and permission level | **Severe Gaps**: Delegado granular scope and permission model is absent. Workspace RLS uses `FOR ALL`. SupabaseAuthGuard contains critical bypass fallback. |
| **Dev/Admin Console** | Explicitly privileged dev/admin actors | Moderation queue, operational telemetry, payment audit, global action logs | **Authorization Gap**: `apps/web/src/app/[locale]/dev/layout.tsx` redirects only `buscador`. Ordinary Gestores and Delegados are permitted access. Dev screenshots prove rendering, not authorized dev access. |

---

## 2. Source-Inspected Authorization & Security Findings

### Critical P0: API Authentication Bypass Fallback (`FIND-009`)
- **Source**: `apps/api/src/auth/supabase-auth.guard.ts` (lines 60-95)
- **Observed Mechanism**: When Supabase client validation fails or local Supabase is offline, the guard executes heuristic fallbacks:
  ```ts
  } else if (token.includes('dev-access-token') || token.includes('gestor') || token.length > 10) {
    userObj = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'gestor@renda.com.ar',
      user_metadata: { role: 'gestor', rol: 'gestor' },
    };
  ```
  Any bearer token longer than 10 characters automatically resolves to a fixed Gestor with full workspace privileges. There is no environment gate restricting this to development.
- **Impact**: Bypasses authentication across all API capabilities guarded by `SupabaseAuthGuard` (`CAP-001`, `CAP-002`, `CAP-003`, `CAP-004`, `CAP-005`, `CAP-006`, `CAP-007`, `CAP-009`, `CAP-010`, `CAP-011`, `CAP-012`, `CAP-013`).

### High P1: Dev/Admin Console Authorization Gap (`FIND-010`)
- **Source**: `apps/web/src/app/[locale]/dev/layout.tsx` (lines 81-85)
- **Observed Mechanism**:
  ```ts
  // Restricción de acceso a la consola de devs para usuarios comunes
  if (rol === 'buscador' || user.user_metadata?.role === 'buscador') {
    redirect(`/${locale}/auth/login`);
  }
  ```
  The layout checks if the user is a `buscador`, but allows any authenticated user with `rol === 'gestor'` or `rol === 'delegado'`. The console fails to require an explicit `dev` or `admin` role.
- **Impact**: Ordinary Gestores and Delegados can access global moderation, system error logs, infrastructure latency metrics, and payment audits.

### High P1: Absent Delegado Scope and Permission Model (`FIND-011`)
- **Source**: `apps/api/src/delegados/delegados.service.ts`, `supabase/migrations/20260905062000_rbac_delegados.sql`
- **Observed Reality**:
  - The intended architecture specifies `scope` (account, Grupo, or selected Unidades) × `permission` (`Ver` vs `Gestionar`).
  - The actual implementation has only `users.rol IN ('gestor', 'delegado')`.
  - Workspace RLS uses `FOR ALL` without filtering by assigned Unidades or operation type.
  - The missing dropdown in `DelegadoFormModal.tsx` is only a superficial symptom; the entire underlying backend authorization enforcement for Delegado scope and action level is completely missing (all-or-nothing access).

---

## 3. Actor Access Matrix (Source Intent vs Executed Evidence)

| Actor | Public Marketplace | Operational Workspace | Owner Billing / AFIP | Dev/Admin Console | Execution Evidence |
|---|---|---|---|---|---|
| **Anonymous** | Allowed | Denied (redirects to `/auth/login`) | Denied (redirects to `/auth/login`) | Denied (redirects to `/auth/login?role=dev`) | Verified via explicit empty storage state Playwright tests (`EVID-RUN-PLAYWRIGHT-TARGETED`) |
| **Authenticated Public User** | Allowed (own favorites & reports) | Onboarding only | Denied | Denied by layout (redirects `buscador` to `/auth/login`) | Partially verified; API guarded |
| **Gestor** | Allowed | Allowed (full owner) | Allowed | **Unintended Access Allowed** (Defect FIND-010) | Verified in Playwright targeted test; dev layout admits Gestor session |
| **Delegado** | Allowed | All-or-nothing (Defect FIND-011) | Should be denied; not granularly isolated | **Unintended Access Allowed** (Defect FIND-010) | Unverified independently; blocked by missing scope model |
| **Dev/Admin** | Allowed | As designed | Only when authorized | Intended owner | Rendered visual proof exists; role enforcement unverified |

---

## 4. Location Privacy and Obfuscation (ADR 0005)
- Public Marketplace (`/unidades`, `/unidades/[id]`):
  - Anonymous and public users receive fuzzed coordinates (approximate neighborhood pin).
  - Exact street address and apartment numbers are hidden from unauthenticated viewers.
- Gestor Panel (`/mis-unidades/nueva`):
  - Exact coordinates picked via `LocationPickerMap` (Leaflet & Nominatim).
  - Private address stored in `unidades.direccion` and isolated by tenancy.

---

## 5. Platform Targets & Mobile / Android Readiness (ADR 0009)

| Target Platform | Audit Scope & Evidence | Current Disposition |
|---|---|---|
| **Desktop Web** (1024w / 1440w) | Full Playwright captures across 24 rendered surfaces in light & dark themes. | Implemented and verified for marketplace and operational workspace. |
| **Responsive Web** (375w / 768w) | Full Playwright captures at 375px and 768px widths. | **Defects Noted**: Dev console (SURF-022 to 025) is unusable at 375px due to fixed desktop sidebar and table width; `UnidadForm` has sticky action bar overlapping bottom inputs. |
| **Capacitor Android Wrapper** | Architecture and configuration readiness inspection only (`apps/web/capacitor.config.ts`, `apps/web/android/`). | **Readiness Findings (`FIND-012`)**: Hardcoded LAN development URL (`http://192.168.1.36:3000`), `cleartext: true`, `allowMixedContent: true`, and `webContentsDebuggingEnabled: true`. |
| **Native Android App** | **Deferred to future dedicated Spec Kit feature.** | Physical-device installation, native permissions, hardware back button, native keyboard, lifecycle, offline sync, and deep links have NOT been validated and are not claimed. |
