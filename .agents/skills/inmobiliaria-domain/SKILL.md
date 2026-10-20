---
name: inmobiliaria-domain
description: >
  Skill de dominio para el Marketplace Inmobiliario (TFI). Define el glosario
  de entidades, reglas de negocio críticas, invariantes del sistema y guías de
  implementación alineadas con la arquitectura definida en ARQUITECTURA-Y-PRODUCTO.md,
  CONTEXT.md y ADR-candidatos.md. Activar siempre que se trabaje en lógica de negocio,
  modelos de datos, endpoints de API o cualquier código que toque las entidades del dominio.
---

# Domain Skill — Marketplace Inmobiliario

> Esta skill sintetiza `CONTEXT.md`, `ARQUITECTURA-Y-PRODUCTO.md` y `ADR-candidatos.md`
> en guías accionables para el desarrollo. Los 3 archivos son la fuente de verdad; esta
> skill los referencia, no los reemplaza.

---

## 1. Terminología canónica (NUNCA usar los alias prohibidos)

| Término correcto | Evitar | Definición corta |
|---|---|---|
| **Unidad** | propiedad, inmueble | Entidad alquilable individual. Unidad de facturación 1:1. |
| **Grupo** | bloque, edificio | Contenedor organizativo opcional. NO es entidad de facturación. |
| **Gestor** | administrador, dueño | Usuario que crea su primera Unidad. No es tipo de cuenta separado. |
| **Delegado** | colaborador, empleado | Acceso limitado configurado por el Gestor. Requiere cuenta propia. |
| **Inquilino** | cliente, arrendatario | Registro interno del Gestor. No necesita cuenta en la plataforma. |
| **Cupo** | plan, límite | Máx de Unidades Activas simultáneas que paga el Gestor. |
| **Modalidad de precio** | tarifa, plan de alquiler | Unidad tiempo + cantidad + precio. |
| **Alquiler** | contrato, reserva | Registro de evento de arrendamiento con historial de pagos. |
| **Pago** | cuota, cargo | Registro manual dentro de un Alquiler. Tipo: Seña/Pago/Saldo. |
| **Depósito** | garantía, fianza | Monto adicional con resolución parcial (retenido/devuelto). |
| **Plan de pago** | cuotas | Config opcional de monto+frecuencia+fecha_max por Alquiler. |
| **Zona** | barrio, sector | Subdivisión de Ciudad, catálogo desde dev dashboard. |
| **Log de acciones** | auditoría, historial | Registro de cambios con impacto real, visible solo al Gestor dueño. |
| **Borrado lógico** | eliminación | Desaparece de vista del Gestor, conservado internamente. |

---

## 2. Estados de Unidad — máquina de estados

```
Borrador ──────────────────────────────► Publicada
   │                                        │
   │                                   ┌────┴────┐
   ▼                                   ▼         ▼
Archivada ◄── [auto: bajar Cupo] ── Pausada   No Disponible/Alquilada
   │
   └─► [cooldown 15 días] → puede desarchivar → Borrador
   
Publicada/Pausada → En revisión [AUTO: 50 reportes] → Suspendida [Moderador]
                                                     → Publicada [Moderador restaura, sin marca]

Cualquier estado ──► Bloqueada por impago [AUTO: vence gracia 3-5 días]
```

**Regla de oro: el Gestor controla el estado manualmente. El sistema solo lo cambia automáticamente en 4 casos:**
1. Bloqueo del calendario al registrar una Seña
2. Auto-archivado al bajar el Cupo (excluye Unidades con Alquiler activo)
3. Paso a Bloqueada por impago al vencer el período de gracia
4. Paso a En revisión al llegar a 50 reportes

---

## 3. Reglas de negocio críticas — no negociables

### Cupo y facturación
- La Unidad se factura desde el momento de **creación**, no desde que se publica.
- Una Unidad Archivada NO cuenta para el Cupo ni la facturación.
- **Cooldown de 15 días** entre archivar y desarchivar/re-archivar. Bloquear la acción con error claro si el cooldown no expiró.
- Subir el Cupo: autoservicio, cobro prorrateado inmediato, actualiza Mercado Pago Suscripciones.
- Bajar el Cupo: solo desde dev dashboard, aplica en ciclo siguiente, sin reembolso.
- Al bajar el Cupo: auto-archivar ordenando por fecha de creación más reciente primero, **excluyendo siempre Unidades con Alquiler activo**.

### Seña y calendario
- Una Seña bloquea automáticamente las fechas del Alquiler en el calendario público.
- El estado general de la Unidad (Publicada/Pausada/etc.) sigue siendo siempre manual.

