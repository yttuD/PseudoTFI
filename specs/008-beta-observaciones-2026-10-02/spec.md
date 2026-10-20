# Feature Specification: Cierre de observaciones de beta N01–N08

**Feature Branch**: `008-beta-observaciones-2026-10-02`

**Created**: 2026-10-03

**Status**: Especificación validada; implementación y aceptación de beta pendientes.

**Input**: Completar la especificación de la feature seleccionada, conservando cambios existentes y el alcance N01–N08 de [issues.md](issues.md). Aislar espacios de gestión sin afectar el marketplace público, corregir edición y tarifas, proteger dirección y perfil, ofrecer traducciones honestas y permitir crear grupos con y sin descripción/seña. Las verificaciones reales y el backfill EN/PT permanecen pendientes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestionar únicamente el espacio autorizado (Priority: P1)

Como Gestor o Delegado, quiero ver y modificar exclusivamente las Unidades y Grupos de mi alcance, sin perder el acceso público a publicaciones del marketplace.

**Why this priority**: N01 implica exposición de inventario ajeno y riesgo de escrituras entre espacios.

**Independent Test**: Con dos Gestores reales de espacios distintos y un Delegado de alcance conocido, comprobar inventario, grupos, recuentos, paginación, detalle y modificaciones; comprobar por separado el marketplace sin sesión.

**Acceptance Scenarios**:

1. **Given** dos Gestores con Unidades propias, **When** cada uno consulta su panel y todas sus páginas, **Then** ve exclusivamente sus Unidades y Grupos y sus recuentos coinciden con ese conjunto.
2. **Given** una Unidad o Grupo de otro espacio, **When** un Gestor intenta acceder por identificador o modificarlo desde el espacio operativo, **Then** no obtiene datos privados ni puede modificarlo y el dato original permanece intacto.
3. **Given** un Delegado con alcance limitado, **When** lista, consulta o modifica recursos dentro y fuera de su alcance, **Then** solamente las operaciones expresamente autorizadas prosperan.
4. **Given** publicaciones habilitadas para el marketplace, **When** un visitante sin sesión las consulta, **Then** siguen disponibles públicamente sin revelar inventario operativo ni datos privados.

---

### User Story 2 - Crear Grupos sin errores ni cruces entre espacios (Priority: P1)

Como Gestor autorizado, quiero crear Grupos tanto con descripción y seña como sin esos datos opcionales. Como Delegado, quiero hacerlo únicamente cuando mi alcance me lo permita.

**Why this priority**: N07 bloquea la combinación de descripción/seña; N08 bloquea la creación mínima y evidencia riesgo de autorización.

**Independent Test**: Crear y abrir desde la interfaz real de grupos las cuatro combinaciones de descripción/seña, recargar y verificar titularidad; repetir intentos entre dos espacios y con Delegado.

**Acceptance Scenarios**:

1. **Given** un Gestor en su espacio, **When** crea un Grupo con descripción y seña válida, **Then** la operación termina correctamente y ambos valores aparecen al abrir y recargar el Grupo.
2. **Given** el mismo Gestor, **When** crea un Grupo sin descripción ni seña, **Then** puede abrirlo y recargarlo sin errores de permisos ni valores inventados.
3. **Given** datos opcionales independientes, **When** crea un Grupo solo con descripción o solo con seña, **Then** conserva el valor proporcionado sin exigir el otro.
4. **Given** dos espacios, **When** otro Gestor o un Delegado no autorizado intenta crear un Grupo en el espacio ajeno, **Then** la creación se rechaza y no queda un Grupo parcial; un Delegado autorizado solo puede crearlo dentro de su alcance.

---

### User Story 3 - Editar categoría y tarifas sin perder integridad (Priority: P2)

Como Gestor autorizado, quiero cambiar la categoría de una Unidad y gestionar sus Modalidades de precio, viendo el mismo conjunto activo en editor y publicación.

