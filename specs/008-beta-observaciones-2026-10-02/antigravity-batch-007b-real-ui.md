# B007b — inventario y runtime navegador real

RISK: HIGH
EVIDENCE_PROFILE: API | DB | UI | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
Tasks: T001 web,T006; T007 publicación Codex. No cerrar N01 sin aceptación.

Read SOLO este brief, DESIGN_RULES, SECURITY_RULES, contrato Inventario y transversal;
fuentes afectadas y dependencies dirigidas. No tasks/historial/env/secrets remotos.
Antes de escribir, registrar SHA256 baseline de TODOS los write paths existentes en
evidence/N01/ui-runtime.md; guardar copias locales ignoradas para diff exacto.

Write permitidos:
- apps/web/src/app/[locale]/(gestor)/mis-unidades/page.tsx
- apps/web/src/components/gestor/BentoGruposGrid.tsx
- apps/web/src/components/gestor/InventoryLoadError.tsx (si necesario, nuevo)
- apps/web/src/lib/inventory-loader.ts (helper tipado si útil, nuevo)
- apps/web/e2e/beta-real-runtime.mjs, beta-real-fixtures.ts (nuevos)
- apps/web/playwright.beta-real.config.ts (nuevo)
- apps/web/e2e/beta_isolation_real.spec.ts (nuevo)
- apps/web/messages/es.json,en.json,pt.json SOLO nuevas claves pertinentes
- specs/008-beta-observaciones-2026-10-02/evidence/N01/ui-runtime.md
- evidence/N01/captures/ (capturas sin datos personales o sesiones)
No cambiar API/policies/cupo/otros formularios/shared layout ni settings/git/deploy.

Corregir sin rediseñar:
1. fetch actual devuelve [] en error/timeout2s: distinguir error vs empty y éxito,
   no inventar permisos/datos/demo fallback. Mostrar error claro con reintentar sin
   acciones basadas en datos incompletos; timeout razonable compatible coldstart.
   No registrar tokens/headers ni cuerpos privados en errores.
2. Paginar GET /unidades explícito page/limit usando contrato {data,count,page,limit}.
   Total autorizado = count. Links accesibles anterior/siguiente, query validada.
   Mostrar número mostrado/total y grupos/unidades de página sin afirmar grupo
   global vacío cuando sus unidades estén en otra página. No cargar todo por atajo.
3. Grid actualmente muestra creación grupo/unidad con !isReadOnly aunque delegado
   gestionar/IDs no puede crear, y gestionar/grupo no crea grupos. Props explícitas
   canCreateGrupo/canCreateUnidad resueltas por servidor; failclosed defaults;
   conservar edit permitida solo unidades listadas. No permitir escalada por cliente.
   Mantener readonly, bento/tabla, marketplace separado y ARS para gestor.
4. Nuevas/afectadas etiquetas usan i18n es/en/pt, tokens actuales navy/gold light/dark.
   Accesibilidad WCAGAA, focus/teclado, targets44px, mobile no overflow documental
   (tabla horizontal acotada puede tener scroll accesible). No ampliar scopes.

Runtime nuevo sin mocks ni sesión inventada:
- Driver node captura supabase status -o json EN MEMORIA, validate loopback antes
  de seed/cleanup. Config Playwright NO viejo global.setup/.auth ni traces/video.
- API REAL compilada de src actual mediante tsc prod, outdir aislado ignorado
  apps/api/.dist-beta-real; levantar puerto3201 y Next dev3200 con local keys/env
  en memoria. Both AUTH_ALLOW_DEV_TOKENS=false, NEXT_PUBLIC=false, beta=false
  (release config rechaza localhost), pagos/fiscal false, DEEPL_AUTH_KEY vacía.
  Nada de .env lectura manual, producción Supabase, keys/token en logs/artifacts.
  Arrancar con cwd sin .env y env explícita; Next puede cargar config normal pero
  overrides local deben ganar. Verificar hosts efectivos. Puerto ocupado = no matar
  procesos ajenos, error claro. Un worker, memoria limitada Next1024MB/API512MB.
- Fixtures exclusivamente propias GestorA/GestorB/Delegado, Auth real create/signIn,
  RLS usuario/roles locales, invitación/accept/configure/revoke RPCs existentes.
  Cliente inicia sesión en UI login REAL (no browser.addCookies token inventado).
  Test fixtures inmem, credentials no persistidas. afterAll/finally limpian IDs propios
  en DB/Auth y comprueban ausencia aun fallo; procesos solo hijos propios stop.
- Verificar A/B inventario y recuentos, scopes cuenta/grupo/IDs y ver/gestionar,
  pending/revoked, creación visible sólo cuando permitida, páginas limit1 por URL
  si implementado o fixture > page size. Direct HTTP negatives con JWT real para
  detail/state/modalidades/alquileres; pipeline guard/pipes real, registrar status
  sin tokens. Marketplace anon muestra públicas, no privadas, no mezcla gestión.
- Error/vacío tests: fixtures propias vacías; error del inventario por API local
  proxy/fault injection explícita SOLO escenario negativo separado (no confundir
  con integración normal real). Sin page.route SSR falso. Registrar qué está simulado.
- Capturas reales 375/768/1024/1440 light/dark inventario relevante, tabla/readonly/
  error/empty/public donde difiere comportamiento (deduplicar estados, justificar).
  Antigravity DEBE abrir y analizar imágenes con herramienta visual disponible,
  informe concreto por criterio desktop/mobile. Si no tiene herramienta visual,
  marcar visual BLOCKED y entregar paths para Carlos, NO aceptar por DOM solamente.

Comandos nuevos propuestos exactos (Codex habilita después de revisar runner):
node apps/web/e2e/beta-real-runtime.mjs
node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
node apps/web/node_modules/next/dist/bin/next lint --dir apps/web
Runner usa cwd apps/web para playwright CLI, config beta-real, e2e spec B007b,
sin shell interpolada; no install ni background oculto no supervisado. Si runner
requiere comando todavía no habilitado, entregar preparación y solicitar ejecución,
no seguir improvisando comandos amplios. No ampliar permisos tú mismo.

RESULT_PACKET <=2500 caracteres: criterio PASS/FAIL/BLOCKED, diffstat,
tests exits, fuente hashes, local Auth/DB vs simulados, capturas+análisis, riesgos,
cleanup. No logs completos, no afirmar publicación/N01 cerrado.
