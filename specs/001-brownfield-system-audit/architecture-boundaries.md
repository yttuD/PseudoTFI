# Rendo Audience and Platform Boundaries

This document is normative for the active brownfield audit and for every remediation feature that
follows it. It records the product boundaries confirmed by Carlos on 2026-09-25.

## Trust surfaces

| Boundary | Intended actors | Allowed data and actions | Must never expose |
|---|---|---|---|
| Public marketplace | anonymous and authenticated public users | discover published Unidades, use public filters, view obfuscated location, contact a Gestor, manage own favorites, submit guarded reports | workspace operations, exact private location, Inquilinos, Alquileres, billing, certificates, tenant-wide logs |
| Operational workspace | Gestor owner and authorized Delegados | manage the owner's workspace according to actor, scope, and permission level | another workspace, dev/admin global data, owner-only billing/log data to Delegados |
| Dev/admin console | explicitly privileged dev/admin actors | global moderation, operational diagnostics, payment audit, system-wide logs | access by ordinary public users, Gestores, or Delegados merely because they are authenticated |

Navigation hiding is not authorization. Every protected action must be enforced consistently by
the rendered route, API guard/policy, service authorization, and Supabase RLS.

## Actor model

| Actor | Public marketplace | Operational workspace | Owner billing/logs | Dev/admin console |
|---|---|---|---|---|
| Anonymous | yes | no | no | no |
| Authenticated public user | yes, including own favorites and guarded reports | onboarding only | no | no |
| Gestor | yes | owner access | yes | no unless separately privileged |
| Delegado | yes | only assigned scope and allowed action level | never | no |
| Dev/admin | as explicitly designed | support access only when specified and audited | only when explicitly authorized | yes |

The intended Delegado model is `scope × permission`: account, Grupo, or selected Unidades combined
with `Ver` or `Gestionar`. The current implementation must be audited against that intent and gaps
must remain visible; documentation may not describe absent granularity as implemented.

## Platform targets

| Target | Current phase | Required evidence now | Completion gate |
|---|---|---|---|
| Desktop web | in scope | Playwright at 1024 and 1440 pixels, behavior and UI/UX disposition | current web remediation features |
| Responsive web | in scope | Playwright at 375 and 768 pixels, touch/keyboard/scroll/overlay behavior and separate UI/UX disposition | current web remediation features |
| Capacitor Android wrapper | readiness only | configuration, security, build-surface, lifecycle and native-plugin gap assessment | does not establish native acceptance |
| Future Android app | deferred | physical-device install and tests for permissions, keyboard, lifecycle, deep links, offline behavior, performance and security | dedicated Spec Kit feature, explicit notice to Carlos, authorization, and wireless-debugging access to his Android phone |

A responsive web capture or Capacitor WebView capture must never be labeled as proof that the
future Android app is complete. Codex must notify Carlos when the roadmap reaches the native-mobile
phase before requesting device access or installing anything.
