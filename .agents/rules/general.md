---
trigger: always_on
---

 # Marketplace Inmobiliario — Regla de
  proyecto

    **Al iniciar cualquier sesión en este
  proyecto**, leer primero:
    `D:\Programacion-
  Cosas\Proyecto_inmobiliaria\TFI\INICIO.md`

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