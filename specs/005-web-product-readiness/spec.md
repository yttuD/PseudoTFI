# Feature Specification: Web Product Readiness

**Feature Branch**: `005-web-product-readiness`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Auditar y llevar todo Rendo a un acabado funcional y UI/UX consistente, comprobando absolutamente cada vista, formulario y flujo por separado para público, Gestor, Delegado y desarrollo, tanto en escritorio como en web responsive; entregar el sistema local listo para prueba manual antes del despliegue."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experiencia pública completa (Priority: P1)

Como visitante o usuario público quiero descubrir, filtrar y evaluar unidades, consultar su detalle, registrarme o iniciar sesión, gestionar favoritos e invitaciones y comprender las condiciones legales sin encontrar pantallas incompletas, callejones sin salida ni contenido de gestión interna.

**Why this priority**: Es la puerta de entrada de Rendo y debe transmitir confianza antes de que una persona comparta datos o contacte una propiedad.

**Independent Test**: Una persona sin sesión y otra con cuenta pública pueden recorrer todas las superficies públicas, completar sus acciones principales y recuperar estados vacíos, errores y validaciones en escritorio y responsive sin acceder al espacio operativo.

**Acceptance Scenarios**:

1. **Given** una persona anónima, **When** busca, filtra y abre una unidad, **Then** ve información consistente, acciones comprensibles y ubicación con el nivel de privacidad correspondiente.
2. **Given** una cuenta pública, **When** gestiona favoritos o una invitación recibida, **Then** obtiene confirmación clara y el resultado persiste.
3. **Given** datos inválidos o ausencia de resultados, **When** la persona usa autenticación, búsqueda o reporte, **Then** recibe orientación accesible sin perder su progreso ni quedar bloqueada.

---

### User Story 2 - Operación integral del Gestor (Priority: P1)

Como Gestor quiero administrar unidades, grupos, inquilinos, alquileres, señas opcionales, disponibilidad, métricas, facturación, configuración fiscal, delegados y registros desde un espacio coherente para operar mi cartera sin recurrir a soluciones externas.

**Why this priority**: Es el núcleo comercial y operativo del producto.

**Independent Test**: Un Gestor puede completar de punta a punta los recorridos de creación, consulta, edición y validación de cada módulo con datos representativos, incluyendo alquiler mensual, diario y por hora.

**Acceptance Scenarios**:

1. **Given** una cartera vacía o existente, **When** el Gestor crea o edita grupos y unidades, **Then** puede definir modalidades de precio y disponibilidad sin inconsistencias entre formularios y vistas.
2. **Given** un inquilino y una unidad, **When** el Gestor crea un alquiler mensual, diario o por hora, **Then** sólo aparecen campos y reglas pertinentes a esa modalidad.
3. **Given** un alquiler, **When** el Gestor decide usar o no una seña, **Then** la seña es realmente opcional y su configuración puede aplicarse a una unidad o a un grupo explícito sin repetición innecesaria.
4. **Given** una operación válida o inválida, **When** el Gestor la confirma, **Then** recibe estado de carga, éxito o error inequívoco y puede continuar trabajando.

---

### User Story 3 - Trabajo delegado seguro (Priority: P1)

Como Delegado quiero trabajar únicamente sobre el alcance y las acciones asignadas por el Gestor, con una interfaz que oculte o bloquee claramente datos sensibles, facturación y administración exclusiva del titular.

**Why this priority**: La delegación debe ser útil sin romper aislamiento, privacidad ni confianza.

**Independent Test**: Delegados de sólo lectura y de gestión recorren cada destino operativo con alcance de cuenta, grupo y unidades específicas, verificando permitidos, denegados y cambios de alcance.

**Acceptance Scenarios**:

1. **Given** un Delegado de sólo lectura, **When** intenta modificar un recurso, **Then** la interfaz no ofrece una acción engañosa y el sistema rechaza cualquier acceso directo.
2. **Given** un Delegado con gestión dentro de alcance, **When** ejecuta una acción operativa permitida, **Then** la completa con el mismo nivel de claridad que el Gestor.
3. **Given** cualquier Delegado, **When** intenta acceder a facturación, configuración fiscal, pagos, datos sensibles del Gestor o consola de desarrollo, **Then** el sistema falla de forma cerrada sin revelar datos.

