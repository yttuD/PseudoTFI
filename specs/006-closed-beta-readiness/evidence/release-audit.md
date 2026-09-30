# Release Audit — 2026-09-29

Status: **initial baseline, superseded by `final-review.md`**. This table records the risks identified before Feature 006 implementation; it is not a claim that the listed code still has each defect. The release verdict remains BLOCKED for external beta pending hosted tests and Feature 005 closure.

| Risk | Current evidence | Required result |
|---|---|---|
| Critical: synthetic release data | `apps/api/src/marketplace/marketplace.service.ts`, `favoritos/favoritos.service.ts` and the public catalog page can substitute in-memory/example data after failure | Production/beta shows an error; no fake persisted success |
| High: local-only service wiring | `apps/web/next.config.mjs` rewrites `/api` to `127.0.0.1:3001`; `SupabaseService.isOnline()` probes local port 54321 | Explicit hosted destinations and correct dependency status |
| High: API browser origins | `apps/api/src/main.ts` calls `enableCors()` without an allowlist | Exact beta web origins only |
| High: demo database keys | `apps/api/src/supabase/supabase.service.ts` has embedded local fallback keys | Required environment keys; no embedded credential fallback |
| High: non-commercial actions | `apps/api/src/pagos/pagos.service.ts` has a dummy token and mock-success URL; AFIP remains callable | Beta blocks payment/fiscal mutations before side effects |
| High: unfinished audience gate | Feature 005 `delegado-findings.md` records FIND-005-044 critical open; scoped API code appears guarded but closure evidence is missing | Reproduce and reconcile with API/UI/RLS evidence |
| Medium: internal mock pages | `/dev/moderacion`, `/dev/logs` and `/dev/auditoria-pagos` render static mock records | Internal console disabled or genuinely integrated for beta |
| External deployment inputs | Hosting provider, beta domains, isolated Supabase project and tester identities not supplied | Record as owner-approved inputs; do not invent or deploy |

Workspace stewardship: the repository contains extensive uncommitted application code and retained visual evidence from Features 001–005. Preserve it. Docker also has a non-Rendo container; do not stop or alter it under this task.
