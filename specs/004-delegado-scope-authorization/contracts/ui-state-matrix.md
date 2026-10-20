# UI State and Visual Evidence Matrix

All rows require keyboard interaction assertions, zero horizontal overflow, 44×44 primary touch
targets, visible focus, ES/PT/EN copy coverage, and screenshots at 375, 768, 1024, and 1440 pixels.
Capture both light and dark themes where the surface supports them.

| ID | Surface | Actor | State | Required proof |
|---|---|---|---|---|
| UI-001 | `/delegados` | Gestor | empty | Explanation, invite CTA, no table ambiguity |
| UI-002 | invite dialog | Gestor | default/invalid email | Labeled input, inline error, no browser alert |
| UI-003 | invite dialog/list | Gestor | unknown/unverified/conflict | Safe direct error, retry path, no leaked profile details |
| UI-004 | `/delegados` | Gestor | pending | Target summary, expiry, in-app/email status, cancel action |
| UI-005 | `/cuenta/invitaciones` | target account | pending | Gestor identity summary, accept/reject, expiry |
| UI-006 | `/cuenta/invitaciones` | target account | empty/expired/error | Explicit state, no fabricated invitation |
| UI-007 | `/delegados` | Gestor | accepted/unconfigured | Zero-access badge, configure CTA |
| UI-008 | permission editor | Gestor | account + Ver/Gestionar | Plain-language access summary and confirmation |
| UI-009 | permission editor | Gestor | Grupo + Ver/Gestionar | Search/select Grupo, boundary warning, confirmation |
| UI-010 | permission editor | Gestor | selected Units | Search 500-item fixture, persistent selections, summary |
| UI-011 | `/delegados` | Gestor | active/edit/revoke | Current scope, last change, replace warning, revoke confirm |
| UI-012 | operational layout | Delegado | accepted/unconfigured | Awaiting configuration; no private calls or quick actions |
| UI-013 | dashboard/sidebar | Delegado Ver | active | Scope and read-only indicator; no owner-only destinations |
| UI-014 | Units/Alquileres/Inquilinos | Delegado Ver | list/detail | Scoped data and no mutation affordances |
| UI-015 | forms/direct route | Delegado Ver | mutation attempted | Disabled/absent controls and safe denied result |
| UI-016 | dashboard/sidebar | Delegado Gestionar | active | Scoped operational actions, no sensitive destinations |
| UI-017 | Grupo/Unidad/Alquiler forms | Delegado Gestionar | in-scope | Successful allowed action and actor feedback |
| UI-018 | operational direct route | Delegado | out-of-scope/revoked/stale | Concealed not-found or access-changed state |
| UI-019 | owner-only routes | Delegado | direct navigation | Localized denial/redirect before protected render |
| UI-020 | public marketplace | anonymous/public | regression | No operational data or delegation UI |
| UI-021 | dev/admin console | Gestor/Delegado | regression | Explicit rejection remains; no role inheritance |
| UI-022 | all affected routes | all applicable | loading/service error | Skeleton/progress, retryable fail-closed error, no sample data |

## Screenshot naming

`<UI-ID>__<actor>__<state>__<width>w__<theme>.png`

Store under `specs/004-delegado-scope-authorization/evidence/screenshots/` and index every retained
file in `evidence/reports/visual-manifest.md` with test name, URL, fixture, viewport, theme, and review
status.
