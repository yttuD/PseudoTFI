# Rendo — web/API release preflight (2026-10-20)

**Alcance de este lote:** web Next.js, API NestJS, Supabase y Vercel. **No incluye Android, Capacitor ni instalación nativa.**

## Estado y fuentes

| Elemento | Confirmación | Límite |
|---|---|---|
| Candidato web/API | `codex/release-candidate-n01-n08-2026-10-20`, commit de referencia `8112cd17ac41523c3b999cea972d95af6a414bda` | SHA cambia con cada integración; comprobar nuevamente antes de publicar |
| API unit | 302/302 PASS en HEAD anterior + gates reejecutados en RC actualizado | No implica aceptación funcional manual |
| Auth/RLS local | 51/51 en stack Docker/localhost | No acredita Auth ni permisos de la beta desplegada |
| Playwright UI | 10/10 escritorio/móvil y 8/8 Auth real en PR #33 | Algunas capturas usan fixtures simuladas; no es QA de Android |
| Supabase alojado | 30/30 versiones de migración coinciden; tablas públicas con RLS | No verifica hashes SQL, cambios manuales ni ajustes de Auth |
| Web Vercel producción | `dpl_CCUjNTerCxx8zhfhsT897jA96EtL` | READY en SHA anterior `7e66fc48fe87b77c3782f2aa1e5a505ecde5fc1b` |
| API Vercel producción | `dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN` | READY en el mismo SHA anterior |

## Bloqueantes antes de promoción

- **Seguridad de base:** [PR #34](https://github.com/yttuD/PseudoTFI/pull/34) ya incluye migración versionada `20261020222326_harden_rendo_rpc_permissions.sql` (creada con CLI Supabase); **51/51 Auth/RLS y 8/8 navegador real PASS** en base local. Antes de aplicar a Supabase alojado se requiere revisar su impacto, aprobar explícitamente la migración y asegurar rollback. [Auditoría #36](https://github.com/yttuD/PseudoTFI/issues/36) incluye advertencias restantes, entre ellas leaked-password protection.
- **Datos monetarios:** [issue #27](https://github.com/yttuD/PseudoTFI/issues/27): dos grupos de tarifas activas aparentemente idénticas, 3 filas excedentes si se conservara solo una por grupo. No archivar sin validar que sean duplicados accidentales y conservar referencias históricas.
- **Datos de idiomas:** [issue #32](https://github.com/yttuD/PseudoTFI/issues/32): 3 unidades publicadas; hay 2 títulos EN, 2 PT y 1 descripción EN/PT vacíos. El planner de PR #35 permite inventario sólo lectura; no ejecutar `--apply` ni traducir a ciegas sin aprobación del contenido comercial.
- **Operación y aceptación:** revisar diff de alto riesgo, autenticar gestor/delegado/buscador real en preview aislada, comprobar pagos/reportes si forman parte del release, y corroborar secretos y permisos sin imprimirlos.
- **Integración Git:** la rama candidata contenía más de 100 commits y cientos de archivos respecto de `main`, incluidas rutas fuera de web/API. No fusionar todo a main sin controlar la lista de archivos y respetar el alcance excluido (nativo).

## Procedimiento web/API: sin escrituras en producción

1. Congelar el **SHA de commit exacto** aprobado en GitHub y verificar estado terminal verde para API unit, Auth/RLS local, browser Auth real, UI desktop/mobile y build. Cualquier merge posterior invalida esa evidencia hasta reejecutar los gates afectados.
2. Auditar configuración efectiva de Vercel **sin imprimir valores de entorno**: Git repository/branch, `NODE_ENV`, modo beta, URLs de API/Supabase, orígenes permitidos, Auth y disponibilidad DeepL. Nunca habilitar tokens de desarrollo en preview o release pública.
3. Crear **preview/staged** de web y API desde el mismo SHA. **No asignar alias de producción**. Leer metadatos de ambos deployment IDs con el conector Vercel (no asumir que compilar o crear un deploy confirma identidad). Guardar solo los dos objetos JSON de metadata en archivos temporales locales, nunca en Git, y ejecutar:

   ```bash
   node scripts/release/verify-vercel-pair.mjs --web-file /tmp/rendo-web.json --api-file /tmp/rendo-api.json --sha <SHA_APROBADO_COMPLETO_40> --target preview
   ```

   Este control exige los IDs correctos de los proyectos Rendo, origen GitHub `yttuD/PseudoTFI`, **SHA completo idéntico en web/API**, ambos `READY`, hosts Vercel válidos y ausencia de alias públicos de producción en preview. Cualquier discrepancia **detiene** publicación. Tras una promoción autorizada, repetir con `--target production` para exigir alias exactos; no equivale a smoke HTTP.
4. Ejecutar smoke GET-only contra URLs stage exactas (sin headers Auth ni datos reales):

   ```bash
   node scripts/release/readonly-vercel-smoke.mjs --web https://<preview-web>.vercel.app --api https://<preview-api>.vercel.app
   ```

   Este smoke solo comprueba `/es/auth/login`, `/health/live` y `/health/ready`, **no el SHA**, autentificación real, datos ni reglas de negocio. Comparar commit SHA directamente con Vercel API/MCP; si falla un GET detener publicación.
5. Ejecutar QA manual autorizada en **preview aislada** para perfil, inventario, grupos, altas/edición, tarifas, marketplace anónimo/contacto y traducciones, sin alterar cuentas reales de prueba. Documentar capturas y limites.
6. Obtener aprobación explícita para migraciones/Backfill y promoción. Si cambian Auth/RLS, repetir las regresiones bajo el schema aprobado; no crear usuarios ni limpiar datos ajenos automáticamente.
7. Publicar **API y web desde el mismo SHA** bajo ventana controlada; verificar ambos deployment IDs/aliases reales, liveness/readiness y funcionalidad básica; recién entonces marcar release. No suponer que el push ni el build indican que el alias está actualizado.

## Rollback

Conservar los deployment IDs previos de Web/API listados arriba. Ante error, **detener promoción**, restaurar de manera coordinada los alias que antes funcionaban y verificar READY + GET. Revertir cambios de base solo con un plan seguro y migración reversible; volver a desplegar código anterior **no revierte DDL** ni datos por sí mismo. Registrar causa, commit, hora, operaciones y resultado del rollback.

## Límites explícitos

Este documento y el script son preparación reproducible, **no ejecutan deploy, no cambian Vercel o Supabase y no prueban Android**. La aceptación por parte del dueño y Codex para operaciones sensibles sigue siendo necesaria.
