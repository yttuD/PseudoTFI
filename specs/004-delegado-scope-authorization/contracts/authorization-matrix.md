# Authorization Matrix

Legend: **R** read, **M** mutate, **—** denied, **Scoped** derived from current configured scope.
Every denial applies to UI, API, and database access; direct identifiers do not reveal existence.

| Capability | Anonymous | Public account | Gestor owner | Delegado Ver | Delegado Gestionar | Dev/admin |
|---|---:|---:|---:|---:|---:|---:|
| Public marketplace published Unidad projection | R | R | R | R | R | R |
| Operational Unidades | — | — | R/M all own | R Scoped | R/M Scoped | explicit admin tooling only |
| Create Unidad | — | — | M | — | account scope: M; Grupo scope: M in assigned Grupo; selected scope: — | explicit admin tooling only |
| Modalidades de precio | — | — | R/M | R Scoped | R/M Scoped | explicit admin tooling only |
| Grupos | — | — | R/M | R as needed by scope | account: R/M; Grupo: rename/settings; selected: R only as needed | explicit admin tooling only |
| Grupo membership/delete | — | — | M | — | account scope: M; Grupo/selected: — | explicit admin tooling only |
| Alquileres and future Pago/Depósito/Plan de pago/availability | — | — | R/M | R Scoped | R/M Scoped | explicit admin tooling only |
| Inquilinos | — | — | R/M all own | R through in-scope Alquiler only | R/M through in-scope Alquiler only | explicit admin tooling only |
| Scoped metrics/export | — | — | R all own | R Scoped | R Scoped | explicit admin tooling only |
| Gestor profile/security data | — | own public profile only | R/M own | — | — | explicit support tooling only |
| Cupo and platform subscription Pagos | — | — | R/M | — | — | explicit platform tooling only |
| Facturación and AFIP | — | — | R/M | — | — | explicit platform tooling only |
| Delegado administration | — | invitation inbox only | R/M | invitation inbox before membership only | — | — |
| Complete Log de acciones | — | — | R own workspace | — | — | explicit global tooling only |
| Dev/admin console | — | — | — | — | — | explicit role only |

## Grupo Gestionar detail

| Action | Account scope | Matching Grupo scope | Selected-Unidad scope |
|---|---:|---:|---:|
| Read Grupo | yes | yes | only container needed for selected Unidad |
| Rename/configure Grupo | yes | yes | no |
| Create Grupo | yes | no | no |
| Delete Grupo | yes | no | no |
| Add existing Unidad to Grupo | yes | no | no |
| Move Unidad out of Grupo | yes | no | no |
| Create new Unidad inside Grupo | yes | yes | no |
| Manage current member Unidad | yes | yes | only when explicitly selected |

## Owner-only route behavior

`/facturacion`, `/facturacion-afip`, `/delegados`, and `/logs` must reject Delegados before protected
data fetch/render. Navigation and dashboard cards omit these destinations. API endpoints return 403;
object-specific owner-only targets may return 404 when concealment is safer.