**Why this priority**: N02 y N03 impiden mantener correctamente la oferta y sus importes.

**Independent Test**: En datos reales autorizados, cambiar Casa a Cancha, gestionar una Modalidad de precio y comparar editor y publicación después de guardar y recargar.

**Acceptance Scenarios**:

1. **Given** una Unidad Casa editable, **When** se cambia a Cancha y se guarda, **Then** tras recargar permanece Cancha, sus campos específicos son coherentes y no se pierde información común ajena al cambio.
2. **Given** Modalidades de precio activas y otras eliminadas, **When** se abren editor y publicación, **Then** ambos muestran las mismas activas con sus importes y condiciones; las eliminadas no reaparecen como activas.
3. **Given** una Modalidad de precio existente, **When** se modifica y guarda, **Then** cambia esa modalidad sin crear otra y persiste al recargar; crear añade una sola modalidad y eliminar retira únicamente la seleccionada del conjunto activo.
4. **Given** duplicados históricos, **When** se corrige la edición, **Then** no se borran, fusionan ni ocultan automáticamente para simular integridad; se informa su existencia y cualquier saneamiento queda pendiente de una decisión explícita.

---

### User Story 4 - Consultar dirección sin exponerla públicamente (Priority: P2)

Como usuario autenticado, quiero ver la dirección guardada de una publicación; como visitante, debo recibir solo una ubicación aproximada.

**Why this priority**: N04 combina información necesaria para el usuario con privacidad del inmueble.

**Independent Test**: Consultar la misma publicación con dirección guardada y otra sin ella, con y sin sesión, en escritorio y móvil responsive.

**Acceptance Scenarios**:

1. **Given** una dirección guardada y un usuario autenticado, **When** abre el detalle, **Then** ve esa dirección y la conserva tras recargar.
2. **Given** esa publicación, **When** se consulta sin sesión, **Then** no se entrega dirección privada ni ubicación exacta que la revele; solo se muestra la ubicación aproximada.
3. **Given** una publicación sin dirección guardada, **When** se abre el detalle, **Then** la ausencia se comunica sin inventar una dirección a partir del mapa.

---

### User Story 5 - Leer y contactar en el idioma elegido (Priority: P2)

Como visitante o usuario autenticado, quiero que la publicación y el contacto por WhatsApp respeten español, inglés o portugués sin presentar texto original como si estuviera traducido.

**Why this priority**: N05 induce a error cuando una traducción ficticia o ausente se presenta como terminada.

**Independent Test**: Revisar título, descripción, botón y mensaje de WhatsApp en los tres idiomas, incluyendo traducción real disponible, contenido pendiente y fallo de traducción.

**Acceptance Scenarios**:

1. **Given** título y descripción con traducciones reales, **When** se elige inglés o portugués, **Then** se muestra el contenido correspondiente y no un original con prefijos falsos.
2. **Given** una traducción inexistente o fallida, **When** se consulta ese idioma, **Then** se informa explícitamente que está pendiente; si se muestra el original, queda identificado como original y no como traducción.
3. **Given** cualquiera de los tres idiomas, **When** se consulta o inicia el contacto de WhatsApp, **Then** el botón y el mensaje preparado están localizados en ese idioma.
4. **Given** contenido existente pendiente de traducción, **When** aún no existe acceso autorizado para completarlo, **Then** el backfill EN/PT permanece registrado como pendiente/bloqueado sin simular éxito.

---

### User Story 6 - Editar el propio perfil con privacidad (Priority: P2)

Como Inquilino o Gestor, quiero editar los campos permitidos de mi propio perfil y ver los cambios al volver a cargarlo.

**Why this priority**: N06 impide mantener datos propios y requiere evitar exposición de datos sensibles entre roles.

**Independent Test**: Con cuentas reales autorizadas de ambos roles, editar un campo permitido, guardar, recargar e intentar consultar o modificar datos de otra persona.

**Acceptance Scenarios**:

