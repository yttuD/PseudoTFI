# Implementation Plan: Observaciones beta N01–N08

**Feature**: `008-beta-observaciones-2026-10-02` | **Checkout**: `codex/rendo-beta-deploy`
**Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)
**Estado**: diseño incremental; no acredita incidentes resueltos.

## Summary

Conservar arquitectura y correcciones presentes; cerrar cada incidente con regresiones,
Auth/DB real, Playwright desktop/mobile y publicación verificada. Orden N01 → N07/N08
→ N02 → N03 → N04 → N05 → N06. Un sub-lote no cierra automáticamente su incidente.

## Technical Context

- Node local v22.16.0 observado; pnpm@9 declarado. TypeScript estricto, no añadir any.
- Next14.2.35/React18/next-intl, Nest12, Supabase Auth/Postgres/RLS; sin modificar ADRs.
  Versiones con ^ son rangos declarados, no instalación comprobada.
- API Vitest (scripts test/test:e2e); UI Playwright. Config web actual usa mocks/dev
  tokens: nueva config real independiente, sin reemplazar suite existente.
- Vercel API/web beta y Supabase Rendo existentes. Pruebas de escritura en local
  aislado con identidades propias; no cuentas/datos de testers ni migraciones remotas
  implícitas. Solo servicios Rendo necesarios, un worker de pruebas.
- Targets desktop/responsive distintos; Android fuera de alcance. Sin inventar SLO:
  conservar disponibilidad/timeouts y coherencia de páginas/recuentos.

## Constitution Check (pre/post design)

Constitución2.1.1. FR/SC/roles intactos; permisos/dinero HIGH con diff afectado completo
y evidencia ejecutable. Público no expone datos privados. UI Playwright y análisis
de Agy (Carlos si insuficiente). Sin estados/ADRs/cupo nuevos, borrados físicos,
dependencias adicionales ni arquitectura paralela. Gates de diseño satisfechos;
los de ejecución se verifican por lote, no se infiere runtime de documentos.

## Project Structure

- API: `apps/api/src/{unidades,grupos,authorization,marketplace,auth}`.
- UI: `apps/web/src/components/gestor/{BentoGruposGrid,GrupoFormModal,UnidadForm}.tsx`;
  páginas `src/app/[locale]/(gestor)/mis-unidades`, `(marketplace)/unidades/[id]`,
  `(marketplace)/cuenta`; mensajes `apps/web/messages/{es,en,pt}.json`.
- Tests API src/**/*.spec.ts y test/**/*.e2e-spec.ts, web e2e/, SQL
  supabase/tests/004_delegado_scope_authorization.sql y 008_beta_group_description.sql.
- Feature: research/model/contracts/quickstart/tasks, evidencia por lote.

## Architecture and batches

### US1 / N01 — aislamiento operativo

UnidadesService.findAll ya aplica gestor_id antes de range. Controller Delegado
filtra después y usa filtered.length como total. Resolver contexto una vez; reutilizar
DelegationConfiguration existente, filtrar grupo_id o IDs explícitos antes de count/range
y conservar gestor_id obligatorio. Cuenta activa usa workspace; pendiente/revocado o
IDs vacíos devuelve cero, nunca fallback global. Scope solo servidor, no query cliente.
Orden estable. No modificar políticas públicas ni confundir inventario con marketplace.

N01a: paginación/recuentos con tests rojo/verde y Auth/DB real. N01b: detalle, estado,
modalidades, alquileres/escrituras, revocación/Ver/Gestionar y marketplace separados;
corregir defectos demostrados, no cerrar N01 solo con N01a. Cambios authz/RLS requieren
nuevo alcance HIGH; ninguna migración remota nueva sin autorización específica.

### US2 / N07–N08 — grupos

Reutilizar POST/GET listado/PATCH/DELETE y políticas de octubre. No nuevo GET por ID
sin necesidad. Presentar descripción completa/seña en detalle accesible desde listado
autorizado, recuperar por refresh. GrupoFormModal hoy solo crea, no abre ni edita.
Consulta usa datos existentes; edición adicional no es requisito para cerrar creación.
Seña inactiva muestra sin seña; activa porcentaje o monto ARS, nunca cobro.
Cuatro combinaciones de opcionales, validación DTO/service, errores y retorno inmediato.
Delegado crea solo gestionar/cuenta; lecturas según alcance; otro workspace denegado.

### US3 / N02–N03 — categoría/modalidades

Lotes separados. N02 Casa→Cancha guarda y recarga dos veces; no enviar atributos
incompatibles como actuales ni perder comunes. N03 PATCH conserva ID, POST solo
nuevas, DELETE lógico por ID; mapear modalidades_precio en editor y filtrar eliminadas
en editor/publicación. Doble submit/reintento no duplica. Históricos no se borran,
fusionan ni ocultan. Mantener monedas/precios manuales y modalidades mensuales/diarias/horarias.

### US4 / N04 — dirección

API marketplace y detalle: sesión válida ve dirección almacenada; anónimo solo
aproximación, nunca dirección/exacta en JSON/DOM/caché. Ausencia explícita, logout
invalida datos visibles privados. Regresión SupabasePublicAuthGuard; no ampliar gestión.

### US5 / N05 — idiomas

DeepL backend existente; probar servicio real sin leer/exportar Secret. Título y
descripción reales o pendientes por campo; falso [EN]/[PT] inválido; preservar manuales.
WhatsApp ES/EN/PT. Inventario acotado/backfill separado y bloqueado sin acceso/autoridad;
UI pendiente aceptada no cierra backfill. No escrituras remotas implícitas.

### US6 / N06 — perfil

CuentaPage usa users directo: solo full_name/phone propios; email readonly, rol/
workspace/cupo protegidos. UI vigente max120 nombre, max40 teléfono; conservar DB.
Gestor y Buscador (rol runtime Inquilino), dos recargas, errores y acceso cruzado
denegado. No guard de gestión para conceder acceso al perfil privado ajeno.

## Verification, dependencies and rollout

Integración local Auth real por signIn y DB migrada, credenciales en memoria/ignored
solamente. Si falta entorno: BLOCKED, no skip+PASS. pgTAP rollback complementa pero
no sustituye UI/API. Capturas375/1440 light/dark afectadas, vacío/error/éxito/solo
lectura; anchos intermedios donde variante cambie.

Antes de publicar: tests/lint/typecheck/build de alcance y dependencias; diff HIGH
completo, sin secretos. Staging por hunks si archivo ya sucio, commit atómico por fix.
Verificar Git Vercel, SHA/Ready/smoke; sin integración Git, deploy CLI autorizado del
mismo artefacto aceptado y declarar no automático. No desplegar dirty tree entero.
Rollback a deployment anterior sin reset local. Limpieza solo recursos de tarea.

## Complexity Tracking

Sin excepciones constitucionales. Blockers de ejecución bloquean gates afectados,
no eliminan criterios ni delegan decisiones de arquitectura.
