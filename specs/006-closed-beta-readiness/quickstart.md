# Quickstart: Closed Beta Preflight

This guide prepares a candidate; it does not deploy. Use only an isolated Rendo beta project, never another application's database.

1. Run focused configuration and failure-semantics tests for the API and web.
2. Run the complete API and web lint/test/build gates on a production-mode candidate with beta-only environment settings.
3. Apply migrations and data-policy tests to a fresh isolated Rendo database; seed synthetic records with no real tenant, payment or fiscal identifiers.
4. Exercise public, Gestor, Delegado and internal direct-access cases. Capture and inspect desktop and responsive Playwright evidence for changed visual behavior.
5. Confirm commerce/fiscal attempts create zero external transactions.
6. Complete the release report with source revision, all gate results, known findings, required settings by name, tester invitations, provider selection and rollback procedure.

Do not declare PASS if Feature 005 still has a critical/high finding, a required gate is blocked, or the target host/domain has not been configured and validated. Deployment occurs only after explicit owner approval.
