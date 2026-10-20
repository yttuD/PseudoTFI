# Delegated Operation Findings Register (`delegado-findings.md`)

Governing Story: **User Story 3 — Trabajo delegado seguro (Priority: P1)**  
Conforms to `data-model.md`.

| Finding ID | Inventory ID | Category | Severity | Reproduction Steps | Expected Behavior | Observed Actual Behavior | Status | Owner Batch |
|---|---|---|---|---|---|---|---|---|
| FIND-005-040 | FORM-007 / SURF-019 | Functional / Selector | Medium | Open invite modal on `/es/delegados` and submit invalid email | Modal exposes semantic test-id `modal-invitar-delegado` and error message carries `.text-destructive` class | Modal only exposed `FORM-007` and error lacked standard `.text-destructive` class | Open | Batch 04 |
| FIND-005-041 | SURF-009 / Invitaciones | Authorization / Fixture | Medium | Navigate to `/es/cuenta/invitaciones` as Gestor owner | Empty invitations state shown because Gestor account does not receive external invitations | Mock API returned demo invitation targeted to `buscador@test.com` regardless of authenticated actor | Open | Batch 04 |
| FIND-005-042 | SURF-011 / BentoGruposGrid | Authorization / A11y | High | Navigate to `/es/mis-unidades` as `delegado_read` on mobile viewport | Unit title is static text with no edit affordance; all touch targets >= 44x44px | Unit title rendered `<Link href="/editar">` with height 16px, violating read-only delegation and failing mobile touch target gate | Open | Batch 04 |
| FIND-005-043 | SURF-020 / Metricas | Security / RBAC | High | Navigate to `/es/metricas` directly or observe sidebar as `delegado` | Navigation item hidden in sidebar; direct navigation blocked with `owner-only-forbidden` screen | Sidebar showed Métricas link and page attempted to load client analytics view | Open | Batch 04 |
| FIND-005-044 | SURF-011 / SURF-015 / SURF-016 | Security / Concealment | Critical | Request out-of-scope resource ID directly via API or UI while in `grupo` or `unidades` scope | Out-of-scope resource returns 404 concealing existence, owner, and metadata | API server returned resource payload regardless of delegate assigned scope | Open | Batch 04 |

