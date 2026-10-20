# B008/B009 — grupo consultable y creación real

RISK: HIGH
EVIDENCE_PROFILE: UI | API | DB | SECURITY | MONEY
SOL_REVIEW: FULL_AFFECTED_DIFF
T008-T011. Activar después de B007b aceptado; no ejecutar simultáneamente.

Read: este brief, contrato Grupos/transversal, DOMAIN/SECURITY/DESIGN_RULES según
alcance; componentes/DTO/service/controller/RPC/policies/tests directamente afectados.
No tasks/historial/env remotos. Baseline SHA/copia local antes de cada edición.

Write:
- apps/api/src/grupos/grupos.service.spec.ts y grupos.controller.spec.ts
- apps/api/test/beta-isolation.e2e-spec.ts SOLO tests de grupos si necesarios
- apps/web/src/components/gestor/BentoGruposGrid.tsx y GrupoFormModal.tsx
- apps/web/src/components/gestor/GrupoDetailsDialog.tsx (nuevo)
- apps/web/messages/es.json,en.json,pt.json SOLO claves propias
- apps/web/e2e/beta_groups_real.spec.ts (nuevo)
- apps/web/e2e/beta-real-fixtures.ts/runtime.mjs/config beta-real SOLO añadir
  selección cerrada de suite groups y fixtures/cleanup propios, no comandos libres
- evidence/N07-N08/runtime.md y captures/ sin sesiones/datos de usuarios reales
No migración/RLS/code API productivo/cupo/secrets/git/deploy/settings. Defecto nuevo
productivo debe reproducirse y devolverse FAIL para lote acotado, no workaround.

Implementación UI:
1. GrupoItem incluye sena_default_activa/tipo/valor tipados. Dialog accesible de
   consulta con nombre+descripción COMPLETA o ausencia, seña porcentual/fija ARS
   o explícito sin seña. Abrir desde tarjeta y grupo de tabla cuando relevante,
   independiente de poder editar. Datos ya listados autorizados, NO nuevo endpoint.
2. Form nombre trim obligatorio max100 (DTO no exige2), descripción opcional max500;
   textarea accesible/contador si útil. Seña OFF por defecto, activa>0, porcentaje<=100,
   fija ARS. Inline validation, aria-invalid/describedby, errores claros/pending,
   no doble submit, no cierre/éxito en fallo. Nuevo texto es/en/pt.
3. Base UI Dialog actual NO Radix: render={<Button/>}, Close render, foco retorna
   al trigger, Escape; propio cierre localizado showCloseButton=false si preciso.
   Tokens navy/gold existentes light/dark; alturas44 en select/checkbox label/inputs.
   Descripción extensa/valores/idiomas no cortados en mobile; modal scroll correcto.
4. Consultar configuración no equivale a cobro ni bloqueo calendario. No cambiar
   herencia monetaria/alquiler ni unidades existentes al mostrarla.

Tests/evidencia:
- DTO class-validator nombre100/101, descripción500/501; opcionales válidos y tipo,
  service activar0/negativo/>100 rechazados, fijo y porcentaje válidos, OFF0 válido,
  update merge actual activo + patch parcial no evade validación; errores DB failclosed.
  Mocks UNIT claramente etiquetados, no sustituyen integración. No nuevo any.
- Auth/HTTP/DB real usando runtime B007b: cuatro combinaciones descripción/seña,
  porcentaje y fija; usuarioA crea en UI y reload2 conserva consulta exacta, B nunca
  ve A; delegado cuenta gestionar crea, ver/grupo/IDs no crea. GET scoped visible,
  negar crossworkspace payload/inserción; comparar DB con IDs propios sin tokens.
  Esquema/policies locales ya reflejan migraciones beta, NO tocar servidor remoto.
- Formularios invalid/errors/pending, cerrar/Escape/teclado, desktop1440/mobile375
  y768/1024/light/dark afectados. Agy abre imágenes y emite análisis concreto; si
  falta herramienta visual = BLOCKED, paths para Carlos, no inferir estética por DOM.
- Cleanup DB/Auth de todas las fixtures y procesos hijos en finally, ausencia
  comprobada, localhost seguro, RAM mínima. Artefactos relevantes retener, trash propio
  borrar solo tras entrega técnica aceptada. Mantener tests originales no relacionados.

Comandos habilitará Codex por ejecución cerrada: API vitest pertinentes, API/Web tsc,
runner beta-real --suite groups tras review de su selección fija y lint afectado.
RESULT_PACKET <=2500 caracteres, criterios separados N07 vs N08, comandos/exit,
baseline/final hashes, capturas/análisis, limitaciones/cleanup. No publicar.
