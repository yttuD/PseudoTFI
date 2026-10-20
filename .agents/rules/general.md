---
trigger: always_on
---

 # Marketplace Inmobiliario — Regla de
  proyecto

    **Al iniciar una sesión**, leer el estado compacto
  `.specify/memory/PROJECT_STATE.md` y la gobernanza
  `.specify/memory/constitution.md` una vez.
  Cargar solo las reglas especializadas que esta última indique para la tarea.
  `INICIO.md` y los documentos de diseño se consultan por secciones pertinentes,
  nunca completos automáticamente. Si ya están en contexto y no cambiaron, no releer.

    ## Skills a activar según la tarea
    - Lógica de negocio, modelos, API, estados →
  activar `inmobiliaria-domain`
    - Cualquier componente visual, layout, diseño
  → activar `inmobiliaria-ui-ux`

    ## Invariantes siempre activos

    **Terminología canónica** (nunca usar los
  alias prohibidos):
    - Unidad (no "propiedad" ni "inmueble")
    - Gestor (no "administrador" ni "dueño")
    - Alquiler (no "contrato" ni "reserva")
    - Cupo (no "plan" ni "límite")
    - Delegado (no "colaborador")
    - Inquilino (no "cliente")

    **Stack cerrado**: Los ADR 0001–0009 son
  decisiones tomadas. No proponer alternativas
    (Google Maps, Neon, app nativa, tabla rígida
  por tipo de Unidad, etc.).

    **TypeScript strict en todo el monorepo.**
  Sin `any`.

    **Borrado lógico siempre.** Nunca `DELETE`
  físico en producción.

    **El Gestor controla el estado de sus
  Unidades manualmente.**
    El sistema solo los cambia automáticamente en
  4 casos (ver INICIO.md).

    ## Supervisor del proyecto
    Carlos es el arquitecto y tiene la palabra
  final. Escalar ante cualquier
    decisión de arquitectura o producto no
  cubierta en los documentos de diseño.
