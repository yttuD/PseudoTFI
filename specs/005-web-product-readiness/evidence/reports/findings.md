# Master Findings Register (`findings.md`)

Conforms strictly to `data-model.md` and governing rules.  
All visual suspicions from source inspection are labeled as **unverified** until confirmed by browser execution in subsequent batches.

## Finding Schema Reference
- `id`: Stable identifier (`FIND-005-xxx`).
- `inventoryId`: Associated item from manifests.
- `category`: `functionality` | `authorization` | `privacy` | `domain` | `UI` | `responsive` | `accessibility` | `performance` | `localization` | `documentation` | `cleanup`.
- `severity`: `critical` | `high` | `medium` | `low`.
- `status`: `open` | `assigned` | `fixed` | `verified` | `accepted-exception` | `not-reproducible`.

---

## Baseline Findings (Batch 01 Source Inspection)

| Finding ID | Inventory ID | Category | Severity | Reproduction / Evidence | Expected Behavior | Observed Actual Behavior | Status | Target Story / Batch |
| **FIND-005-001** | CAP-013 | cleanup | low | File exists at `apps/api/src/scratch/test_afip_fiscal_config.cjs` | Production source free of temporary test scratch scripts | Orphaned test script retained in API source tree | open | Phase 8 / T062 |
| **FIND-005-002** | SURF-016 | domain | high | Source review of `apps/api/src/alquileres/` and `apps/web/src/components/gestor/` | FR-020: Seña must be optional and configurable in a reusable way for an explicit Grupo | Seña stored on Alquiler entity, but no group-level reusable default configuration exists | verified | Phase 4 / US2 (T034) (Fixed in T034; verified 11/11 rentals E2E pass) |
| **FIND-005-003** | SURF-016 | functionality | high | Source review of `AlquilerFormModal.tsx` and `alquileres.service.ts` | FR-019 & FR-021: Monthly, daily, hourly rentals must have distinct temporal rules and overlap prevention | Modal primarily handles monthly contracts; hourly and daily availability boundaries lack distinct UI fields and overlap validation | verified | Phase 4 / US2 (T033) (Fixed in T033; verified 11/11 rentals E2E pass) |
| **FIND-005-004** | SURF-022 | UI | medium | Historical audit inspection of `apps/web/src/app/[locale]/dev/moderacion/page.tsx` | FR-007 & FR-012: Clean UTF-8 strings and responsive non-clipped layout at 375w | Mojibake observed in badge text and table columns compressed on mobile | open | Phase 6 / US4 (T052) |
| **FIND-005-005** | SURF-019 | functionality | medium | Source review of `apps/web/src/app/[locale]/(gestor)/delegados/page.tsx` | FR-009: Graceful fallback when backend services are offline or slow | SSR query attempts direct connection without resilient mock or error boundary when local Supabase offline | open | Phase 5 / US3 (T044) |
| **FIND-005-006** | SURF-026 | documentation | medium | Review of `apps/web/e2e/` test coverage | FR-015, FR-016, FR-028: Dedicated E2E suite covering authenticated public user journeys (invitation inbox, favorites, reporting) | Existing E2E suites cover anon and gestor; public authenticated user journeys are fragmented | open | Phase 3 / US1 (T017–T019) |
| **FIND-005-007** | Interactions | accessibility | medium | Source inspection of compact table action buttons and icon links | FR-011: Interactive controls must have at least 44x44px touch bounding box or wrapper | Unverified visual suspicion: Action buttons in dense tables may measure < 44px on mobile viewports | open (unverified) | Phase 7 / US5 (T056) |
| **FIND-005-008** | SURF-001 | accessibility | medium | Source inspection of badge overlays and translucent glassmorphism cards | FR-013: All text and essential controls must meet WCAG AA 4.5:1 contrast | Unverified visual suspicion: Subtitle and badge text on dark/light background variants may fall below 4.5:1 | open (unverified) | Phase 7 / US5 (T057) |
| **FIND-005-009** | SURF-011 | responsive | medium | Source inspection of data tables in `mis-unidades`, `alquileres`, `logs` | FR-012: Zero horizontal page overflow at 375px and 768px viewports | Unverified visual suspicion: Multi-column tables may produce viewport scrollbar without horizontal scroll wrapper | open (unverified) | Phase 7 / US5 (T055) |
| **FIND-005-010** | Translations | localization | low | Source inspection of `apps/web/messages/{es,pt,en}.json` | FR-015 & FR-017: Comprehensive UI strings across ES, PT, and EN | Unverified suspicion: Keys added in Feature 004 (delegado invitations, scope tags) may be missing in PT/EN | open | Phase 7 / US5 (T058) |

---