1. **Given** un Inquilino o Gestor autenticado, **When** modifica un campo permitido de su perfil y guarda, **Then** el cambio permanece tras recargar, sin modificar campos no editados.
2. **Given** una cuenta de otro usuario o rol, **When** se intenta leer o alterar su información privada, **Then** no se exponen datos sensibles ni se permiten modificaciones no autorizadas.
3. **Given** datos inválidos o un intento de alterar rol, permisos, Cupo o titularidad desde el perfil, **When** se intenta guardar, **Then** no se aplica el cambio y se muestra un mensaje comprensible sin información sensible.

### Edge Cases

- Cambio de página, filtro o acceso directo no amplía el alcance del Gestor/Delegado; tampoco lo hace una autorización retirada.
- Una lista vacía muestra recuento cero, no inventario ajeno como alternativa.
- Reintentar un guardado fallido o pulsar guardar repetidamente no multiplica Modalidades de precio ni Grupos; un rechazo no se muestra como éxito.
- El cambio de categoría no conserva como aplicables campos incompatibles ni destruye datos comunes silenciosamente; errores de validación se explican antes de confirmar el guardado.
- Duplicados históricos se distinguen de duplicados nuevos y no habilitan un borrado masivo automático.
- Descripción vacía y seña omitida son válidas; importes inválidos, negativos o con precisión no admitida no se guardan. Omitir la seña no equivale a registrar un pago.
- Al cerrar sesión deja de estar disponible la dirección privada; el detalle anónimo no la filtra en contenido oculto.
- Traducción parcial, servicio no disponible o contenido modificado sin traducción vigente se identifican como pendientes; el original nunca recibe prefijos `[EN]` o `[PT]` como traducción ficticia.
- Un error al guardar perfil no sustituye el valor persistido ni revela información de otro usuario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (N01)**: El espacio operativo DEBE limitar inventario, Grupos, recuentos, filtros y paginación al Gestor titular o al alcance autorizado del Delegado. Aceptación: historia 1, escenarios 1 y 3.
- **FR-002 (N01/N08)**: El acceso directo y toda escritura sobre Unidades y Grupos DEBEN aplicar el mismo aislamiento, impidiendo lecturas privadas y cambios entre espacios no autorizados. Aceptación: historia 1.2–1.3 y 2.4.
- **FR-003 (N01/N04)**: El marketplace DEBE conservar consulta pública de publicaciones habilitadas, sin exponer inventario privado, dirección privada ni ubicación exacta a visitantes sin sesión. Aceptación: historias 1.4 y 4.2.
- **FR-004 (N02)**: Cambiar la categoría de una Unidad DEBE persistir después de guardar y recargar y presentar campos compatibles con la categoría elegida. Aceptación: historia 3.1.
- **FR-005 (N03)**: Editor y publicación DEBEN presentar el mismo conjunto activo de Modalidades de precio e importes, excluyendo las eliminadas. Aceptación: historia 3.2.
- **FR-006 (N03)**: Crear, editar o eliminar una Modalidad de precio DEBE afectar únicamente la modalidad pretendida, persistir tras recarga y no generar duplicados por edición o reintento. La eliminación respeta el borrado lógico vigente. Aceptación: historia 3.3 y casos límite de guardado.
- **FR-007 (N03)**: Los duplicados preexistentes DEBEN conservarse sin borrado, fusión ni ocultación automática; el inventario de duplicados y cualquier propuesta de saneamiento se registran por separado. Aceptación: historia 3.4.
- **FR-008 (N04)**: El usuario autenticado DEBE ver la dirección guardada; si no existe, DEBE ver una ausencia explícita sin dirección inventada. Aceptación: historia 4.1 y 4.3.
- **FR-009 (N05)**: Título y descripción DEBEN ofrecer traducciones reales al idioma seleccionado o indicar explícitamente que están pendientes; ningún prefijo falso ni texto original sin identificar acredita traducción. Aceptación: historia 5.1–5.2.
- **FR-010 (N05)**: El botón y mensaje de WhatsApp DEBEN estar localizados en español, inglés y portugués. Aceptación: historia 5.3.
- **FR-011 (N05)**: El contenido existente pendiente de traducción EN/PT DEBE permanecer en un registro verificable hasta su traducción real; no se declara completado por un estado pendiente ni por una prueba simulada. Aceptación: historia 5.4.
- **FR-012 (N06)**: Inquilino y Gestor DEBEN poder editar y conservar tras recarga los campos permitidos de su propio perfil, sin habilitar cambios de rol, permisos, Cupo o titularidad. Aceptación: historia 6.1 y 6.3.
- **FR-013 (N06)**: La consulta y edición de perfil DEBEN proteger información privada de otras personas y roles. Aceptación: historia 6.2.
- **FR-014 (N07/N08)**: Un Gestor DEBE poder crear, abrir y recargar un Grupo con descripción/seña, sin ambas o con solo una; los valores suministrados DEBEN conservarse y la seña DEBE aparecer en el Grupo sin tratar su configuración como cobro. Aceptación: historia 2.1–2.3.
- **FR-015 (N08)**: La creación de Grupo DEBE respetar titularidad y alcance del Delegado, rechazar cruces no autorizados y permitir consultar inmediatamente el Grupo recién creado dentro del alcance permitido. Aceptación: historia 2.2 y 2.4.
- **FR-016 (N02/N03/N06/N07/N08)**: Los formularios DEBEN informar errores de validación, permisos o persistencia sin simular éxito, sin registros parciales y sin cambios colaterales. Aceptación: historia 6.3, historia 2.4 y casos límite.
- **FR-017 (N01–N08)**: Las vistas y flujos afectados DEBEN funcionar en web de escritorio y móvil responsive, con evidencia por escenario y actor pertinente; Android nativo no forma parte del alcance.

