# Remediation Roadmap — Bounded Spec Kit Candidates (`remediation-roadmap.md`)

Date: 2026-09-25 (Correction Pass 03)  
Purpose: Group verified findings into actionable, dependency-ordered future Spec Kit features with explicit boundaries.

---

## Candidate 1: REMED-001 — Core Auth Guard Remediation & Security Hardening
- **Status**: COMPLETED and accepted in `specs/002-auth-guard-hardening` on 2026-09-25.
- **Suggested Priority**: P0 (Immediate / Critical Security)
- **Problem Statement**: `SupabaseAuthGuard` allows unverified bearer strings > 10 characters to bypass authentication and assume Gestor identity (`11111111-1111-1111-1111-111111111111`).
- **Included Findings**: `FIND-009`.
- **Affected Journeys**: All API endpoints guarded by `SupabaseAuthGuard`.
- **Dependencies**: None.
- **Acceptance Boundary**:
  1. Removed length-based, substring, metadata/email, fixed-user, and decode-only fallbacks.
  2. Deployed credentials are authoritatively validated by Supabase Auth, which performs the token
     verification, then resolved through the active canonical operational profile.
  3. Local demo credentials are default-disabled, exact-format only, and require both explicit
     opt-in and a development/test runtime; production and other environments reject them.
  4. Forty-nine focused guard tests plus the full 88-test API suite and production build pass.
  5. Codex source review and independent local-executable verification are retained in
     `specs/002-auth-guard-hardening/evidence/reports/codex-final-acceptance.md`.

---

## Candidate 2: REMED-002 — Seña Calendar Availability & Blocking
- **Status**: Specification and Phase 0/1 design completed in
  `specs/003-modality-aware-availability`; implementation has not started.
- **Suggested Priority**: P1 (High)
- **Correction**: The original candidate contradicted ADR 0004 by asking for an automatic Unidad
  state change. General state remains manual; lease expiration also makes no automatic state change.
- **Problem Statement**: Registering a Seña on an Alquiler does not create the required public
  calendar date-range block, and no canonical availability model currently exists.
- **Included Findings**: Corrected `FIND-002`. `FIND-006` moves to REMED-005.
- **Affected Journeys**: Gestor or authorized Delegado recording a Seña/managing availability;
  public users checking modality-aware availability.
- **Dependencies**: Bounded availability/calendar design is complete. REMED-004's shared granular
  Delegado authorization foundation must land before Delegado mutations or full feature acceptance;
  until then the safe provisional mutation actor is the Gestor owner only.
- **Acceptance Boundary**:
  1. Define canonical half-open availability blocks by Unidad for monthly, daily, and hourly
     modalities, with one global overlap timeline per physical Unidad.
  2. Atomically create/update the block when a Seña becomes registered for an Alquiler.
  3. Define cancellation, Seña removal/refund, Alquiler date extension, soft deletion, and overlap
     behavior without automatically changing `Unidad.estado`.
  4. Expose blocked ranges to the public calendar without private Inquilino, payment, or exact
     operational data.
  5. Add API/database tests for block creation, overlap prevention, update/removal semantics,
     workspace isolation, and the invariant that Unidad state remains unchanged.

---

## Candidate 3: REMED-003 — Dev/Admin Surface Authorization & Mobile Usability
- **Suggested Priority**: P1 (High)
- **Problem Statement**: `apps/web/src/app/[locale]/dev/layout.tsx` redirects only `buscador`, admitting ordinary Gestores and Delegados. In addition, the dev console is unusable on 375px mobile viewports.
- **Included Findings**: `FIND-010`, `FIND-013`.
- **Affected Journeys**: System operators, Gestores, and public users.
- **Dependencies**: REMED-001.
- **Acceptance Boundary**:
  1. Update `dev/layout.tsx` to require an explicit role `dev` or `admin`, redirecting Gestores and Delegados to `/dashboard`.
  2. Implement responsive sidebar collapse / drawer and horizontal scroll containers for mobile viewports.
  3. Playwright test verifying Gestor attempting `/dev/*` is rejected.

---

## Candidate 4: REMED-004 — Delegado Scope & Granular Permission Architecture
- **Status**: COMPLETED and validated in `specs/004-delegado-scope-authorization` on 2026-09-26 (121/121 DB pgTAP assertions, 173/173 API tests, 22/22 Playwright tests, 176 screenshots, 22 contact sheets).
- **Suggested Priority**: P1 (High)
- **Execution Order**: Must precede REMED-002's Delegado mutation rollout and final acceptance; the
  availability feature consumes this shared authorization interface rather than duplicating it.
- **Problem Statement**: Granular delegation (`scope` [account, Grupo, selected Unidades] × `permission` [`Ver`, `Gestionar`]) is completely absent from backend, API, RLS, and UI.
- **Included Findings**: `FIND-011`.
- **Affected Journeys**: Gestor delegating access to team members.
- **Dependencies**: REMED-001.
- **Acceptance Boundary**:
  1. Define database schema for delegated assignments (gestor_id, delegado_id, scope_type, scope_id, permiso).
  2. Update Supabase RLS policies from `FOR ALL` to check delegated assignment table.
  3. Enforce permission level in API controllers (read-only for `ver`, mutation blocked unless `gestionar`).
  4. Provide full UI controls in `DelegadoFormModal.tsx` and permissions management table.

---

## Candidate 5: REMED-005 — UI/UX, Encoding & Brand Design System Polish
- **Suggested Priority**: P2 (Medium)
- **Problem Statement**: UTF-8 mojibake in dev views; native OS emojis in `UnidadForm.tsx`; sticky action bar overlap on 375px mobile viewports.
- **Included Findings**: `FIND-003`, `FIND-004`, `FIND-005`.
- **Affected Journeys**: Gestor creating units on mobile; dev console inspection.
- **Dependencies**: None.
- **Acceptance Boundary**:
  1. Re-save dev templates with clean UTF-8 encoding.
  2. Replace OS emojis in `UnidadForm.tsx` with Lucide icons (`<Building2 />`, `<Globe />`, `<Package />`).
  3. Add `pb-24` bottom padding on mobile layout in `UnidadForm.tsx` to prevent action bar overlap.
  4. Visual Playwright test confirming clean 375px rendering.