## Public Baseline Audit Findings (Batch 02A Browser Execution — T017–T020)

| Finding ID | Inventory ID | Category | Severity | Reproduction / Evidence | Expected Behavior | Observed Actual Behavior | Status | Target Story / Batch |
|---|---|---|---|---|---|---|---|---|
| **FIND-005-011** | SURF-001 | privacy | high | E2E `product_readiness_public.spec.ts` Case 1.9 | FR-004, FR-015: Anonymous visitors must not be exposed to Gestor dashboard URLs | Direct link `href="/es/dashboard"` rendered in footer/nav for anon visitor | verified | Phase 3 / US1 (T021) |
| **FIND-005-012** | SURF-003, CTRL-002 | domain | high | E2E `product_readiness_public.spec.ts` Case 2.4 | FR-015: WhatsApp button must render when contact phone exists | Button passes `telefono={unidad.telefono}` but API returns `whatsapp`; evaluates to empty phone and returns null | verified | Phase 3 / US1 (T021) |
| **FIND-005-013** | SURF-001 | responsive | medium | E2E visual matrix at 1440w viewport (`SURF-001__1440w__light.png`) | FR-012: Zero horizontal page overflow | `g#distantSkyline` rect in `CityBackground.tsx` extends to 1475px (> 1440px viewport) | not-reproducible | Phase 3 / US1 (T023) |
| **FIND-005-014** | SURF-001, FORM-009 | accessibility | medium | E2E visual matrix at 375w and 768w | FR-011: Minimum 44x44px touch target on mobile/tablet | Inline search input measures 20px height (287x20px / 413x20px) | verified | Phase 3 / US1 (T023) |
| **FIND-005-015** | SURF-002, FORM-015 | accessibility | medium | E2E visual matrix at 375w and 768w | FR-011: Minimum 44x44px touch target on mobile/tablet | Filter sidebar select inputs and action buttons measure 36px height (< 44px) | verified | Phase 3 / US1 (T023) |
| **FIND-005-016** | SURF-003 | responsive | medium | E2E visual matrix at 768w dark theme (`SURF-003__768w__dark.png`) | FR-012: Zero horizontal page overflow | Leaflet map container tiles extend to right 793px (> 768px viewport) | not-reproducible | Phase 3 / US1 (T023) |
| **FIND-005-017** | SURF-003, CTRL-001 | accessibility | medium | E2E visual matrix at 375w | FR-011: Minimum 44x44px touch target on mobile/tablet | Favorite and share icon buttons measure 34x34px; tabs measure 28px height | verified | Phase 3 / US1 (T023) |
| **FIND-005-018** | SURF-007, SURF-008 | responsive | high | E2E visual matrix across all viewports (`SURF-007__*`, `SURF-008__*`) | FR-012: Zero horizontal page overflow | Blurred glow elements extend up to 1520px with negative left coordinates without `overflow-hidden` | not-reproducible | Phase 3 / US1 (T022) |
| **FIND-005-019** | SURF-007, SURF-008 | accessibility | medium | E2E visual matrix at 375w and 768w | FR-011: Minimum 44x44px touch target on mobile/tablet | Auth mode toggles measure 32px height; text inputs measure 42px height | verified | Phase 3 / US1 (T022) |
| **FIND-005-020** | SURF-009, FORM-012 | responsive | high | E2E visual matrix across all viewports (`SURF-009__*`) | FR-012: Zero horizontal page overflow | Decorative background elements extend beyond viewport bounds without `overflow-hidden` | not-reproducible | Phase 3 / US1 (T022) |
| **FIND-005-021** | SURF-005, SURF-006 | accessibility | low | E2E visual matrix at 375w | FR-011: Minimum 44x44px touch target on mobile/tablet | Legal back link measures 133x20px (< 44px min height) | verified | Phase 3 / US1 (T023) |
| **FIND-005-022** | SURF-002, SURF-007 | accessibility | medium | E2E keyboard focus reachability test | FR-013, FR-026: Sequential Tab navigation and visible focus rings | Focus traversal trapped/diverted before reaching primary submit button in auth form | verified | Phase 3 / US1 (T022) |
| **FIND-005-023** | SURF-001, SURF-002, SURF-003 | responsive | medium | E2E visual matrix at 768w (`SURF-001__768w__*.png`) | FR-012: Every visible header control must have left >= -1 and right <= innerWidth + 1 without visual clipping | Right side of Panel Gestor clipped at 768px due to desktop center nav width pushing controls beyond viewport | verified | Phase 3 / US1 (T023) |
| **FIND-005-024** | SURF-003 | responsive | medium | E2E visual matrix at 768w (`SURF-003__768w__*.png`) | FR-012: Hero gallery adapts gracefully when secondary images are absent | Gallery splits into 2 columns with right column showing empty muted placeholder blocks | verified | Phase 3 / US1 (T023) |
| **FIND-005-025** | SURF-003 | responsive | medium | E2E visual matrix at 375w (`SURF-003__375w__*.png`) | FR-012: Detail tabs must remain readable and contained within viewport bounds | Detail tabs overflow 375px mobile viewport and clip rightmost tab text | verified | Phase 3 / US1 (T023) |
| **FIND-005-026** | SURF-001 | accessibility | medium | E2E visual matrix at 1440w dark (`SURF-001__1440w__dark.png`) | FR-013: All interactive text and CTA buttons meet WCAG AA 4.5:1 contrast | Primary CTA button ("Publicar mis Unidades") fails contrast with 1.12:1 against dark background | verified | Phase 3 / US1 (T023) |
| **FIND-005-027** | Public Matrix Surfaces | accessibility | medium | Comprehensive contrast check across all 16 surfaces/forms | FR-013: Normal text >= 4.5:1, qualifying large text >= 3.0:1 | Multiple muted text, subtitle, and badge elements fail 4.5:1 ratio in verified dark theme | verified | Phase 3 / US1 (T022, T023) |
| **FIND-005-028** | SURF-001 | accessibility | medium | E2E visual matrix at 375w | FR-011: Minimum 44x44px touch target on mobile/tablet | Secondary CTA on SURF-001 at 375w had undersized 36px touch target | verified | Phase 3 / US1 (T023) |
| **FIND-005-029** | SURF-001 | responsive / functionality | high | E2E Playwright navigation on `/es` at 375w | FR-015: Ordinary mobile web visitor remains on `/es` and sees responsive Home | User agent detection treated mobile web as native mode, redirecting `/es` to `/es/unidades` | verified | Phase 3 / US1 (T021, T023) |

