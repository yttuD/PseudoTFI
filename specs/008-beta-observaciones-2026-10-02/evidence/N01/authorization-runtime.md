# Evidencia de Autorización y Aislamiento en Runtime (B007a / T005 / T001)

- **Fecha**: 2026-10-04
- **Lote**: `specs/008-beta-observaciones-2026-10-02/antigravity-batch-007a-real-authorization.md`
- **Revisión**: `specs/008-beta-observaciones-2026-10-02/antigravity-batch-007a-review.md`
- **Perfil de Evidencia**: API | DB | SECURITY
- **Harness**: `apps/api/test/beta-isolation.e2e-spec.ts`
- **Estado**: PREPARED (Harness y suite corregidos según review B007a/B007c; pendiente de ejecución post-migración local).

---

## 1. Naturaleza y Limitaciones del Harness Direct-Call

- **Tipo de Ejecución**: Invocación directa de instancias NestJS (`SupabaseAuthGuard`, `UnidadesController`, `GruposController`, `AlquileresController`, `MarketplaceController`, y Services asociados).
- **Autenticación e Infraestructura**: Tokens JWT reales emitidos por Supabase Auth localhost (`signInWithPassword`), clientes PostgREST reales (`anonClient`, `clientGestorA`, `clientDelegado`, `adminClient`) y base de datos local Postgres con RLS activo.
- **NO es HTTP e2e**: No atraviesa el listener TCP ni el middleware router de Express, ni ejecuta pipes de transformación (`ValidationPipe`), ni prueba la serialización de respuestas HTTP ni comportamiento en navegador.
- **Excepciones de NestJS**: Los rechazos observados son excepciones directas de NestJS (`NotFoundException`, `ForbiddenException`), no códigos de estado HTTP ni payloads JSON serializados sobre la red.
- **Invitaciones de Fixture**: La invitación del delegado de prueba se insertó directamente en la tabla `invitaciones_delegados` (para retener control exacto de IDs de fixture), y luego fue aceptada mediante el RPC transaccional real `accept_delegado_invitation`.
- **Diferenciación de Alcance Vacío**:
  - *Grupo vacío*: Grupo legítimo sin unidades asociadas (`p_alcance_tipo = 'grupo'`, `p_grupo_id = grupoVacioId`). Configuración aceptada por el RPC `configure_delegacion`, resultando en `count: 0, data: []`.
  - *IDs vacíos*: Alcance unidades sin IDs (`p_alcance_tipo = 'unidades'`, `p_unidad_ids = []`). Rechazado formalmente por el RPC `configure_delegacion` con la excepción `'El alcance por unidades requiere al menos una unidad seleccionada'`.

---

## 2. Hashes SHA256 de Archivos Afectados

- `apps/api/test/beta-isolation.e2e-spec.ts`: `0de3fd067cff0d13e91144828c34c0897c51b54b6cf8b844d2fc7c50270aaeb4`
- `apps/api/src/unidades/unidades.controller.ts`: `8ca4082587e5fe5c7a28fdf616d2d1fbf74da9c606958f342154b5e2cf965845`
- `apps/api/src/authorization/authorization.service.ts`: `313eebf7ed89d98a8d0c714f5934d559ad5cfd2fa2be7fdb0974e8acd399ab81`
- `apps/api/src/grupos/grupos.controller.ts`: `da1fd10cfc469a8fafb4092d30eb888eea0429e13da02e59a157d31c9a4a14cd`
- `apps/api/src/alquileres/alquileres.controller.ts`: `85535bb8d48cc51e2a6c1c1adfc3d6c668677fba9dec41cfe8d7b8b00ab36e41`

---

## 3. Matriz de Cobertura y Resultados de Criterios

### Criterio 1: Listado Paginado Gestor A/B y Aislamiento Multi-Tenant
- **Gestor A**: Ve exactamente sus 4 unidades operativas (3 publicadas + 1 borrador) con recuento total constante de 4 a través de paginación (`limit: 2`, `page: 1` -> 2; `page: 2` -> 2). Excluye soft-deleted y `unitB1`.
- **Gestor B**: Ve únicamente su unidad (`unitB1`), recuento 1, ID y titularidad exactos.
- **Resultado**: `PASS`

### Criterio 2: Ciclo de Vida y Alcances del Delegado en Listado
- **Pendiente antes de configurar (`aceptada_sin_configurar`)**: `count: 0`, `data: []`.
- **Alcance Grupo (`grupoAId`)**: `count: 2`, IDs exactos `[unitA1, unitA2]`. Paginación `limit: 1` con orden determinista ante empate de `created_at`. Excluye `unitA3`, `unitABorrador`, `unitADeleted`, `unitB1`.
- **Alcance Cuenta**: `count: 4`, IDs exactos `[unitA1, unitA2, unitA3, unitABorrador]`. Excluye `unitADeleted` y `unitB1`.
- **Alcance Unidades explícitas (`[unitA1]`)**: `count: 1`, ID exacto `unitA1`.
- **Alcance Grupo vacío**: `count: 0`, `data: []`.
- **Resultado**: `PASS`

