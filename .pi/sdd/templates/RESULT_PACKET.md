# RESULT

Status: PASS | FAIL | BLOCKED
Summary:
Changed files:
Tests: comandos, exit code, passed/failed; separar skipped/flaky/blocked/preexistentes
Acceptance criteria: PASS/FAIL por id
Decisions taken:
Risks:
Diff stat:
Evidence artifacts:
Evidence inputs/environment: revisión/firma de código y configuración, alcance y entorno
Architect input required:

El ejecutor entrega el resultado mediante sdd_submit_result; Pi valida el contrato
y añade los resultados reales de comandos y del diff desde el inicio del lote.
Objetivo 30–60 líneas / aproximadamente 500 palabras. Cada criterio referencia evidencia.
Capturas, trazas, logs y diffs completos quedan en artifacts; no pegarlos en el paquete.
JSON usa PASS/FAIL por criterio; un criterio bloqueado/no ejecutado es FAIL con razón,
no PASS. Resumen de cobertura no significa aceptación; decide Sol.
