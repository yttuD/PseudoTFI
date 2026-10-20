
## Hallazgos aceptados — 008-unidades-api-discovery-004 (2026-10-03)

Registro del RESULT_PACKET recibido y de la aceptación vigente indicada en el handoff. Este registro no constituye una nueva ejecución de pruebas ni una aceptación integral de la beta.

### Interfaces actuales para preparar N01/N02/N03

Fuente: `apps/api/src/unidades/unidades.controller.ts`.

| Método y ruta | Handler | Línea informada |
| --- | --- | --- |
| POST /unidades | create | 36 |
| GET /unidades | findAll | 56 |
| GET /unidades/:id | findOne | 81 |
| PATCH /unidades/:id | update | 92 |
| PATCH /unidades/:id/estado | cambiarEstado | 107 |
| DELETE /unidades/:id | remove | 122 |
| POST /unidades/:id/modalidades | createModalidad | 133 |
| PATCH /unidades/:id/modalidades/:modId | updateModalidad | 148 |
| DELETE /unidades/:id/modalidades/:modId | removeModalidad | 164 |
| GET /unidades/:id/alquileres | getAlquileres | 179 |

**Scope workspace:** el controller obtiene `req.user.workspace_id` mediante `AuthenticatedRequest`; el service lo usa como `gestor_id` de `unidades`. El resultado informa uso explícito en `apps/api/src/unidades/unidades.service.ts`: `UnidadesService.create`, `UnidadesService.findAll` y `UnidadesService.update`. Además, `UnidadesController.findAll` filtra los resultados de Delegados mediante `authzService.canReadUnidad` (L67 del controller), según el contraste externo con el source actual. Para `findOne`, `cambiarEstado`, `remove` y las subrutas de modalidades, informa dependencia de `authzService.canManageUnidad`/`canReadUnidad` en controller y de RLS, sin pasar `workspaceId` al service. Esa dependencia es un riesgo a verificar, no prueba de una vulnerabilidad ni de aislamiento efectivo. El filtro de Delegados no acredita pruebas de paginación, recuentos ni RLS.

**Edición:** tipo `UpdateUnidadDto` en `apps/api/src/unidades/dto/update-unidad.dto.ts`: `categoria`, `zona_id`, `grupo_id`, `atributos`, `titulo_es/pt/en`, `descripcion_es/pt/en`, `fotos`, `ubicacion_aprox`, `ubicacion_exacta`, `whatsapp`, `instagram`, `direccion_texto`, `auto_traducir`.

**Modalidades:** CRUD sobre `modalidades_precio` y soft delete, según `UnidadesService.createModalidad`, `UnidadesService.updateModalidad` y `UnidadesService.removeModalidad` en `apps/api/src/unidades/unidades.service.ts`. No se autoriza borrar automáticamente tarifas duplicadas preexistentes.

### Evidencia y límites

- AC1 figura PASS en el resultado aceptado: rutas, origen del scope, campos y limitación concreta. `interface-index` figura con código de salida 0; ese comando identifica interfaces, no verifica funcionalidad.
- Discovery sin modificaciones: `changedFiles`, `diffStat` y `scopeViolations` vacíos en el resultado recibido. No se repitieron verificaciones en este registro documental; no se ejecutaron pruebas funcionales ni UI.
- Se corrigieron en este registro las referencias imprecisas del paquete: se retiraron líneas/rangos del service y DTO no contrastados y se usaron nombres concretos de funciones/tipos como referencias estables. Se incorporó el filtro de Delegados informado por el contraste externo, sin reescribir el paquete.
- No se probó RLS directamente en DB ni aislamiento multi-tenant con dos cuentas reales en Supabase remoto; tampoco hubo validación visual ni comprobación de persistencia tras recarga.
- N01–N06 siguen bloqueadas para verificación operativa con dos cuentas reales y recarga; N07–N08 requieren UI real de grupos. Los fixtures locales no acreditan integración remota.
- Continúan bloqueados `sdd-context-validation-001` y la acreditación del handoff de `sdd-context-facts-002` hasta evidencia real aceptada.
- Este lote no ejecutó ni amplía autorización para backfill/Secrets/Android. No revoca autorizaciones humanas anteriores. Se conservan los riesgos de catálogo y traducciones EN/PT pendientes.

### Siguiente acción de planificación

Usar estas interfaces para continuar la planificación de N01/N02/N03 en `specs/008-beta-observaciones-2026-10-02`, contrastando el alcance con `issues.md` y separando cambios locales de verificaciones operativas bloqueadas. Este registro no completa el plan, no cierra incidencias y no habilita converge. No se solicita otra fase en esta ejecución.
