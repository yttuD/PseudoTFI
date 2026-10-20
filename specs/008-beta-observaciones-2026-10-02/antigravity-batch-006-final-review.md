# B006 — último gate técnico

RISK: HIGH
EVIDENCE_PROFILE: CODE | API | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
No nueva exploración. Mismo alcance del brief de corrección.

Revisión Codex: suite relevante repetida independientemente 73/73 exit0. Controller
fail-closed correcto, filtros antes de rango correctos. Dos defects aún bloquean:

1. `typeof orderedBuilder.order` y cast se agregaron al código productivo para
   acomodar mocks viejos. PostgREST soporta segundo order; usar cadena directa
   `.order('created_at',...).order('id',...)` sin test-only feature detection/casts.
   Se amplía escritura SOLO al builder/order de findAll en
   apps/api/src/unidades/unidades.observaciones.spec.ts para mock thenable/chain
   compatible. No modificar assertions/create/update/modalidades ajenos.
2. Cleanup aún ignora error de log_acciones.delete y de TODAS las consultas de
   ausencia, incl. Auth.getUserById. Fallos de red/permisos no prueban ausencia.
   Verificar errores del delete y del select, delegaciones/invitaciones/logs también.
   Auth ausente solo error esperado user_not_found/404, otro error falla. Intentar
   todos los pasos aun si uno arroja (helper seguro acumula código/etiqueta, no
   credenciales/error crudo). Si setup falla antes de config y sin IDs, no cleanup;
   si parcial, limpiar IDs conocidos. No aumentar scope de borrado.

Después última edición correr cuatro comandos exactos ya permitidos y comando
adicional exacto aprobado: node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.build.json
Tipos general preexistentes permanecen abiertos, pero tipos fuente productiva deben
ser verdes antes de publicar. Evidencia conserva rojo histórico real y resultados
vigentes separados; números de líneas NO son firmas/hash de fuentes. No afirmar
full build global HTTP ni UI ni N01 cerrado. Sin git/deploy/settings.
RESULT_PACKET breve con tests/exit reales y paths modificados; no historial/logs.
