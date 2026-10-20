# Findings Report — Deduplicated by Root Cause (`findings.md`)

Date: 2026-09-25 (Correction Pass 02)

## Findings Summary by Severity
- **P0 (Critical Security Vulnerability / Auth Bypass)**: 1
- **P1 (High / Architecture / Invariant Violation / Blocked Journey)**: 4
- **P2 (Medium / UI/UX / Responsive / Non-Canonical Copy / Config Readiness)**: 7
- **P3 (Low / Polish)**: 0
- **Total Deduplicated Findings**: 12

---

## Detailed Findings Ledger

### FIND-009: Critical API Authentication Bypass Fallback in SupabaseAuthGuard
- **Severity**: P0 (Critical Security Risk)
- **Root Cause**: `apps/api/src/auth/supabase-auth.guard.ts` (lines 86-92) accepts unverified bearer tokens when Supabase validation fails, explicitly granting full Gestor identity (`11111111-1111-1111-1111-111111111111`) to any bearer string longer than 10 characters or containing 'gestor'/'dev-access-token'. There is no environment gate restricting this fallback to local development.
- **User Impact**: Total authentication bypass on all guarded API capabilities (`CAP-001` through `CAP-013`). Any external HTTP caller can forge requests with an arbitrary 11-character token and obtain administrative access over tenant data.
- **Affected Items**: `CAP-001`, `CAP-002`, `CAP-003`, `CAP-004`, `CAP-005`, `CAP-006`, `CAP-007`, `CAP-009`, `CAP-010`, `CAP-011`, `CAP-012`, `CAP-013`.
- **Evidence**: Source inspection of `apps/api/src/auth/supabase-auth.guard.ts`.
- **Remediation Candidate**: `REMED-001` (Core Auth Guard Remediation & Security Hardening).

### FIND-002: Missing Public Calendar Blocking When a Seña Is Registered
- **Severity**: P1 (Business Invariant Violation)
- **Correction**: The original audit incorrectly demanded an automatic Unidad state change to
  `alquilada`. ADR 0004, `CONTEXT.md`, and `ARQUITECTURA-Y-PRODUCTO.md` explicitly require the
  general Unidad state to remain manual. No such state exists in the physical enum.
- **Root Cause**: `AlquileresService.create()` stores `monto_sena`/`estado_pago`, but the schema and
  service contain no public-calendar availability model or atomic date-range block when a Seña is
  registered.
- **User Impact**: A paid Seña does not create the required automatic availability block for the
  Alquiler date range, so a public calendar cannot reliably prevent conflicting interest/bookings.
- **Affected Items**: `CAP-002`, `SURF-016`, `MIG-007`.
- **Evidence**: `CONTEXT.md:64-65`, `ARQUITECTURA-Y-PRODUCTO.md:113-119`,
  `documentation.md:94-98`, `apps/api/src/alquileres/alquileres.service.ts`, and active migrations.
- **Remediation Candidate**: `REMED-002` (Seña Calendar Availability & Blocking).

### FIND-010: Dev/Admin Console Authorization Gap in Web Layout
- **Severity**: P1 (Authorization Boundary Defect)
- **Root Cause**: `apps/web/src/app/[locale]/dev/layout.tsx` (lines 81-84) checks only `if (rol === 'buscador')` to redirect unauthorized users. Authenticated users with role `gestor` or `delegado` are not rejected.
- **User Impact**: Ordinary property managers and delegates can access internal dev/admin tools (moderation queues, system logs, platform metrics, payment audit), violating Constitution Principle VI (Trust Surfaces Separation).
- **Affected Items**: `SURF-022`, `SURF-023`, `SURF-024`, `SURF-025`.
- **Evidence**: Source inspection of `apps/web/src/app/[locale]/dev/layout.tsx` and Playwright targeted test execution (`2026-09-25-playwright-targeted.log`).
- **Remediation Candidate**: `REMED-003` (Dev/Admin Surface Authorization & Role Enforcement).

### FIND-011: Absent Delegado Granular Scope and Permission Model
- **Severity**: P1 (Core Domain Architecture Gap)
- **Root Cause**: The intended model (`scope` [account, Grupo, selected Unidades] × `permission` [`Ver`, `Gestionar`]) is completely absent from backend implementation. The schema has only `users.rol IN ('gestor', 'delegado')`, workspace RLS policies use `FOR ALL`, and API controllers do not enforce action level. The missing dropdown in `DelegadoFormModal.tsx` is only a superficial symptom of an unbuilt domain model.
- **User Impact**: Delegados either receive complete, unconstrained administrative access over the Gestor workspace or no access. Granular least-privilege delegation cannot be configured.
- **Affected Items**: `CAP-004`, `SURF-019`, `FORM-007`, `MIG-008`.
- **Evidence**: Source inspection of `delegados.service.ts`, `DelegadoFormModal.tsx`, and migration `20260905062000_rbac_delegados.sql`.
- **Remediation Candidate**: `REMED-004` (Delegado Scope & Granular Permission Architecture).

