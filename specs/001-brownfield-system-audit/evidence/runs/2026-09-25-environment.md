# Environment and Fixture Verification Report

Date: 2026-09-25 (Correction Pass 02)

## Environment Prerequisites Summary

| Component | Status | Verification Detail | Redaction / Security |
|---|---|---|---|
| Node.js / pnpm | Configured | Node 20+, pnpm 9+ workspace | No sensitive values |
| Supabase Auth Fixture | Configured | `apps/web/e2e/.auth/user.json` with active session | Session tokens and cookies redacted |
| Playwright Harness | Configured | `playwright.config.ts`, `audit.config.ts` | Localhost port 3000 target |
| NestJS API Server | Configured | Port 3001 | Local development environment |
| Next.js Web Server | Configured | Port 3000 | Local development environment |
| AFIP Services | Environment Blocked | Requires live electronic certificate (`.crt` and `.key`) | Marked as `BLOCK-AFIP-001` |
| Mercado Pago Webhooks | Test Sandbox | Requires live webhook signatures | Tested with simulated unit mock payloads |

## Role Prerequisites and Test Accounts

- Anonymous: No credentials required. Accessible on public marketplace routes (`/`, `/unidades`, `/unidades/[id]`, `/auth/login`, `/auth/registro`, `/terminos`, `/privacidad`). Verified via explicit empty storage state context.
- Gestor: Seeded via `apps/web/e2e/.auth/user.json` (role: Gestor principal). Credentials, access tokens, and user UUIDs are redacted and excluded from evidence.
- Delegado: Delegated roles mapped in `delegados` table. Bounded discovery confirmed scope/permission enforcement is absent (see FIND-011).
- Dev/Admin: Dev console routes at `/dev/*`. Current layout enforces redirection only for `buscador`; Gestores are currently admitted without privileged dev/admin check (see FIND-010).
