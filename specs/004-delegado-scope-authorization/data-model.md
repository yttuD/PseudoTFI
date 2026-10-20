# Data Model: Delegado Scope and Granular Authorization

## 1. Existing Profile Extension

### `users` (existing)

Relevant fields remain:

| Field | Rule |
|---|---|
| `id` | Auth account id and profile primary key |
| `rol` | `gestor` or `delegado` for the current V1 operational membership |
| `workspace_id` | `NULL` for a Gestor owner; Gestor id for an accepted Delegado |
| `deleted_at` | Deleted profiles cannot invite, accept, configure, or operate |

Invariants:

- `rol = 'gestor'` implies `workspace_id IS NULL OR workspace_id = id`; canonical writes normalize
  to `NULL`.
- `rol = 'delegado'` implies a non-self `workspace_id` and exactly one non-revoked Delegado
  relationship for the same Gestor.
- An account with owned non-deleted Unidades or an active Delegado relationship cannot accept an
  invitation to another workspace.
- On revocation, the profile returns to `rol = 'gestor', workspace_id = NULL` with no automatic
  Unit creation or owner privileges over the former workspace.

## 2. Delegado Invitation

### `invitaciones_delegados` (evolved existing table)

| Field | Type | Required | Validation |
|---|---|---:|---|
| `id` | UUID | yes | Immutable primary key |
| `gestor_id` | UUID | yes | Active Gestor owner; cannot equal `delegado_id` |
| `delegado_id` | UUID | yes | Existing, verified, non-deleted target account |
| `email_snapshot` | text | yes | Trimmed, lowercased target email at creation |
| `estado` | enum/text | yes | `pendiente`, `aceptada`, `rechazada`, `cancelada`, `expirada` |
| `expires_at` | timestamptz | yes | Creation plus seven calendar days |
| `responded_at` | timestamptz | no | Required for accepted/rejected; otherwise null |
| `cancelled_at` | timestamptz | no | Required only for cancelled |
| `created_at` | timestamptz | yes | Server time |
| `updated_at` | timestamptz | yes | Server time |

Constraints:

- At most one `pendiente` invitation per Gestor/target pair.
- At most one pending invitation targeting an account across all Gestores because V1 permits one
  operational workspace.
- Only the Gestor owner creates/cancels; only `delegado_id` accepts/rejects.
- Terminal states never transition again.
- Expired/cancelled invitations cannot create a relationship.
- Legacy `email`/`usada` data is migrated to the new representation where identity can be resolved;
  unresolved legacy rows become terminal and grant no access.

State transitions:

```text
pendiente ──accept──> aceptada
    ├──────reject───> rechazada
    ├──────cancel───> cancelada
    └──────expiry───> expirada
```

## 3. Delegado Relationship

### `delegaciones`

| Field | Type | Required | Validation |
|---|---|---:|---|
| `id` | UUID | yes | Primary key |
| `invitacion_id` | UUID | yes | Unique accepted invitation |
| `gestor_id` | UUID | yes | Owner of operational workspace |
| `delegado_id` | UUID | yes | Unique while relationship is accepted/configured |
| `estado` | enum/text | yes | `aceptada_sin_configurar`, `activa`, `revocada` |
| `permiso` | enum/text | conditional | `ver` or `gestionar`; required only when active |
| `alcance_tipo` | enum/text | conditional | `cuenta`, `grupo`, or `unidades`; required only when active |
| `grupo_id` | UUID | conditional | Required only for `grupo`; must belong to `gestor_id` |
| `configured_at` | timestamptz | no | Set whenever active configuration is saved |
| `revoked_at` | timestamptz | no | Required only when revoked |
| `created_at` | timestamptz | yes | Acceptance time |
| `updated_at` | timestamptz | yes | Last lifecycle/configuration change |

Constraints:

- One non-revoked relationship per `delegado_id` globally.
- One non-revoked relationship per Gestor/Delegado pair.
- `aceptada_sin_configurar` has null permission/scope and grants zero operational access.
- `activa` has permission and scope; `grupo_id` is non-null only for Grupo scope.
- `revocada` is terminal, preserves prior configuration, and grants zero access.
- Scope replacement is atomic and increments `updated_at`.

State transitions:

```text
accepted invitation -> aceptada_sin_configurar -> activa -> revocada
                                      activa --reconfigure--> activa
```

## 4. Selected-Unidad Scope

### `delegacion_unidades`

| Field | Type | Required | Validation |
|---|---|---:|---|
| `delegacion_id` | UUID | yes | Active relationship with `alcance_tipo = 'unidades'` |
| `unidad_id` | UUID | yes | Non-deleted Unidad owned by the relationship's Gestor |
| `created_at` | timestamptz | yes | Server time |

