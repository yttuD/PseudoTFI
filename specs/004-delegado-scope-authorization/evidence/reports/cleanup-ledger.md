# Cleanup Ledger: Delegado Scope and Granular Authorization

Feature: `004-delegado-scope-authorization`  
Date: 2026-09-25  

This ledger records all temporary files, dead code, test artifacts, and simulated fallbacks cleaned up during the execution of correction brief 01.

---

## 1. Eliminated Simulated Stores and Fallbacks

| File | Item Removed | Rationale |
|---|---|---|
| `apps/api/src/metricas/metricas.service.ts` | `resilientStore.getUnidades`, `getVistas`, `getContactos`, `getAlquileres` | Private metrics must query real database or fail closed with error log; simulated data violates Constitution I. |
| `apps/api/src/cupo/cupo.service.ts` | `resilientStore.getUser('default-gestor')` and `'default-gestor'` fallback | Private quota must reflect authenticated user record or raise exception; no fabricated quotas. |
| `apps/web/src/app/[locale]/(gestor)/dashboard/page.tsx` | Simulated fallback quota object `{ cupo_maximo: 10, ... }` | Dashboard must not invent active units or trial expiration when backend is unavailable. |
| `apps/web/src/app/[locale]/(gestor)/facturacion/page.tsx` | Simulated fallback quota object `{ cupo_maximo: 10, ... }` | Facturacion page must not display fictitious subscription states. |

---

## 2. Removed Unverified Inferences & Heuristics

| File | Item Removed | Rationale |
|---|---|---|
| `apps/web/src/lib/supabase/client-auth.ts` | `user.email?.includes('delegado')`, `user.email?.includes('buscador')` | Role inference from email strings is unauthoritative and bypassable. |
| `apps/web/src/app/[locale]/(gestor)/facturacion/page.tsx` | `user?.email?.toLowerCase().includes('delegado')` | Replaced by strict authoritative check on `accessContext` and profile role. |
| `apps/web/src/lib/supabase/client-token.ts` | Default fallback `'dev-token'` | Replaced with empty string to prevent unintended authenticated requests. |
| `apps/web/src/lib/supabase/server-auth.ts` | Unsigned cookie parsing in production paths | Restricted to `AUTH_ALLOW_DEV_TOKENS === 'true'` in test/dev environments. |
| `apps/web/src/lib/supabase/middleware.ts` | Unsigned cookie parsing in production paths | Restricted to `AUTH_ALLOW_DEV_TOKENS === 'true'` in test/dev environments. |

---

## 3. Repaired Code Quality and Encodings

| File | Change | Rationale |
|---|---|---|
| `apps/web/src/app/[locale]/dev/layout.tsx` | Repaired mojibake strings (`Moderación`, `Auditoría`, `Métricas`) | Clean visual presentation, eliminates broken UTF-8 characters. |
| `apps/api/src/delegados/delegados.service.ts` | Removed duplicate `import { ... }` block | Restored clean TypeScript compilation and resolved syntax error. |
| `apps/web/e2e/delegado_scope_authorization.spec.ts` | Removed conditional assertions (`if (count > 0)`) | Strict assertions guarantee that elements are verified, not skipped. |

---

## 4. Phase 12 Lifecycle, Transactional Audit, and Artifact Cleanup

| File / Path | Change / Item Removed | Rationale |
|---|---|---|
| `apps/web/e2e/fixtures/mock-api-server.ts` | Added socket tracking (`activeSockets`) and bounded socket destruction in `stopMockApiServer` | Prevents lingering sockets and eliminates port collisions on 3001. |
| `apps/web/e2e/global.setup.ts` & `global.teardown.ts` | Removed duplicate mock API server start/stop | Unifies lifecycle ownership strictly inside the Playwright suite. |
| `apps/web/e2e/delegado_scope_authorization.spec.ts` | Removed test DOM fabrication (`document.createElement`, `innerHTML`) in UI-015 | Tests product-owned safe 403 denial screen on `/mis-unidades/nueva` rather than injecting synthetic banners. |
| `apps/api/src/delegados/delegados.service.ts` | Removed post-commit `ActionLogService.logAction` in favor of atomic RPC `create_delegado_invitation` | Guarantees atomic transaction: invitation creation, notification, outbox, and audit log succeed or fail together. |
| `specs/004-delegado-scope-authorization/evidence/review-contact-sheets-pass*` | Deleted superseded contact sheet directories (pass2, pass3, pass4) | Retains only canonical fresh 22 contact sheets in `review-contact-sheets`. |
| `supabase/tests/004_delegado_scope_authorization.sql` | Replaced defective `set_test_actor` with `SECURITY DEFINER SET search_path = pg_catalog, public` helper issuing `RESET ROLE` | Restores superuser privileges before selecting target test actor, preventing permission errors during multi-actor execution. |

---

## 5. Closeout Brief 11/12 Transient Artifact & Process Cleanup

| File / Path | Change / Item Removed | Rationale |
|---|---|---|
| `apps/web/test-results/` | Removed directory and `.last-run.json` | Clean up task-owned transient test artifacts after test suite completion. |
| Port listeners on 3000 / 3001 | Verified zero listeners remaining on 3000 and 3001 following Playwright run | Enforce clean bounded server teardown without orphan node processes. |
| `specs/.../evidence/screenshots/*.png` | Deleted partial/failed run screenshots prior to test execution; regenerated all 176 fresh captures | Eliminate stale run evidence and guarantee that all 176 PNGs are freshly produced from the final run. |
| `specs/.../evidence/review-contact-sheets/*.png` | Regenerated all 22 canonical contact sheets via `build_contact_sheets.py` | Ensure visual contact sheets accurately reflect the fresh screenshot set. |

---

## 6. Closeout Brief 13 & 14 Post-Correction Cleanup and Verification

| File / Path | Change / Item Removed | Rationale |
|---|---|---|
| `apps/web/src/components/ui/dialog.tsx` | Changed `DialogOverlay` to `z-40` and `DialogContent` to `z-50`; applied explicit Rendo tokens | Eliminates z-index stacking collision where backdrop overlay painted on top of dialog content and degraded text contrast. |
| `apps/web/test-results/` | Removed directory and `.last-run.json` | Clean up transient test results created during Playwright test execution. |
| Ports 3000 / 3001 | Verified zero listeners remaining on 3000 and 3001 with `Get-NetTCPConnection` | Ensures no orphaned Node.js or Playwright server processes remain running. |
| Docker / Supabase / WSL | Preserved in stopped state throughout Brief 14 execution | Adheres to memory and process constraints without running unneeded services. |
| `specs/.../evidence/screenshots/*.png` | Regenerated all 176 PNG screenshots via full suite run | Guarantees all evidence reflects the verified contrast and stacking fix. |
| `specs/.../evidence/review-contact-sheets/*.png` | Regenerated all 22 canonical contact sheets via `build_contact_sheets.py` | Guarantees contact sheets reflect 100% fresh post-correction screenshots. |

