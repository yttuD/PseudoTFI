# B007e — ejecución terminal local

RISK: HIGH
EVIDENCE_PROFILE: API | UI | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Ejecutar SOLO si Codex autoriza expresamente esta etapa tras revisar preparación.
No leer tasks/historial/env/secrets; native files. No cambiar implementación ni
migraciones ni instalar dependencias ni publicar. Herramientas ya instaladas.

Preparar ÚNICAMENTE reporter JSON adicional a list en
apps/web/playwright.beta-real.config.ts, outputFile absoluto derivado de __dirname
para specs/008-beta-observaciones-2026-10-02/evidence/N01/playwright-real-results.json.
Conservar traces/video/screensauto off; no reportes con datos de sesión. No cambiar
tests/umbral/asserts/fixtures/runtime (salvo corrección exacta siguiente; defecto de infraestructura: informar,
no arreglar silenciosamente). Todos los procesos de prueba deben cerrar.

Corrección exacta autorizada antes pruebas en beta_isolation_real.spec.ts:
bgComposited debe iniciar [0,0,0,0], NO blanco opaco inventado que convierte
la comprobación de alpha final en tautología. Componer ancestros y FALLAR si
ninguno establece fondo efectivo opaco. Retornar contrastRatio SIN Math.round,
para que 4.499 no pase por redondeo a4.5 (redondear solo visualización). Nada más.

1. RunCommand Cwd apps/api (ruta absoluta):
   node node_modules/vitest/vitest.mjs run src/unidades/unidades.isolation.spec.ts
   node node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts test/beta-isolation.e2e-spec.ts
   Cwd importa: evita ejecutar copias baseline en .tmp. Guardar salidas como
   evidencia N01/api-range-runtime.md con conteos, exit y comandos reales.
2. Cwd repo:
   node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.build.json
   node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
   Si cualquiera FALLA, recuperar resultado FINAL y parar antes navegador.
3. Cwd repo: node apps/web/e2e/beta-real-runtime.mjs
   Esperar NATIVO CommandStatus/GetCommandOutput hasta FINAL; no entregar
   "aguardando", no abandonar tareas background ni arrancar un segundo runner.
   Máximo una ejecución. Ante fallo guardar datos y entregar FAIL, NO retocar
   assertions ni forceclick ni reintentar ocultando el primer resultado.
4. Abrir con view_file NATIVO las capturas REALES relevantes tras ejecución:
   desktop1440 light/dark, tablet768, mobile375 light/dark; inventario, tabla,
   readonly, error/retry y recuperación página. Revisar cada viewport por separado;
   informar rutas exactas abiertas, problema observable y severidad. No afirmar
   AA global: únicamente ratios medidos del badge si artifact lo demuestra.
   Si herramienta no disponible, decirlo y presentar imágenes a Carlos, no inventar.
5. Fixtures cleanup estricto y puertos libres deben constar. No detener servicios
   Rendo compartidos ni procesos ajenos. No borrar evidencia/baselines; al cerrar
   runner ninguna cuenta propia/delegación/unidad/grupo debe quedar pendiente.

Write permitido estas dos correcciones de medición, config reporter y evidencia N01/{api-range-runtime,ui-runtime,
failure-log,visual-review}.md más resultados/capturas automáticos. No Git/remoto.
RESULT_PACKET <=2500car: estado PASS/FAIL, conteos PASS/FAIL/SKIP, exitFINAL de
cada comando, reporter path, capturas analizadas, ratios, cleanup y límites.
Entrega terminal solo cuando TODOS los comandos propios hayan cerrado.
