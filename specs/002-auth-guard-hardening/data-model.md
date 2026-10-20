# Data Model: Auth Guard Hardening

No database migration is introduced. This document defines the in-memory and existing-record
contracts used by the guard.

## PresentedCredential

| Field | Type | Constraints |
|---|---|---|
| value | string | Non-empty value from exactly one Bearer authorization header |
| source | constant | `authorization-header` |

The value remains untrusted until one authentication path accepts it. It is never written to logs,
evidence, request context, or persistent storage.

## ValidatedAccount

| Field | Type | Constraints |
|---|---|---|
| id | UUID | Required; returned by authoritative validation for the exact credential |
| email | string or absent | Informational only; never determines role or workspace |

Provider metadata is deliberately excluded from authorization decisions.

## CanonicalOperationalProfile

Existing source: `public.users`.

| Field | Type | Constraints |
|---|---|---|
| id | UUID | Must equal `ValidatedAccount.id` |
| rol | enum | Exactly `gestor` or `delegado` |
| workspace_id | UUID or null | Gestor: null or its own id; Delegado: required owning Gestor id different from its own id |
| deleted_at | timestamp or null | Must be null |

### State validation

- Missing profile -> denied.
- Deleted profile -> denied.
- Unsupported role -> denied.
- Gestor linked to another workspace -> denied.
- Delegado without a distinct valid workspace -> denied.

## LocalDemoIdentity

| Field | Type | Constraints |
|---|---|---|
| id | UUID | Fixed compatibility id or UUID captured by an exact documented format |
| rol | enum | `gestor`, `delegado`, or local-only `buscador` |
| workspace_id | UUID | Deterministic mapping defined in the auth contract |
| email | absent | Not needed for local authorization and not inferred |

Existence requires both the explicit opt-in and a development/test runtime. It has no database
record and is forbidden in production.

## AuthenticatedRequestContext

| Field | Type | Constraints |
|---|---|---|
| id | UUID | From validated account or accepted local demo identity |
| email | string or absent | From validated account only; informational |
| rol | enum | Canonical operational role or explicit local demo actor |
| workspace_id | UUID | Validated canonical or deterministic local workspace |

The context is created per request and never shared between requests.
