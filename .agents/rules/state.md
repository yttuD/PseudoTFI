---
trigger: always_on
---

Estado actual antes que historial

Leer `.specify/memory/PROJECT_STATE.md` al iniciar, salvo que ya esté incluido y vigente.
Conservar solo milestone/estado, blockers/riesgos, próxima acción y evidencia reciente.
No convertirlo en diario. Consultar specs/evidence/decisiones por referencias concretas;
leer únicamente la sección pertinente de ESTADO-REAL.md si hace falta historial.

- "Listo"/"funciona" requiere evidencia ejecutable vigente para el alcance declarado,
  no documentación de intención ni repetir pruebas válidas sin motivo.
- Declarar pendientes desconocidos o no verificados; nunca inferir completitud por ausencia.
- Al cerrar, guardar evidencia/decisión en la feature y actualizar el estado compacto.
  Agregar a ESTADO-REAL.md una entrada fechada solo cuando cambie el auditado histórico,
  sin borrar historia ni leerla toda para añadir una entrada.
- Señalar conflictos entre comportamiento, evidencia y diseño. El comportamiento prueba
  lo que ocurre, no autoriza cambiar requisitos. Rige la constitución, no un historial.
