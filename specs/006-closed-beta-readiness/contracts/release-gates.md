# Closed Beta Release Gates

1. **Configuration**: required web/API/Supabase origins and keys are present, valid and non-loopback; no demo-auth flag or public service-role key. Report setting names, never values.
2. **Failure semantics**: dependency outage is an error, not an example catalog or in-memory success; empty healthy catalog remains a true empty state.
3. **Commerce**: beta payment and fiscal mutations return an explicit unavailable result; no preference, charge, webhook mutation or invoice is created.
4. **Trust surfaces**: direct URL and API checks prove public, Gestor, scoped Delegado and internal boundaries with current account state.
5. **Product quality**: Feature 005 has zero unresolved critical/high findings; affected browser interactions have inspected evidence at required widths/themes.
6. **Handoff**: deploy/rollback instructions name provider-dependent decisions, isolated seed-data policy, tester invitation process and observability endpoints. Actual publication requires Carlos's approval.
