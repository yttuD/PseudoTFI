# Investigación — feature 008

## Hechos aceptados reutilizados para planificación

Fuente: `evidence/004-unidades-api-discovery.md`, lote
`008-unidades-api-discovery-004` aceptado el 2026-10-03. Este extracto evita ampliar
el control de lectura de Pi; no constituye nueva exploración ni pruebas funcionales.

- `apps/api/src/unidades/unidades.controller.ts`: POST/GET `/unidades`,
  GET/PATCH/DELETE `/unidades/:id`, PATCH `/unidades/:id/estado`,
  POST `/unidades/:id/modalidades`, PATCH/DELETE
  `/unidades/:id/modalidades/:modId`, GET `/unidades/:id/alquileres`.
- `req.user.workspace_id` (`AuthenticatedRequest`) se usa como `gestor_id` en
  `UnidadesService.create`, `findAll` y `update` de
  `apps/api/src/unidades/unidades.service.ts`.
- `UnidadesController.findAll` filtra Delegados mediante
  `authzService.canReadUnidad`. Recuentos/paginación todavía requieren evidencia.
- `findOne`, `cambiarEstado`, `remove` y subrutas de modalidades dependen de
  `canManageUnidad`/`canReadUnidad` y RLS, sin workspaceId explícito al service.
  Esto es riesgo a verificar, no prueba de vulnerabilidad ni de aislamiento.
- `apps/api/src/unidades/dto/update-unidad.dto.ts`, `UpdateUnidadDto`:
  categoria, zona_id, grupo_id, atributos, titulo_es/pt/en, descripcion_es/pt/en,
  fotos, ubicacion_aprox, ubicacion_exacta, whatsapp, instagram,
  direccion_texto, auto_traducir.
- `createModalidad`, `updateModalidad`, `removeModalidad` realizan CRUD en
  modalidades_precio con borrado lógico. Duplicados históricos no se borran,
  fusionan ni ocultan automáticamente.

## Decisiones y límites vigentes

- Reutilizar este inventario para N01/N02/N03; no duplicar discovery vigente.
  Alternativa descartada: ampliar permisos del orquestador o repetir exploración.
- Preparar plan/tasks/analyze antes de implementar; no tocar scripts core.
- N01–N06 requieren identidades Auth reales y persistencia/recarga; N07/N08
  requieren UI real de grupos. Mocks no acreditan integración real.
- El inventario aceptado fue read-only: no probó RLS ni flujo funcional/UI,
  no cerró incidentes ni autorizó backfill remoto/Android. Autorizaciones humanas
  previas se conservan dentro de su alcance.
- Carlos delegó revisión visual a Antigravity: Playwright, capturas reales
  desktop/mobile y análisis por criterio. Sol evalúa el informe; análisis visual
  insuficiente requiere devolución humana en el chat. Constitución v2.1.1.

## Decisiones de diseño — 2026-10-04

- Agy directo mantiene Spec Kit y aceptación Codex: Pi bloqueaba fuentes/fases;
  se descarta modificar core para desbloquear tareas. Autorización humana registrada.
- Scope de Delegado antes de count/range, reutilizando DelegationConfiguration.
  Fuente: controller.findAll usa longitud de página como count; service ya filtra
  workspace. No scope cliente ni nueva fuente de permisos.
- Consulta Grupo desde listado; no endpoint adicional por inercia. GrupoFormModal
  solo POST y BentoGruposGrid no visualiza seña; discovery005 contrastado.
- Auth real aislado por signIn; no JWT manual/dev tokens ni cuentas de testers.
  SQL rollback prueba DB, no UI/Auth HTTP. Manifiestos y Node22.16.0 contrastados.
- N04/N05/N06 reutilizan interfaces existentes: marketplace, DeepL/WhatsApp y
  users full_name/phone. CuentaPage contrastada: email readonly, campos de privilegio
  no se incluyen en update. Sin nuevas entidades ni cambios de ADR.
- Servicios/identidades y acceso remoto son blockers de ejecución por comprobar,
  no ambigüedad de diseño ni razón para sustituir integración por mocks.
