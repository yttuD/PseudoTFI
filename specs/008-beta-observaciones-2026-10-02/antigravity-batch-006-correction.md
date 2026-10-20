# B006 — revisión técnica: corrección acotada

RISK: HIGH
EVIDENCE_PROFILE: CODE | API | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
Continúa el mismo lote/modelo/entorno/permisos; no reconstruir historia/spec/tasks.

Entrega anterior NO aceptada; AC2/AC3/AC5 requieren corrección:

1. Nuevos `any` siguen en unidades.isolation.spec.ts: mockAuthzService y dos
   dependencias constructor del servicio. Importar tipos AuthorizationService,
   CupoService, TraduccionService y tipar casts, sin `any` nuevo.
2. Fallo delegado-read-authorization.spec.ts es **inducido por el cambio de contrato**,
   no preexistente. Se amplía escritura SOLO al mock/findAll/assert de ese test:
   servicio devuelve inventario ya scoped; verificar resolveAccessContext una vez,
   scope como cuarto argumento y ausencia de N+1. No quitar negativas ni debilitar
   aislamiento. Preservar tests create/update/findOne ajenos.
3. Orden no determinista ante created_at idéntico: agregar desempate `id` estable
   a findAll y testear dos órdenes. Harness crear empate explícito entre A1/A2,
   verificar mismas páginas al repetir y conjunto exacto sin duplicados.
4. Controller: si request delegado obtiene actor distinto o scope ausente, NO caer
   a consulta de cuenta completa; fail-closed (vacío o Forbidden). Test negativo.
5. Cleanup: Supabase retorna {error} sin throw. afterAll actual ignora errores y
   los catches los silencian: no acredita cleanup. Comprobar TODOS los resultados,
   intentar cleanup restante aunque falle uno, verificar IDs creados ausentes y
   hacer fallar suite si queda residuo/error. Verificar también usuarios Auth.
   Retener IDs creados aun si setup parcial falla. No logs error crudos/JWT.
   No borrar fixtures ajenas. Quitar fallback npx: CLI supabase ya instalado,
   no instalaciones implícitas. Revalidar localhost antes de cleanup.
6. Evidencia: corregir etiquetas preexistente/PASS falsas; indicar test real de
   guard/controller/services directos, NO HTTP ni AppModule completo. Registrar
   fingerprints de fuentes y exitcode real de typecheck; errores ajenos no son
   typecheck verde. AC3 acepta suite relevante verde y cero nuevos errores de
   tipos con problemas base claramente abiertos, no afirmar build global apto.

Write: mismo scope B006 + adaptación puntual
apps/api/src/authorization/delegado-read-authorization.spec.ts. No ampliar código
productivo fuera findAll. Evidence/N01/pagination.md refleja estado final real.
Commands exactos ya habilitados: unit, regression, real, types del brief original.
Después última edición ejecutar los cuatro; no reescribir docs SDD ni deploy/git.
RESULT_PACKET <=3000 caracteres: cada AC, resultados reales, límites y riesgos;
artifacts íntegros seguros y cleanup comprobado. No declarar N01 cerrado.
