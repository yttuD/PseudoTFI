# 2026-10-03 — Corrección documental de contexto y handoff

## Alcance y autorización

Mantenimiento documental autorizado expresamente por Carlos dentro de Pi. Alcance:
`.specify/memory/PROJECT_STATE.md`, `.pi/sdd/agents/architect.md`,
`.pi/sdd/rules/AGENT_RULES.md`, `.pi/sdd/README.md` y esta nueva decisión.
Se consultó además `.pi/sdd/templates/TASK_PACKET.json`, sin modificarlo.
Esta entrada es append-only: complementa decisiones anteriores, no las reescribe.
No se modificaron constitución, DOMAIN_RULES/SECURITY_RULES/DESIGN_RULES, permisos,
modelos ni límites runtime. AGENT_RULES de coordinación sí se modificó dentro del
alcance autorizado.

## Corrección de sdd-context-facts-002

El `estado_stale=false` reportado por sdd-context-facts-002 contradice el handoff
PROJECT_STATE que indicaba constitución v2.0.0 frente a la vigente v2.1.0.
Por tanto, ese paquete no es evidencia de handoff corregido, aunque el estado anterior
lo presentara como ACCEPT. Esta corrección no reescribe su resultado ni decisiones
históricas, ni implica aceptación de la validación documental integral.
No se atribuye una causa técnica sin prueba. Se recomienda `Get-Content -Encoding UTF8`
o lectura UTF8 explícita como prevención, no como explicación demostrada del defecto.
`Length` de `Get-Item` mide bytes, no caracteres.

## Decisión operativa

- Handoff compacto: constitución v2.1.0, validación documental integral todavía no
  aceptada y sdd-context-validation-001 bloqueado; beta publicada pero no cerrada.
  Mantener los bloqueos y riesgos reales. Retomar el plan 008 mediante DISCOVERY acotado.
- Antes de cada nuevo TASK_PACKET, consultar el JSON de la plantilla o usar un contrato
  completo vigente ya incluido; reservar contexto para ese contrato antes de reglas.
  No releer PROJECT_STATE/constitución ya presentes. Tras dos rechazos sin registro,
  terminar con BLOCKED y el error exacto del validador, sin bucles ni rebajar controles.
- Review no inyecta diffs automáticamente, tampoco MEDIUM/HIGH. Leer rangos dirigidos;
  HIGH exige todo el diff afectado y evidencia ejecutable. UI exige captura real.
  SECURITY/MONEY/MIGRATION nunca son PACKET_ONLY.
- Suite 55/55: antecedente informado, no nueva ejecución. Mediciones actuales pendientes.
- Carlos autorizó subir arreglos aceptados al repo actual y publicar gradualmente.
  Staging/commit/push solo del alcance validado, sin dirty work ajeno ni secrets.
  Verificar conexión Git de Vercel y revisión realmente desplegada, sin asumir auto deploy.
  No se amplían permisos ni se levantan bloqueos operativos por esta política.

## Evidencia y límites de esta intervención

Solo lecturas y ediciones documentales en el alcance autorizado. Pruebas, conteos,
mediciones, conexión Git de Vercel y revisión desplegada: NO EJECUTADOS/NO VERIFICADOS
por docs-only. No se ejecutaron comandos, commit, push ni deploy; no se iniciaron otras
tareas. Las instrucciones corregidas no demuestran por sí solas comportamiento runtime.
La validación documental integral continúa pendiente de revisión y aceptación externa.
