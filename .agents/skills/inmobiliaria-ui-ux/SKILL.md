---
name: inmobiliaria-ui-ux
description: >
  Skill de diseño UI/UX premium para el Marketplace Inmobiliario (TFI).
  Establece el sistema de diseño, componentes, paleta, tipografía y patrones
  de interacción para todas las superficies del producto: marketplace público,
  panel del Gestor y landing Pro. Activar cuando se trabaje en cualquier
  componente visual del proyecto.
---

# UI/UX Pro — Marketplace Inmobiliario

> Basada en los principios de **ui-ux-pro-max-skill** (nextlevelbuilder),
> adaptada al dominio y stack específico de este proyecto.

---

## 1. Identidad del producto

**Producto:** Marketplace inmobiliario para alquiler en Goya, Corrientes.
**Audiencia:** Gestores (dueños/administradores de propiedades) y usuarios buscadores.
**Tono:** Profesional, confiable, directo — no frío. Cercano al estilo de Mercado Libre
pero más limpio y con foco en la gestión.

---

## 2. Design System

### 2.1 Paleta de colores

```
PRIMARIO:   #1A56DB  (Azul profesional — confianza, institucional)
SECUNDARIO: #0E9F6E  (Verde — disponibilidad, confirmación, positivo)
ACENTO:     #F05252  (Rojo coral — alertas, impago, suspendido)
NEUTRO:     #111827  (Casi negro — texto principal)
FONDO:      #F9FAFB  (Gris muy claro — fondo general)
SURFACE:    #FFFFFF  (Blanco — cards, panels)
BORDE:      #E5E7EB  (Gris claro — divisores, bordes)
MUTED:      #6B7280  (Gris medio — texto secundario, labels)
```

**Estados de Unidad → colores de badge:**
- Borrador: `#9CA3AF` (gris)
- Publicada: `#0E9F6E` (verde)
- Pausada: `#F59E0B` (ámbar)
- No disponible/Alquilada: `#6366F1` (índigo)
- En revisión: `#F97316` (naranja)
- Suspendida: `#EF4444` (rojo)
- Archivada: `#9CA3AF` (gris apagado)
- Bloqueada por impago: `#991B1B` (rojo oscuro)

### 2.2 Tipografía

```
Headings:   Inter — font-weight: 700/600
Body:       Inter — font-weight: 400
Mono:       JetBrains Mono — solo para valores numéricos (precios, fechas técnicas)
```

**Escala tipográfica (Tailwind):**
- `text-xs` → labels, badges, metadata
- `text-sm` → body secundario, formularios
- `text-base` → body principal
- `text-lg` → subtítulos de sección
- `text-xl/2xl` → títulos de página
- `text-3xl/4xl` → hero, landing

### 2.3 Iconografía

**Usar exclusivamente Lucide React** para toda la interfaz.
Phosphor Icons como alternativa si Lucide no tiene el ícono exacto.
**Prohibido usar emojis como íconos en la UI.**

```tsx
// Correcto
import { Home, Building2, Calendar, AlertTriangle } from 'lucide-react'

// Incorrecto ❌
<span>🏠</span>
```

### 2.4 Componentes base

**Stack de componentes:** shadcn/ui como base accesible + Tailwind CSS.
**Para efectos especiales en landing Pro:** Magic UI o Aceternity UI (solo landing, no en panel del Gestor).

```
shadcn/ui components prioritarios:
- Button (variantes: default, destructive, outline, ghost, link)
- Card, CardHeader, CardContent, CardFooter
- Badge (para estados de Unidad)
- Dialog, AlertDialog
- Form + Input + Select + Textarea
- Table (para listados de Unidades, Alquileres, Pagos)
- Tabs (para vistas del Gestor)
- Avatar
- Separator
- Skeleton (loading states)
- Toast / Sonner (notificaciones)
- Command (search)
- Calendar (para disponibilidad)
- Sheet (sidepanel en mobile)
```

---

## 3. Patrones de layout

### 3.1 Marketplace público

**Patrón:** Grid de Cards — estilo Mercado Libre / Airbnb
- Mobile: 1 columna, cards full-width
- Tablet (768px): 2 columnas
- Desktop (1024px+): 3 columnas, sidebar de filtros a la izquierda

**Card de Unidad:**
```
[Foto principal (aspect-ratio: 4/3)]
[Badge de estado si relevante]
[Título de la Unidad]
[Zona · Categoría]
[Modalidades de precio principales]
[Botón de contacto rápido]
```

### 3.2 Panel del Gestor

**Patrón:** Shell con sidebar colapsable + área de contenido principal
- Sidebar izquierdo (64px colapsado / 256px expandido)
- Header con breadcrumb + acciones contextuales
- Área de contenido con padding generoso (p-6 o p-8)

**Navegación principal del Gestor:**
```
- Dashboard (home)
- Mis Unidades
- Grupos
- Alquileres
- Inquilinos
- Delegados
- Métricas
- Facturación
- Configuración
```

### 3.3 Dev Dashboard

**Patrón:** Admin table-heavy, minimal visual polish
- Full-width tables con sorting/filtering
- Acciones en columna final (Suspender, Restaurar, etc.)
- Sin animaciones