---

### User Story 4 - Administración de desarrollo aislada (Priority: P2)

Como operador de desarrollo autorizado quiero usar moderación, logs, métricas técnicas y auditoría de pagos en una consola separada del marketplace y de la operación de Gestor/Delegado.

**Why this priority**: Las herramientas internas son necesarias, pero nunca deben quedar expuestas a roles de negocio o al público.

**Independent Test**: Un operador autorizado accede a todas las vistas internas; usuarios anónimos, públicos, Gestores y Delegados son rechazados en navegación y acceso directo.

**Acceptance Scenarios**:

1. **Given** un operador autorizado, **When** recorre la consola interna, **Then** puede interpretar y operar cada vista en escritorio y responsive.
2. **Given** cualquier actor no autorizado, **When** intenta abrir una ruta interna, **Then** no ve contenido ni datos parciales y recibe una salida segura.

---

### User Story 5 - Experiencia adaptable y accesible (Priority: P2)

Como persona que usa Rendo quiero que cada pantalla, formulario, diálogo, tabla, mapa y estado se adapte a mi dispositivo, tema y método de interacción para completar tareas sin zoom forzado, desbordes ni controles inaccesibles.

**Why this priority**: La web responsive es el puente actual hacia el uso móvil y debe evaluarse independientemente del escritorio.

**Independent Test**: El inventario completo se prueba en 375, 768, 1024 y 1440 píxeles, en claro y oscuro, con teclado y objetivos táctiles, y cada celda produce evidencia visual revisable.

**Acceptance Scenarios**:

1. **Given** cualquier superficie inventariada, **When** cambia el ancho o el tema, **Then** conserva contenido, jerarquía, contraste y acciones sin desbordamiento horizontal.
2. **Given** un formulario o diálogo, **When** se usa con teclado o pantalla táctil, **Then** el foco, etiquetas, errores, controles y cierre son perceptibles y operables.
3. **Given** carga, vacío, error, éxito o acceso restringido, **When** aparece el estado, **Then** la persona comprende qué ocurrió y qué puede hacer después.

---

### User Story 6 - Entrega local verificable (Priority: P3)

Como responsable del producto quiero recibir una única fuente de verdad y un entorno local limpio y funcionando para probar manualmente antes de autorizar el despliegue.

**Why this priority**: Evita declarar listo un sistema que sólo funciona en pruebas aisladas o que depende de residuos no documentados.

**Independent Test**: Desde servicios detenidos, una guía reproducible inicia únicamente Rendo, comprueba salud y muestra enlaces y cuentas de prueba; tras detenerlo no quedan procesos ni temporales del lote.

**Acceptance Scenarios**:

1. **Given** una instalación preparada, **When** se sigue la guía local, **Then** la web, API y servicios de datos de Rendo quedan accesibles mediante enlaces documentados.
2. **Given** la batería final completa, **When** termina, **Then** no quedan navegadores, servidores, PID, resultados temporales ni bases ajenas iniciadas por la tarea.

### Edge Cases

