# Closed-beta security review — 2026-09-30

Verdict: **PARTIAL / hosted actor verification pending**. Source checks and isolated tests do not close Feature 005's original critical/high findings by themselves.

| Boundary | Current evidence | Still required |
|---|---|---|
| Public vs Gestor vs Delegado | Migration `20260930010000_public_and_manager_identity.sql` makes public signups canonical `buscador`, explicit manager signups `gestor`, and never accepts a self-declared `delegado`. `become_gestor()` changes a public account only after authenticated self-check. Isolated and hosted pgTAP: 136/136 each. | Test real confirmed accounts and invitation transition on hosted Supabase. Review any preexisting users before import; do not assume old all-Gestor profiles are correct. |
| Public favorites | `SupabasePublicAuthGuard` validates a real Supabase user and active canonical profile for beta. Operational guard still rejects `buscador`. The favorites query now selects real related units and filters by current user. | Live seeker saves/reads/removes only own published unit; direct access to another user's favorite denied. |
| FIND-005-042, read-only delegate UI | `BentoGruposGrid` renders the title as text and hides edit controls for read-only delegates; 44px touch targets remain for editable actions. | Capture a fresh 375px screenshot with a real scoped read-only delegate. Mark historical finding verified only after that interaction. |
| FIND-005-043, owner-only metrics | Sidebar marks Métricas `reqGestor`; metrics page now requires canonical `accessContext.actor === 'gestor'`, failing closed if unavailable. | Real delegate direct URL and sidebar check in hosted beta. |
| FIND-005-044, out-of-scope direct IDs | Unit and rental controllers return 404 before fetching disallowed records (two targeted tests); delegated RLS suite passed in isolated database. | Live cross-owner and group/unit-scope direct-ID probes for unit, rental, group and tenant; verify revocation after session refresh. Critical historical finding remains open until this passes. |
| Authentication outage | Production web no longer stores local passwords or issues mock cookies after Supabase network failure. Local-only test adapter is disabled in beta/production. | Browser checks of login and registration in final production preview and real Supabase account creation after hosting setup. |
| Internal and financial surfaces | `/dev/*` returns 404 in beta; payment/fiscal mutation tests and gates reject beta operations. | Confirm no external payment/fiscal side effects in hosted beta and owner-only accounting views with real actors. |

No new secret values are recorded here. The service-role/secret key must be confined to the API host and never use `NEXT_PUBLIC_*`.