### Key Entities *(include if feature involves data)*

- **Gestor**: Titular de un espacio operativo con inventario, Grupos y perfil propios.
- **Delegado**: Actor con permisos limitados y alcance explícito dentro de un espacio de gestión.
- **Inquilino**: Usuario que consulta publicaciones y mantiene su perfil permitido.
- **Unidad**: Recurso del Gestor, con categoría, campos específicos, publicación, dirección y ubicación; distingue información pública de privada.
- **Grupo**: Agrupación del espacio de gestión con descripción y seña opcionales, conservando las relaciones de dominio vigentes.
- **Modalidad de precio**: Tarifa asociada a una Unidad con importe, condiciones y estado activo o eliminado lógicamente; conserva identidad al editarse.
- **Perfil**: Datos propios de una persona, con campos editables según rol y campos privados/no editables.
- **Contenido localizado**: Título y descripción asociados a idioma y estado real de traducción; separado de textos del botón y mensaje de contacto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (N01)**: El 100% de los casos de listado, paginación, recuentos, detalle directo y escritura con dos Gestores y un Delegado respeta el alcance; cero recursos privados ajenos visibles o modificados. Las publicaciones habilitadas siguen accesibles sin sesión.
- **SC-002 (N02)**: El cambio Casa→Cancha se guarda correctamente en escritorio y móvil responsive y mantiene categoría/campos coherentes tras dos recargas consecutivas.
- **SC-003 (N03)**: Tras crear, editar y eliminar una Modalidad de precio, editor y publicación coinciden en el 100% de las modalidades activas e importes después de recargar; cero duplicados nuevos y cero duplicados históricos eliminados automáticamente.
- **SC-004 (N04)**: El 100% de los detalles probados con dirección guardada la muestra con sesión y ninguno la revela sin sesión; los casos sin dirección no muestran un valor inventado, en ambas presentaciones web.
- **SC-005 (N05)**: En los tres idiomas, el 100% de botones y mensajes de WhatsApp corresponde al idioma elegido. Para cada título/descripción probado hay traducción real verificable o indicación de pendiente, y cero prefijos falsos.
- **SC-006 (N06)**: Ambos roles completan la edición de un campo permitido de su perfil, ven el valor tras dos recargas y comprenden la confirmación o el rechazo; cero datos sensibles de otro usuario expuestos en los intentos no autorizados.
- **SC-007 (N07/N08)**: Las cuatro combinaciones de descripción/seña se crean y consultan correctamente desde la interfaz real de grupos en escritorio y móvil responsive; el 100% de intentos de creación fuera del alcance se rechaza sin Grupo residual.
- **SC-008 (N01–N08)**: Cada observación cuenta con estado explícito y evidencia vinculada a sus criterios; cero cierres basados solo en fixtures, mocks o documentación histórica. N01–N06 incluyen cuentas reales y recarga; N07–N08 incluyen interfaz real de grupos.
- **SC-009 (N05)**: El registro identifica el 100% de los contenidos EN/PT pendientes hallados en el inventario acotado del catálogo, incluidos el prefijo falso y las dos traducciones ausentes reportadas. El backfill solo se cierra cuando todos los elementos inventariados tienen traducciones reales verificadas; la aceptación de mostrar pendientes no acredita este cierre.