---

## 4. Reglas de UI obligatorias

### 4.1 Accesibilidad
- Contraste mínimo texto/fondo: **4.5:1** (WCAG AA)
- Focus states visibles en **todos** los elementos interactivos
- `cursor-pointer` en todos los elementos clickables
- `prefers-reduced-motion` respetado — usar `motion-safe:` en Tailwind para animaciones
- Labels en todos los inputs del formulario (no solo placeholder)
- `aria-label` en íconos sin texto visible

### 4.2 Responsive
Breakpoints obligatorios a verificar: **375px, 768px, 1024px, 1440px**
- Mobile-first: escribir estilos base para mobile, escalar con breakpoints
- No usar posiciones fijas que rompan en mobile
- Tablas → en mobile usar card-list en lugar de scroll horizontal

### 4.3 Estados de carga
- Usar `Skeleton` de shadcn/ui para estados de carga de datos
- Nunca mostrar layout vacío o sin contenido de relleno mientras carga

### 4.4 Feedback al usuario
- Toda acción destructiva → `AlertDialog` de confirmación
- Toda acción exitosa → `Toast` con mensaje específico
- Errores de formulario → mensaje inline bajo el campo (no solo toast)
- Estados vacíos → ilustración + mensaje + CTA (nunca una tabla vacía sin contexto)

### 4.5 Anti-patterns PROHIBIDOS
- ❌ Gradientes purple/pink estilo IA genérica
- ❌ Glassmorphism excesivo en el panel del Gestor (solo landing Pro puede tenerlo con moderación)
- ❌ Animaciones en loops sin control del usuario
- ❌ Placeholders como único label del input
- ❌ Botones sin estado hover/focus
- ❌ Dark mode (no está en el scope de V1)
- ❌ Spinner infinito sin timeout ni mensaje de error alternativo

---

## 5. Mapeo dominio → UI

### Estados de Unidad como Badges
```tsx
const ESTADO_BADGE = {
  borrador:   { label: 'Borrador',    variant: 'secondary' },
  publicada:  { label: 'Publicada',   className: 'bg-green-100 text-green-800' },
  pausada:    { label: 'Pausada',     className: 'bg-yellow-100 text-yellow-800' },
  alquilada:  { label: 'Alquilada',   className: 'bg-indigo-100 text-indigo-800' },
  en_revision:{ label: 'En revisión', className: 'bg-orange-100 text-orange-800' },
  suspendida: { label: 'Suspendida',  variant: 'destructive' },
  archivada:  { label: 'Archivada',   variant: 'outline' },
  bloqueada:  { label: 'Bloqueada',   className: 'bg-red-900 text-white' },
}
```

### Tipos de Pago como labels
```
Seña   → badge azul   (bloquea calendario)
Pago   → badge verde  (pago regular)
Saldo  → badge índigo (pago final)
```

### Cooldown visual
Cuando una Unidad está dentro del cooldown de 15 días (archivar/desarchivar):
- Mostrar badge "En cooldown" con fecha de expiración en tooltip
- Deshabilitar el botón de cambio de estado con `disabled` + tooltip explicativo

---

## 6. Internacionalización (i18n)

- **3 idiomas**: español (`/es/`), portugués (`/pt/`), inglés (`/en/`)
- **Solo en**: marketplace público, panel del Gestor y landing Pro
- **Dev Dashboard**: español únicamente
- Usar `next-intl` o `i18next` — no hardcodear strings en ningún componente
- Las traducciones automáticas via API se guardan en la BD; el archivo de i18n solo contiene las claves de la UI del sistema (labels, mensajes de error, acciones)

---

## 7. Checklist pre-entrega de UI (correr antes de cada PR)

```
[ ] Breakpoints verificados: 375px, 768px, 1024px, 1440px
[ ] Contraste de texto: 4.5:1 mínimo
[ ] Focus states visibles con Tab
[ ] cursor-pointer en todos los clickables
[ ] Skeleton en todos los estados de carga
[ ] AlertDialog en acciones destructivas
[ ] Toast en acciones exitosas
[ ] Errores de formulario inline
[ ] Estados vacíos con CTA
[ ] Íconos Lucide (no emojis)
[ ] Sin hardcoded strings (usar i18n keys)
[ ] prefers-reduced-motion respetado
```

---

## 8. Componentes de referencia para consultar

| Componente | Librería | Cuándo usar |
|---|---|---|
| Wizard de búsqueda (3 pasos) | shadcn Stepper custom | Búsqueda inicial marketplace |
| Mapa de Unidad | Leaflet + React-Leaflet | Pin aproximado/exacto |
| Calendario de disponibilidad | shadcn Calendar / react-day-picker | Disponibilidad de Unidad |
| Editor de fotos (hasta 10) | react-dropzone + preview grid | Upload de fotos de Unidad |
| Tabla de Alquileres | TanStack Table + shadcn | Historial de alquileres |
| Gráfico de ingresos | Recharts o Tremor | Métricas financieras |
| Chat interno | Custom con Supabase Realtime | Mensajes Gestor-Usuario |

