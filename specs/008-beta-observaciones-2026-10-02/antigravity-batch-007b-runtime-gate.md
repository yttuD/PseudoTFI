# B007b — defectos precisos restantes, preparación acotada

RISK: HIGH
EVIDENCE_PROFILE: UI | API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Write SOLO beta-real-runtime.mjs, beta-real-fixtures.ts,
beta_isolation_real.spec.ts, playwright.beta-real.config.ts y ui-runtime.md.
No repetir exploración del proyecto ni tocar producto, no tests/servers/remoto.
Entregar PREPARED<1500 caracteres, no enumerar archivos sin cambios.

Runner:
- CRÍTICO: execFileSync Playwright BLOQUEA eventloop del proxy en el mismoproceso.
  Reemplazar por spawn async+await promise close/error, agregar childProcs para
  cleanup. Rechazar código distinto0; no absorber failure. API/Next error spawn
  atendidos. Cleanup idempotente promise, portsfree obligatorios; taskkill solo
  childrenown que siguen vivos, no nombres globales; windowsHide true.
- API main escucha todasinterfaces. Seam test: trascompilar main.js generar
  main.local.js MISMO directorio sustituyendo SOLO la única llamada listen de
  main por host127.0.0.1. Validar match exactamente1 antes escribir; comparar
  sourcegeneratedregistro sin mostrar secretos. API correeseentry, producto
  src/main.ts intacto. No alterar guards/pipes/bootstrap restante ni flags.
- Compilador puede seguir síncrono ANTES iniciarproxy. Readiness yaok. Memoria
  Supabase/status nooutput y environment mínimo conservar.

Fixtures:
- acceptRes.error debe hacer throw aunque haya payload. Registrar vínculo propio
  para cleanup mediante delegaciones.select('id').eq('invitacion_id',ownID),
  NO invitaciones.delegacion_id (columna inexistente). Consultafallback SOLOcleanup,
  nunca convierteacceptfail en PASS. Config/revoke exigir success real/errornull.
- Quitar fallbackadmin directo en revoke: si RPCfalla FAIL, no simular revocación.
- Cleanup actual NO comprueba Auth/audit/links ni notif/outbox aunque afirma sí.
  Verificar auth.admin.getUserById404 cadaownID, audit porgestor IDs, links por
  delegacion IDs. Notificaciones por usuario_id propios; outbox esquema leer
  solamente sección tabla100-118 en migración20260925120000, filtrar por
  invitacion_id propios si esaFK; delete/verify antesusers. No borrar global.
  Si no creó filas esequery0 tambiénevidencia. Conservar trackers si falla.

Tests:
- CRÍTICO browser.newContext() SIN options usa1280x720 y SINbaseURL, ignora
  projectmatrix. Usar options {...testInfo.project.use} filtrados context válidos
  (viewport,colorScheme,baseURL) o fixture contextoptions explícitos; confirmar
  page.viewportSize anchoexacto porproject y temaactual .dark esperado. Theme
  init antesDOM puede documentElementNULL: SOLOlocalStorage inicial y luego
  comprobar themeprovider aplica clase, no fingir CSS; forzar light también.
  Cerrarcontext en finally incluso siassertFAIL. A/B separados preservar.
- Escenario2 prometeIDs pero OMITIDO. Añadir gestionar/unidades con unitA1:
  exactallowedvisible, A2/A3/Babsent, botonescreateforbidden y HTTPforbidden.
  Cuenta/grupo/ver/pending/revoked exactscope/count/DBassert respetar.
- No repetir matrizauthcompleta7veces: agregar proyecto auth-matrix1440light
  testMatch aislado vía grep @auth; visualproyectos grep @visual. Etiquetar
  esc1/3/4 @visual, esc2 @auth; capturas de tabla/readOnly mobiledesktop añadir
  dentrovisualescenario si corresponde sin mezclar exclusiones condicionalesPASS.
- Falloproxy reset try/finally statusassert, para que testfallido no contamine
  siguiente. Retryrecuperadoactualokay. Sin wait arbitrario ni mocks normales.
- data-testid pending/revoked: revisar layout real SOLOselectores. No inventar.
- Contexts default parámetros reales. Testbudget ajustarmatrizauth>60s si necesita,
  no sleeps ni retries paraocultarerror.

No ejecución hasta confirmación de Codex después de revisión de estos cambios.
