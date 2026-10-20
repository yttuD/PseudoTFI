# Evidencia de Recuperación y Preservación Local — UnidadesService

**Fecha:** 2026-10-09  
**Objetivo:** Documentar la procedencia, hashes, diff y resultados de verificación tras la recuperación del servicio `apps/api/src/unidades/unidades.service.ts` luego del incidente de extracción de tarball.

---

## 1. Procedencia y Acreditación de Fuentes

1. **Blob Git Local (`ef38056`):**
   - Identificador en git object store: `ef38056` (`git cat-file -p ef38056`).
   - Contenido acreditado: Versión previa de `unidades.service.ts` que contenía todas las modificaciones locales no versionadas:
     - `create`: optimización `Promise.all` para auto-traducción en paralelo, estado inicial `UnidadEstado.Borrador`, persistencia de `fotos`, `ubicacion_aprox`, `ubicacion_exacta`, `direccion_texto`.
     - `findOne`: filtrado de `modalidades_precio` excluyendo registros marcados con `deleted_at`.
     - `update`: optimización `Promise.all` para auto-traducción en paralelo.
     - `remove`: implementación con verificación de alquileres activos.

2. **Compilado de Respaldo (`dirty-backup.js`):**
   - Archivo: `apps/api/dist/unidades/unidades.service.dirty-backup.js`.
   - Fecha de generación: Generado inmediatamente antes de la extracción accidental del tarball.
   - Contenido acreditado: Demuestra que en la sesión previa el método `remove` integraba de forma conjunta la comprobación de alquileres activos y la llamada atómica RPC `archive_unidad` con mapeo de errores (422 ante alquileres activos y 404 ante no encontrado).

3. **Candidato Sobrescrito (Respaldo fuera de `src`):**
   - Archivo de respaldo: `specs/008-beta-observaciones-2026-10-02/evidence/N01/backup-unidades.service.candidate.ts`.
   - Procedencia: Copia exacta del archivo sobreescrito por el tarball de Vercel antes de iniciar la reconstrucción.
   - SHA-256: `6656e3bd561bdd7c0244c2971c55155f43f4abbc138d17d9d564b7d74c28c728`.

4. **Archivo Recuperado:**
   - Archivo: `apps/api/src/unidades/unidades.service.ts`.
   - Integración: Fusión del blob `ef38056` con la integración `archive_unidad` aprobada en B009.
   - SHA-256: `8016ca91a43c68cb9a3ee543daaf2a41e2ef86ab4feebb5f5cf94ee67d579081`.
   - Coincidencia: Reproduce 100% de forma determinista el SHA-256 registrado antes del incidente.

---

## 2. Hashes Criptográficos

| Elemento | Ubicación / Referencia | SHA-256 |
|---|---|---|
| Candidato sobrescrito (respaldo) | `specs/.../evidence/N01/backup-unidades.service.candidate.ts` | `6656e3bd561bdd7c0244c2971c55155f43f4abbc138d17d9d564b7d74c28c728` |
| Servicio recuperado | `apps/api/src/unidades/unidades.service.ts` | `8016ca91a43c68cb9a3ee543daaf2a41e2ef86ab4feebb5f5cf94ee67d579081` |
| Blob Git fuente | `git cat-file -p ef38056` (LF) | `c3506ef5237c1ff4b9864fe283e16b9bb7ee4fb3d74a0058ec4044155b931980` |

---

## 3. Diff de Recuperación (Candidato Sobrescrito vs Servicio Recuperado)

