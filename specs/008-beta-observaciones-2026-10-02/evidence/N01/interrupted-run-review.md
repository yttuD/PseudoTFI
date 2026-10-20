# B007e navegador: ejecución incompleta y recuperación, 2026-10-05

No aceptada la UI. Agy reportó CANCELED para task204 tras reinicio de su servidor.
El proceso local continuó fuera del seguimiento del agente: su log registra tests
hasta el28, antes de cerrarse la instancia idle. No hay reporter JSON final ni
exit global válido. NO convertir progreso parcial en PASS29/29.

Fallo concreto del auth-matrix (error-context.md, test358):
expect([data-testid="access-context-error"]).toBeVisible timeout10s tras revocar.
Snapshot DOM muestra dashboard independiente, no el error esperado. Esto por sí
solo NO demuestra filtración de workspace. La función vigente revoke_delegacion,
migration20260925120000 líneas1546-1624, revoca la relación y restaura users.rol a
gestor/workspace_idNULL; AuthorizationService.resolveAccessContext trata ese
perfil como gestor propio. La prueba debe verificar aislamiento respecto al
antiguo gestor y contexto propio, no exigir deshabilitar toda la cuenta. Pendiente
corrección dirigida y ejecución completa real; no relajar políticas ni permisos.

API aceptada por separado en55b8e19, unit21/21 y Authdirect34/34. Las cuatro pruebas
directas no reemplazan la integración HTTP ni este caso de reasignación de perfil.

Recuperación ejecutada por Codex tras no recibir entrega Agy en8m:
- Puertos3200/1/2 sin listeners comprobados tras cerrar SOLO CLIidle61824 propio.
- Antes de recuperar:3Auth sintéticos b007b_*@local.test; baseline anterior0.
- Simulacro:2gestores+1delegado,4unidades,2grupos,1invitación,1delegación.
- URLs estrictamente localhost; emails/prefix/timestamp/roles y relaciones
  validados; cero escrituras durante simulacros fallidos.
- Se reutilizó cleanup estricto de BetaRealFixtureManager, sin cambios a esa
  clase ni nuevos borrados globales. node .tmp/rendo-b007e-recovery.mjs --apply
  informó cleanupPASS/ownFixturesRemaining0 y verificó ausencia DB/Auth404.
- Solo datos ficticios locales eliminados; son recreables. Ningún usuario real,
  esquema remoto, otro servicio o evidencia fue borrado.

Limitación CLI: una segunda invocación mientras la primera está activa reinicia
el servidor y puede cancelar el seguimiento. No volver a solapar instancias.
Recuperación Agy también agotó timeout8m con respuesta vacía, no se acepta como
trabajo completado. Próxima delegación debe ser mínima, sin logs completos.

La preparación mínima posterior B007f también agotó timeout4m, respuesta vacía;
test2.6 y artifact review siguen sin cambios/ausente. No nuevos tests ni procesos
de este intento. Requiere recuperación del ejecutor o permiso humano de fallback;
no continuar invocaciones costosas sin una entrega utilizable.15 permisos propios
temporales retirados, resto preservado. Fixtures eliminados son datos sintéticos
recreables; no hay nueva entrega UI aceptada ni publicación beta.
