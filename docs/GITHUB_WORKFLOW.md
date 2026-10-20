# Flujo GitHub — Rendo

Vigente desde 2026-10-19, autorizado por Carlos en el chat. GitHub es el puente;
no hay mensajería automática garantizada entre chats. Repositorio **público**:
`yttuD/PseudoTFI`. No adjuntar credenciales ni datos privados.

## Roles

- ChatGPT implementador: exploración acotada, implementación, mejoras y verificaciones
  que realmente pueda ejecutar; publicar rama/PR si tiene permisos efectivos.
- Codex: todo lo que requiere esta máquina (servicios, builds/pruebas locales cuando
  hagan falta, credenciales, Docker, migraciones, despliegues) y revisión final.
- Carlos: decisiones de producto, autoridad sobre operaciones sensibles y aceptación.

Pi/Antigravity y su configuración quedan conservados como historia reproducible,
no como flujo activo. Los specs y reglas siguen siendo la fuente de intención.

## Una entrega = un lote comprobable

1. Issue con objetivo, criterios, límites y spec aplicable.
2. Rama `codex/<tema>` o rama descriptiva del implementador, sin sobrescribir trabajo
   ajeno. Identificar siempre rama y commit; una rama no es lo mismo que `main`.
3. PR pequeño con `RISK`, `EVIDENCE_PROFILE`, `SOL_REVIEW` y RESULT_PACKET:
   resultado por criterio, diff stat, pruebas realmente ejecutadas, pendientes,
   riesgos y operaciones locales solicitadas. Logs/capturas quedan como artifacts
   sanitizados; nunca volcar todo el historial al contexto de Codex.
4. Codex revisa paquete → criterios → diff stat → evidencia → diff dirigido → logs
   sólo ante fallo/discrepancia. Seguridad, permisos, dinero y migraciones siempre
   requieren revisión dirigida; riesgo HIGH exige todo el diff afectado.
5. Merge sólo tras aceptación. Deploy se comprueba por fuente/commit, ID real,
   alias y checks: push o build verde por sí solos NO prueban publicación.

Para SDD: specify → clarify si hay ambigüedad → checklist si aporta → plan → tasks
→ analyze una vez → batches GitHub → converge. No repetir fases si sus inputs no
cambiaron. La conversación implementadora sin herramientas debe entregar patch o
PR propuesto y declarar qué no pudo ejecutar, nunca inventar tests ni push.

## Sincronización inicial de trabajo existente

La rama de sincronización conserva el estado local publicable, incluidas features
pendientes N01–N08. Se trata de un **handoff WIP**, no una release aprobada.
No mezclar su publicación con deploy, migraciones, purga de Auth o cambios de pagos.
Consultar `docs/GITHUB_SYNC.md` para exclusiones y auditoría reproducible.

Las capturas/referencias locales no disponibles en GitHub se declaran expresamente;
su existencia histórica no se presenta como evidencia recuperable ni PASS nuevo.