```diff
--- specs/008-beta-observaciones-2026-10-02/evidence/N01/backup-unidades.service.candidate.ts
+++ apps/api/src/unidades/unidades.service.ts
@@ -25,18 +25,12 @@
     let { titulo_es, descripcion_es, titulo_en, titulo_pt, descripcion_en, descripcion_pt, auto_traducir } = createDto;
 
     if (auto_traducir !== false) {
-      if (titulo_es && !titulo_en) {
-        titulo_en = await this.traduccionService.traducir(titulo_es, 'en');
-      }
-      if (titulo_es && !titulo_pt) {
-        titulo_pt = await this.traduccionService.traducir(titulo_es, 'pt');
-      }
-      if (descripcion_es && !descripcion_en) {
-        descripcion_en = await this.traduccionService.traducir(descripcion_es, 'en');
-      }
-      if (descripcion_es && !descripcion_pt) {
-        descripcion_pt = await this.traduccionService.traducir(descripcion_es, 'pt');
-      }
+      [titulo_en, titulo_pt, descripcion_en, descripcion_pt] = await Promise.all([
+        titulo_es && !titulo_en ? this.traduccionService.traducir(titulo_es, 'en') : titulo_en,
+        titulo_es && !titulo_pt ? this.traduccionService.traducir(titulo_es, 'pt') : titulo_pt,
+        descripcion_es && !descripcion_en ? this.traduccionService.traducir(descripcion_es, 'en') : descripcion_en,
+        descripcion_es && !descripcion_pt ? this.traduccionService.traducir(descripcion_es, 'pt') : descripcion_pt,
+      ]);
     }
 
     const supabase = this.supabaseService.getClient(token);
@@ -47,11 +41,15 @@
         categoria: createDto.categoria,
         zona_id: createDto.zona_id,
         grupo_id: createDto.grupo_id,
-        estado: UnidadEstado.Publicada,
+        estado: UnidadEstado.Borrador,
         titulo_es: createDto.titulo_es,
         descripcion_es: createDto.descripcion_es,
         whatsapp: createDto.whatsapp,
         instagram: createDto.instagram,
+        fotos: createDto.fotos || [],
+        ubicacion_aprox: createDto.ubicacion_aprox,
+        ubicacion_exacta: createDto.ubicacion_exacta,
+        direccion_texto: createDto.direccion_texto,
         titulo_en,
         titulo_pt,
         descripcion_en,
@@ -139,26 +137,27 @@
       throw new NotFoundException('Unidad no encontrada');
     }
 
-    return data;
+    return {
+      ...data,
+      modalidades_precio: (data.modalidades_precio || []).filter((m: any) => !m.deleted_at),
+    };
   }
 
   async update(id: string, updateDto: UpdateUnidadDto, token: string, workspaceId?: string) {
     const finalUpdateDto = { ...updateDto };
 
     if (finalUpdateDto.auto_traducir !== false) {
-      if (finalUpdateDto.titulo_es && !finalUpdateDto.titulo_en) {
-        finalUpdateDto.titulo_en = await this.traduccionService.traducir(finalUpdateDto.titulo_es, 'en');
-      }
-      if (finalUpdateDto.titulo_es && !finalUpdateDto.titulo_pt) {
-        finalUpdateDto.titulo_pt = await this.traduccionService.traducir(finalUpdateDto.titulo_es, 'pt');
-      }
-
-      if (finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_en) {
-        finalUpdateDto.descripcion_en = await this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'en');
-      }
-      if (finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_pt) {
-        finalUpdateDto.descripcion_pt = await this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'pt');
-      }
+      [finalUpdateDto.titulo_en, finalUpdateDto.titulo_pt,
+        finalUpdateDto.descripcion_en, finalUpdateDto.descripcion_pt] = await Promise.all([
+        finalUpdateDto.titulo_es && !finalUpdateDto.titulo_en
+          ? this.traduccionService.traducir(finalUpdateDto.titulo_es, 'en') : finalUpdateDto.titulo_en,
+        finalUpdateDto.titulo_es && !finalUpdateDto.titulo_pt
+          ? this.traduccionService.traducir(finalUpdateDto.titulo_es, 'pt') : finalUpdateDto.titulo_pt,
+        finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_en
+          ? this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'en') : finalUpdateDto.descripcion_en,
+        finalUpdateDto.descripcion_es && !finalUpdateDto.descripcion_pt
+          ? this.traduccionService.traducir(finalUpdateDto.descripcion_es, 'pt') : finalUpdateDto.descripcion_pt,
+      ]);
     }
     delete (finalUpdateDto as any).auto_traducir;
 
@@ -276,6 +275,15 @@
   async remove(id: string, token: string) {
     const supabase = this.supabaseService.getClient(token);
 
+    const { data: activeRentals, error: rentalsError } = await supabase
+      .from('alquileres')
+      .select('id')
+      .eq('unidad_id', id)
+      .eq('estado', 'activo')
+      .is('deleted_at', null)
+      .limit(1);
+    if (rentalsError) throw new UnprocessableEntityException('No se pudo verificar si la unidad tiene alquileres activos');
+    if (activeRentals?.length) throw new UnprocessableEntityException('La unidad tiene alquileres activos y no se puede eliminar');
+    
     // Borrado lógico atómico vía RPC archive_unidad
     const { data, error } = await supabase.rpc('archive_unidad', {
       p_unidad_id: id,
```

---

## 4. Resultados de Pruebas Unitarias Locales

### A. `src/unidades/unidades.observaciones.spec.ts`
- **Comando:** `pnpm --filter api test src/unidades/unidades.observaciones.spec.ts`
- **Resultado:** **PASS (8 de 8 tests pasados)**
- **Detalle:**
  - Crea unidad con estado `Borrador` y traducción paralela: PASS
  - Persiste fotos, ubicación aproximada y exacta: PASS
  - Actualiza unidad con traducción en paralelo: PASS
  - `findOne` filtra modalidades con `deleted_at`: PASS
  - `remove` valida bloqueo por alquileres activos: PASS

