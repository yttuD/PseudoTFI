# Public Findings and Remediation Report (`public-findings.md`)

**Date**: 2026-09-27  
**Phase**: Phase 3 / US1 — Experiencia pública completa (T021–T025 Remediation)  
**Execution Reference**: `apps/web/e2e/product_readiness_public.spec.ts` (`--project="Desktop Chrome"`)  
**Master Findings Reference**: `specs/005-web-product-readiness/evidence/reports/findings.md`  
**Acceptance Matrix Reference**: `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md`  

---

## 1. Executive Summary

Following baseline audit T017–T020, batch **02B (T021–T025)** executed systematic remediation of public findings **FIND-005-011** through **FIND-005-028** strictly within frontend presentation code (`apps/web/src/**`).

- **Playwright Test Execution**: **144 tests executed, 144 passed (0 failed, 0 skipped)** on the canonical `Desktop Chrome` project.
- **Accepted Screenshot Inventory**: **128 valid PNG files** generated into `specs/005-web-product-readiness/evidence/screenshots/public/accepted/` (16 IDs × 4 viewports × 2 themes).
- **Entropy & Integrity**: **128 unique SHA-256 hashes** across all 128 accepted files (0 hash collisions, 0 light/dark collisions).
- **Contact Sheets**: **16 PNG contact sheets** generated into `specs/005-web-product-readiness/evidence/contact-sheets/public/accepted/` (one per surface/form item with 8 labeled cells) plus interactive HTML review matrix.
- **Status of Findings**: All 19 public findings resolved: 15 `fixed -> verified`, 4 `not-reproducible` (re-evaluated with viewport clipping confirmation). Zero critical, high, or medium public defects remain open.

---

## 2. Findings Remediation Register

| Finding ID | Inventory ID | Category | Severity | Pre-Remediation Status | Post-Remediation Status | Verification Method |
|---|---|---|---|---|---|---|
| **FIND-005-011** | SURF-001 | privacy | high | open | `fixed -> verified` | Playwright TC-PUB-001, 002, 004, 009: anon visitors see no `/dashboard` links |
| **FIND-005-012** | SURF-003, CTRL-002 | domain | high | open | `fixed -> verified` | Playwright TC-PUB-005: WhatsApp button renders with normalized phone & `wa.me` URL |
| **FIND-005-013** | SURF-001 | responsive | medium | open | `not-reproducible` | Bounded SVG container check: outer element clips via `overflow-hidden` |
| **FIND-005-014** | SURF-001, FORM-009 | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Hero search input & button enforce `min-h-[44px] min-w-[44px]` |
| **FIND-005-015** | SURF-002, FORM-015 | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Filter select triggers, inputs, and Limpiar button >= 44px |
| **FIND-005-016** | SURF-003 | responsive | medium | open | `not-reproducible` | Bounded container check: Leaflet container wrapped in `overflow-hidden rounded-2xl` |
| **FIND-005-017** | SURF-003, CTRL-001 | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Favorito and share buttons enforce `min-h-[44px] min-w-[44px]` |
| **FIND-005-018** | SURF-007, SURF-008 | responsive | high | open | `not-reproducible` | Bounded layout check: `AuthLayout` root has `overflow-hidden` clipping all glows |
| **FIND-005-019** | SURF-007, SURF-008 | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Auth mode toggle buttons & inputs meet 44px min height |
| **FIND-005-020** | SURF-009, FORM-012 | responsive | high | open | `not-reproducible` | Bounded layout check: Onboarding Gestor container clips background via `overflow-hidden` |
| **FIND-005-021** | SURF-005, SURF-006 | accessibility | low | open | `fixed -> verified` | Playwright matrix: Legal back links enforce `min-h-[44px]` touch target envelope |
| **FIND-005-022** | SURF-002, SURF-007 | accessibility | medium | open | `fixed -> verified` | Playwright TC-PUB-018: Sequential Tab navigation and visible focus rings verified |
| **FIND-005-023** | SURF-001, SURF-002, SURF-003 | responsive | medium | open | `fixed -> verified` | Playwright matrix at 768px: Direct containment check `left >= -1 && right <= innerWidth + 1` passes for all header controls; no visual clipping of Panel Gestor |
| **FIND-005-024** | SURF-003 | responsive | medium | open | `fixed -> verified` | Playwright matrix: Single-photo units hide secondary column `.hidden.md:grid` |
| **FIND-005-025** | SURF-003 | responsive | medium | open | `fixed -> verified` | Playwright matrix: Detail tabs stack via `flex-col sm:flex-row` at 375px without clipping |
| **FIND-005-026** | SURF-001 | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Home primary CTA contrast meets WCAG AA >= 4.5:1 in dark mode |
| **FIND-005-027** | Public Surfaces | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Comprehensive contrast >= 4.5:1 across all public matrix cells |
| **FIND-005-028** | SURF-001 | accessibility | medium | open | `fixed -> verified` | Playwright matrix: Secondary CTA on SURF-001 at 375w measures >= 44px touch target |
| **FIND-005-029** | SURF-001 | responsive / routing | high | open | `fixed -> verified` | Playwright TC-PUB-001 & visual matrix loop: Ordinary mobile web browser on `/es` remains on `/es` without redirection; Home content visibly rendered at 375w |

---

## 3. Remediation Details by Finding

### FIND-005-011: Public Navigation Gestor Link Leak
- **Status**: `fixed -> verified`
- **Resolution**: Ensured anonymous navigation surfaces (footer, header, bottom nav) omit links to `/dashboard`. Anonymous visitors are routed only to public marketplace or `/auth/login`.

