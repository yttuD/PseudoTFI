# Actor-Surface Authorization Matrix (`actor-surface-matrix.md`)

Conforms to FR-004 through FR-008.  
Maps every surface, layout, form, and capability to its defined **Audience**, **Allowed Actors**, **Denied Actors**, **Channels**, and **Authorization Proof Status**.

## Actor Taxonomy

- `anonymous`: Unauthenticated public visitor.
- `public_user`: Authenticated marketplace account (canonical auth role 'buscador', public seeker / user).
- `gestor`: Portfolio owner / property manager account.
- `delegado_read`: Collaborator with read-only permission (`ver`) on assigned account, group, or unit scope.
- `delegado_manage`: Collaborator with operational permission (`gestionar`) on assigned account, group, or unit scope.
- `dev_admin`: Internal platform operator or administrator with system diagnostic access.

---

## 1. Surfaces, Routes, and Layouts Matrix

| Inventory ID | Name | Audience | Allowed Actors | Denied Actors | Channel | Enforcement Seam | Auth Proof Status |
|---|---|---|---|---|---|---|---|
| **SURF-001** | Home / Marketplace Search | public | anonymous, public_user | none | desktop, responsive | Public route | unverified |
| **SURF-002** | Catálogo de Unidades | public | anonymous, public_user | none | desktop, responsive | Public route | unverified |
| **SURF-003** | Detalle de Unidad | public | anonymous, public_user | none | desktop, responsive | Public route | unverified |
| **SURF-004** | Favoritos del Usuario | public | public_user | anonymous | desktop, responsive | Client redirect to `/auth/login` | unverified |
| **SURF-005** | Términos y Condiciones | public | all actors | none | desktop, responsive | Public static content | unverified |
| **SURF-006** | Política de Privacidad | public | all actors | none | desktop, responsive | Public static content | unverified |
| **SURF-007** | Inicio de Sesión | public | anonymous | public_user, gestor, delegado_* (session active) | desktop, responsive | Auth flow redirect | unverified |
| **SURF-008** | Registro de Usuario | public | anonymous | public_user, gestor, delegado_* (session active) | desktop, responsive | Auth flow redirect | unverified |
| **SURF-009** | Onboarding de Gestor | operational | gestor | anonymous, public_user, delegado_*, dev_admin | desktop, responsive | Role check in page/middleware | unverified |
| **SURF-010** | Panel de Control Gestor | operational | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | `(gestor)/layout.tsx` + `access-context` | verified (Feature 004) |
| **SURF-011** | Mis Unidades | operational | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | `(gestor)/layout.tsx` + `access-context` | verified (Feature 004) |
| **SURF-012** | Nueva Unidad | operational | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | UI button hide + page guard + API | verified (Feature 004) |
| **SURF-013** | Editar Unidad | operational | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | Scoped unit check + API guard | verified (Feature 004) |
| **SURF-014** | Grupos (Redirect Alias) | operational | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | Server-side redirect to `/mis-unidades` | verified (Feature 004) |
| **SURF-015** | CRM Inquilinos | operational | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | `(gestor)/layout.tsx` + `access-context` | verified (Feature 004) |
| **SURF-016** | Gestión de Alquileres | operational | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | `(gestor)/layout.tsx` + `access-context` | verified (Feature 004) |
| **SURF-017** | Planes y Facturación | operational | gestor | anonymous, public_user, delegado_read, delegado_manage, dev_admin | desktop, responsive | Owner-only check in page/middleware | verified (Feature 004) |
| **SURF-018** | Facturación AFIP | operational | gestor | anonymous, public_user, delegado_read, delegado_manage, dev_admin | desktop, responsive | Owner-only check in page/middleware | verified (Feature 004) |
| **SURF-019** | Delegados y Permisos | operational | gestor | anonymous, public_user, delegado_read, delegado_manage, dev_admin | desktop, responsive | Owner-only check in page/middleware | verified (Feature 004) |
| **SURF-020** | Métricas Gestor | operational | gestor | anonymous, public_user, delegado_read, delegado_manage, dev_admin | desktop, responsive | Owner-only check in page/middleware | verified (Feature 004) |
| **SURF-021** | Logs de Auditoría | operational | gestor | anonymous, public_user, delegado_read, delegado_manage, dev_admin | desktop, responsive | Owner-only check in page/middleware | verified (Feature 004) |
| **SURF-022** | Dev Moderación | dev-admin | dev_admin | anonymous, public_user, gestor, delegado_read, delegado_manage | desktop, responsive | `dev/layout.tsx` (isDevAdmin check) | unverified (Source only) |
| **SURF-023** | Dev Logs Globales | dev-admin | dev_admin | anonymous, public_user, gestor, delegado_read, delegado_manage | desktop, responsive | `dev/layout.tsx` (isDevAdmin check) | unverified (Source only) |
| **SURF-024** | Dev Métricas & Infra | dev-admin | dev_admin | anonymous, public_user, gestor, delegado_read, delegado_manage | desktop, responsive | `dev/layout.tsx` (isDevAdmin check) | unverified (Source only) |
| **SURF-025** | Dev Auditoría Pagos | dev-admin | dev_admin | anonymous, public_user, gestor, delegado_read, delegado_manage | desktop, responsive | `dev/layout.tsx` (isDevAdmin check) | unverified (Source only) |
| **SURF-026** | Invitaciones Usuario | public | public_user | anonymous | desktop, responsive | Auth guard on account routes | unverified (Source only) |
| **LAY-001** | Root Locale Layout | all | all actors | none | desktop, responsive | Root Next shell | verified |
| **LAY-002** | Marketplace Layout | public | all actors | none | desktop, responsive | Public navigation layout | unverified |
| **LAY-003** | Gestor Layout | operational | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | Server auth + access context check | verified (Feature 004) |
| **LAY-004** | Dev / Admin Layout | dev-admin | dev_admin | anonymous, public_user, gestor, delegado_read, delegado_manage | desktop, responsive | Fail-closed `owner-only-forbidden` | unverified (Source only) |

