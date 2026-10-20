# Quickstart Validation: Delegado Scope and Granular Authorization

This guide defines the minimum reproducible acceptance run. It does not replace the full task list
or the retained evidence reports.

## Prerequisites

- Node/pnpm versions supported by the repository.
- Local Supabase available with a fresh or explicitly disposable development database.
- API and web environment files populated with non-production credentials.
- Email provider replaced by the explicit test sink unless a dedicated non-production provider is
  authorized. Never use real customer recipients.
- Playwright browsers installed.

Do not run the migration or seed scenarios against production.

## 1. Apply and verify the database model

Start/reset local Supabase using the repository's configured workflow, then execute the database
policy test file:

```powershell
pnpm exec supabase db reset
pnpm exec supabase test db supabase/tests/004_delegado_scope_authorization.sql
```

Expected:

- Migration applies without warnings that leave broad legacy policies active.
- Anonymous/public operational access is denied.
- Gestor owner accesses all own operational data and owner-only data.
- Delegado Ver reads only its current scope and every mutation is denied.
- Delegado Gestionar mutates only allowed in-scope records.
- Pending/unconfigured/revoked/cross-workspace actors receive zero private access.
- Platform Pagos, Cupo, AFIP, complete Log, and contract storage remain owner-only.

If local Supabase is unavailable, report the database gate as blocked; mocked API tests do not prove
RLS and the feature cannot receive final acceptance.

## 2. Run API checks

```powershell
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api build
```

Required focused scenarios:

1. Invite existing verified target; reject unknown, unverified, self, duplicate, and conflicting
   membership.
2. Target-only accept/reject and owner-only cancel.
3. Accepted-but-unconfigured context returns no operational capabilities.
4. Configure `cuenta`, `grupo`, and selected `unidades` with Ver and Gestionar.
5. Replace scope atomically and deny a stale request using the old scope.
6. Revoke and deny the next protected request.
7. Verify Unidad, Grupo, Alquiler, Inquilino, metrics, Cupo, platform Pagos, and AFIP representative
   paths against the [authorization matrix](./contracts/authorization-matrix.md).
8. Simulate authorization/database timeout and confirm no private resilient fallback is returned.
9. Verify action attribution and that a Delegado cannot list the complete Log de acciones.

## 3. Build the web application

```powershell
pnpm --filter web build
```

Expected: production build succeeds without type, route, translation-key, or server-render errors.

## 4. Execute functional and visual Playwright coverage

Run the feature suite against deterministic non-production fixtures:

```powershell
pnpm --filter web exec playwright test e2e/delegado_scope_authorization.spec.ts
```

The suite must cover every row in [ui-state-matrix.md](./contracts/ui-state-matrix.md). It must retain
screenshots under `specs/004-delegado-scope-authorization/evidence/screenshots/` and the HTML/report
artifacts under the feature evidence directory, not under an untracked global scratch location.

Required widths:

- Responsive web: 375 and 768.
- Desktop web: 1024 and 1440.
- Light and dark themes where supported.

Native Android installation, device permissions, keyboard, lifecycle, deep links, and performance
are not part of this run and must not be claimed from responsive screenshots.

## 5. Manual acceptance sequence

Use synthetic accounts only:

1. Sign in as Gestor A and invite verified Account D.
2. Confirm in-app notification and test-email delivery record.
3. Sign in as Account D, accept, and verify the pending-configuration screen has no private data.
4. Sign in as Gestor A, configure selected-Unidad Ver, then verify D reads only selections.
5. Upgrade D to selected-Unidad Gestionar; verify in-scope mutation and out-of-scope denial.
6. Change D to Grupo Gestionar; verify Grupo settings/current members are manageable but membership
   and deletion are denied.
7. Change D to account Gestionar; verify broad operational access while Facturación, Cupo, AFIP,
   Delegados, personal/security settings, and complete Log remain denied.
8. Verify a shared Inquilino reveals only in-scope Alquiler relationships.
9. Revoke D while an edit page is open and verify submission is denied without mutation.
10. Sign in as Gestor B and confirm no record from Gestor A can be addressed or inferred.

## 6. Evidence and cleanup

Retain only:

- command results and version information in `evidence/test-results/`;
- source/contract review in `evidence/reports/`;
- named screenshots and visual manifest in `evidence/screenshots/` and
  `evidence/reports/visual-manifest.md`.

Remove only task-owned temporary browser traces, scratch downloads, local test mail, and temporary
servers after evidence is copied. Do not delete unrelated repository or computer files.

## Acceptance boundary

The feature is acceptable only when database policy tests, API tests, production builds, functional
Playwright tests, and Codex screenshot inspection all pass. A green UI mock alone is insufficient.