### FIND-005-012: WhatsApp CTA Property Normalization
- **Status**: `fixed -> verified`
- **Resolution**: Updated `unidades/[id]/page.tsx` and `WhatsAppButton.tsx` to handle both `telefono` and `whatsapp` properties seamlessly, stripping non-digit characters and forming canonical `https://wa.me/5493777123456` links.

### FIND-005-013: City Skyline Horizontal Overflow at 1440w
- **Status**: `not-reproducible` (re-evaluated with clipping)
- **Resolution**: Verified that `CityBackground.tsx` is contained within an `overflow-hidden` parent section. Unclipped SVG element measurements were confirmed to be visual test false-positives; document-level horizontal overflow is strictly 0.

### FIND-005-014: Search Wizard Touch Targets on Mobile/Tablet
- **Status**: `fixed -> verified`
- **Resolution**: Adjusted search input container and submit button in `page.tsx` and `skiper106.tsx` to `min-h-[44px] min-w-[44px]`.

### FIND-005-015: Catalog Filter Touch Targets
- **Status**: `fixed -> verified`
- **Resolution**: Added `min-h-[44px] min-w-[44px]` to Select triggers, price inputs, and the "Limpiar" button in `MarketplaceFiltrosSidebar.tsx`.

### FIND-005-016: Leaflet Map Tiles Overflow at 768w Dark
- **Status**: `not-reproducible` (re-evaluated with clipping)
- **Resolution**: The map card in `unidades/[id]/page.tsx` uses `overflow-hidden rounded-2xl` with zero document-level horizontal overflow.

### FIND-005-017: Detail Action Buttons Undersized
- **Status**: `fixed -> verified`
- **Resolution**: In `FavoritoButton.tsx`, `ReporteModal.tsx`, and detail share buttons, applied `min-h-[44px] min-w-[44px]` with proper touch padding.

### FIND-005-018: Auth Layout Glow Overflows
- **Status**: `not-reproducible` (re-evaluated with clipping)
- **Resolution**: Verified `auth-layout.tsx` enforces `overflow-hidden` at the root wrapper, containing all decorative background gradients.

### FIND-005-019: Auth Form Toggle and Input Heights
- **Status**: `fixed -> verified`
- **Resolution**: Updated auth inputs and method toggle buttons to `h-11 min-h-[44px]`.

### FIND-005-020: Onboarding Gestor Decorative Overflows
- **Status**: `not-reproducible` (re-evaluated with clipping)
- **Resolution**: Confirmed root container in `onboarding-gestor/page.tsx` clips decorative blur layers via `overflow-hidden`.

### FIND-005-021: Legal Back Navigation Link Undersized
- **Status**: `fixed -> verified`
- **Resolution**: Added `min-h-[44px] inline-flex items-center` to the "Volver al marketplace" link in `terminos/page.tsx` and `privacidad/page.tsx`.

### FIND-005-022: Keyboard Focus Indicator & Traversal
- **Status**: `fixed -> verified`
- **Resolution**: Removed disabled-by-default barriers on login/register submit buttons and added `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-2` to interactive controls.

### FIND-005-023: Marketplace Header Control Clipping at 768px Tablet
- **Status**: `fixed -> verified`
- **Resolution**: In `Navbar.tsx`, adopted a deliberate tablet layout by hiding secondary center navigation links ("EXPLORAR", "PUBLICAR MI UNIDAD") until `lg` (1024px+), while retaining the full accessible navigation paths. Added direct Playwright evaluation asserting `left >= -1` and `right <= window.innerWidth + 1` for all visible header controls, ensuring `Panel Gestor` and all right controls are completely contained and visually unclipped at 768px.

### FIND-005-029: Ordinary Mobile Web Visitor Redirected Away from Home
- **Status**: `fixed -> verified`
- **Resolution**: Removed regex user-agent and viewport width checks from `apps/web/src/lib/supabase/middleware.ts` and `apps/web/src/app/[locale]/(marketplace)/page.tsx`. Ordinary mobile web browsers at 375w, 768w, 1024w, and 1440w remain on the requested `/es` route and visibly render responsive Home content. Native routing is strictly deferred and only activated if an explicit `renda-native-mode=true` cookie is present. Verified by functional pathname assertion and visual matrix capture.

### FIND-005-024: Unbalanced Hero Split on Detail
- **Status**: `fixed -> verified`
- **Resolution**: In `unidades/[id]/page.tsx`, conditioned the secondary gallery column on `unidad.fotos.length > 1`, rendering a clean single-image hero when only one photo exists.

### FIND-005-025: Clipped Detail Tabs on 375px Mobile
- **Status**: `fixed -> verified`
- **Resolution**: In `tabs.tsx`, changed tab list container layout to `flex flex-col sm:flex-row w-full` for small screens, allowing full readability and reachable tap targets.

### FIND-005-026: Home Dark-Theme CTA Button Contrast
- **Status**: `fixed -> verified`
- **Resolution**: Adjusted color tokens on the primary CTA button in `page.tsx` to provide >= 4.5:1 contrast against dark background `#101B37`.

### FIND-005-027: Comprehensive Dark Mode Contrast Deficiencies
- **Status**: `fixed -> verified`
- **Resolution**: Corrected text colors, prose links, legal links, invitation action buttons, and pricing titles across `privacidad/page.tsx`, `terminos/page.tsx`, `login/page.tsx`, `registro/page.tsx`, `InvitationInbox.tsx`, and `interactive-hover-button.tsx`.

### FIND-005-028: Secondary CTA Touch Target on Mobile (SURF-001)
- **Status**: `fixed -> verified`
- **Resolution**: Ensured the secondary CTA "Explorar Unidades" and related mobile buttons maintain >= 44px touch bounding box.
