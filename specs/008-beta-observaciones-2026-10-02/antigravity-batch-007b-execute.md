# B007b — ejecución cerrada tras preflight técnico

RISK: HIGH
EVIDENCE_PROFILE: UI | API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

PREPARE revisado por Codex: runnerloopback, scopefuente y cleanup funcional
permiten EJECUTAR, no implican aceptación de resultados. No productoaceptado aún.
Baselines007b exactos y contexto de aceptación en briefs007b; leer SOLOeste brief,
archivos afectados necesarios y DOMAIN/SECURITY/DESIGN_RULES secciones relevantes.
No tasks/historial global ni secrets reales. Cuatroservicios Rendo locales activos,
migracionesaudit/archive ya LOCAL. No remoto/Git/deploy/settings/install/subagentes.

Comandos exactos permitidos desde raíz:
- node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
- node apps/web/e2e/beta-real-runtime.mjs
Lanzar primero tipos y luego runner. Si comando innecesario no autorizado, evitarlo;
si necesario, BLOCKED con texto EXACTO del comando en RESULT_PACKET, no SUCCESSvacío.

Write test/runner/fixtures/config y scopeproducto ORIGINAL007b exclusivamente:
inventory-loader.ts, InventoryLoadError.tsx, mis-unidades/page.tsx,
BentoGruposGrid.tsx, messages es/en/pt soloInventario, evidence/N01/ui-runtime.md/
captures. Debugging solo defectos DEMOSTRADOS en esas rutas: no broadrewrites.
Nueva falla fuera de scope explicar causa+ruta y BLOCKED; no workaround.

Verificar Auth/HTTP/DB/Navegador reales, sin tokensdev ni route mocks normales;
fallosSSR proxy marcadosinyección. Tipos/build o cleanupfallos son FAIL, no "PASÓ".
Capturas propias viewport/themeexactos: Bento/tabla, sololectura, errores, páginas
y mobile/desktop. Añadir captura de páginaactual paginación cuando corresponda.
Abrir REALMENTE imágenes con herramienta visual nativa y analizar layout/foco/
legibilidad/overflow/contrast/estados; existencia/DOM no es análisisvisual. Si no
tienes esa herramienta devolver BLOCKED_VISUAL y paths exactos para Carlos.
No inspeccionar archivos .env ni credentials, no mostrarpassword/token ni captura
login. Snapshotdescribe emailslocaltest siaparecen no datosusuariosbeta.

Cleanup todosIDs propios comprobado porDB/Auth, cerrar processesown en finally,
puertos3200/3201/3202 libres; NO procesos por nombre ni otrosproyectos. Conservar
capturas/evidencia, no basura nuevas dependencias. Leer logs únicamentefallosespecíficos.
RESULT_PACKET<=2500 caracteres concomandos/exit/count, AC porcriterio, changedpaths,
hashes/entorno, capturas + herramientausada/análisis, cleanup/riesgos. No afirmar
N01 terminado ni beta actualizada. Reporte terminal, Codex revisa; no shadowing.
