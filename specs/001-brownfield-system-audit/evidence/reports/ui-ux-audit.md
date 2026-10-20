# UI/UX & Visual Inspection Audit Report (`ui-ux-audit.md`)

Date: 2026-09-25 (Correction Pass 02)  
Auditor: Antigravity  
Evidence Set: 194 retained screenshots (184 rendered surface cells + 10 interaction captures) under `specs/001-brownfield-system-audit/evidence/screenshots/`  
Matrix Coverage: 24 distinct rendered surfaces across 4 viewports (375w, 768w, 1024w, 1440w) and 2 themes (Light, Dark). Redirect alias SURF-014 captures (8 files) were deleted as redundant.

---

## 1. Platform Separation: Desktop Web vs Responsive Web

### Desktop Web (1024w and 1440w)
- **Status**: Implemented and visually consistent across marketplace and operational workspace.
- **Rendo Brand Tokens**:
  - Light theme properly resolves `#F7F5F0` (ivory background), `#131F3C` (night blue headers), `#B89355` (gold buttons/badges).
  - Dark theme properly resolves `#0B1428` / `#131F3C` (canvas) and `#182747` (elevated cards).
  - Text contrast against ivory canvas exceeds 7:1 (WCAG AAA).
- **Typography & Layout**:
  - Geist / GeistMono font stacks render cleanly without layout shifts.
  - Spacing and grid layouts (e.g. Bento grid on `/mis-unidades`) display correct hierarchy.

### Responsive Web (375w and 768w)
- **Status**: Mixed disposition; public marketplace mobile navigation operates cleanly, but operational and dev surfaces exhibit significant responsive defects.
- **Specific Responsive Findings**:
  - **FIND-005 (UnidadForm Action Bar Overlap)**: At 375px, the floating action bar covers the bottom input fields of `UnidadForm.tsx` due to missing bottom padding (`pb-24`).
  - **FIND-013 (Responsive Dev Console Unusable)**: At 375px, the fixed desktop dev sidebar (width `w-64`) and wide telemetry tables in `/dev/*` are severely compressed into a narrow viewport strip, causing horizontal clipping and illegible data.
  - **Touch Targets**: While marketplace bottom nav buttons meet the 44×44px touch target, several action icons in the gestor tables fall below 36px.

---

## 2. Key Findings Ledger from Direct Visual Inspection

### Finding 1: UTF-8 Mojibake in Dev Console (`FIND-003`)
- **Severity**: P2 (I18n & Brand Quality)
- **Evidence**: `SURF-022__dev__1440w__light__default.png`
- **Observed**: Sidebar navigation and section headings display corrupted double-encoded UTF-8 characters:
  - `Cola de ModeraciÃ³n` (expected: `Moderación`)
  - `AuditorÃ­a de Pagos` (expected: `Auditoría`)
  - `MÃ©tricas & Infra` (expected: `Métricas`)
  - `automÃ¡tico` (expected: `automático`)

### Finding 2: Native OS Emojis as Interface Icons (`FIND-004`)
- **Severity**: P2 (Design System Invariant)
- **Evidence**: `SURF-012__gestor__1440w__light__default.png`
- **Observed**: Section headings in `UnidadForm.tsx` embed native Unicode emojis directly (`🏢`, `📦`, `🌐`) instead of Lucide SVG icons (`<Building2 />`, `<Globe />`, `<Package />`). Emojis render inconsistently across client operating systems.

### Finding 3: Non-Canonical Vocabulary in Inquilinos CRM (`FIND-006`)
- **Severity**: P2 (Domain Canon Compliance)
- **Evidence**: `SURF-015__gestor__1440w__light__default.png`
- **Observed**: Subtitle copy reads: *"Gestioná los datos de tus inquilinos para asociarlos a los contratos."* Canonical domain requires **Alquiler**, not "contrato".

### Finding 4: Sticky Action Bar Overlap on Mobile (`FIND-005`)
- **Severity**: P2 (Mobile Usability)
- **Evidence**: `SURF-012__gestor__375w__light__default.png`
- **Observed**: On 375px viewport, the sticky bottom action bar containing `CANCELAR` and `Guardar Unidad` covers the bottom input fields.

### Finding 5: Mobile Dev Console Layout Degradation (`FIND-013`)
- **Severity**: P2 (Responsive Web Usability)
- **Evidence**: `SURF-022__dev__375w__light__default.png`, `SURF-023__dev__375w__light__default.png`
- **Observed**: Fixed sidebar and wide table layout force content into an unusable narrow layout. Mobile web does not have an adaptive drawer or mobile-friendly card view for dev metrics and logs.

---

## 3. Capacitor Android Wrapper Readiness Assessment
- **Evidence**: `apps/web/capacitor.config.ts`, `apps/web/android/`
- **Readiness Findings (`FIND-012`)**:
  - `server.url` points to LAN address `http://192.168.1.36:3000`.
  - `cleartext: true` and `allowMixedContent: true` allow unencrypted HTTP traffic.
  - `webContentsDebuggingEnabled: true` remains enabled in configuration.
- **Platform Clarification**: These observations constitute configuration readiness analysis only. Native Android device testing is deferred to a future dedicated Spec Kit feature.
