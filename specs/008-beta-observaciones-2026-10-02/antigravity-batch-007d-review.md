# B007d — review RPC previo a ejecución

RISK: HIGH
EVIDENCE_PROFILE: API | DB | SECURITY | MIGRATION
SOL_REVIEW: FULL_AFFECTED_DIFF
Mismo scope007d. No tests/SQL/servidores/subagentes todavía.

Bloqueantes precisos:
1. archive_grupo compara workspace con <>; NULL da NULL y IF no rechaza. Comparar
   IS DISTINCT FROM para rol/workspace/permiso/estado/alcance, actor inválido failclosed.
2. Query delegaciones sin filtro activa puede elegir historial revocado en vez de
   fila vigente. WHERE estado='activa' con rowlock; permisos/alcance explícitos y
   noFOUND rechazado, uniqueactive existente no ORDER/LIMIT arbitrarios.
3. Orden actual grupoFORUPDATE→delegacionFORUPDATE puede invertir configure:
   configure bloquea delegación y UPDATE grupo_id necesita FKkeyshare grupo.
   Para delegado resolver/lock delegación primero, luego grupo; revalidar actor y
   grupo dueño/no deleted bajo lock, permisos vigentes. Grupo ownership scope
   filtrado antes lock: no bloquear fila de workspace ajeno y recién luego negar.
   Owner omite delegación. Revisar orden con revoke deleg→users para evitar ciclo;
   no inventar prueba concurrencia verde: demostrarlocalo declararlimitación.
4. Tests nuevos harness `${timestamp}` está FUERA del beforeAll scoped const;
   usar fixtureMarker o Date.now propio. No seeds omitidas ni fallos escondidos.
5. service.remove valida resultado RPC success===true e id===solicitado, no !data
   ({} o {success:false} no deben mostrar éxito). Tests null/false/wrongID/error.
6. SQL011 añadir negativos actor.deleted/rolbuscador/nullworkspace/pending/IDs y
   historialrevocada+active legítima con IDsfixturepropios. SELECT/list dearchivados
   sigue oculto; attribution completa tras positives y negativa DB/logintactos.
   Nunca plantilla ONCONFLICT silencie fixtures ni políticas directas relajadas.
7. Tests010 helper roles test se quedantransaccionales. ConservardirectUPdeleted
   denegado/RPC permitido; unitstateaudit/perfilupdates y acciones anteriores intactos.

Entrega PREPARED<=1500 caracteres; SQL+code final listos review. No nuevos archivos
fuera alcance y no ejecutar remoto. Codex hará rojo/localmigration/verde pertinentes.
