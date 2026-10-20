# Manifest Conventions and Audit Identifiers

## Identifier Prefixes
All inventory items and evidence artifacts follow a stable prefix scheme:

- `SURF-xxx`: Surfaces (distinct views, layouts, pages, responsive presentation modes)
- `FORM-xxx`: Forms and dialog interactions
- `CAP-xxx`: Server capabilities, controllers, and backend services
- `MIG-xxx`: Database migrations and physical schema capabilities
- `TEST-xxx`: Automated test suites and test specifications
- `EVID-xxx`: Concrete executable or screenshot evidence items
- `FIND-xxx`: Findings (defects, gaps, deviations, contradictions)
- `REMED-xxx`: Bounded remediation candidates
- `BLOCK-xxx`: Named environment or external configuration blockers

## Status Usage Examples conforming to `contracts/inventory-row.md`

| Status | Meaning | When to Use |
|---|---|---|
| `implemented-verified` | Working as intended with fresh verified evidence | E2E test passes with assertions, HTTP 200, visual proof inspected |
| `implemented-unverified` | Code exists in source but lacks fresh automated execution evidence | Component or route compiles, but no fresh test run or screenshot validates it |
| `partially-implemented` | Code exists but material functionality or states are missing | Route renders static skeleton or missing critical error/submit paths |
| `placeholder-or-mock` | Visible or callable structure exists but relies on mock/stub data | Hardcoded lists or dummy API responses |
| `specified-only` | Requirement exists in docs/ADR but has no active implementation | Feature described in spec but absent from code |
| `environment-blocked` | Implementation exists but requires unavailable credentials or external services | Requires live AFIP certificates or production Mercado Pago webhook |
| `absent` | No implementation found in source code | Intentionally omitted or not yet created |

## Manifest Row Schema
Every primary manifest row adheres strictly to the fields:
`| ID | Kind | Name | Actor | Entry point | Source | Purpose | Dependencies | Status | Evidence | Verified at | Notes |`
