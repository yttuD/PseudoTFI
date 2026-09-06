# ADRs candidatos — Marketplace Inmobiliario

Estas son las decisiones de la sesión de diseño que cumplen los 3 criterios para merecer un ADR (difíciles de revertir, no obvias sin contexto, resultado de un trade-off real). Cuando arranques el repo, cada una se puede volcar tal cual a `docs/adr/000N-slug.md`, numeradas en el orden en que las vayas creando.

---

## 0001 — Next.js con SSR/SSG en vez de SPA pura, empaquetado en Capacitor como WebView

El marketplace público vive de tráfico orgánico de Google ("cabaña en alquiler Goya"), lo cual descartaba una SPA React/Vite pura. Se decidió construir el sitio público con Next.js (indexable, con soporte multi-idioma vía rutas `/es/` `/pt/` `/en/` + hreflang) desplegado como sitio web normal, y que la app de Capacitor sea un WebView delgado apuntando a ese mismo sitio en vez de duplicar la UI. El panel del Gestor sigue siendo web-only, sin empaquetar.

## 0002 — Esquema de datos flexible para la heterogeneidad de tipos de Unidad

En vez de tablas rígidas por tipo (Departamento, Cabaña, Salón, Cancha...), cada Unidad tiene una categoría + un conjunto de atributos dinámicos (JSON). Permite agregar tipos de propiedad nuevos desde el dev dashboard sin migraciones ni deploys, a costa de que los filtros de búsqueda estructurados solo cubren los atributos comunes a todas las categorías (precio, radio geográfico, capacidad, fechas) — el resto de los atributos dinámicos quedan como información de la ficha, no como filtro.

## 0003 — Historial de Alquileres reemplaza al "contrato" como campo único

Cada vez que el Gestor marca una Unidad como alquilada, se crea un registro nuevo de Alquiler (con su propio rango de fechas, pagos y depósito) en vez de sobrescribir un campo fijo de "contrato". Es lo que permite que las métricas de ingresos por Unidad/Grupo/período sean reales, y que eliminar una Unidad no borre su historial de ingresos (se resuelve con borrado lógico).

## 0004 — Ningún cambio de estado es automático, salvo dos excepciones explícitas

Regla transversal de diseño: el Gestor siempre decide manualmente los cambios de estado de una Unidad (publicar, pausar, marcar alquilada, archivar/desarchivar). Las únicas excepciones son: (1) el bloqueo automático del calendario público cuando un Alquiler recibe una Seña, y (2) el paso a "Bloqueada por impago" al vencer el período de gracia sin pago confirmado. Se adoptó para evitar que el sistema tome decisiones sobre el negocio del Gestor sin su intervención (ej. archivar por error una Unidad con inquilino activo).

## 0005 — Modelo de Cupo con facturación prorrateada y cooldown anti-rotación

Subir el Cupo es autoservicio con cobro prorrateado inmediato; bajarlo pasa por el dev dashboard y aplica recién en el ciclo siguiente, sin reembolso. El auto-archivado al bajar excluye siempre las Unidades con un Alquiler activo, y toda Unidad archivada/desarchivada queda sujeta a un cooldown de 15 días antes de poder cambiar de estado otra vez — evita que un Gestor rote Unidades dentro y fuera del Cupo para exponer más de lo que paga.

## 0006 — Integración AFIP vía librería open source en vez de proveedor pago

Se descartó Xubio/Facturante (con costo desde el mes 2 por volumen) a favor de integrar directo los webservices de AFIP (WSAA + WSFEv1) con una librería open source para Node/TypeScript (`afip-apis`). Ahorra el costo recurrente del proveedor, a cambio de que el equipo se hace cargo de gestionar el certificado digital de AFIP por cada Gestor que factura y de manejar los estados de error del webservice directamente.

## 0007 — Geolocalización vía OpenStreetMap + Leaflet + Nominatim en vez de Google Maps

Se descartó Google Maps Platform (con costo por llamada más allá del crédito gratuito mensual) a favor de la pila abierta OpenStreetMap (datos) + Leaflet (mapa interactivo) + Nominatim (geocoding), sin costo de licencia. Dado el volumen de geocoding esperado en una sola ciudad, alcanza con el servicio público de Nominatim al inicio; si el uso escala, la salida es alojar una instancia propia o pasar a un proveedor de volumen sobre los mismos datos abiertos (ej. LocationIQ), no volver a Google.

## 0008 — Facturación Gestor → Inquilino como opt-in, mismo mecanismo que 0006

Cada Gestor que quiera facturarle a su inquilino carga sus propios datos fiscales (CUIT, condición fiscal) una vez en su perfil y factura desde ahí usando la misma integración AFIP de la ADR 0006 — la plataforma no asume ni valida el régimen fiscal de cada Gestor. Quien no lo activa sigue registrando pagos sin factura, sin perder ninguna otra funcionalidad.

## 0009 — Supabase (Auth + Postgres + Storage) en vez de Neon

Se reemplaza Neon (solo base de datos) por Supabase para este proyecto puntual — no para Turnos TPI, que mantiene su stack ya probado. La razón es que el modelo de permisos (Delegado × alcance × nivel Ver/Gestionar) se puede resolver con Row Level Security directamente en Postgres en vez de a mano en cada endpoint de NestJS, y Auth viene bundleado sin costo adicional en el mismo free tier. Se acepta como trade-off que Supabase no elimina la necesidad de un proveedor de SMS externo (Twilio/MessageBird/Vonage) para el OTP — solo orquesta el flujo, el costo por mensaje sigue estando.