### Criterio 3: Detalle Directo (`findOne`) y `getAlquileres`
- **Gestor A**: `unitA1` retorno exitoso (status teórico 200); `unitB1` excepción `NotFoundException` (status teórico 404).
- **Gestor B**: `unitA1` excepción `NotFoundException` (status teórico 404).
- **Delegado (grupo A)**: `unitA1` retorno exitoso (status teórico 200); `unitA3` excepción `NotFoundException` (status teórico 404); `unitB1` excepción `NotFoundException` (status teórico 404).
- **`getAlquileres`**:
  - Gestor A sobre `unitA1` -> retorno de alquileres (status teórico 200); sobre `unitB1` -> excepción `NotFoundException` (status teórico 404).
  - Gestor B sobre `unitA1` -> excepción `NotFoundException` (status teórico 404).
  - Delegado sobre `unitA1` (en scope) -> retorno exitoso (status teórico 200); sobre `unitA3` (fuera de scope) -> excepción `NotFoundException` (status teórico 404); sobre `unitB1` (fuera de workspace) -> excepción `NotFoundException` (status teórico 404).
- **Resultado**: `PASS`

### Criterio 4: Delegado 'ver' Rechaza Escrituras en Scope (Verificación DB)
- **Rechazos observados (llamadas directas)**:
  - `update(unitA1)` -> excepción `NotFoundException` (status teórico 404). DB `titulo_es` verificado sin mutación (`expect(dbErr).toBeNull()`).
  - `cambiarEstado(unitA1)` -> excepción `NotFoundException` (status teórico 404). DB `estado` intacto (`publicada`).
  - `createModalidad(unitA1)`, `updateModalidad`, `removeModalidad` -> excepción `NotFoundException` (status teórico 404). DB modalidades intacta (count: 1, precio: 50000, `deleted_at: null`).
  - `alquileres.create` -> excepción `ForbiddenException` (status teórico 403). Sin alquileres nuevos en DB (count: 1).
  - `alquileres.update`, `alquileres.remove` -> excepción `NotFoundException` (status teórico 404). DB `deleted_at: null`, observaciones sin cambio.
- **Gestor B sobre A1**: `update` unidad y `update` alquiler rechazados con excepción `NotFoundException` (status teórico 404). DB verificada intacta.
- **Resultado**: `PASS`

### Criterio 5: Delegado 'gestionar' Positivo y Límites de Mutación
- **Positivo**: Delegado con `gestionar` sobre grupo A actualiza `unitA1` (`titulo_es: 'Depto A1 Modificado Autorizado mkt_...'`, `auto_traducir: false`) -> retorno de registro mutado (status teórico 200). Persistencia en DB verificada con `adminClient`.
- **Negativas fuera de scope y workspace (llamadas directas)**:
  - `update(unitA3)` -> excepción `NotFoundException` (status teórico 404). DB intacta.
  - `cambiarEstado(unitA3)` -> excepción `NotFoundException` (status teórico 404). DB intacta.
  - `createModalidad(unitA3)` -> excepción `NotFoundException` (status teórico 404). DB intacta.
  - `update(unitB1)`, `cambiarEstado(unitB1)`, `createModalidad(unitB1)` -> excepción `NotFoundException` (status teórico 404). DBs intactas.
- **Resultado**: `PASS`

### Criterio 6: Aislamiento y Permisos de Grupos (Gestor y Delegado)
- **Gestor A**: Ve `[grupoA, grupoVacio]`. Gestor B ve `[grupoB]`.
- **Gestor B sobre Grupo A**: `update` rechaza con `NotFoundException` (status teórico 404); `remove` rechaza con `ForbiddenException` (status teórico 403). DB intacta.
- **Delegado en Grupo**: Ve únicamente `[grupoA]`. `create` rechaza con `ForbiddenException` (status teórico 403); `update` en grupo vacío rechaza con `NotFoundException` (status teórico 404); `remove` rechaza con `ForbiddenException` (status teórico 403).
- **Delegado en Unidades explícitas (`[unitA1]`)**: Ve únicamente `[grupoA]` (grupo contenedor de la unidad delegada); no ve `grupoVacio`. `create` rechaza con `ForbiddenException` (status teórico 403); `update` rechaza con `NotFoundException` (status teórico 404).
- **Delegado en Cuenta (permiso ver)**: Ve `[grupoA, grupoVacio]`. `create` rechaza con `ForbiddenException` (status teórico 403); `update` rechaza con `NotFoundException` (status teórico 404).
- **Delegado en Cuenta (permiso gestionar)**:
  - `create`: Crea grupo exitosamente (`Grupo Creado Delegado ...`).
  - `update`: **FAIL REPRODUCIBLE** (ver Sección 4; resuelto en B007c con migración audit).
  - `remove` (B007d): Cubrimiento añadido para borrado positivo por Gestor y Delegado cuenta vía RPC `archive_grupo`, y negativas para Delegado ver/unidades y Gestor B.
- **Resultado**: `FAIL` (debido a defecto real de base de datos en update)

