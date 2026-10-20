# Contradictions Report (`contradictions.md`)

Date: 2026-09-25 (Correction Pass 02)  
Purpose: Cross-compare implementation reality against automated tests, `ESTADO-REAL.md`, product documents, ADRs, and the Rendo Constitution.

---

## Contradiction Ledger

### 1. Seña Calendar Blocking vs. Incorrect Audit State-Transition Claim
- **Incorrect prior audit claim**:
  - The first audit pass stated that an active Alquiler must automatically change Unidad state to
    `alquilada`. `INICIO.md` and `documentation.md` do not state that requirement, and the physical
    enum has no `alquilada` value.
- **Governing documents**:
  - `CONTEXT.md:64-65` says a Seña blocks the Alquiler dates in the public calendar while the general
    Unidad state remains manual.
  - `ARQUITECTURA-Y-PRODUCTO.md:74,113-119` says the Gestor manually marks availability and lease
    expiration changes nothing automatically.
  - ADR 0004 is closed and forbids automatic general-state changes outside its explicit reactions.
- **Observable implementation**:
  - `AlquileresService.create()` stores Seña data but there is no availability/calendar entity,
    date-range block, or database trigger implementing the required calendar reaction.
- **Governing Decision**: Retract the automatic-state interpretation. The actual implementation gap
  is public-calendar blocking on Seña and is recorded as corrected `FIND-002`.

### 2. Delegado Granular Permission Model (Claimed vs Actual)
- **Document / Prior Audit Claim**:
  - ADR 0008 and historical design notes specify a granular model: `scope` (account, Grupo, selected Unidades) × `permission` (`Ver` vs `Gestionar`).
  - Prior audit drafts falsely claimed `rol_permiso` and backend enforcement already existed and that only a modal selector was missing.
- **Observable Implementation**:
  - `apps/api/src/delegados/delegados.service.ts` and database schemas contain only `users.rol IN ('gestor', 'delegado')`.
  - Workspace RLS policies apply `FOR ALL` without filtering by assigned Unidades or action level.
  - Access is all-or-nothing; no granular scope or permission model exists in code.
- **Governing Decision**: Rendo Constitution Principle VI and ADR 0008 govern. Reality recorded as architectural gap `FIND-011`.

### 3. Dev/Admin Console Authorization
- **Document / Boundary Claim**:
  - `architecture-boundaries.md` establishes the Dev/Admin console as a restricted trust surface requiring explicitly privileged dev/admin actors.
- **Observable Implementation**:
  - `apps/web/src/app/[locale]/dev/layout.tsx` only rejects users with `rol === 'buscador'`. Ordinary Gestores and Delegados are permitted into the console.
- **Governing Decision**: `architecture-boundaries.md` governs; vulnerability recorded as `FIND-010`.

### 4. API Authentication Enforcement vs Development Fallbacks
- **Document Claim**:
  - Architecture documents specify secure Supabase JWT verification on all protected endpoints.
- **Observable Implementation**:
  - `apps/api/src/auth/supabase-auth.guard.ts` contains an un-gated fallback treating any token longer than 10 characters as a valid Gestor session (`11111111-1111-1111-1111-111111111111`).
- **Governing Decision**: Security standards and Rendo Constitution Principle I & VI govern; critical flaw recorded as `FIND-009`.

### 5. Free / Trial Cupo Limit (3 vs 5)
- **Document Claim**:
  - Early product documentation and historical briefs stated: *"El Gestor tiene un cupo inicial gratuito de 5 unidades."*
- **Observable Implementation**:
  - Migration `20260904042700_cupo_and_seeds.sql` line 29: `VALUES (NEW.id, ..., 3); -- TRIAL_MAX_UNITS`.
  - `apps/api/src/cupo/cupo.service.ts`: Fallback cupo is `3`.
  - UI banner on `/facturacion` displays 3 units for free tier.
- **Governing Decision**: The source code and database migration establish `3` as the canonical trial cupo limit.

### 6. Mobile Viewport Proof vs Native Android Acceptance
- **Document Claim**:
  - Historical notes occasionally referred to 375px Playwright tests as "mobile/Android validation".
- **Observable Implementation**:
  - 375px captures are responsive web inside a Chromium browser engine.
  - Capacitor configuration uses LAN development server (`192.168.1.36:3000`).
  - No physical Android device or native wrapper lifecycle testing has occurred.
- **Governing Decision**: `architecture-boundaries.md` governs. Native Android validation is explicitly deferred; responsive web and Android readiness are strictly decoupled.
