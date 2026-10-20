# Rendo — estado operativo compacto

- Milestone actual: beta publicada, no cerrada; resolver observaciones con evidencia real.
- Feature actual: specs/008-beta-observaciones-2026-10-02; alcance y estados en issues.md.
- Coordinación vigente: GitHub; rama de handoff `codex/github-handoff-2026-10-19`. Entrada AGENTS.md y docs/GITHUB_WORKFLOW.md. El chat ChatGPT implementa; Codex opera la máquina, verifica y despliega; Carlos tiene autoridad final. Pi/Antigravity inactivos.
- Estado: N01 abierto; N02–N08 pendientes de aceptación integral. Servicio local recuperado (SHA256 8016ca91a43c68cb9a3ee543daaf2a41e2ef86ab4feebb5f5cf94ee67d579081); contiene WIP distinto del deployment B009. Subirlo no autoriza desplegarlo.
- Evidencia histórica B009/recuperación: `specs/008-beta-observaciones-2026-10-02/evidence/N01/`; límites de publicación en docs/GITHUB_SYNC.md.
- Marco vigente: constitución v3.0.0; Spec Kit conserva intención y trazabilidad. Revisión según riesgo con RESULT_PACKET compacto, sin repetir historial ni checks verdes con inputs vigentes.
- Autorización previa B010: una ejecución N01, hasta dos Gestores/un Delegado temporales y archivado propio; sin tocar testers ni purgar Auth. Sin ejecución acreditada.
- Riesgos: Las 3 unidades residuales del intento interrumpido previo permanecen en DB remota hasta la ejecución de la suite de archivado/limpieza autorizada.
- Blocker externo: última comprobación 2026-10-13, Supabase NXDOMAIN y API readiness 503; no revalidado en esta sincronización. No iniciar registros mientras la dependencia no se restablezca.
- Evidencia reciente: API local 34 suites/281 tests PASS; auditoría pública en docs/GITHUB_SYNC.md. Capturas/respaldos privados siguen locales; typecheck histórico no aprobado.
- Próximo: usar el handoff GitHub para un PR acotado de N01 y comprobar disponibilidad con Codex. La suite B010 autorizada sigue sin ejecución acreditada; no lanzar agentes históricos.




