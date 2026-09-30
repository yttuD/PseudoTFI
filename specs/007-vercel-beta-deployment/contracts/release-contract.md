# Hosted release contract

| Surface | Input | Required behavior |
| --- | --- | --- |
| API liveness | `GET /health/live` | Reports process availability without exposing secrets. |
| API readiness | `GET /health/ready` | Reports actual dependency readiness; never synthetic success. |
| Web public | localized catalog and detail URLs | Only public data; explicit empty/error state. |
| Web workspace | authenticated Gestor/Delegado URLs | Actor and permission-scoped data/actions. |
| Internal console | direct URL as non-admin | Denied, never mock internal data. |
| Beta money | payment/fiscal action | Rejected before external charge or issuance. |

`WEB_ORIGINS` is exact, not wildcard. Supabase service credential is API-only. Browser bundle receives only Supabase publishable credentials.
