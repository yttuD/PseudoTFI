# Validación y publicación incremental

1. Confirmar baseline sucio/lote permitido. No imprimir .env, keys ni auth storage.
2. Supabase Auth/Postgres/PostgREST local Rendo, API y Next; excluir servicios pesados.
   Identidades aisladas A/B/Delegado por Auth real. Verificar localhost antes de seed/
   cleanup; credentials en memoria/ignored; no cuentas de testers ni bases ajenas.
3. Tests dirigidos rojo/verde: pnpm --filter api test / test:e2e.
   Typecheck: node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json.
4. Playwright real: node apps/web/node_modules/@playwright/test/cli.js test --config=apps/web/playwright.beta-real.config.ts.
   Config a crear en T001; no existe aún. Config mock no acredita Auth real. Capturas
   por criterio/actor/viewport/theme y análisis visual Agy.
5. pgTAP local transaccional complementa; servicio ausente es BLOCKED, no skip+PASS.
6. Criterios → diff stat lote → evidencia → diff HIGH completo → logs si discrepancia.
7. Stage por hunks si sucio, commit/push fix aceptado. Comprobar Git Vercel, SHA/Ready,
   health/flujo. Sin conexión Git, deploy autorizado de artefacto aislado aceptado,
   declarando no automático; nunca dirty tree completo.
8. Limpiar solo filas/identidades locales/procesos/scratch propios, mantener evidencia.
   Carpeta de observaciones solo se elimina al resolverlas todas.
