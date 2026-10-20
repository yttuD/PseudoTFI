# B007e — aceptación técnica API, 2026-10-05

RISK: HIGH; EVIDENCE_PROFILE: API | SECURITY; SOL_REVIEW: FULL_AFFECTED_DIFF.

Aceptado SOLO findAll: recuperación de página fuera de rango mediante HEAD nuevo
con workspace, borrado lógico y alcance grupo/IDs idénticos. Únicamente código
PGRST103 exacto y offset positivo; count entero seguro no negativo y offset>=count
permiten data vacía con conteo auténtico. Otros errores, count inválido y fallo
HEAD siguen422. No adminclient ni nueva autorización ni consulta sin scope.

Revisión Codex: diff afectado completo contra baseline exacto B007e, helper/query
y error branch de unidades.service.ts; nueve regresiones de isolation.spec.ts
(incluida colisión de mensaje/código); cuatro nuevas pruebas Auth/DB del harness.
Los cambios previos de traducción, creación/borrado y modalidades en service son
ajenos a este batch y NO se incluyen en este commit.

Evidencia ejecutada por Antigravity, N01/api-range-runtime.md:
- unit21/21, exit0;
- integración local Auth/DB34/34, exit0, sin servidor HTTP;
- tipos productivos API y Web exit0, reportado en entrega terminal.

No equivale a cierre N01 ni aprobación UI. Ejecución navegador actual cancelada
tras primer authFAIL; no reporte final ni nueva aceptación visual. No nuevo
despliegue ni migración remota. Publicación beta sigue pendiente de autorización
para migraciones de auditoría/archivado y reconciliación de fuentes publicadas.