---

## 2. Interactive Controls & Forms Matrix

| Inventory ID | Name | Allowed Actors | Denied Actors | Channel | Enforcement Mechanism |
|---|---|---|---|---|---|
| **FORM-001** | Modal Alquiler | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | UI disable/hide for read + API guard |
| **FORM-002** | Config Fiscal AFIP | gestor | anonymous, public_user, delegado_*, dev_admin | desktop, responsive | Owner-only surface + API guard |
| **FORM-003** | Modal Grupo | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | UI disable/hide for read + API guard |
| **FORM-004** | Modal Inquilino | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | UI disable/hide for read + API guard |
| **FORM-005** | Formulario Unidad | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | UI disable/hide for read + API guard |
| **FORM-006** | Selector Ubicación Mapa | gestor, delegado_manage | anonymous, public_user, delegado_read, dev_admin | desktop, responsive | Container inside UnidadForm |
| **FORM-007** | Modal Invitar Delegado | gestor | anonymous, public_user, delegado_*, dev_admin | desktop, responsive | Owner-only surface + API guard |
| **FORM-008** | Modal Reportar Unidad | public_user | anonymous | desktop, responsive | Requires auth session to submit report |
| **FORM-009** | Asistente de Búsqueda | anonymous, public_user | none | desktop, responsive | Public client component |
| **FORM-010** | Formulario de Registro | anonymous | authenticated actors | desktop, responsive | Public auth entry point |
| **FORM-011** | Formulario de Login | anonymous | authenticated actors | desktop, responsive | Public auth entry point |
| **FORM-012** | Form Onboarding Gestor | gestor | anonymous, public_user, delegado_*, dev_admin | desktop, responsive | Post-registration onboarding |
| **FORM-013** | Editor Alcance Delegado | gestor | anonymous, public_user, delegado_*, dev_admin | desktop, responsive | Owner-only modal trigger |
| **FORM-014** | Acciones Invitación | public_user | anonymous, gestor (own invites) | desktop, responsive | Scoped to invitation recipient email |
| **FORM-015** | Filtros Catálogo | anonymous, public_user | none | desktop, responsive | Public client sidebar |
| **CTRL-001** | Toggle Favorito | public_user | anonymous (triggers login redirect) | desktop, responsive | Client click handler with auth check |
| **CTRL-002** | Contacto WhatsApp | anonymous, public_user | none | desktop, responsive | Public external URL generator |
| **CTRL-003** | Selector Idioma | all actors | none | desktop, responsive | Global header control |
| **CTRL-004** | Conmutador Tema | all actors | none | desktop, responsive | Global theme toggle |
| **CTRL-005** | Bento Grid Grupos | gestor, delegado_read, delegado_manage | anonymous, public_user, dev_admin | desktop, responsive | Operational navigation control |

---

## 3. Strict Boundary Rules

1. **Owner-Only Isolation (FR-005, FR-008)**:
   - Facturación (`SURF-017`), Facturación AFIP (`SURF-018`), Delegados (`SURF-019`), Métricas (`SURF-020`), and Logs (`SURF-021`) are strictly reserved for `gestor`. Any `delegado_read` or `delegado_manage` attempting navigation or API invocation MUST receive an immediate denial / fail-closed response without data leakage.
2. **Dev Console Isolation (FR-007)**:
   - All `/dev/*` routes (`SURF-022` to `SURF-025` and `LAY-004`) are accessible solely to `dev_admin`. All business roles (`gestor`, `delegado_*`, `public_user`, `anonymous`) receive the fail-closed `owner-only-forbidden` screen.
3. **Delegation Scope Boundary (FR-006)**:
   - A `delegado_read` can view inventory, tenants, and rentals within assigned scope (account, group, or unit IDs), but cannot see creation buttons, edit links, or invoke mutation endpoints.
   - A `delegado_manage` can create/edit within assigned scope, but cannot alter other groups/units or access owner financial records.
