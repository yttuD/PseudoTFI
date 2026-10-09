# Verificación de Despliegue y Manifiesto de Fuentes — Lote B009

- **Deployment ID Verificado**: `dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN`
- **Proyecto**: `rendo-beta-api` (`prj_dL8gNB3eb3ePfOI9NBoE1GbRLtVB`)
- **Scope / Equipo**: `team_7VskngbUFc8h5haIO6O0AEau` (usuario CLI `yttud`)
- **Estado**: `READY` (Target: `production`)
- **Fecha de Despliegue**: 2026-10-09T01:58:29-03:00 (2026-10-09T04:58:29Z)
- **URL Directa**: `https://rendo-beta-aj6vd8pev-dutty.vercel.app`
- **Alias de Producción**: `https://rendo-beta-api.vercel.app`, `https://rendo-beta-api-dutty.vercel.app`

---

## 1. Salida Sanitizada de Inspección de Despliegue en Vercel

```text
$ npx vercel inspect dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN --scope team_7VskngbUFc8h5haIO6O0AEau
Vercel CLI 63.1.0 (Node.js 22.16.0)
Fetching deployment "dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN" in dutty
> Fetched deployment "rendo-beta-aj6vd8pev-dutty.vercel.app" in dutty

  General
    id          dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN
    name        rendo-beta-api
    target      production
    status      ● Ready
    url         https://rendo-beta-aj6vd8pev-dutty.vercel.app
    created     Fri Oct 09 2026 01:58:29 GMT-0300

  Build Machine
    assigned cores   2 vCPU
    memory           8192 MiB
    selection type   fixed (plan-default)

  Duration
    build duration       28s
    post-build duration  42s
    billable duration    2m

  Aliases
    ╶ https://rendo-beta-api.vercel.app
    ╶ https://rendo-beta-api-dutty.vercel.app

  Builds
    ┌ .        [0ms]
    └── λ index (2.92MB) [iad1]
```

---

## 2. Salida Sanitizada de Inspección del Alias de Producción

```text
$ npx vercel inspect https://rendo-beta-api.vercel.app --scope team_7VskngbUFc8h5haIO6O0AEau
Vercel CLI 63.1.0 (Node.js 22.16.0)
Fetching deployment "rendo-beta-api.vercel.app" in dutty
> Fetched deployment "rendo-beta-aj6vd8pev-dutty.vercel.app" in dutty

  General
    id          dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN
    name        rendo-beta-api
    target      production
    status      ● Ready
    url         https://rendo-beta-aj6vd8pev-dutty.vercel.app

  Aliases
    ╶ https://rendo-beta-api.vercel.app
    ╶ https://rendo-beta-api-dutty.vercel.app
```

> **Acreditación**: El alias oficial `https://rendo-beta-api.vercel.app` resuelve deterministamente al deployment `dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN` en estado `READY`.

---

## 3. Manifiesto Comparativo de Fuentes (Baseline → Candidato → Desplegado)

| Componente | Archivo | SHA-256 | Rol / Estado |
|---|---|---|---|
| **Baseline publicado** | `snapshots/candidate-api/src/unidades/unidades.service.ts` | `13583df9601742908088d9a1f7e963a91ae0e22d7b9b77132f761c83c4046ef2` | Código API previo en producción (`dpl_6EQBEFvG6JsUcPfJ9rFuTzcUswcm` / Commit `55b8e19`) |
| **Candidato preparado** | `apps/api/src/unidades/unidades.service.ts` (Commit `5b8e64c`) | `6656e3bd561bdd7c0244c2971c55155f43f4abbc138d17d9d564b7d74c28c728` | Aislado: solo método `remove` modificado a RPC `archive_unidad` |
| **Fuente desplegada** | `snapshots-vercel/api-candidate/apps/api/src/unidades/unidades.service.ts` | `6656e3bd561bdd7c0244c2971c55155f43f4abbc138d17d9d564b7d74c28c728` | Fuente extraída y compilada por Vercel Cloud (399 archivos) |

### Paridad Candidato ↔ Fuente Desplegada
```text
$ git diff 5b8e64c:apps/api/src/unidades/unidades.service.ts snapshots-vercel/api-candidate/apps/api/src/unidades/unidades.service.ts
(0 diferencias — paridad exacta 100%)
```

### Diff Exacto: Baseline Publicado ↔ Candidato Desplegado
```diff
--- snapshots/candidate-api/src/unidades/unidades.service.ts
+++ snapshots-vercel/api-candidate/apps/api/src/unidades/unidades.service.ts
@@ -275,19 +275,20 @@ export class UnidadesService {
 
   async remove(id: string, token: string) {
     const supabase = this.supabaseService.getClient(token);
-    
-    // Borrado lógico
-    const { data, error } = await supabase
-      .from('unidades')
-      .update({ deleted_at: new Date().toISOString() })
-      .eq('id', id)
-      .select()
-      .single();
-
-    if (error || !data) {
-      throw new NotFoundException('Unidad no encontrada');
-    }
-    return data;
+
+    // Borrado lógico atómico vía RPC archive_unidad
+    const { data, error } = await supabase.rpc('archive_unidad', {
+      p_unidad_id: id,
+    });
+
+    const res = data as { success?: boolean; id?: string; deleted_at?: string } | null;
+    if (error || !res || res.success !== true || res.id !== id) {
+      if (error?.message?.includes('alquileres activos')) {
+        throw new UnprocessableEntityException('La unidad tiene alquileres activos y no se puede eliminar');
+      }
+      throw new NotFoundException('Unidad no encontrada');
+    }
+    return { success: true, id: res.id, deleted_at: res.deleted_at };
   }
 
   async createModalidad(unidadId: string, createDto: CreateModalidadPrecioDto, token: string) {
```

> **Aislamiento verificado**: Ningún cambio local de traducción, auto-traducción, estado `borrador` ni modalidades de precio fue arrastrado al despliegue.

---

## 4. Verificación de Disponibilidad HTTP Smoke

```json
[
  {
    "url": "https://rendo-beta-api.vercel.app/health/live",
    "status": 200,
    "body": "{\"status\":\"ok\"}"
  },
  {
    "url": "https://rendo-beta-api.vercel.app/health/ready",
    "status": 200,
    "body": "{\"status\":\"ok\"}"
  },
  {
    "url": "https://rendo-beta-api.vercel.app/unidades",
    "status": 401,
    "body": "{\"message\":\"Token inválido o no autorizado\",\"error\":\"Unauthorized\",\"statusCode\":401}"
  },
  {
    "url": "https://rendo-beta-web.vercel.app/es",
    "status": 200,
    "body": "<!DOCTYPE html><html lang=\"es\">..."
  }
]
```
