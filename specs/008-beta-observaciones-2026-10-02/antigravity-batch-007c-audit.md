# B007c — trigger auditoría con tipos de filas distintos

RISK: HIGH
EVIDENCE_PROFILE: DB | SECURITY | MIGRATION
SOL_REVIEW: FULL_AFFECTED_DIFF
Descubierto B007a rojo26/27: update grupo autorizado rechaza SQLSTATE42703,
record old has no field estado. Relación N01/T005 y N07-N08, no cerrar UI.

Read SOLO brief y SECURITY_RULES, función audit_operational_mutation y triggers
en supabase/migrations/20260925120000_delegado_scope_authorization.sql:1075-1181,
schemas de cinco tablas, fixture SQL pertinente tests004/008, harness/evidenceB007a.
Sin historial/tasks/env/secrets remoto. Grafo si útil no exploración extensa.
Hipótesis ordenadas: expresión OLD.estado en AND resolve un campo inexistente
incluso con TG_TABLE_NAME no unidades; drift schema; denegación RLS. Rojo existente
SQLSTATE42703 indica primera; minimizar con update grupos en SQL transaccional.

Write SOLO:
- supabase/migrations/20261005010000_operational_audit_record_fields.sql (nuevo)
- supabase/tests/010_beta_operational_audit.sql (nuevo)
- evidence/N01/audit-runtime.md (feature008)
- apps/api/test/beta-isolation.e2e-spec.ts SOLO reafirmar audit log/negative DB
  en caso exitoso previo si necesario (sin quitar pruebas ni redacciones engañosas)
No editar migración ya aplicada. Crear reemplazo puntual función con invariantes:
misma firma/security definer/search_path'', actor/workspace/recurso/acción/metadata,
INSERT UPDATE SOFT_DELETE unitstate DELETE y atomicidad. No disable/remove trigger,
permisos/policies nuevos, client logs ni EXCEPTION WHEN OTHERS que ignore fallos.
Sólo lectura segura de columnas existentes (rama interna sólo unidades o extracción
JSON segura tipada), evitar depender de cortocircuito SQL sobre OLD.estado.

Primero entregar migración+test, sin ejecutarlos hasta revisión Codex del SQL.
Tests transaccionales BEGIN/ROLLBACK pgTAP con UUIDs propios únicos/no conflicts
silenciados; auth actor usando fixture JWT claims SQL (declarado no Auth real),
no mod users/permisos producción. Test rojo antes migración (no migraciónoldedit):
updates de grupos, inquilinos, modalidades_precio, alquileres sin estado y unidades
con estado; real schemas verificar qué campos existen. Cada caso assert persistencia
y auditoría actor/rol/gestor/recurso/acción correctos, unitstate metadata old/new,
soft-delete y updates mismosestado actionupdate; cliente no insertar/editar/borrar
audit rows ni cruzar workspace; audit failure rollback/no mutación parcial si viable
sin debilitar producto o triggers globales. Sin afirmar covers no probado.

Codex ejecutará rojo/localmigration/verde sólo después revisar SQL; no CLI db push,
db reset, servicios nuevos ni ejecutar SQL arbitrario. Supabase remoto requiere
autorización humana aparte: NO acceder ni aplicar remoto. Cleanup rollback SQL,
fixtures harness porIDs comprobados, registros temporales propios.
Entregar RESULT_PACKET <=2000 caracteres PREPARED, paths/SHA, regresión propuesta,
causa/riesgos. No iniciar subagentes, no reconstruir contexto ni repetir typechecks
preexistentes; un lote, fuente acotada, sin logs grandes. Un helper breve si necesario.
