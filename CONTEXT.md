# Marketplace Inmobiliario

Plataforma que permite a dueños y administradores de inmuebles (edificios, cabañas, casas quinta, salones de eventos, canchas, etc.) publicar y administrar sus propiedades en alquiler en Goya, Corrientes, y a usuarios buscarlas y contactar directamente a quien las gestiona. La plataforma nunca procesa ni retiene el dinero del alquiler entre el Gestor y el usuario final — es una herramienta de gestión y descubrimiento, no una pasarela de pagos entre partes.

## Language

### Entidades principales

**Unidad**:
La entidad individual y alquilable — un departamento, una cabaña, un salón, una cancha. Es la entidad que se factura al Gestor, siempre 1:1, esté publicada o no en el marketplace.
_Avoid_: Propiedad, inmueble (como término de dominio; usar solo en lenguaje coloquial de cara al usuario)

**Grupo**:
Contenedor organizativo opcional, con nombre libre elegido por el Gestor, que agrupa Unidades relacionadas (ej. un edificio con 6 departamentos). No es una entidad de facturación ni de negocio — solo organiza la vista del Gestor.
_Avoid_: Bloque, edificio (como término de dominio)

**Gestor**:
Cuenta que administra una o más Unidades. Puede ser el dueño del inmueble o un tercero (ej. una inmobiliaria) que administra en nombre de otros. No es un tipo de cuenta separado — cualquier Usuario se convierte en Gestor al crear su primera Unidad.
_Avoid_: Administrador, dueño (como término exclusivo — un Gestor no siempre es el dueño)

**Delegado**:
Persona con acceso limitado a la cuenta de un Gestor. Necesita su propia cuenta ya registrada y verificada; se invita por el email de esa cuenta y acepta vía notificación en la app. Su alcance (cuenta completa / un Grupo / Unidades sueltas) y su nivel de permiso (Ver / Gestionar) se configuran por separado; nunca tiene acceso a Facturación.
_Avoid_: Colaborador, empleado

**Inquilino**:
Registro propio y libre del Gestor (nombre, documento, teléfono) para llevar el control de a quién le alquila. No depende de que esa persona tenga o haya usado una cuenta de Usuario.
_Avoid_: Cliente, arrendatario

### Facturación y Cupo

**Cupo**:
Número máximo de Unidades que un Gestor puede tener en estado Activa simultáneamente, determinado por lo que paga mensualmente. El total de Unidades creadas puede superar el Cupo si el resto están Archivadas. Subir el Cupo es autoservicio con cobro prorrateado inmediato; bajarlo puede hacerse desde el dev dashboard y recién aplica en el próximo ciclo de facturación.
_Avoid_: Plan, límite

**Modalidad de precio**:
Forma en la que el Gestor ofrece una Unidad en alquiler: unidad de tiempo (hora/día) + cantidad N + precio. Sin restricción técnica por categoría de Unidad. La interfaz calcula etiquetas amigables para casos comunes (1 día → Diario, 7 días → Semanal, 14 → Quincenal, 30 → Mensual); el resto se muestra literal (ej. "5 días").
_Avoid_: Tarifa, plan de alquiler

### Estados de la Unidad

- **Borrador**: creada, datos de marketplace incompletos, no visible públicamente.
- **Publicada**: visible y activa en el marketplace.
- **Pausada**: oculta temporalmente por decisión del Gestor, sin afectar el Cupo.
- **No disponible / Alquilada**: marcada manualmente por el Gestor, independiente de si cargó o no un Alquiler formal.
- **En revisión**: baja automática y preventiva al acumular 50 reportes de usuarios registrados y logueados; oculta al público y queda prioritaria en la cola de moderación. Distinta de Suspendida — es reversible sin dejar marca si el moderador determina que el reporte masivo era infundado.
- **Suspendida**: dada de baja por moderación (dev dashboard) tras revisión humana confirmada, ya sea por un reporte individual o por una Unidad que salió de En revisión con una violación real confirmada.
- **Archivada**: no cuenta para el Cupo ni la facturación; solo lectura (el Gestor ve historial y contratos pero no edita ni republica); sujeta a un cooldown de 15 días antes de poder desarchivarse o volver a archivarse, para evitar rotación abusiva del Cupo.
- **Bloqueada por impago**: automática al vencer el período de gracia (3-5 días) sin pago confirmado; no visible al público; el Gestor no puede reactivarla por su cuenta.

**Borrado lógico**:
Al eliminar una Unidad, esta desaparece por completo de la vista del Gestor (sin quedar ni como Archivada), pero el registro se conserva internamente para las métricas históricas (ej. "alquileres este año") y por obligaciones contables/impositivas.
_Avoid_: Eliminación (a secas, sin aclarar que es lógica de cara al Gestor)
Nota legal: un pedido de supresión total (Ley 25.326) se cumple sobre todo excepto los registros que la ley obliga a conservar por motivos contables/impositivos (facturas, pagos asociados a una factura emitida) — esos se conservan aislados, sin uso, mientras dure la obligación de retención.

### Alquileres y pagos

**Alquiler**:
Registro de un evento real de arrendamiento de una Unidad: rango de fechas (inicio y fin siempre definidos, editable/extendible si el inquilino se queda más tiempo), PDF de contrato opcional. Una Unidad acumula un historial de Alquileres a lo largo del tiempo — reemplaza al concepto de "contrato" como campo único.
_Avoid_: Contrato (como entidad — el contrato PDF es solo un adjunto opcional dentro de un Alquiler), reserva

**Pago**:
Registro manual dentro de un Alquiler: monto, fecha, método (texto libre), nota opcional, etiquetado por tipo (Seña / Pago / Saldo). Un Alquiler puede tener múltiples Pagos sin límite de cantidad — no hay un número fijo esperado.

**Seña**:
Pago inicial que, a diferencia del resto, bloquea automáticamente en el calendario público las fechas de ese Alquiler — a diferencia del estado general de la Unidad, que sigue siendo siempre manual. El Gestor decide si la exige o no, y para qué rango de fechas.

**Depósito**:
Monto adicional dentro de un Alquiler (típico de contratos largos) con resolución parcial: se registra un monto retenido y un monto devuelto (que suman el total del depósito), con un motivo opcional para lo retenido.
_Avoid_: Garantía, fianza

**Plan de pago**:
Configuración opcional dentro de un Alquiler: monto y frecuencia esperados, más una fecha máxima de tolerancia (ej. "el 10 de cada mes"). Habilita el cálculo de avisos de atraso, medidos contra la fecha de vencimiento esperada — nunca contra el último pago registrado. Visible para el Gestor dueño y para Delegados con permiso Gestionar sobre esa Unidad.

### Geografía

**Zona**:
Subdivisión de una Ciudad (ej. Goya: Centro / Sur / Norte) usada como filtro de búsqueda. Es un catálogo cargado manualmente desde el dev dashboard por ciudad — nunca inventado libremente por un Gestor ni calculado automáticamente por GPS.

### Auditoría

**Log de acciones**:
Registro de cambios de estado y datos con impacto real (crear/editar/archivar/desarchivar/eliminar Unidad, publicar/pausar, subir/editar contrato, aceptar/rechazar conversación de chat, invitar/quitar Delegado), tanto del Gestor dueño como de sus Delegados. Visible únicamente para el Gestor dueño de la cuenta.
