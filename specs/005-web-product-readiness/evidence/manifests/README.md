# Product Inventory Manifests Index

## Summary of Active Inventory Denominators

| Manifest | File | Total Items | Primary Source Scope | Status Summary |
|---|---|---|---|---|
| **Routes & States** | [`routes-and-states.md`](routes-and-states.md) | **41** | `apps/web/src/app/` | 25 pages, 1 redirect, 4 layouts, 11 loading skeletons |
| **Interactions** | [`interactions.md`](interactions.md) | **20** | `apps/web/src/components/`, `app/` | 15 forms/dialogs, 5 critical interactive controls |
| **API Capabilities** | [`api-capabilities.md`](api-capabilities.md) | **15** | `apps/api/src/` | 14 controllers, 18 services, authorization seams |
| **Data & Policies** | [`data-and-policies.md`](data-and-policies.md) | **18** | `supabase/migrations/`, `tests/` | 17 SQL migrations, 1 pgTAP test suite |
| **Automated Tests** | [`automated-tests.md`](automated-tests.md) | **54** | `apps/web/e2e/`, `apps/api/src/`, `supabase/tests/` | 32 Playwright E2E specs, 21 Vitest API specs, 1 DB suite |
| **Actor Surface Matrix** | [`actor-surface-matrix.md`](actor-surface-matrix.md) | **41** | All routes & surfaces | Audience, allowed/denied actors, channel mappings |
| **Acceptance Matrix** | [`acceptance-matrix.md`](acceptance-matrix.md) | **41** | All inventory surfaces | Multi-viewport/theme acceptance shell |

**Total Active Denominator**: **148 distinct inventory items** across web, API, data, and tests.

All tables conform to `contracts/inventory-contract.md`.
