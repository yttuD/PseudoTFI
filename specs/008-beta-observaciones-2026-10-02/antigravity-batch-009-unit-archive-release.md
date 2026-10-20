# B009 — Publicar archivado de unidades en beta

RISK: HIGH
EVIDENCE_PROFILE: API | DB | SECURITY | MIGRATION
SOL_REVIEW: FULL_AFFECTED_DIFF

## Autoridad y alcance

Carlos autorizó en este chat aplicar exclusivamente la migración
`20261008040000_unit_archive_rpc.sql` en Supabase beta y publicar la API compatible
en Git/Vercel. Codex aceptó el lote local previo; esto NO cierra N01 ni autoriza
otras migraciones, funciones nuevas, cambios Web, cuentas de testers o purgas.
Carlos mantiene la ejecución manual con Antigravity; este archivo no inicia procesos.

Proyecto: `D:/Programacion-Cosas/Proyecto_inmobiliaria/TFI`.
Repositorio: `https://github.com/yttuD/PseudoTFI.git` (comprobar rama y upstream).
Supabase permitido: `maeiuaketocznpogmtic` exclusivamente.
API beta: `https://rendo-beta-api.vercel.app`.
Web, sin redespliegue: `https://rendo-beta-web.vercel.app`.

## Entradas y aceptación ya revisada

- SQL aceptado: `supabase/migrations/20261008040000_unit_archive_rpc.sql`.
  SHA256: `88B17B290C030AADFB6D9ED0378B7D98D2DE33F45120EDCFEFBAAEAA4606601A`.
- Concurrencia local: `apps/api/test/test-concurrent-rental-archive.mjs`, SHA256
  `E480024CF7A3A7DCEA73F5F138113B8D363E1DA0DA58B8471724C82BEAA69FE3`.
- Matriz local: `apps/api/test/test-unit-archive-matrix.mjs`, SHA256
  `60A308632E3760B3F13F6D55FEB96BCC5764226093681517C04749E577FAD0B6`.
- Evidencia previa: `specs/008-beta-observaciones-2026-10-02/evidence/N01/deploy.md`
  y `failure-log.md`. Leer sólo secciones pertinentes, no todo el historial.

## Ejecución ordenada y criterios

1. Registrar baseline Git/index, autenticaciones disponibles sin valores secretos,
   proyecto enlazado e ID real del deployment/alias API actual. Preservar todo cambio
   ajeno. La API anterior documentada es `dpl_6EQBEFvG6JsUcPfJ9rFuTzcUswcm`;
   verificar vigencia, no asumirla. No reconfigurar agentes ni herramientas globales.
2. Verificar hash SQL, historial remoto y dry-run. Aplicar sólo si la única migración
   pendiente es `20261008040000` y el destino coincide. Si difiere, detenerse antes
   de mutar. Usar migración versionada/transaccional; no SQL manual que omita historial.
   No reaplicar si ya consta aplicada: verificar definición efectiva.
3. Confirmar historial y definiciones efectivas de `archive_unidad`, trigger asociado,
   función `check_unidad_active_for_rental`, search_path y grants. Conservar evidencia
   redacted. Paridad del historial no demuestra igualdad completa del esquema.
4. Construir candidato API aislado desde la fuente verificada del deployment actual.
   Cambiar únicamente `UnidadesService.remove` a la RPC aceptada y los imports
   indispensables. NO copiar el servicio completo del árbol sucio: contiene cambios
   ajenos de traducción, creación y modalidades. Si Git HEAD no coincide con la fuente
   publicada, no sustituir silenciosamente una por otra. Documentar baseline, manifiesto
   y diff exacto del candidato. Comprobar compilación y pruebas unitarias afectadas
   de éxito RPC, errores y alquiler activo; no repetir matrices locales ya aceptadas
   si no cambian sus entradas. Si hace falta nuevo código productivo, entregar para
   revisión antes de publicarlo.
5. Versionar y subir únicamente la migración aceptada, el cambio acotado del servicio,
   pruebas propias pertinentes y evidencia del lote. No staging amplio, secretos,
   sesiones, snapshots masivos, ni tests N02–N08. Preservar contenido local no incluido.
   Antes de push comprobar commits salientes y diff staged completo; no force-push.
6. Publicar candidato API con la configuración beta existente. Verificar READY y
   `/health/live`, `/health/ready` con 200 y `/unidades` sin sesión con 401. Confirmar
   fuente efectiva frente al candidato aceptado y destino del alias. No asumir que
   push provoca redeploy: la conexión Git automática no estaba acreditada. No crear
   ni mostrar bypass tokens; no desactivar protección. Si se promueve explícitamente,
   validar candidato antes del cambio de alias y volver a comprobar después.
7. Ante fallo de API, detener publicación/promoción y conservar el deployment previo.
   No revertir destructivamente la DB ni borrar datos: la migración es aditiva y la
   API anterior debe conservarse como recuperación operativa. Informar estado real.

## Evidencia y límites

Escribir evidencia en `specs/008-beta-observaciones-2026-10-02/evidence/N01/`
como `unit-archive-release.md` y actualizar el handoff compacto
`.specify/memory/PROJECT_STATE.md`. No declarar N01 cerrado.

Este lote no incluye nueva suite funcional remota, creación de identidades ni purga
de fixtures históricos. Esos pasos se preparan después de revisar esta entrega.
No se requieren capturas por un cambio exclusivamente API/DB; cualquier comprobación
visual añadida debe ser Playwright con evaluación de Antigravity, nunca de Codex.

RESULT_PACKET <=500 palabras: resultado por criterio, comandos/exit codes, hash SQL,
historial/definiciones/grants, diff stat y manifest del candidato, pruebas afectadas,
commit y push comprobado, ID/READY/fuente/alias del deployment, HTTP smoke, riesgos,
recuperación disponible y pendientes exactos. Logs completos quedan en artifacts.
