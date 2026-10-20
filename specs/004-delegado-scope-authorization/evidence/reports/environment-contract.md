# Environment Contract: Delegado Scope and Granular Authorization

Feature: `004-delegado-scope-authorization`

## Overview
This feature introduces outbox and notification delivery for Delegado invitations without coupling local development or test suites to live email credentials or public mail endpoints.

## Configured Variables

| Variable | Required in Dev | Test Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | `http://127.0.0.1:54321` | Supabase Postgres/Auth API URL |
| `SUPABASE_JWT_SECRET` | Yes | Local secret | Secret to decode and verify JWTs |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Local service key | Privileged service key for atomic auth lookups |
| `INVITATION_EMAIL_SINK` | No | `test` | `test` sinks email delivery into `email_delivery_outbox` without contacting remote SMTP/API |
| `EMAIL_FROM` | No | `Rendo <no-reply@rendo.app>` | Header sender address |

## Safety Guarantees
- No credentials or live SMTP secrets are hardcoded.
- In test and local environments, `INVITATION_EMAIL_SINK=test` records outbound invitations to the `email_delivery_outbox` table with status `sent` (or `pending`) without attempting external connections.
- Real recipients are never contacted during automated test suites or development seeds.