Primary key: (`delegacion_id`, `unidad_id`).

An active selected-Unidad scope requires at least one selection. Rows for old scope are replaced in
the same transaction as the relationship update. Soft-deleted/archived Units remain in history but
are absent from normal authorized lists.

## 5. Notification and Delivery Records

### `notificaciones`

| Field | Rule |
|---|---|
| `id`, `usuario_id` | Notification belongs to the invitee |
| `tipo` | `invitacion_delegado` for this feature |
| `referencia_id` | Invitation id |
| `titulo`, `mensaje` | Localizable message key/payload, no sensitive workspace data |
| `leida_at`, `created_at` | Read lifecycle |

Only the recipient reads/marks their notifications. The owner cannot use the notification table to
read the invitee's unrelated notifications.

### `email_delivery_outbox`

| Field | Rule |
|---|---|
| `id`, `recipient_user_id`, `recipient_email` | Bound to invitation target |
| `template_key`, `payload` | Allowlisted template and minimal payload |
| `reference_type`, `reference_id` | `delegado_invitation` and invitation id |
| `status` | `pending`, `sending`, `sent`, `failed` |
| `attempt_count`, `last_error_code`, `next_attempt_at`, `sent_at` | Retry evidence; no provider secrets or stack traces |

Only trusted server execution reads/writes the outbox. User-facing owner status exposes channel
state and retry action, not internal errors or credentials.

## 6. Delegado Action Record

### `log_acciones`

| Field | Rule |
|---|---|
| `id`, `gestor_id` | Workspace attribution |
| `actor_id`, `actor_rol` | Authenticated real actor; never body-supplied |
| `accion` | Allowlisted lifecycle or mutation verb |
| `recurso_tipo`, `recurso_id` | Affected entity identity |
| `metadata` | Minimal non-secret before/after identifiers; no tokens or fiscal secrets |
| `created_at` | Immutable server time |

Only the Gestor owner and explicit dev/admin authority may read the complete workspace log.
Delegados may cause append-only records but never query the complete log.

## 7. Derived Authorization Rules

### Unidad read

Allowed when actor is the Gestor owner, or has an active relationship where:

- scope `cuenta`; or
- scope `grupo` and `unidad.grupo_id = delegacion.grupo_id`; or
- scope `unidades` and a matching `delegacion_unidades` row exists.

Both Ver and Gestionar can read. Public published-Unidad projection remains separate and does not
grant operational fields.

### Unidad manage

Unidad read conditions plus `permiso = gestionar`.

Creation:

- owner: any valid workspace target;
- account Gestionar: grouped or ungrouped;
- Grupo Gestionar: only directly in assigned Grupo;
- selected-Unidad Gestionar and Ver: denied.

### Grupo rules

- Read: owner/account scope; assigned Grupo scope; or a Grupo containing a selected readable Unidad.
- Rename/operational settings: owner, account Gestionar, or matching Grupo Gestionar.
- Create/delete/membership changes: owner or account Gestionar only.

### Alquiler and related records

Read/manage derives from the current referenced Unidad. Changing `unidad_id` requires manage access
to both old and new Units in one transaction. Future Pago, Depósito, Plan de pago, and availability
records inherit the Alquiler/Unidad decision.

### Inquilino projection

Read requires at least one active, non-deleted Alquiler on a readable Unidad. Returned Alquiler joins
are independently scope-filtered. Update requires at least one manageable linked Unidad. Soft delete
additionally requires that no active Alquiler exists on a non-manageable Unidad.

### Owner-only resources

`users` owner profile fields, Cupo, platform `pagos`, AFIP configuration/comprobantes, payment
instruments, delegation administration, and complete action log require exact Gestor owner identity.
They are not inherited through `workspace_id`.

## 8. RLS and Storage Coverage

The migration must replace broad policies on:

- `users`, `invitaciones_delegados`, `delegaciones`, `delegacion_unidades`;
- `grupos`, `unidades`, `modalidades_precio`;
- `inquilinos`, `alquileres` and feature 003's future related tables through documented helpers;
- `vistas_unidades`, `contactos_whatsapp` for private analytics reads;
- platform `pagos`, `gestor_afip_config`, `afip_comprobantes`;
- `notificaciones`, `log_acciones`, and contract storage objects.

Public marketplace SELECT projections and public analytics INSERT behavior remain separate. Contract
storage authorization must derive from the owning Alquiler's Unidad rather than `auth.uid() IS NOT
NULL`.
