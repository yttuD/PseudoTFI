# Rendo — estado operativo compacto

- Milestone actual: beta publicada, no cerrada; resolver observaciones con evidencia real.
- Feature actual: specs/008-beta-observaciones-2026-10-02; alcance y estados en issues.md.
- Estado: N01 abierto. Migración 20261008040000_unit_archive_rpc.sql aplicada exitosamente en Supabase remoto (maeiuaketocznpogmtic). Candidato API aislado (solo UnidadesService.remove modificado a archive_unidad RPC) publicado en Vercel (dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN), estado READY y aliaseado a https://rendo-beta-api.vercel.app. Web preservada sin redespliegue. Endpoints de producción verificados (/health/live=200, /health/ready=200, /unidades=401, web /es=200). Rollback a dpl_6EQBEFvG6JsUcPfJ9rFuTzcUswcm preservado.
- Evidencia: `specs/008-beta-observaciones-2026-10-02/evidence/N01/unit-archive-release.md`; migration list y definiciones de pg_proc/grants en remoto validadas; unit tests en `unidades.archive.spec.ts` (4/4 passed); smoke tests HTTP en producción.
- Marco vigente: constitución v2.1.1; Spec Kit sigue siendo fuente de verdad. Carlos y Claude/Juez tienen la palabra final.
- Autorización vigente: Lote B009 ejecutado según especificación autorizada. N01 permanece ABIERTO para la posterior reanudación controlada de suites remotas.
- Riesgos: Las 3 unidades residuales del intento interrumpido previo permanecen en DB remota hasta que se ejecute la suite de archivado/limpieza autorizada; paridad de historial no acredita por sí sola igualdad total del esquema.
- Próximo: Revisión del RESULT_PACKET por Carlos y el Juez (Claude). Preparación de la suite remota de verificación de inventario y archivado. N01 ABIERTO.





