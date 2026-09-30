# Data Model: Beta Release Evidence

This feature adds no product table by default. It defines release evidence and configuration boundaries.

## BetaEnvironment

- `webOrigin`, `apiPublicOrigin`, `apiInternalOrigin`, `supabaseOrigin`: separate, non-loopback destinations.
- `supabaseAnonKey`: browser-safe project key; never a service-role key.
- `supabaseServiceRoleKey`: API-only secret.
- `paymentsEnabled`, `fiscalEnabled`: false for this beta.
- `demoAuthEnabled`, `syntheticDataEnabled`: false in release builds.
- `testerIdentities`: individually attributable invited actors and scopes.

Validation: no secret in public configuration; no release value may refer to local-only ports or user-machine paths.

## ReleaseCandidate

- `sourceRevision`: immutable source identity.
- `buildResult`, `testResult`, `migrationResult`, `visualReview`: pass/fail/blocked with evidence path.
- `knownRisks`: explicit remaining findings and owner decision.
- `rollbackInstructions`: application rollback plus database restoration decision.

State: `draft -> verified -> approved_for_deploy`; any critical/high open finding or missing gate prevents `verified`.