## Assumptions

- [issues.md](issues.md) es la fuente de alcance y estado reportado. Esta especificación no modifica sus estados ni acredita ejecución nueva. La constitución vigente v2.1.1 gobierna aislamiento, evidencia, revisión y conservación de decisiones de dominio.
- Se reutilizan roles, permisos, campos de perfil permitidos, reglas de importes y relaciones de Grupo existentes. Su inventario y la matriz concreta de permisos/campos se documentan en el plan antes de implementar; esta feature no concede permisos nuevos ni redefine seña, pagos o Cupo.
- No se modifica la disponibilidad pública de publicaciones ni se concede acceso público a datos operativos. Una publicación pública no convierte su recurso operativo en legible/editable por otro Gestor.
- La prioridad es aislamiento N01, creación segura N07/N08, integridad N03/N02 y privacidad N04, seguidas de localización N05 y perfil N06; pueden ejecutarse lotes independientes sin ampliar el alcance.
- La evidencia local previa es información reportada, no aceptación nueva: N01 tiene corrección local de listado; N02/N03 tienen comprobaciones sintéticas; N04 tiene cambios de dirección reportados y verificación simulada; N05 tiene adaptador probado con mocks; N06 tiene pruebas transaccionales reportadas sin cierre de interfaz; N07/N08 tienen cambios y pruebas transaccionales reportados sin cierre con cuentas reales.
- Todos N01–N08 permanecen **por verificar** en sus criterios integrales. **Reportado** describe el hallazgo; **corregido localmente** describe solo la corrección demostrada en ese entorno; **por verificar** conserva los criterios sin evidencia suficiente; **bloqueado** identifica una dependencia concreta no disponible. Los estados parciales pueden coexistir para un mismo ID.
- Son dependencias pendientes las cuentas reales autorizadas para N01–N06, los escenarios de interfaz real de grupos para N07/N08 y el acceso autorizado para traducciones reales/backfill EN/PT. Cuando falten, se registra el bloqueo sin sustituirlos por fixtures ni mocks.
- Este pedido NO autoriza uso de cuentas productivas, despliegues, migraciones remotas ni acceso a secretos. Las operaciones que lo requieran necesitan autorización humana específica; no se registran credenciales, tokens ni datos personales de las capturas originales.
- Se conservan todos los cambios existentes. El saneamiento de duplicados históricos, nuevas funciones de cobro, cambios de decisiones de dominio y Android nativo están fuera de alcance.
- La especificación no acredita implementación. Codex supervisa plan/tareas/análisis y Agy ejecuta lotes directamente según autorización de Carlos del 2026-10-04. Los despliegues incrementales de fixes aceptados fueron autorizados aparte; no autoriza por sí sola migraciones remotas, datos de testers ni backfill.