### Delegados
- Solo puede invitar el Gestor dueño (no un Delegado).
- El invitado debe tener cuenta ya registrada y verificada.
- El Delegado NUNCA accede a Facturación ni al Log de acciones.
- Invitación via email → notificación in-app → el invitado acepta.

### Moderación
- Reportes válidos: solo usuarios registrados y logueados (no anónimos).
- Umbral: 50 reportes → automático a En revisión.
- Decisión humana: Suspendida (con marca permanente) o restaurada (sin marca).

### Impago
- Reintento automático de Mercado Pago: 2 veces en 2 días.
- Día 3 sin pago: todas las Unidades se archivan + cuenta completamente deshabilitada.
- No hay excepción por Alquileres activos en caso de impago.

### Ubicación
- Pin aproximado: visible sin login (al público).
- Ubicación exacta: solo tras login.

### Notificaciones críticas (nunca pueden desactivarse)
Los avisos sobre: impago, invitación de Delegado, contrato por vencer, atraso de Inquilino
van **siempre por ambos canales** (push in-app + email), sin opción de desactivar.

---

## 4. Stack técnico — decisiones tomadas (ADRs)

### No re-discutir (ADRs cerrados):

| ADR | Decisión | No usar |
|---|---|---|
| 0001 | Next.js (SSR/SSG) + Capacitor WebView | SPA pura / app nativa |
| 0002 | Unidad: categoría + JSON de atributos dinámicos | Tablas rígidas por tipo |
| 0003 | Historial de Alquileres (no campo "contrato" único) | Campo de contrato único |
| 0004 | Estado manual por el Gestor (4 excepciones automáticas) | Auto-cambios de estado |
| 0005 | Cupo con cooldown 15 días + prorrateado | Modelo de planes |
| 0006 | AFIP via `afip-apis` (Node/TS, open source) | Xubio, Facturante |
| 0007 | OpenStreetMap + Leaflet + Nominatim | Google Maps Platform |
| 0008 | Facturación Gestor→Inquilino como opt-in (misma integración AFIP) | — |
| 0009 | Supabase (Auth + Postgres + Storage) con RLS | Neon standalone |

### Stack por capa:
```
Marketplace público: Next.js + Vercel (plan comercial)
Panel del Gestor:    Next.js, web-only, Vercel
App móvil:          Capacitor WebView sobre el mismo Next.js público
Backend/API:        NestJS en Railway
Base de datos:      Supabase Postgres con Row Level Security
Auth:               Supabase Auth (OTP SMS via Twilio/MessageBird)
Storage:            Supabase Storage (fotos, PDFs de contratos)
Pagos plataforma:   Mercado Pago + Mercado Pago Suscripciones
Email:              Resend (o similar con capa gratuita)
Push:               Firebase Cloud Messaging
Geoloc:             OpenStreetMap + Leaflet + Nominatim
i18n:               next-intl (es/pt/en en marketplace y landing)
Traducciones auto:  DeepL/Google Translate API
```

---

## 5. Permisos por actor — mapa rápido

| Acción | Usuario | Gestor (dueño) | Delegado Ver | Delegado Gestionar | Dev Dashboard |
|---|---|---|---|---|---|
| Buscar Unidades | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver datos exactos ubicación | 🔒 login | ✅ | ✅ | ✅ | ✅ |
| Contactar Gestor | 🔒 login | — | — | — | — |
| Crear/editar Unidad | ❌ | ✅ (propias) | ❌ | ✅ (alcance config) | ✅ |
| Ver Alquileres/Pagos | ❌ | ✅ | ✅ (alcance) | ✅ (alcance) | ✅ |
| Crear Alquiler/Pago | ❌ | ✅ | ❌ | ✅ (alcance) | ❌ |
| Ver Facturación | ❌ | ✅ | ❌ | ❌ | ✅ |
| Cambiar Cupo (subir) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Cambiar Cupo (bajar) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver Log de acciones | ❌ | ✅ (solo dueño) | ❌ | ❌ | ✅ |
| Invitar Delegado | ❌ | ✅ | ❌ | ❌ | ❌ |
| Moderar/Suspender | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reportar Unidad | 🔒 login | ❌ (propia) | — | — | ✅ |

---

## 6. Modelo de datos — entidades clave