- Sesión ausente, expirada, de rol incorrecto o con invitación revocada durante una operación.
- Alcance delegado vacío, modificado o revocado mientras una vista permanece abierta.
- Cuenta, grupo o unidad sin datos; resultados extensos; identificador inexistente; error de red o servicio externo.
- Alquiler mensual, diario o por hora con límites, solapamientos y zona horaria; seña omitida, nula, parcial o heredada de un grupo.
- Contenido largo, traducciones ES/EN/PT, moneda y fechas argentinas, imágenes faltantes y documentos inválidos.
- Pantalla angosta, orientación horizontal, teclado virtual, zoom del navegador, tema oscuro y preferencia de movimiento reducido.
- Servicios locales detenidos o parcialmente disponibles, evitando esperas indefinidas y mensajes técnicos crudos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El producto MUST mantener un inventario fuente de verdad de todas las rutas renderizadas, redirecciones, estados de carga, formularios, diálogos, controles críticos, capacidades de servicio, migraciones y suites de prueba activas.
- **FR-002**: Cada elemento inventariado MUST tener identificador estable, audiencia, actor, propósito, estado, dependencias y evidencia verificable.
- **FR-003**: El inventario MUST reconciliar explícitamente altas, bajas y cambios respecto de la auditoría anterior sin reutilizar estados obsoletos.
- **FR-004**: Las superficies públicas MUST permanecer separadas del espacio operativo y de la consola interna en navegación, contenido y autorización.
- **FR-005**: Las superficies del Gestor MUST distinguir acciones exclusivas del titular de las acciones delegables.
- **FR-006**: Las superficies del Delegado MUST representar visual y funcionalmente permiso de lectura, permiso de gestión y alcance de cuenta, grupo o unidades específicas.
- **FR-007**: Las superficies internas de desarrollo MUST estar disponibles sólo para operadores autorizados y fallar cerradas para cualquier otro actor.
- **FR-008**: Los datos sensibles de facturación, pagos, configuración fiscal y perfil privado del Gestor MUST permanecer inaccesibles para Delegados.
- **FR-009**: Cada destino navegable MUST ofrecer contenido o un estado intencional de carga, vacío, error, éxito, restricción o redirección; no puede quedar como placeholder ambiguo.
- **FR-010**: Cada formulario y diálogo MUST validar campos, preservar datos razonables tras errores, impedir doble envío y mostrar resultado comprensible.
- **FR-011**: Cada control interactivo MUST ser operable con teclado y táctil, tener nombre accesible, foco visible y área táctil mínima de 44 por 44 píxeles cuando corresponda.
- **FR-012**: La experiencia MUST evitar desbordamiento horizontal y pérdida de acciones en 375, 768, 1024 y 1440 píxeles.
- **FR-013**: Los temas claro y oscuro MUST conservar jerarquía visual, identidad Rendo y contraste mínimo AA en texto y controles esenciales.
- **FR-014**: La paleta MUST usar los colores de marca entregados por el usuario sin copiar la composición visual del ejemplo de Home.
- **FR-015**: El marketplace MUST permitir búsqueda, filtros, catálogo, detalle, contacto, favoritos, reporte y estados sin resultados o error de forma coherente.
- **FR-016**: Autenticación, registro y onboarding MUST conducir al destino apropiado según rol y contexto, sin exponer destinos protegidos.
- **FR-017**: El Gestor MUST poder crear, consultar y editar grupos y unidades, incluida ubicación, imágenes, traducciones y modalidades de tarifa pertinentes.
- **FR-018**: El Gestor MUST poder administrar inquilinos y sus datos relacionados con consentimiento y validación visibles.
- **FR-019**: El sistema MUST tratar alquiler mensual, diario y por hora como modalidades con reglas, etiquetas y campos diferenciados.
- **FR-020**: La seña MUST ser opcional en cada alquiler y MUST poder configurarse de forma reutilizable para un grupo explícito cuando el Gestor lo decida.
- **FR-021**: La disponibilidad y prevención de solapamientos MUST corresponder a la modalidad temporal de cada alquiler.
- **FR-022**: Métricas y tableros MUST mostrar valores, unidades, rangos y estados vacíos interpretables sin mezclar datos fuera del alcance del actor.
- **FR-023**: Facturación, pagos y configuración fiscal MUST tener estados de preparación, bloqueo y error accionables, incluso cuando una integración externa no esté habilitada localmente.
- **FR-024**: Invitación, aceptación, configuración, modificación y revocación de Delegados MUST tener confirmación y reflejar el alcance efectivo.
- **FR-025**: Las operaciones sensibles y denegaciones de autorización MUST dejar evidencia auditable sin exponer secretos.
- **FR-026**: Cada superficie y flujo crítico MUST verificarse por separado en web de escritorio y web responsive; una aprobación en un canal no implica aprobación en el otro.
- **FR-027**: Las verificaciones visuales MUST ejecutarse con automatización reproducible de navegador y MUST producir capturas revisables por caso, ancho y tema.
- **FR-028**: Las pruebas MUST incluir recorridos positivos, validaciones, errores, estados vacíos y accesos prohibidos para cada actor relevante.
- **FR-029**: La entrega MUST incluir trazabilidad bidireccional entre requisitos, tareas, pruebas, hallazgos, correcciones y evidencia.
- **FR-030**: Ningún hallazgo crítico o alto puede quedar abierto al declarar la web lista para prueba manual.
- **FR-031**: Los hallazgos medios MUST corregirse o quedar expresamente justificados y aceptados; los bajos MUST registrarse sin presentarlos como inexistentes.
- **FR-032**: La batería final MUST verificar compilación, calidad estática, pruebas de servicios, políticas de datos, recorridos web y evidencia visual fresca.
- **FR-033**: La puesta en marcha local MUST iniciar únicamente servicios de Rendo, documentar enlaces y cuentas de prueba y comprobar salud antes de la entrega.
- **FR-034**: La limpieza MUST eliminar sólo residuos creados por las tareas y cerrar procesos auxiliares, preservando código, datos y cambios ajenos.
- **FR-035**: El producto MUST quedar preparado para una fase posterior de app Android nativa sin afirmar que la web responsive ya constituye esa app.

