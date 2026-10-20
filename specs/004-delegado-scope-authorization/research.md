# Phase 0 Research: Delegado Scope and Granular Authorization

## Decision 1: One operational workspace membership per account in V1

**Decision**: An account may own one Gestor workspace or be a Delegado of one Gestor, never both and
never multiple Delegado memberships. Invitation acceptance is the transition point and must recheck
eligibility atomically.

**Rationale**: This is the user's explicit clarification and matches the current canonical profile
shape (`rol` plus `workspace_id`). It avoids ambiguous active-workspace context in web and the later
mobile application.

**Alternatives considered**: Multiple Delegado workspaces; simultaneous Gestor and Delegado roles.
Both require a workspace switcher, contextual sessions, and a different identity model and are
excluded from V1.

## Decision 2: Persist invitation and active authorization separately

**Decision**: Keep an invitation lifecycle record separate from the active Delegado relationship.
The relationship is accepted-but-unconfigured first, then becomes active only after the owner saves
one permission and one scope. Selected-Unidad scope uses a child selection set.

**Rationale**: Invitation state, membership state, and authorization configuration change at
different times and have different actors. Separating them makes replay prevention, cancellation,
revocation, and audit history testable without nullable fields representing several concepts.

**Alternatives considered**: Extend the current `usada` boolean; store scope on the user profile;
one row per grant. Those models either cannot express lifecycle or permit accidental cumulative
grants.

## Decision 3: Scope replacement is atomic and non-additive

**Decision**: A Delegado relationship has one current scope mode. Saving a new mode replaces the old
Grupo/Unidad references in one transaction. There are no hidden additive grants or deny rows.

**Rationale**: The specification says one active boundary, and the UI can summarize it accurately.
It also removes the need to define precedence among overlapping grants.

**Alternatives considered**: Multiple additive assignments with strongest permission winning;
allow/deny ACLs. Both increase policy complexity and make owner review error-prone.

## Decision 4: Mirror one authorization vocabulary in API and database

**Decision**: Define the same actor/action/target concepts in `AuthorizationService` and
schema-qualified database helper functions: owner, read/manage Unidad, create Unidad in Grupo,
read/manage Grupo, and manage Grupo membership.

**Rationale**: The API provides clear errors and prevents unnecessary work, while RLS is the final
anti-bypass boundary. Stable capability names are also the contract feature 003 needs.

**Alternatives considered**: RLS only, which produces opaque errors and leaves service-role paths
unsafe; controller decorators only, which cannot express target-dependent scope; duplicated checks
in every service, which will drift.

## Decision 5: Grupo Gestionar is broad but cannot self-expand

**Decision**: Full-account Gestionar may perform normal Grupo lifecycle and membership operations.
Grupo-scoped Gestionar may rename/configure its Grupo, manage current member Unidades, and create a
new Unidad directly in it. It cannot add an external Unidad, move a member out, delete the Grupo, or
otherwise redefine the scope boundary. Selected-Unidad scope cannot create Unidades or manage
Grupo membership.

**Rationale**: This implements the user's “almost all Gestor operational rights” direction without
allowing a Delegado to enlarge or invalidate their own authorization boundary.

**Alternatives considered**: Owner-only Grupo configuration was too restrictive; full membership
control for Grupo-scoped Delegados created a privilege-escalation path.

## Decision 6: Inquilino privacy is relation-derived

**Decision**: A Delegado reads an Inquilino only through at least one non-deleted Alquiler whose
Unidad is in scope. Responses never include out-of-scope Alquileres. Gestionar creates an Inquilino
only in the same transaction as an in-scope Alquiler, may update when an in-scope link exists, and
may soft-delete only when no active out-of-scope Alquiler exists.

**Rationale**: This is the user's selected privacy-minimized option and prevents a Unidad-scoped
Delegado from browsing the Gestor's full personal-data CRM.

**Alternatives considered**: Workspace-wide Inquilino directory; owner-only Inquilinos. The first
overexposes personal data and the second prevents practical Alquiler management.

## Decision 7: Owner-only means owner identity, never workspace equality

**Decision**: Gestor personal/security settings, Cupo, platform subscription Pagos, Facturación,
AFIP, delegation administration, and the complete Log de acciones require `actor.id == gestor.id`
and the Gestor owner role. A Delegado's `workspace_id` is never sufficient.

**Rationale**: Existing workspace policies accidentally expose financial and fiscal data to
Delegados. These domains are explicitly non-delegable.

**Alternatives considered**: Hide UI only; permit read-only financial summaries. Both contradict
the product rules and leak sensitive data.

## Decision 8: Authorization failures never use resilient private fallbacks

**Decision**: Database timeout, malformed relationship, missing scope, and authorization-service
failure are closed failures. Existing mock/resilient stores may remain only in explicitly local,
non-private fixtures and must not return or mutate protected operational data for a Delegado.

**Rationale**: A fallback that invents a workspace or returns global sample records is an
authorization bypass. Feature 002 established the same fail-closed rule for identity.

**Alternatives considered**: Keep current resilience for demos; derive authorization from token
metadata. Both permit stale or fabricated access.

## Decision 9: Invitation target lookup is authoritative and account-bound

**Decision**: Normalize the submitted email and resolve it server-side against the verified Auth
account. Persist the target account id and email snapshot. Acceptance checks the authenticated id,
not request email. The lookup mechanism is narrowly callable by the Gestor owner and does not return
profile details beyond eligibility.

**Rationale**: The canonical flow requires an existing verified account and a direct error. Binding
to immutable account id prevents email-change and replay attacks.

**Alternatives considered**: Signup-trigger invitation conversion; send an open token to any email;
trust a body-provided user id. All violate the established flow or identity boundary.

## Decision 10: Seven-day, single-use invitation window

**Decision**: Pending invitations expire seven calendar days after creation, may be cancelled sooner,
and cannot be replayed after accept/reject/cancel/expiry. A new invitation requires a new record.

**Rationale**: The product did not prescribe duration; seven days is a conventional bounded window
that reduces stale-access risk while allowing normal coordination. The duration is surfaced in UI
and can become configuration later without changing lifecycle semantics.

**Alternatives considered**: Indefinite pending invitations leave forgotten access paths; very short
windows create unnecessary support friction.

## Decision 11: Persist delivery intent and channel outcome

**Decision**: Creating an invitation also creates an in-app notification and an email delivery
record. Email delivery is retried from a persistent outbox and uses environment-provided provider
credentials; local/test uses an explicit non-delivery sink. Invitation creation remains valid when
delivery temporarily fails, but the owner sees failure and can retry.

**Rationale**: Both channels are mandatory, but a transient provider failure must not duplicate or
corrupt authorization state. Persistence provides reproducible delivery evidence.

**Alternatives considered**: Fire-and-forget email; rollback invitation on provider timeout; pretend
success in fallback. Each loses auditability or reliability.

## Decision 12: Visual proof is state-matrix driven

**Decision**: A dedicated Playwright suite captures named states at 375, 768, 1024, and 1440 pixels,
light/dark where supported. API responses may be deterministically intercepted for visual states,
while separate API/database tests prove real authorization.

**Rationale**: Deterministic visual fixtures make every state reproducible without weakening
functional proof. Desktop and responsive evidence remain explicitly separate.

**Alternatives considered**: Only end-to-end live data screenshots; one viewport; manual review
without named assertions. These are flaky or incomplete.