### Criterio 7: Aislamiento de Alquileres
- **Gestor A**: `findOne` -> retorno exitoso (status teórico 200).
- **Gestor B**: `findOne` -> excepción `NotFoundException` (status teórico 404); `findAll` excluye alquiler de Gestor A; `remove` -> excepción `NotFoundException` (status teórico 404). DB `deleted_at: null`.
- **Resultado**: `PASS`

### Criterio 8: Marketplace Público y PostgREST Anónimo
- **Marketplace Público**: Retorna unidades públicas; payload NO proyecta columnas operativas privadas (`gestor_id`, contratos, inquilinos, log_acciones).
- **Filtro de Privacidad**: Ni la unidad `borrador` ni la unidad `soft-deleted` aparecen en el marketplace. Marcador único en memoria (`fixtureMarker`) y `limit: 50` garantizan aserción sobre IDs propios exactos.
- **PostgREST Anon**: Verificación previa de cliente sin sesión en memoria (`auth.getSession().session === null`). Consulta anónima restringida a los 3 IDs de prueba (`unitA1`, `unitABorrador`, `unitADeleted`) entrega exclusivamente `unitA1` (publicada activa) y excluye `unitABorrador` y `unitADeleted`.
- **Resultado**: `PREPARED - PENDIENTE NUEVA EJECUCIÓN` (suite corregida; pendiente de ejecución post-migración local).

### Criterio 9: Revocación de Delegado al Final de la Suite
- **RPC `revoke_delegacion`**: Ejecutada al final de la suite.
- **Efecto Inmediato**: Delegado revocado obtiene `count: 0, data: []` en `findAll`, excepción `NotFoundException` (status teórico 404) en `findOne(unitA1)`, excepción `NotFoundException` (status teórico 404) en `getAlquileres(unitA1)`, y `data: []` en `gruposController.findAll`.
- **Resultado**: `PASS`

---

## 4. Defecto Real del Producto Detectado (FAIL Reproducible)

- **Falla**: `UnprocessableEntityException: record "old" has no field "estado"`
- **Operación**: `GruposService.update` invocado cuando un usuario autenticado (Gestor o Delegado con token JWT) actualiza un registro en `public.grupos`.
- **Puntero Exacto**: `supabase/migrations/20260925120000_delegado_scope_authorization.sql:1122`
- **Causa Raíz**:
  El trigger `trg_audit_grupos` (línea 1168) está asociado a `AFTER UPDATE ON public.grupos` y ejecuta la función `public.audit_operational_mutation()`.
  En la línea 1122 de dicha función:
  ```sql
  ELSIF TG_TABLE_NAME = 'unidades' AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
  ```
  En PL/pgSQL, la variable `OLD` adopta el tipo de la tabla sobre la cual disparó el trigger (`public.grupos`). Al evaluar la condición compuesta, el motor de PostgreSQL intenta resolver el atributo `estado` sobre el registro `OLD`. Dado que la tabla `public.grupos` no posee una columna denominada `estado`, PostgreSQL aborta la ejecución con el error de catálogo `record "old" has no field "estado"` (SQLSTATE 42703).
  El fallo también se reprodujo en modalidades_precio e inquilinos. Alquileres
  sí posee estado y no reprodujo42703. Resultados actuales30/30 y limitaciones
  en group-archive-review.md; estos FAIL/PREPARED describen ejecuciones históricas.
- **Comportamiento en Harness**: No se modificó el código productivo ni se debilitó el test; el fallo se reporta como defecto bloqueante para el batch correspondiente.

---

## 5. Limpieza Exhaustiva de Fixtures (Verificación Post-Cleanup)

El bloque `afterAll` ejecutó la eliminación ordenada y verificó la ausencia en TODAS las tablas propias mediante consultas directas con captura individual de errores:
1. `alquileres`: 0 residuos (`adminClient.from('alquileres').select('id').in('id', ...)`)
2. `inquilinos`: 0 residuos (`adminClient.from('inquilinos').select('id').in('id', ...)`)
3. `modalidades_precio`: 0 residuos (`adminClient.from('modalidades_precio').select('id').in('id', ...)`)
4. `delegacion_unidades`: 0 residuos (`adminClient.from('delegacion_unidades').select('delegacion_id').eq('delegacion_id', ...)`)
5. `delegaciones`: 0 residuos (`adminClient.from('delegaciones').select('id').eq('id', ...)`)
6. `invitaciones_delegados`: 0 residuos (`adminClient.from('invitaciones_delegados').select('id').eq('id', ...)`)
7. `unidades`: 0 residuos (`adminClient.from('unidades').select('id').in('id', ...)`)
8. `grupos`: 0 residuos (`adminClient.from('grupos').select('id').in('id', ...)`)
9. `log_acciones`: 0 residuos (`adminClient.from('log_acciones').select('id').in('gestor_id', ...)`)
10. `users`: 0 residuos (`adminClient.from('users').select('id').in('id', ...)`)
11. `auth.users`: 0 residuos (`adminClient.auth.admin.getUserById` con status 404 esperado para los 3 usuarios de prueba).
- **Resultado del Cleanup**: Éxito total sin residuos de fixture en la base de datos local.