### B. `src/unidades/unidades.archive.spec.ts`
- **Comando:** `pnpm --filter api test src/unidades/unidades.archive.spec.ts`
- **Resultado anterior:** 4 fallos iniciales por mock incompleto (`TypeError: supabase.from is not a function`).
- **Alineación aplicada (sin modificar código productivo):**
  - Se completó el doble tipado en `unidades.archive.spec.ts` soportando la cadena `.from('alquileres').select('id').eq().eq().is().limit()`.
  - Por defecto responde sin alquileres activos (`data: []`, `error: null`).
  - Se mantuvieron las 4 comprobaciones de la RPC existentes (éxito, error 422 por RPC, 404 por no encontrada, 404 por payload incompleto).
  - Se añadieron 2 casos adicionales:
    1. Detección de alquileres activos en la consulta previa (`status: 422`, mensaje correspondiente, sin invocar `archive_unidad`).
    2. Fallo de base de datos en la consulta previa de alquileres (`status: 422`, mensaje correspondiente, sin invocar `archive_unidad`).
- **Resultado actual:** **PASS (6 de 6 tests pasados)**.
- **Verificación de SHA-256 del servicio productivo:**
  - Archivo: `apps/api/src/unidades/unidades.service.ts`
  - SHA-256: `8016ca91a43c68cb9a3ee543daaf2a41e2ef86ab4feebb5f5cf94ee67d579081` (inalterado, 100% confirmado).

---

## 5. Diagnóstico de `tsc --noEmit`

- **Comando:** `pnpm --filter api exec tsc --noEmit`
- **Código de salida:** `1` (FAIL)
- **Diagnóstico completo reportado por el compilador:**
```text
src/auth/supabase-auth.guard.spec.ts(41,25): error TS2344: Type 'typeof vi.fn<[string?], Promise<MockGetUserResult>>' does not satisfy the constraint '(...args: any) => any'.
  Type 'typeof vi.fn<[string?], Promise<MockGetUserResult>>' provides no match for the signature '(...args: any): any'.
src/auth/supabase-auth.guard.spec.ts(41,38): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(43,20): error TS2344: Type 'typeof vi.fn<[string], MockSupabaseClient>' does not satisfy the constraint '(...args: any) => any'.
src/auth/supabase-auth.guard.spec.ts(43,33): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(44,22): error TS2344: Type 'typeof vi.fn<[string], MockSupabaseClient>' does not satisfy the constraint '(...args: any) => any'.
src/auth/supabase-auth.guard.spec.ts(44,35): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(45,18): error TS2344: Type 'typeof vi.fn<[string, unknown], MockSupabaseClient>' does not satisfy the constraint '(...args: any) => any'.
src/auth/supabase-auth.guard.spec.ts(45,31): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(46,22): error TS2344: Type 'typeof vi.fn<[], Promise<MockProfileResult>>' does not satisfy the constraint '(...args: any) => any'.
src/auth/supabase-auth.guard.spec.ts(46,35): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(50,25): error TS2344: Type 'typeof vi.fn<[string?], MockSupabaseClient>' does not satisfy the constraint '(...args: any) => any'.
src/auth/supabase-auth.guard.spec.ts(50,38): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(55,19): error TS2344: Type 'typeof vi.fn<[string], string | undefined>' does not satisfy the constraint '(...args: any) => any'.
src/auth/supabase-auth.guard.spec.ts(55,32): error TS2635: Type '<T extends Procedure | Constructable = Procedure>(originalImplementation?: T | undefined) => Mock<T>' has no signatures for which the type argument list is applicable.
src/auth/supabase-auth.guard.spec.ts(70,21): error TS2322: Type 'new (...args: unknown[]) => unknown' is not assignable to type 'Type<T>'.
src/auth/supabase-auth.guard.spec.ts(72,20): error TS2322: Type 'unknown[]' is not assignable to type 'T'.
src/auth/supabase-auth.guard.spec.ts(73,26): error TS2322: Type 'unknown' is not assignable to type 'T'.
src/auth/supabase-auth.guard.spec.ts(83,20): error TS2322: Type 'string' is not assignable to type 'TContext'.
src/authorization/test-adapter.spec.ts(2,38): error TS6059: File '.../apps/web/src/lib/test-adapter.ts' is not under 'rootDir' '.../apps/api'.
src/delegados/delegados.controller.spec.ts(42,18): error TS2554: Expected 3 arguments, but got 2.
test/app.e2e-spec.ts(4,21): error TS2307: Cannot find module 'supertest/types' or its corresponding type declarations.
```

- **Observación importante:** Ningún diagnóstico de `tsc --noEmit` afecta a los archivos de producción ni a `unidades.service.ts`. La compilación productiva (`pnpm --filter api run build`, ejecutada con `tsconfig.build.json` que excluye archivos de test) finaliza con código de salida `0` (éxito).

---

## 6. Procedimiento Preventivo Establecido

En adelante, ante cualquier extracción o inspección de paquetes tarball de Vercel u otras fuentes:
- Se extraerán estrictamente en directorios temporales aislados (`scratch/` o `tmp/`).
- Queda prohibida la extracción directa sobre la raíz del repositorio o sobre árboles de trabajo activos (`src/`).
