# B007b — preflight dirigido final

RISK: HIGH
EVIDENCE_PROFILE: UI | API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Mismo scope007b. PREPARED solamente: no ejecutar runner/tests/servidores todavía.
No Git/remoto/subagentes/config global ni lectura de secrets. Baseline exact007b.

Corregir defectos observados en segunda entrega:
1. Fixtures RPC inventada configure_delegado_access. Leer configure_delegacion
   real y sus cinco args: p_delegacion_id, p_permiso, p_alcance_tipo,
   p_grupo_id (solo grupo), p_unidad_ids (solo unidades). Leer invitaciones
   esquema real y accept payload: no insertar columnas inexistentes. Configuración
   y aceptación verificadas, token nunca impreso. Admin separado de sesiones.
2. Cleanup verificar ausencia ALL IDs propios DB/Auth, invitaciones/delegaciones/
   links/audit/notificaciones/outbox que efectivamente genere el flujo. Leer
   schema y cleanup del harness beta-isolation; no tablas/campos inventados.
   Si acceptance falla registrar delegation por consulta propia de invitation_id
   antes cleanup para no dejar vínculo; acumular errores, no falsePASS.
3. Runner Windows execFileSync .cmd sin shell no funciona. Resolver CLI instalado
   (supabase.ps1 por powershell -NoProfile -File, ruta conocida validada, o
   paquete cli ya instalado). No npx/download. Environment OS mínimo PATH,
   SYSTEMROOT/TEMP/COMSPEC para hijos; sin heredar secretos/provider keys.
   Mantener auth/beta flagsfalse y localhost. API_ORIGIN debe llevar proxy3202
   cuando frontend SSR use esa variable; tests HTTP directos3201 explícitos.
   API loopback: verificar main actual escucha host? No cambiar main fuera scope;
   documentar si escucha red y proponer seam test revisable, no afirmar loopback.
   Readiness Web exigir 200 de login, cleanup idempotente/errors failrunner,
   manejar error spawn y conservar no-kill ajenos. Service key solo API/test.
4. Tests A/B usar CONTEXTOS nuevos/cookies separados. Tema dark real app vía
   storage/cookie/themeprovider compatible, no asumir colorScheme basta.
   Añadir gestionar/cuenta, gestionar/grupo, gestionar/IDs (unidades allowed y
   forbidden exactas, botóncreate segúnscope), pending/revoked failclosed.
   Negativas HTTP authenticated POST/PATCH prohibidas comprueban DB intacta.
   No skip condicional. Pending/revoked login espera ruta restricción real no
   loginViaUI normal forzando mis-unidades. Fixture método opciones explícitas.
5. Escenario error: resetproxy con statusassert y sin catchsilencioso; después
   clickRetry comprobar recuperación con inventario real. Cubrir fallogrupos,
   out-of-range page y límites inválidos. Matriz usar 1440/1024/768/375,
   desktop/mobile light/dark. No duplicar TODO authmatrix sieteveces: separar
   auth exhaustive desktop y visual representativo porproject sin debilitar AC.
6. Visual: capturas postlogin propias sin claves. Análisis REAL por Agy con tool
   imagen disponible, layout/foco/contrast/overflow/estados por viewport/theme.
   Si no hay tool, declarar BLOCKED_VISUAL; no análisis fingido desde DOM.
7. Producto inventoryloader fallback3201 es test-specific: preservar puerto
   default REAL del proyecto baseline (ver páginas previas); no testconfig en
   producto. Payloadunits/grupos validate contratos reales. I18n nueva scope.

Entrega compactaPREPARED, diffstat, riesgos y próxima ejecución exacta. No decir
resuelto mientras no se ejecuten runtime real/capturas/cleanup.
