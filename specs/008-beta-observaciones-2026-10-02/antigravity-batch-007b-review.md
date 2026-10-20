# B007b — preparación rechazada, corrección dirigida

RISK: HIGH
EVIDENCE_PROFILE: API | DB | UI | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
Mismo read/write scope B007b, no ejecución hasta revisión runner. No subagentes.
Baseline EXACTO Codex .tmp/rendo-b007b-baseline-exact/apps/web, no usar snapshot
reconstruido nativo que cambió &amp; a &. Hashes pueden esperar, no shell nuevo.

Problemas concretos de entrega (no riesgos hipotéticos):
- Fixture .from('usuarios') NO existe: tabla users; Auth trigger genera perfil. No
  upsert rol delegado. Crear gestores metadata role/full_name, comprobar users y
  generar delegado por invitación+accept/configure RPC reales. Reusar patrones
  probados en apps/api/test/beta-isolation.e2e-spec.ts. NO firmarJWT/devcookies.
- Unidad NO tiene tipo_espacio/direccion_calle/numero/latitud/longitud. Usar columnas
  reales categoria/direccion_texto/ubicacion según DTO o fixture mínima del harness.
- Nunca signIn con supabaseAdmin: cambia su sesión y rompe bypass cleanup. Cliente
  Auth ANON NUEVO separado por actor, error/session/assert token obligatorio.
- Login real es /es/auth/login?portal=gestor&next=/mis-unidades. No /es/login/panel.
  Leer selectors reales y next routing, no inventar. Scope delegado no es rol suelto.
- Constructor fixtures valida loopback/keys antes deSDK; sin fallback a.env remoto,
  error si falta. Cleanup acumula errores y verifica ausencia tablas propias/Auth,
  incluso setup parcial. Nada de clear() IDs antes checks, catch/ignorar o delete
  sin revisar error. Log/invitación/delegación/unidades/grupos/usuarios propios.
- Runner NO npx ni instalación. Usar node rutas locales de tsc/Next/Playwright y
  Supabase CLI instalada (Windows .cmd shim necesita lanzamiento seguro revisado,
  status captured en memoria, no error.message con stdout de keys). Error sin URLs
  secretas/commandoutput. API tsconfig.build.json, no fulltests tsconfig que falla;
  outDir .dist-beta-real/no incremental, main.js salida real. Cwd API sin .env;
  usar .tmp ownruntime si necesario (fuera de source env) con código apioutdir.
- Flags EXACTOS API/web: AUTH_ALLOW_DEV_TOKENS=false y NEXT_PUBLIC=false,
  RENDO_BETA_MODE=false, PAYMENTS_ENABLED=false,FISCAL_ENABLED=false,DEEPL_AUTH_KEY='';
  Next API_ORIGIN/NEXT_PUBLIC_API_URL/WEB_PUBLIC_URL loopback3201/3200 coherentes,
  RENDO_BUILD_DIR=.next-beta-real, NODE_ENV dev apropiado; no service key en envWeb.
  No heredar keys proveedor/envflags globales sin quitar override explícito.
- Bind Next -H127.0.0.1. Readiness API /health/ready status200+payloadstatusok,
  NO catch(()=>true), no404como listo. Child spawn error handlers/finallytreecleanup,
  sólo rootPID propio activo y descendientes; Windows oculto. Verificarpuertoslibres
  despuésstop; no ignorarcleanupfailure. Tests env NEXT_PUBLIC_API_URL3201, no3001.
- page.route no afecta fetchSSR; usar proxy local SOLO faultcase, routeupstream real
  para normales, fault /unidades o/grupos sólo escenario separado. Puede extender
  runnerproxy puerto3202 con controls localinmem explícitos sin authheaderslogs,
  no acceso remoto. No mocks claimedreal; control restaura finally.

Código UI:
- groupsResult.ok=false todavía muestra inventario vacío/gruposvacíos: ERROR si
  cualquiera falla, no clasificar unidades asignadas como sin grupo por falloload.
- Payload malformado debeINVALID_PAYLOAD: no inventar count=data.length ni aceptar
  array sin contrato deunidades; count/page/limit enteros finitos/rangos connooverflows.
  Missinggrupos data NO []implícito deéxito. Count>0 página vacía NOinventariovacío,
  navegacióna página1 siguevisible; queryno parseInt('2bad') válido (usarstrictdigits).
- Claves Inventario añadidas NO usadas: getTranslations/useTranslations para TODOS
  textos afectados/errores/navegación/grupopagina/counters/newactions. Nuevohelper
  errores codificados no hardcodedESUI. Guardar mensajes anteriores sin reformat global.
- Tabla scroll teclado foco accesible, role/aria-label+tabIndex dondecontener útil.

Suite:
- No `if visible` para aceptar badge ni `if token` omite negativos. Assertpositivos
  imprescindibles; failure notskip. GestorB login real separado y exactIDscount。
- Delegado cuenta/grupo/IDs/ver/gestionar/pending/revoked real RPC, creación según
  permisos; directHTTP detail/estado/modalidades/alquileres negatives constatusreal,
  DBintacta. Marketplace público real + privada/deleted negativas. Vacío real.
- 1024 falta y light/dark falta. Configlocalbrowser instalado Edge(channelmsedge)
  como previos, 375/768/1024/1440matrixafectada. Names testInfo/project/actor/theme/state
  no reescribir imagen1440 desde375; CAPTURES_DIR actual../../../specs terminaapps/specs
  incorrecto: ir reporoot desdee2e ../../.. luego specs. Screenshotfailure puede mostrar
  logincredentials: desactivar automática, capturar sólo post-loginestados útiles.
- Análisisvisual porAgy usando herramienta real; si no disponible BLOCKED, paths
  verdaderos para Carlos. No aceptar DOM como estética. Preparación NOsin riesgos.

Entrega sóloPREPARED<=2000caracteres; ejecutar comandos sólo tras aviso deCodex.
Prioridad runner/fixtures reales ycorrectos, luego UI/testcompletos. Noagentesparalelos.
