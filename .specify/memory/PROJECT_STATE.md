# Rendo — estado operativo compacto

- Milestone actual: beta publicada, no cerrada; resolver observaciones con evidencia real.
- Feature actual: specs/008-beta-observaciones-2026-10-02; alcance y estados en issues.md.
- Coordinación vigente: GitHub; rama de handoff `codex/github-handoff-2026-10-19`. Entrada AGENTS.md y docs/GITHUB_WORKFLOW.md. El chat ChatGPT implementa; Codex opera la máquina, verifica y despliega; Carlos tiene autoridad final. Pi/Antigravity inactivos.
- Estado: N01 abierto; N02–N08 pendientes de aceptación integral. Servicio local recuperado (SHA256 8016ca91a43c68cb9a3ee543daaf2a41e2ef86ab4feebb5f5cf94ee67d579081); contiene WIP distinto del deployment B009. Subirlo no autoriza desplegarlo.
- Evidencia histórica B009/recuperación: `specs/008-beta-observaciones-2026-10-02/evidence/N01/`; límites de publicación en docs/GITHUB_SYNC.md.
- Marco vigente: constitución v3.0.0; Spec Kit conserva intención y trazabilidad. Revisión según riesgo con RESULT_PACKET compacto, sin repetir historial ni checks verdes con inputs vigentes.
- Autorización previa B010: una ejecución N01, hasta dos Gestores/un Delegado temporales y archivado propio; sin tocar testers ni purgar Auth. Sin ejecución acreditada.
- Riesgos: Las 3 unidades residuales del intento interrumpido previo permanecen en DB remota hasta la ejecución de la suite de archivado/limpieza autorizada.
- Disponibilidad #2 (2026-10-19 23:32 ART): front/live/ready y Auth 200; DNS A local/Google/Cloudflare correcto. NXDOMAIN anterior no se reproduce. Registro real no probado; sesión Vercel caducada impide acreditar IDs/SHA actuales. Evidencia: `evidence/N01/issue-002-availability.md` dentro de la feature.
- Evidencia reciente: API local 34 suites/281 tests PASS; auditoría pública en docs/GITHUB_SYNC.md. Capturas/respaldos privados siguen locales; typecheck histórico no aprobado.
- Próximo: revisar propuesta `codex/n01b-api-read-isolation` desde handoff, issue #2. Preparación/revocación de fixtures es mutación, separada del diagnóstico. B010 sigue sin ejecución acreditada; no lanzar agentes históricos ni nuevas pruebas remotas automáticamente.




