# Rendo — entrada para cualquier agente/chat

## Flujo vigente: GitHub, desde 2026-10-19

1. Leer `.specify/memory/PROJECT_STATE.md` y la constitución una vez; no reconstruir
   todo el historial. Los specs describen intención; la evidencia delimita lo probado.
2. Seguir `docs/GITHUB_WORKFLOW.md`. El chat implementador trabaja mediante issues,
   ramas y PRs; Codex opera la máquina, valida y despliega. Carlos decide aceptación.
3. Cargar sólo las skills/reglas pertinentes. Las reglas de proyecto vigentes y las
   decisiones explícitas de Carlos prevalecen sobre ejemplos históricos de skills.
4. `.pi/`, los briefs de Antigravity y los documentos antiguos son históricos.
   No iniciar Pi/Antigravity, instalar sus herramientas ni cambiar permisos globales.
5. No asumir comunicación entre chats, permisos de escritura GitHub, herramientas
   disponibles ni funcionamiento actual de la beta. Informar límites reales.

## Revisión y seguridad

- Entregar RESULT_PACKET breve: criterios, diff stat, comandos/resultados, riesgos,
  pendientes y evidencia. Codex profundiza según riesgo, sin repetir tests verdes
  salvo discrepancia, cambio de inputs o riesgo alto. No marcar mocks como integración.
- UI: Playwright; desktop/mobile separados. El implementador evalúa capturas reales;
  si no puede hacerlo, Carlos las revisa. Codex no inspecciona imágenes/vídeos.
- No publicar secretos, sesiones `.auth`, `.env` reales, credenciales, cachés o dumps.
  `.env.example` sólo contiene placeholders. No usar credenciales de documentación.
- Preservar cambios ajenos y respaldos. Extraer archivos en temporales aislados,
  nunca sobre `src/`. No borrar datos ni rotar credenciales sin autoridad específica.
- Subir código pendiente NO significa aprobarlo ni autorizar despliegue/migraciones.
- Mantener separación público/Gestor/Delegado, aislamiento, permisos, RLS y dinero.
  Los tests locales no prueban la beta ni Android nativo.

## Fuentes portables

- Gobernanza: `.specify/memory/constitution.md`.
- Estado: `.specify/memory/PROJECT_STATE.md`.
- Spec Kit: `.agents/skills/speckit-*/`, `.specify/scripts/`, `.specify/templates/`.
- Skills de apoyo de este proyecto: `.agents/skills/README.md`.
- Dominio/seguridad/diseño: `.pi/sdd/rules/` (reglas vigentes; ejecutor Pi inactivo).
- Alcance actual: `specs/008-beta-observaciones-2026-10-02/`.