### Key Entities

- **Superficie**: Destino o estado visual que una persona puede visitar, con audiencia, actor, canal y evidencia.
- **Interacción**: Formulario, diálogo, control o acción crítica con estados, validaciones y resultado.
- **Actor**: Visitante, usuario público, Gestor, Delegado de lectura, Delegado de gestión u operador de desarrollo.
- **Alcance**: Conjunto de cuenta, grupo o unidades sobre el que un Delegado puede actuar.
- **Modalidad de alquiler**: Régimen mensual, diario o por hora con reglas temporales propias.
- **Configuración de seña**: Decisión opcional y reutilizable asociada a un alquiler, unidad o grupo explícito.
- **Hallazgo**: Desviación funcional, visual, de accesibilidad, seguridad, rendimiento o documentación con severidad y estado.
- **Evidencia**: Resultado reproducible, captura, registro o medición que demuestra una aceptación o hallazgo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las superficies e interacciones descubiertas en el código activo está inventariado y reconciliado con evidencia, sin filas huérfanas ni elementos activos omitidos.
- **SC-002**: El 100% de los recorridos críticos de público, Gestor, Delegado y operador interno completa su resultado esperado o su denegación segura.
- **SC-003**: Todas las celdas requeridas de 375, 768, 1024 y 1440 píxeles, en claro y oscuro, tienen captura automatizada fresca y revisión final.
- **SC-004**: Cero superficies auditadas presenta desbordamiento horizontal, acción primaria inaccesible o control táctil esencial menor a 44 por 44 píxeles.
- **SC-005**: Todo texto normal y control esencial evaluado alcanza contraste 4.5:1, y texto grande válido alcanza al menos 3:1.
- **SC-006**: Cero hallazgos críticos o altos permanece abierto y toda excepción media tiene decisión explícita antes de la entrega local.
- **SC-007**: La matriz final demuestra cobertura de todos los requisitos funcionales y criterios verificables mediante una o más tareas y pruebas.
- **SC-008**: Una persona puede iniciar el entorno local limpio, acceder a los enlaces documentados y comenzar una prueba manual en menos de 10 minutos.
- **SC-009**: Al finalizar pruebas automáticas no quedan procesos auxiliares, listeners temporales, PID ni artefactos de ejecución no declarados.
- **SC-010**: La guía y el estado final distinguen inequívocamente web desktop, web responsive, futura app Android y posterior despliegue.

## Assumptions

- El alcance actual termina en una web local apta para prueba manual; despliegue y publicación se realizan sólo después de la aprobación del usuario.
- La app Android nativa, instalación en teléfono y depuración Wi-Fi pertenecen a una fase posterior.
- Las integraciones externas que requieran credenciales reales se validan localmente mediante estados seguros y contratos verificables, sin inventar acceso productivo.
- Se reutilizan autenticación, datos de demostración y arquitectura existentes salvo que la auditoría demuestre una brecha.
- La auditoría 001 es una línea base histórica; el código y comportamiento actuales son la fuente de verdad.
- Las verificaciones visuales usan automatización reproducible de navegador y las implementaciones pesadas quedan sujetas a una revisión final independiente.