### Unidad
```typescript
interface Unidad {
  id: string
  gestorId: string
  grupoId?: string
  zonaId: string
  categoria: string                    // 'departamento' | 'cabaña' | 'salon' | etc.
  atributos: Record<string, unknown>   // JSON dinámico por categoría (ADR 0002)
  estado: EstadoUnidad
  // Datos de marketplace (opcionales, necesarios para publicar):
  titulo?: string
  descripcion?: string
  fotos?: string[]                     // max 10, URLs de Supabase Storage
  ubicacionAprox?: GeoPoint
  ubicacionExacta?: GeoPoint
  whatsapp?: string
  instagram?: string
  modalidadesPrecio: ModalidadPrecio[]
  // Gestión interna:
  creadoEn: Date
  archivadoEn?: Date                   // para cooldown
  deletedAt?: Date                     // borrado lógico
}

type EstadoUnidad = 
  | 'borrador' | 'publicada' | 'pausada' | 'no_disponible' 
  | 'en_revision' | 'suspendida' | 'archivada' | 'bloqueada'
```

### Alquiler
```typescript
interface Alquiler {
  id: string
  unidadId: string
  inquilinoId?: string
  fechaInicio: Date
  fechaFin: Date                       // siempre definida, editable/extendible
  contratoPdfUrl?: string
  depositoId?: string
  planPagoId?: string
  pagos: Pago[]
  creadoEn: Date
}
```

### Pago
```typescript
interface Pago {
  id: string
  alquilerId: string
  monto: number
  fecha: Date
  metodo: string                       // texto libre
  tipo: 'seña' | 'pago' | 'saldo'
  nota?: string
}
```

---

## 7. Superficies de API agrupadas por recurso

Para implementar en NestJS. El diseño exacto de rutas es trabajo de implementación:

```
/auth         → signup, login (OTP tel/Google), verificación, refresh
/unidades     → CRUD, cambio de estado, atributos dinámicos, fotos
/grupos       → CRUD, asignación de Unidades
/precios      → modalidades de precio por Unidad
/alquileres   → CRUD, extensión de fechas
/pagos        → registro, edición, eliminación
/depositos    → registro, resolución parcial
/planes-pago  → configuración, cálculo de atrasos
/inquilinos   → CRUD (CRM privado del Gestor)
/cupo         → upgrade (autoservicio), estado del cupo
/delegados    → invitar, configurar alcance/permiso, quitar
/busqueda     → search + filtros (marketplace público)
/favoritos    → guardar, listar, quitar
/chat         → conversaciones, mensajes (Supabase Realtime)
/reportes     → crear, umbral 50 → En revisión
/moderacion   → cola, suspender, restaurar (dev dashboard)
/notificaciones → listar, marcar leída
/metricas     → por Unidad, por cuenta, exportar CSV
/log-acciones → listar (solo Gestor dueño)
/zonas        → catálogo por Ciudad (solo lectura para todos, CRUD solo dev)
/facturacion  → AFIP plataforma→Gestor y Gestor→Inquilino (opt-in)
/dev          → gestión global: cuentas, pagos efectivo, moderar cupo
```

---

## 8. Guías de implementación por área

### RLS en Supabase (ADR 0009)
```sql
-- Ejemplo conceptual de policy para Unidades
CREATE POLICY "gestor_own_units" ON unidades
  FOR ALL USING (gestor_id = auth.uid());

CREATE POLICY "delegado_view" ON unidades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM delegados d
      WHERE d.gestor_id = unidades.gestor_id
        AND d.usuario_id = auth.uid()
        AND d.permiso IN ('ver', 'gestionar')
        -- verificar alcance (cuenta_completa | grupo_id | unidad_id)
    )
  );
```

### Atributos dinámicos (ADR 0002)
- El JSON de `atributos` se valida a nivel de aplicación con un schema por categoría.
- Los filtros de búsqueda estructurados (precio, zona, capacidad, fechas) usan columnas dedicadas.
- Los atributos específicos de categoría van en el JSON y se muestran en la ficha, pero no son filtrables.

### Borrado lógico
- Nunca `DELETE` físico en producción para Unidades, Alquileres, Pagos, cuentas.
- Usar `deleted_at` timestamp. Los queries siempre filtran `WHERE deleted_at IS NULL`.
- Excepción: registros contables (facturas, pagos a facturas) se retienen incluso ante pedido de supresión (Ley 25.326), aislados y sin uso.

### i18n (Next.js)
```
/es/[...slug]  → español (default)
/pt/[...slug]  → portugués
/en/[...slug]  → inglés
```
- Usar `next-intl` con `hreflang` en metadata para SEO.
- Auto-traducción via API se almacena en la BD (`unidades.titulo_es`, `titulo_pt`, `titulo_en`).
- La opción de edición manual por idioma sobreescribe la auto-traducción.

