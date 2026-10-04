# Modelo afectado — feature008

Sin entidades nuevas ni cambios de estados/ADRs.

| Entidad | Campos/relación | Invariantes |
| --- | --- | --- |
| Gestor/Delegado | users.id/rol/workspace_id, delegaciones/delegacion_unidades | Workspace verificado; activo ver/gestionar y scope cuenta/grupo/unidades. Revocado/pendiente sin inventario; owner-only excluido. |
| Unidad | gestor_id/grupo_id/categoria/atributos, textos/ubicación | Scope antes de count/range; soft delete; publicación no concede gestión. |
| Grupo | gestor_id/nombre/descripcion/sena_default_* | Nombre obligatorio max100; descripción opcional max500. Seña activa >0, porcentaje <=100, valor>=0; tipo porcentaje/monto_fijo. Omitir no es cobro. |
| Modalidad de precio | id/unidad_id, importe/moneda/condiciones/deleted_at | PATCH conserva ID; DELETE lógico; conjunto activo igual; históricos intactos. |
| Perfil | full_name/phone propios | UI max120/max40 vigentes; email readonly; rol/cupo/workspace protegidos. |
| Traducción | titulo/descripcion es/en/pt | Real o pendiente por campo, nunca prefijo falso; preservar manuales. |

Precisión monetaria de DTO/SQL vigente: no redefinir ni cambiar valores históricos.
