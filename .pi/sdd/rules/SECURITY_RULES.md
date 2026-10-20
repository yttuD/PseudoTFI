# SECURITY_RULES

Load for auth, RLS, permissions, secrets, private data or trust boundaries.
Sources: constitution II/VI/VII, affected API/RLS/contracts and
`specs/004-delegado-scope-authorization/spec.md` for Delegado boundaries.

- Separate anonymous/public users, Gestor-owner, scoped Delegado and privileged admin.
  Authentication alone grants neither ownership nor admin access.
- Enforce actor/action/workspace scope in UI, API and RLS. Test authorized access,
  denial across two workspaces, read-only Delegado mutations, out-of-scope identifiers,
  revoked permissions and relevant service-role bypass risks. One authenticated fixture
  cannot cover every actor; synthetic tests do not prove real remote integration.
- Public serializers exclude private operational/financial/tenant/audit data and exact
  address/location. Distinct authenticated location flows need explicit contracts/tests;
  marketplace visibility does not grant operational access.
- Gestor assigns Delegado permissions; even broad Gestionar rights exclude owner-only
  billing, tax/payment instruments, Cupo, delegation administration and full audit logs
  per feature 004. Never expand rights implicitly.
- RLS is mandatory. Review policies, INSERT RETURNING/SELECT, update/delete scope, SQL
  function search_path and grants; preserve logical deletion. Negative tests verify
  neither private response nor unintended persisted writes.
- SECURITY always requires directed Sol review/executable evidence; changed isolation,
  privileges, exposure or RLS are HIGH. Labels cannot bypass gates. MIGRATION adds
  dry-run/apply/recovery checks as appropriate; no destructive cleanup to pass tests.
- Never put secrets, cookies, service keys, OAuth tokens or real-user PII in packets,
  screenshots, logs, Git or model context. Use approved secret stores; inspect redacted
  configuration facts only. Never downgrade secrets merely to extract them.
- Production/protected schema/policy changes require authority within approved user scope
  and a recorded Sol decision for executor protected files. Runtime guards are not an
  OS sandbox or a substitute for authorization.
