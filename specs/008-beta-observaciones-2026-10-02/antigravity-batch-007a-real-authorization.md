# B007a — aislamiento API real restante

RISK: HIGH
EVIDENCE_PROFILE: API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
Task: T005 y T001 API; no cerrar T006/T007/N01 por este lote.
N01a findAll aceptado (12 unit/73 regresión/3 real, fuente prod tipos verde),
commit96b0b30. Fuente beta anterior reconciliada; publicación a cargo de Codex.

Mantener arquitectura productiva. Extender harness REAL existente (Auth/JWT/
PostgREST localhost, guard/controller/services directos) con:
- listado gestor A/B paginado; delegado cuenta/grupo/IDs explícitos; vacío,
  pendiente antes de configurar, revocado tras RPC; count y IDs exactos;
- detalle directo y negativas de update/estado/modalidades/alquileres fuera de
  workspace y scope. Delegado ver no escribe incluso en scope; gestionar solo
  en scope. Prueba positiva pertinente para no confundir denegar todo con seguro;
- grupos de workspace/alcance; evitar inventar GET por ID (no existe actualmente);
- verificar datos originales por DB tras cada escritura rechazada, sin modificar
  datos de usuarios ajenos. Marketplace público sigue separado (Supabase anon/
  servicio real si viable); no proyectar privados por atajo.

Read dirigido: este brief, spec US1/FR001-003/SC001, contrato Inventario, SECURITY_RULES;
harness existente y controller/service/DTO pertinentes de unidades/grupos/alquileres,
AuthorizationService/cupo/guard/SupabaseService/tipos/RPCs migraciones necesarios.
Grafo con coverage por archivo si disponible; completar líneas faltantes directamente.
No leer todo tasks/historia/otras features/env ni fuentes remotas de usuarios.

Write SOLO apps/api/test/beta-isolation.e2e-spec.ts y
specs/008-beta-observaciones-2026-10-02/evidence/N01/authorization-runtime.md.
Sin nuevo any, mocks de RLS/auth/dev tokens, firma JWT manual, policies alteradas,
instalaciones, code productivo, UI, git/deploy ni settings. Si defecto real exige
código, devolver FAIL reproducible y causa/puntero exacto para batch dirigido.

Mismos comandos exactos permitidos:
node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.e2e.ts apps/api/test/beta-isolation.e2e-spec.ts
node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json
Credential discovery supabase status -o json CAPTURADO en memoria del harness:
jamás imprimir/log keys/token, abrir .env o usar Supabase beta. Host localhost
revalidado antes seed/cleanup. Docker Rendo mínimo ya activo, no iniciar servicios
ajenos. Fixtures nuevas incorporadas a cleanup comprobado por IDs específicos,
errores no ignorados, SQL/Auth ausencia esperada versus error real. Si se revoca/
crea, fixtures de positive tests también limpiadas incluso setup/operación parcial.

Entrega: RESULT_PACKET <=2500 caracteres, cada grupo criterio PASS/FAIL/BLOCKED,
comandos/exit reales, negativos y positivos, hashes/entorno/cleanup, limitaciones
direct-call versus HTTP y causas precisas de defectos. Logs quedan locales seguros.
No declarar UI/producción/nuevo fix/N01 cerrado; visual real queda B007b.
