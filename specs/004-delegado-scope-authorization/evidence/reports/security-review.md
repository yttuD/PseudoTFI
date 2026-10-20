# Security Review: Delegado Scope and Granular Authorization

Feature: `004-delegado-scope-authorization`  
Review Date: 2026-09-26  
Target Monorepo: `TFI` (Marketplace Inmobiliario)  
Status: **PASS (CRITICAL SECURITY GAPS REMEDIATED, ALL LIVE GATES VERIFIED)**

---

## 1. Executive Summary

This security review audits the boundary protections, authorization seam, database integrity triggers, transactional RPC boundaries, and interface fail-closed logic implemented for Feature 004 following Codex correction briefs.

All identified security violations (unrestricted direct table updates on `users` and invitations, missing server-side transaction boundaries, unverified client cookie role inference, lack of action logging, leaking metrics/cupo through simulated stores, and unprotected `/dev/*` layouts) have been directly remediated in the codebase and verified by live database (121/121 pgTAP assertions), API (173/173 tests), and Playwright E2E suites.

---

## 2. Security Boundaries & Threat Model

### 2.1 Database Boundary & Trigger Guards (`supabase/migrations/`)
- **Direct Column Modification Prevention**: A strict BEFORE UPDATE trigger `protect_user_fields()` was attached to `public.users`. Any update modifying `rol`, `workspace_id`, or `cupo_maximo` by non-service-role users is aborted with SQL state `42501` (Insufficient Privileges).
- **Transactional RPC Boundary**: Direct mutations on security-critical delegation tables (`invitaciones_delegados`, `delegaciones`, `delegacion_unidades`) are restricted. Six schema-qualified `SECURITY DEFINER SET search_path = ''` RPCs enforce atomic state transitions:
  - `public.create_delegado_invitation(uuid, text)`: Atomically inserts invitation, notification intent, outbox intent, and `log_acciones`.
  - `public.accept_delegado_invitation(uuid)`: Validates target account, claims invitation, transitions to `aceptada`, and creates pending delegation.
  - `public.reject_delegado_invitation(uuid)`: Validates target account and marks invitation `rechazada`.
  - `public.cancel_delegado_invitation(uuid)`: Validates Gestor ownership and marks pending invitation `cancelada`.
  - `public.configure_delegacion(uuid, text, text, uuid, uuid[])`: Replaces scope atomically, populates `delegacion_unidades`, and activates delegation.
  - `public.revoke_delegacion(uuid)`: Revokes delegation, clears assigned units, and writes audit event.
- **Row Locking & Invariants**: Every mutation executes with row-level locks (`SELECT ... FOR UPDATE`), preventing concurrent acceptance races and replay attacks.
- **Row-Level Security (RLS)**: Sensitive tables (`pagos`, `log_acciones`, `gestor_afip_config`) and storage buckets (`contratos`, `fotos`) are strictly enforced per role and scope.

### 2.2 API Authorization Seam (`apps/api/src/`)
- **No Resilient Store in Private Services**: `resilientStore` was completely stripped from `apps/api/src/cupo/cupo.service.ts` and `apps/api/src/metricas/metricas.service.ts`. Queries are executed against Supabase. On failure or unauthenticated access, the services throw `UnauthorizedException`, `NotFoundException`, or `ServiceUnavailableException`. No fake or simulated data is leaked.
- **Strict Role and Scope Resolution**: `AuthorizationService.resolveAccessContext(actor)` evaluates authenticated user credentials. Delegados without an active, configured delegation receive `state: 'pendiente_configuracion'` with 0 capabilities.
- **Target Integrity (Old vs New Targets)**: In `AlquileresController.update`, changing `unidad_id` to an out-of-scope Unidad is blocked with 403 Forbidden.
- **Cross-Workspace Anti-Enumeration**: Reading or managing resources belonging to another workspace yields 404 (or concealed `false`) to prevent ID enumeration.
- **Comprehensive Audit Trail (`ActionLogService`)**: All operations across `delegados`, `unidades`, `grupos`, `alquileres`, and `inquilinos` controllers now record immutable events into `log_acciones`.

### 2.3 Web Application & SSR Boundary (`apps/web/src/`)
- **Unverified Cookie Parsing Removed**: Direct parsing of base64 cookies in `middleware.ts` and `server-auth.ts` has been guarded behind `process.env.AUTH_ALLOW_DEV_TOKENS === 'true'`. In production paths, cookies must be validated by Supabase.
- **No Email Substring Inference**: Removed all heuristics inspecting `email.includes('delegado')` or `email.includes('buscador')`. Roles are strictly extracted from authoritative metadata or profile database records.
- **Fail-Closed Layouts**:
  - In `(gestor)/layout.tsx` and `(gestor)/dashboard/page.tsx`: If `accessContext` is unavailable for a Delegado, the system renders a localized retryable error screen (`data-testid="access-context-error"`) instead of defaulting to Gestor owner.
  - In `(gestor)/facturacion/page.tsx`: Delegados are blocked before any protected fetch with `data-testid="owner-only-forbidden"`.
  - In `(gestor)/delegados/page.tsx`: Non-gestor access is blocked with `data-testid="owner-only-forbidden"`, and unauthenticated requests are redirected to login.
  - In `dev/layout.tsx`: Explicit check `rol === 'admin' || rol === 'dev'` blocks common users and delegados with `data-testid="owner-only-forbidden"`.
- **Concealment of Owner Affordances**: For Delegados, Cupo gauges, Facturación widgets, and links to `/logs` are omitted from the UI.

---

## 3. Residual Risks & Environmental Status

1. **Local Database Verification**: Completed successfully with `supabase db reset` and `supabase test db` (121/121 assertions passed).
2. **Feature Acceptance Scope**: Feature 004 is accepted while the overall Rendo product and native Android remain separate future scopes.
