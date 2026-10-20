# B007e — recuperación tras interrupción CLI

RISK: HIGH
EVIDENCE_PROFILE: SECURITY | API | UI
SOL_REVIEW: FULL_AFFECTED_DIFF

PREPARACIÓN solamente; NO comandos/backgrounds/tests/Git/remoto/subagentes.
Native read/write. No historial/tasks/env/secrets. Sol verificó puertos3200/1/2
libres tras cerrar su CLI idle61824; quedan3 Authusuarios ficticios b007b_@local.test
de esta ejecución. Antes del run había0, no datos reales propios.

1. Leer nativamente log de tarea interrumpida
C:/Users/carlo/.gemini/antigravity-cli/brain/61720065-5a16-4418-a50d-ef01406a85d7/.system_generated/tasks/task-204.log
y apps/web/test-results error-context solo del auth-matrix actual. Extraer EXACTO
fallo: expected/received, assert/línea/status/caller. No inferir causa por títulos.
Guardar N01/failure-log.md distinguiendo runanterior29(14/15) vs actualCANCELED
(primer authFAIL, suiteincompleta), sinAA/PASSinventado ni cambios deproducto.
2. Crear .tmp/rendo-b007e-recovery.mjs, no ejecutarlo. Reusar cleanup estricto
de BetaRealFixtureManager existente (apps/web/e2e/beta-real-fixtures.ts), cargar
el módulo TS con TypeScript transpile instalado en memoria/CommonJS y resolución
desde apps/web/e2e; no nueva dependencia ni modificar fixtures. Capturar statusCLI
local en memoria con ruta explícita supabase.ps1, nunca imprimir claves; URLlocal
OBLIGATORIA. Recuperar SOLAMENTE Auth emails b007b_*@local.test, verificar máximo3
esperados y roles, obtener IDs sintéticos; elegir gestor_ids de esos propietarios
para recuperar unidades/grupos/invitaciones/delegaciones, IDsuser propios para
delegados. Cargar tracked arrays públicos completos y delegar manager.cleanup().
No borrar por patrón global SQL ni usar .neq('id', '') ni cualquier filtro vacío.
Modo predeterminado DRYRUN sin escrituras, imprime conteos e IDs sintéticos
resueltos para review; --apply explícito vuelve a validar inventario exacto y
ausencia de elementos ajenos, ejecuta cleanup y verificaciones existentes. Si
usuarios !=3 o scope ambiguo FAIL y no borrar. No eliminar caches/evidencia.
3. Entrega <=1800 caracteres PREPARED con causa real/fuente y estrategia de
scope/cleanup/risgos; sin ejecutar ni decir ya limpio.
