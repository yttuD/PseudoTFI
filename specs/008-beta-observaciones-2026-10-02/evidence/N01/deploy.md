# N01a — publicación comprobada 2026-10-04

- Commit de arreglo: 96b0b3034ce070caaa45690a2205c773105283a2, push confirmado
  a origin/codex/rendo-beta-deploy (yttuD/PseudoTFI).
- API deployment: dpl_ADgxK4hCp1Rduwa2exgYHTUhTLYT, estado READY, producción beta.
- Fuente CLI: artefacto aislado reconstruido del deployment anterior
  dpl_3i2b2EdBhpRW7aMWsZr9LoHuRL3L. Comparación de los 398 archivos:
  únicas diferencias controller/service SHA aceptados en review.md y .vercelignore
  (excluir .pi, .impeccable y scripts). No publicar árbol sucio completo.
- Se rechazó la primera publicación del árbol sucio. No fue ejecutada; alternativa
  permitida: paquete explícitamente reconciliado. Metadatos gitDirty=1 por checkout
  padre: SHA del commit NO acredita snapshot completo. Baseline y manifest sí.
- Build real Vercel: pnpm frozen lockfile, types build, turbo api/nest build verdes.
  Warnings Turbo por env runtime no declaradas en turbo.json: registrar, no ignorar
  como resueltos. Health real confirmó conexión Supabase después de build.
- Candidata health/ready=200 e inventario sin sesión=401 mediante CLI autenticada.
  CLI generó bypass de protección acotado al proyecto para esos checks; valor jamás
  mostrado, ni enviado a agentes ni guardado en Git. No desactivar protección.
- Alias rendo-beta-api.vercel.app actualizado solo después de checks. API /v4/aliases
  confirma que apunta al nuevo deployment, no al anterior.
- Enlaces públicos finales sin bypass: /health/live=200 {status:ok},
  /health/ready=200 {status:ok}, /unidades sin sesión=401; web /es=200.
- Web NO redesplegada: continúa la versión anterior. N01a es cambio API únicamente.

Límites: integración Auth/JWT/DB de dos gestores y delegado probada localmente,
no cuentas de testers modificadas ni sesión remota validada. No captura/UI requerida
por este cambio API; revisión real desktop/mobile pendiente B007b. N01 completo ABIERTO.

Git automático: proyectos Vercel aún sin link. Se solicitó decisión humana para
versionar también baseline ya publicado y luego conectar Git sin revertir cambios.
Hasta entonces publicación manual verificada, no afirmar que push causó redeploy.

B007a: primer intento no editó archivos ni amplió cobertura; bloqueado por comando
innecesario `dir specs\008-beta-observaciones-2026-10-02\evidence`. Próximo intento:
lectura/listado nativos exclusivamente, no permiso general de shell ni repetir
pruebas N01a como si completaran T005.