---

## Gestor Baseline Audit Findings (Batch 03A Browser Execution — T026–T030)

| Finding ID | Inventory ID | Category | Severity | Reproduction / Evidence | Expected Behavior | Observed Actual Behavior | Status | Target Story / Batch |
| **FIND-005-030** | SURF-016, FORM-001 | domain / validation | high | E2E `product_readiness_rentals.spec.ts` Case 1.2 | FR-021: Hourly/daily rental collision detection prevents concurrent overlapping bookings | Client-side validation lacks temporal collision detection for granular hourly intervals | verified | Phase 4 / US2 (T033) (Fixed in T033; half-open interval overlap 409 and boundary adjacency verified) |
| **FIND-005-031** | SURF-011, 015, 016, 017, 018, 020, 021 | responsive / UI | medium | E2E visual matrix across Gestor tables at 375w | FR-012: Zero horizontal page overflow at 375px viewport | Multi-column tables produce horizontal scrollbar without responsive card conversion or wrapped scroll container | verified (fixed) | Phase 4 / US2 (T031, T032, T033, T035, T036 fixed across all operational tables and cards) |
| **FIND-005-032** | SURF-010, 011, 015, 016, 017, 018, 019, 020, 021 | accessibility | medium | E2E visual matrix at 375w and 768w | FR-011: Minimum 44x44px touch bounding box on mobile/tablet | Table action buttons and status links measure 32x32px or 36x36px | verified (fixed) | Phase 4 / US2 (T031, T032, T033, T035, T036, T037 upgraded to >= 44x44px touch targets) |
| **FIND-005-033** | SURF-010, 017, 018, 020, 021 | accessibility / contrast | medium | E2E visual matrix in dark theme across operational views | FR-013: Normal text >= 4.5:1 against dark token background | Muted text descriptions, table headers, and badges fall below 4.5:1 against #101B37 | verified (fixed) | Phase 4 / US2 (T035, T036 updated with WCAG AA compliant palette) |
| **FIND-005-034** | SURF-012, FORM-006 | responsive / UI | low | E2E visual matrix at 375w (`FORM-006__*__375w__*.png`) | FR-012: Clean mobile UX with inline coordinates and map preview | Map is suppressed on mobile and hidden behind fullscreen dialog trigger | verified (fixed) | Phase 4 / US2 (T031; compact location summary preview outside dialog) |
| **FIND-005-035** | SURF-010 | UI / reliability | high | Server render on `/es/dashboard` with default Gestor session | FR-009: Resilient dashboard render without uncaught runtime errors | Uncaught `TypeError: Cannot read properties of undefined (reading 'length')` at `dashboard/page.tsx:444` crashes entire dashboard on default load | verified (fixed) | Phase 4 / US2 (T035 fixed with null-safety and typed mappings) |



