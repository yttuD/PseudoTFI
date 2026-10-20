# B007b — corrección mínima final antes del runtime

RISK: HIGH
EVIDENCE_PROFILE: UI | API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Solo edición de runtime.mjs/fixtures.ts/beta_isolation_real.spec.ts bajo
apps/web/e2e y evidence/N01/ui-runtime.md. No producto/historial/global/git/remoto.
Read solo funciones afectadas y este brief. No servidores/tests todavía.
Usar herramientas NATIVAS de archivos/edición; no RunCommand ni wrappers shell.
Si faltan, declarar BLOCKED con acción exacta, nunca SUCCESS vacío.

1. killProcessTree condición proc.exitCode!==null || proc.signalCode!==null
   debe OMITIR esePID ya cerrado; proc.killed NO acredita salida por taskkill.
   cleanup memoizar Promise única, llamada doble reutiliza mismoresultado, sin
   taskkill repetido ni masking. Mantener portsfreefail, children propios.
   Environment web fijar TAMBIÉN NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS='false':
   test-adapter usa OR con AUTH_ALLOW_DEV_TOKENS y .env.local podría activarlo.
   API WEB_ORIGINS='http://127.0.0.1:3200' para CORS real duranteformularios.
2. Fixture cleanup añade queries ausencia (NO solo delete) para:
   delegacion_unidades por own trackedDelegacionIds; log_acciones porgestorIDs;
   notificaciones por own usuarioIDs; email_delivery_outbox por recipient_user_id
   y reference_id invitacionespropias. Acumular errores real y rows>0fail.
   Auth ausencia SOLO authErr.status===404 y usernull, no substringnotfound;
   unexpectederror/nullambiguousFAIL. Eliminar TODOS los nuevos any: catchunknown
   -> instanceof Error, AuthError.status está tipado. No cambiar otros fixtures.
3. acceptPayload.success===true y delegacion_id obligatorio; delRow SOLOtracking
   para cleanup, no fallback de éxito. Config/revoke data.success===true. Revisar
   que ID retorno se trackea aunque lookupfalle; errorlookup no falsePASS.
4. Spec ContextA/B baseURL/viewport correcto ahora, agregar assertions exactas
   page.viewportSize ancho project.use.viewport.width y clasehtml.dark esperada
   antes screenshot. NO nombres de proyecto como prueba del viewport real.
   LocalStorage init light/dark para context pagefixture también en beforeEach.
   Botón Nueva Unidad está DUPLICADO cabecera+barra. Evitar strictlocatorFAIL con
   .first() en checks de existencia (negativos siguen locator completo).
   capturas tabla y readonly al menos mobile375/desktop1440 dentro @visual con
   roleselector real. No editarBento ni selectors inventados.

PREPARED<=1200caracteres. Sin ejecución; Codex revisa estas funciones y habilita
runnercerrado, después Agy hará debugging/pruebas/capturas en siguiente batch.
