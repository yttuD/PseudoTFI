# B007e — fallos reales del panel / página fuera de rango

RISK: HIGH
EVIDENCE_PROFILE: UI | API | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Active T005/T006; fuente spec008 FR001-003/017 SC001/008 sin nuevos requisitos.
Run1 B007b:29 tests,14PASS/15FAIL; error-context.md confirma dos strictselectors,
PostgREST PGRST103 (API422) y dock tapa Siguiente768. Baseline exact14archivos en
.tmp/rendo-b007e-baseline. No historial/tasks, nativefiles, nunca leer .env/secret.
Preparación SOLAMENTE; NO ejecutar comandos/servidores/Git/remoto/subagentes.

Writeexact:
- API unidades.service.ts SOLO findAll manejo rangevacío; unidades.isolation.spec.ts
  y beta-isolation.e2e-spec.ts SOLO pruebas range/scope relacionadas.
- Web inventory-loader.ts; BentoGruposGrid.tsx; QuickActionsDock.tsx;
  mis-unidades/page.tsx SOLO contraste de badge si medición lo justifica;
  messageses/en/pt SOLO claves nuevasInventario; beta_isolation_real.spec.ts.
- Evidence N01/ui-runtime.md y failure-log.md; nuevos tests relacionados si
  imprescindibles dentro mismas suites, no migraciones/políticas/cuotas/otrosformularios.

1. RECHAZADO fallback loader: trata CUALQUIER422/416 comopágina vacía si getpage1
   traecount. Eso OCULTAfallos genuinos. Quitar ese bloque. Resolver API PGRST103
   exactamente: countscope debe seguir antespaginación/workspace obligatorio,
   allowedempty siguefailclosed. Si errorPGRST103 y offset>0 recuperar conteo HEAD
   con mismas restricciones deworkspace/grupo/IDs/deleted, rango0-0 o queryequiv.
   Retornar200 data[]/countauténtico/page/limit SOLOsi conteovalidado confirma
   from>=count. Countnull/negativo/error deconteo o cualquierotroerror ->422,
   no inventar0 ni relajarSELECT/RLS. No adminclient/no getall+filterJS.
   Precisión: Head sobre queryBuilder no debe heredar offset9999; limpiar rango
   sin perderwhere/order. No duplicarotrosmétodos ni nuevoany.
   Tests unit con countnull/metadata scoped y errorrealPGRST103, otrasfallasNO
   vacío; integraciónAuth/DB page9999 ownerA/B y delegadogrupo/IDs/count1 vs2.
2. UI out-of-range count>0: contador0/total noInventarioVacío, navegación siempre
   recuperable con enlace DIRECTO primera página; nunca miles deAnterior9998.
   No "Página9999de1" sin explicar estado. Mensaje/enlace localizados. Testclick
   recuperación→primera página datoscorrectos, no reduciraceptación.
3. Dock overlay: corregir QuickActionsDock wrapper en FLUJO despuésdelcontenido
   (sigueanimaciónFloatingDock y mismoslinks); no fixed solapandoacciones. Ajuste
   acotado delwrapper, no ocultarfeature ni modificarFloatingDock/layout global,
   no forceclick tests. Testclickreal a768px y desktop/mobile afectados.
4. Selectors: ediciónIDs usar linkexactotítulo o .first en existencia dehref con
   accesoautorizado (doslinks legit); alertInventory filtrar heading/textocomponente,
   no tocar __next-route-announcer__ ni eludirerror. MantenernegativasDB completas.
5. VisualAA anterior SIN ratios es afirmación no demostrada. Documentar límite.
   Badge readonly text#B89355 sobreclaro es riesgo: preparar mediciónPlaywright
   computedforeground/background reales (composite si alpha) para texto/botones.
   Si falla4.5:1 usar tokensnavytext enlight/gold en dark sin cambiarpaleta. Nada de
   mirarimágenesSol. Agy view_file multimodal sí analizarádesktop/mobile al ejecutar.

EntregaPREPARED<=2000 caracteres; diffstat y decisiones/riesgos. NO testsPASS
inventados ni nuevaejecución hasta review. Ejecución siguiente debe usar CommandStatus
nativo para ESPERAR resultadoFINAL de RunCommand (no entregar "aguardando" ni
abandonar backgrounds). Debe guardar resumenJSON delreporter comoartifact además
de RESULT_PACKET; logs completofuera contexto, nuncacredenciales.