### FIND-007: SSR Timeout on Delegados Route due to Offline Local Supabase
- **Severity**: P1 (Environment Blocker)
- **Root Cause**: Next.js server component `apps/web/src/app/[locale]/(gestor)/delegados/page.tsx` executes server-side Supabase client calls against `http://127.0.0.1:54321`. When the local Supabase container is stopped, the server fetch hangs until connection timeout.
- **User Impact**: Renders error or times out during page load unless Supabase is running or timeout fallback is provided.
- **Affected Items**: `SURF-019`, `BLOCK-SUPABASE-LOCAL`.
- **Evidence**: Playwright targeted test log (`2026-09-25-playwright-targeted.log`).
- **Prerequisite**: Start local Supabase docker stack via `npx supabase start` or configure fallback timeout in server client.

### FIND-003: UTF-8 Mojibake in Dev Dashboard Surfaces
- **Severity**: P2 (Visual / Internationalization Defect)
- **Root Cause**: Dev layout and page files (`apps/web/src/app/[locale]/dev/*`) were saved with mismatched character encoding (ANSI/Windows-1252 to UTF-8 double-encoding).
- **User Impact**: Corrupted glyphs (`Cola de ModeraciÃ³n`, `AuditorÃ­a`, `MÃ©tricas`, `automÃ¡tico`) visible in dev tools.
- **Affected Items**: `SURF-022`, `SURF-023`, `SURF-024`.
- **Evidence**: `SURF-022__dev__1440w__light__default.png`.
- **Remediation Candidate**: `REMED-005` (I18n, Encoding & Brand Design System Polish).

### FIND-004: Native OS Emojis Used as Interface Icons
- **Severity**: P2 (Design System Invariant Defect)
- **Root Cause**: `apps/web/src/components/gestor/UnidadForm.tsx` embeds Unicode emojis (`🏢`, `📦`, `🌐`) directly in JSX heading tags instead of Lucide SVG icons.
- **User Impact**: Emojis render inconsistently across Android, iOS, Windows, and Linux shells; violates WCAG accessible iconography and Rendo Design System.
- **Affected Items**: `SURF-012`, `SURF-013`, `FORM-005`.
- **Evidence**: `SURF-012__gestor__1440w__light__default.png`.
- **Remediation Candidate**: `REMED-005` (I18n, Encoding & Brand Design System Polish).

### FIND-005: Sticky Bottom Action Bar Overlap on Mobile Viewport
- **Severity**: P2 (Responsive Usability Defect)
- **Root Cause**: `UnidadForm.tsx` has fixed bottom floating action buttons without sufficient bottom padding (`pb-24`) on the parent container.
- **User Impact**: On 375px mobile viewports, the bottom inputs are partially covered by the action bar.
- **Affected Items**: `SURF-012`, `FORM-005`.
- **Evidence**: `SURF-012__gestor__375w__light__default.png`.
- **Remediation Candidate**: `REMED-005` (I18n, Encoding & Brand Design System Polish).

### FIND-006: Non-Canonical Vocabulary in Inquilinos CRM
- **Severity**: P2 (Domain Consistency Defect)
- **Root Cause**: `apps/web/src/app/[locale]/(gestor)/inquilinos/page.tsx` uses the non-canonical word "contratos" in the header subtitle.
- **User Impact**: Violates Rendo Constitution Principle II ("Canonical Domain and Architecture").
- **Affected Items**: `SURF-015`.
- **Evidence**: `SURF-015__gestor__1440w__light__default.png`.
- **Remediation Candidate**: `REMED-005` (UI/UX, Encoding & Brand Design System Polish).

### FIND-008: Live AFIP Web Services Unavailability in Dev Environment
- **Severity**: P2 (Environment Blocker)
- **Root Cause**: Live AFIP CAE authorization requires a valid digital certificate (`.crt`), private key (`.key`), and delegation in AFIP WSFE testing portal.
- **User Impact**: Full end-to-end invoice generation cannot be verified against AFIP servers without test credentials; tested via sandbox configuration form.
- **Affected Items**: `CAP-013`, `FORM-002`, `SURF-018`, `BLOCK-AFIP-001`.
- **Prerequisite**: AFIP homologation testing certificates and CUIT delegation.

### FIND-012: Capacitor Android Wrapper Insecure Development Configuration
- **Severity**: P2 (Platform Architecture Readiness)
- **Root Cause**: `apps/web/capacitor.config.ts` defines `server.url = 'http://192.168.1.36:3000'`, `cleartext: true`, `allowMixedContent: true`, and `webContentsDebuggingEnabled: true`.
- **User Impact**: Hardcoded LAN development server configuration prevents standalone APK execution, allows unencrypted traffic, and exposes web debugging in builds.
- **Affected Items**: `apps/web/capacitor.config.ts`, `apps/web/android/`.
- **Evidence**: Source inspection of `apps/web/capacitor.config.ts`.
- **Remediation Candidate**: Deferred to future dedicated Mobile & Native Android Spec Kit feature.

### FIND-013: Responsive Dev Console Unusable on 375px Mobile Viewport
- **Severity**: P2 (Responsive Usability Defect)
- **Root Cause**: `/dev/*` layouts feature a fixed 256px sidebar and multi-column tables designed strictly for desktop viewports without an adaptive mobile drawer or card breakdown.
- **User Impact**: Dense tabular data and navigation are illegible on mobile screens.
- **Affected Items**: `SURF-022`, `SURF-023`, `SURF-024`, `SURF-025`.
- **Evidence**: `SURF-022__dev__375w__light__default.png`.
- **Remediation Candidate**: `REMED-003` (Dev/Admin Surface Authorization & Role Enforcement).
