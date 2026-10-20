# Contract: Authentication Guard Behavior

## Protected request header

Accepted header shape:

```text
Authorization: Bearer <credential>
```

Missing headers, another scheme, empty values, or additional space-delimited segments are denied
with HTTP 401. Authentication errors use one generic response and do not include the credential,
provider response, profile data, or stack details.

## Deployed credential path

1. Validate the exact credential with Supabase Auth.
2. Require a valid UUID account identifier.
3. Read `rol`, `workspace_id`, and `deleted_at` from that account's canonical `public.users` row.
4. Require an active supported profile and valid role/workspace relationship.
5. Attach only `id`, optional `email`, `rol`, and `workspace_id` to the request.

Any error or unmet condition is HTTP 401. There is no decode-only or heuristic fallback.

## Local demo path

The path is active only when:

```text
AUTH_ALLOW_DEV_TOKENS=true
NODE_ENV=development | test
```

Both conditions are required. `NODE_ENV=production`, an absent/other environment, or any flag
value other than exact lowercase `true` disables the path.

### Exact compatibility credentials

| Credential | Actor id | Role | Workspace id |
|---|---|---|---|
| `dev-access-token` | `11111111-1111-1111-1111-111111111111` | gestor | same as actor id |
| `dev-access-token-gestor` | `11111111-1111-1111-1111-111111111111` | gestor | same as actor id |
| `dev-access-token-delegado` | `33333333-3333-3333-3333-333333333333` | delegado | `11111111-1111-1111-1111-111111111111` |
| `dev-access-token-buscador` | `22222222-2222-2222-2222-222222222222` | buscador | same as actor id |

### Exact generated format

```text
dev-token-<role>-<uuid>
```

- `<role>` is exactly `gestor`, `delegado`, or `buscador`.
- `<uuid>` is a canonical UUID string.
- Gestor and Buscador use that UUID as actor and workspace id.
- Delegado uses that UUID as actor id and the fixed local Gestor workspace
  `11111111-1111-1111-1111-111111111111` for compatibility with the current demo workflow.
- Prefixes, suffixes, partial matches, unsupported roles, non-UUID identifiers, or extra separators
  are denied.

These credentials are test conveniences, not secrets and not production authentication.

## Mandatory regression matrix

| Case | Expected result |
|---|---|
| No header / wrong scheme / malformed header | 401 |
| Arbitrary value longer than ten characters | 401 |
| Arbitrary value containing `gestor`, `delegado`, or `buscador` | 401 |
| Decodable but unverified JWT-shaped value | 401 |
| Supabase error, no user, throw, or timeout | 401 |
| Valid account, missing/deleted/invalid profile | 401 |
| Valid active Gestor profile | accepted with own workspace |
| Valid active Delegado profile | accepted with canonical Gestor workspace |
| Exact demo credential, flag absent/false | 401 |
| Exact demo credential, flag true, production/other environment | 401 |
| Exact demo credential, flag true, development/test | accepted with documented mapping |
| Demo-like but non-exact value | 401 |
