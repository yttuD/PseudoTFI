# Evidencia de Política Efectiva en pg_policies — Supabase Beta

- **Proyecto Consultado**: `maeiuaketocznpogmtic` (organización `snpjqinernydjtlzfoug`)
- **Tipo de Operación**: Consulta SQL de solo lectura al catálogo del sistema (`pg_policies`)
- **Comando Ejecutado**:
  ```bash
  npx supabase db query --linked "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unidades' AND policyname = 'Unidades authenticated select policy';"
  ```
- **Código de Salida**: `0`
- **Timestamp de Ejecución**: `2026-10-08T21:49:19Z` (18:49:19-03:00)

> [!IMPORTANT]
> **Aclaración Documental**: La presencia de esta política y la paridad del historial de migraciones no demuestran por sí solas igualdad completa del esquema entre entornos (por ejemplo, ante posibles mutaciones DDL manuales o divergencias no versionadas).

---

## Definición Efectiva de la Política

| Campo | Valor Efectivo en Catálogo |
|---|---|
| **Esquema (`schemaname`)** | `public` |
| **Tabla (`tablename`)** | `unidades` |
| **Nombre de Política (`policyname`)** | `Unidades authenticated select policy` |
| **Tipo Permisivo (`permissive`)** | `PERMISSIVE` |
| **Roles Aplicables (`roles`)** | `{authenticated}` |
| **Comando (`cmd`)** | `SELECT` |
| **Expresión de Verificación (`with_check`)** | `null` (política de lectura SELECT) |

### Expresión de Calificación (`qual`)
```sql
(((deleted_at IS NULL) AND (
  is_gestor_owner(gestor_id)
  OR (EXISTS (
    SELECT 1
    FROM delegaciones d
    WHERE ((d.delegado_id = auth.uid())
      AND (d.gestor_id = unidades.gestor_id)
      AND (d.estado = 'activa'::text)
      AND (d.alcance_tipo = 'cuenta'::text))
  ))
  OR ((grupo_id IS NOT NULL) AND (EXISTS (
    SELECT 1
    FROM delegaciones d
    WHERE ((d.delegado_id = auth.uid())
      AND (d.gestor_id = unidades.gestor_id)
      AND (d.estado = 'activa'::text)
      AND (d.alcance_tipo = 'grupo'::text)
      AND (d.grupo_id = unidades.grupo_id))
  )))
  OR can_read_unidad(id)
)) OR ((estado = 'publicada'::unidad_estado) AND (deleted_at IS NULL)))
```

---

## Salida Cruda JSON de Supabase CLI

```json
{
  "rows": [
    {
      "schemaname": "public",
      "tablename": "unidades",
      "policyname": "Unidades authenticated select policy",
      "permissive": "PERMISSIVE",
      "roles": "{authenticated}",
      "cmd": "SELECT",
      "qual": "(((deleted_at IS NULL) AND (is_gestor_owner(gestor_id) OR (EXISTS ( SELECT 1\n   FROM delegaciones d\n  WHERE ((d.delegado_id = auth.uid()) AND (d.gestor_id = unidades.gestor_id) AND (d.estado = 'activa'::text) AND (d.alcance_tipo = 'cuenta'::text)))) OR ((grupo_id IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM delegaciones d\n  WHERE ((d.delegado_id = auth.uid()) AND (d.gestor_id = unidades.gestor_id) AND (d.estado = 'activa'::text) AND (d.alcance_tipo = 'grupo'::text) AND (d.grupo_id = unidades.grupo_id))))) OR can_read_unidad(id))) OR ((estado = 'publicada'::unidad_estado) AND (deleted_at IS NULL)))",
      "with_check": null
    }
  ]
}
```
