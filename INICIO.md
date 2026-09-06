# INICIO — Marketplace Inmobiliario

> **Para Antigravity IDE:** Este archivo es tu punto de entrada al proyecto.
> Léelo completo antes de hacer cualquier cosa. Es tu briefing de arquitecto/ingeniero.

---

## 🎯 Qué es este proyecto

Un **marketplace inmobiliario** para alquiler en Goya, Corrientes, Argentina. Permite a
dueños y administradores de propiedades (Gestores) publicar y gestionar sus Unidades, y a
usuarios buscadores encontrarlas y contactar directamente al Gestor. La plataforma **nunca
procesa dinero** entre partes — cobra suscripción mensual al Gestor por Unidad administrada.

**Todo lo documentado es V1 — no hay funcionalidades diferidas.**

---

## 📂 Documentos de diseño en este directorio

| Archivo | Qué contiene |
|---|---|
| [`CONTEXT.md`](./CONTEXT.md) | Glosario canónico de dominio — la fuente de verdad terminológica |
| [`ARQUITECTURA-Y-PRODUCTO.md`](./ARQUITECTURA-Y-PRODUCTO.md) | PRD completo, stack técnico, ERD, reglas de negocio, integraciones |
| [`ADR-candidatos.md`](./ADR-candidatos.md) | 9 decisiones arquitectónicas justificadas y cerradas |

**Lee los 3 antes de escribir una sola línea de código.**

---

## 🧠 Skills activas para este proyecto

Estas skills están instaladas en Antigravity IDE y **debes activarlas** cuando trabajés en este proyecto:

| Skill | Activar cuando... |
|---|---|
| `inmobiliaria-domain` | Trabajés en lógica de negocio, modelos de datos, API, reglas de estado |
| `inmobiliaria-ui-ux` | Trabajés en cualquier componente visual, layout, diseño |
| `coding` | Siempre que escribas código (prácticas generales) |
| `security` | Trabajés en auth, RLS, inputs de usuario, APIs |
| `testing` | Escribás tests o verifiques implementaciones |
| `verification` | Antes de dar por terminada cualquier tarea |

---

## 🏗️ Arquitectura de arranque

### Stack decidido (ADRs cerrados — no re-discutir)

```
Frontend:    Next.js 14+ (App Router) — TypeScript estricto
App móvil:   Capacitor WebView apuntando al mismo Next.js público
Panel:       Next.js, web-only (mismo monorepo, rutas separadas)
Backend:     NestJS en Railway — TypeScript estricto
DB + Auth:   Supabase (Postgres + Auth + Storage + Realtime)
Hosting:     Vercel (plan comercial) para Next.js
Pagos:       Mercado Pago + Mercado Pago Suscripciones
AFIP:        librería open source `afip-apis` (Node/TS)
Mapas:       OpenStreetMap + Leaflet + Nominatim (no Google Maps)
Push:        Firebase Cloud Messaging
Email:       Resend (o similar)
OTP SMS:     Twilio/MessageBird via Supabase Auth
i18n:        next-intl (es/pt/en en marketplace y landing)
Traducción:  DeepL/Google Translate API
Componentes: shadcn/ui + Tailwind CSS
Íconos:      Lucide React
```

### Estructura de monorepo sugerida

```
TFI/
├── apps/
│   ├── web/              ← Next.js: marketplace público + landing Pro + panel Gestor
│   └── api/              ← NestJS: backend/API
├── packages/
│   ├── database/         ← Supabase migrations, types generados
│   ├── ui/               ← Componentes compartidos (shadcn/ui base)
│   └── types/            ← Tipos TypeScript compartidos (dominio)
├── CONTEXT.md
├── ARQUITECTURA-Y-PRODUCTO.md
├── ADR-candidatos.md
├── INICIO.md             ← Este archivo
└── package.json          ← Workspace root (pnpm workspaces)
```

---

## 🚦 Orden de implementación — Ruta crítica V1

### Fase 0 — Setup de infraestructura (PRIMERO)
```
[ ] Crear proyecto Supabase
[ ] Crear proyecto Railway (NestJS)
[ ] Crear proyecto Vercel (Next.js)
[ ] Configurar monorepo con pnpm workspaces + Turborepo
[ ] Setup Next.js 14 con App Router + TypeScript strict + Tailwind + shadcn/ui
[ ] Setup NestJS con TypeScript strict
[ ] Instalar next-intl (es/pt/en)
[ ] Configurar Supabase Auth (OTP SMS + Google OAuth)
```

### Fase 1 — Core de datos y auth
```
[ ] Schema de base de datos (migrations Supabase):
    Usuarios, Gestores, Unidades, Grupos, Zonas/Ciudades
[ ] Row Level Security básico para Unidades
[ ] Auth flow completo: registro con teléfono (OTP) + Google OAuth
[ ] Conversión automática Usuario → Gestor al crear primera Unidad
[ ] CRUD básico de Unidades (Gestor) con estados
[ ] Sistema de Cupo (contador + facturación Mercado Pago Suscripciones)
```

### Fase 2 — Marketplace público
```
[ ] Búsqueda y filtros (wizard 3 pasos + filtros avanzados)
[ ] Ficha de Unidad (fotos, descripción, precio, mapa Leaflet)
[ ] Pin aproximado (público) vs exacto (solo login)
[ ] WhatsApp link (wa.me con mensaje prellenado)
[ ] Chat interno (Supabase Realtime)
[ ] Favoritos
[ ] Reportes de Unidades
[ ] i18n: 3 idiomas en marketplace
[ ] Auto-traducción via API al publicar
```

### Fase 3 — Panel del Gestor
```
[ ] Dashboard principal con métricas resumen
[ ] CRUD Unidades con esquema dinámico por categoría (ADR 0002)
[ ] Gestión de Grupos
[ ] Historial de Alquileres (ADR 0003)
[ ] Registro de Pagos (Seña/Pago/Saldo)
[ ] Depósitos
[ ] Plan de pago con avisos de atraso
[ ] CRM de Inquilinos
[ ] Delegados (invitar, configurar alcance × permiso)
[ ] Log de acciones
[ ] Calendarios de disponibilidad
[ ] Upload de fotos (hasta 10) y PDF de contratos (Supabase Storage)
[ ] Métricas financieras con gráficos (Recharts) + exportación CSV
```

### Fase 4 — Integraciones y operaciones
```
[ ] Mercado Pago Suscripciones (ciclo de facturación, reintento, impago)
[ ] AFIP plataforma→Gestor (afip-apis)
[ ] AFIP Gestor→Inquilino (opt-in, misma integración)
[ ] Firebase Cloud Messaging (push in-app)
[ ] Resend (email transaccional)
[ ] Notificaciones críticas (impago, vencimientos, etc.)
[ ] Moderación (cola priorizada, dev dashboard)
[ ] Auto-archivado por impago y por baja de Cupo
[ ] Cooldown 15 días (bloqueo de archivar/desarchivar)
```

### Fase 5 — App móvil y landing Pro
```
[ ] Capacitor WebView (wrapper sobre el marketplace Next.js)
[ ] Build para Google Play (USD 25)
[ ] Landing Pro en 3 idiomas con tabla de precios
[ ] SEO: hreflang, SSG para rutas de marketplace
```

---

## ⚠️ Reglas de implementación — invariantes

1. **El Gestor controla el estado de sus Unidades.** El sistema solo los cambia
   automáticamente en 4 casos exactos (ver CONTEXT.md + ADR 0004). Si algo suena
   como "el sistema debería cambiar el estado cuando X", detente y confirmá con el
   arquitecto (Carlos) antes de implementarlo.

2. **La Unidad es la unidad de facturación**, publicada o no. Nunca cobrar por publicación.

3. **Cooldown de 15 días** entre archivar y desarchivar. Validar en backend Y bloquear en UI.

4. **Borrado lógico** en todos los niveles. Nunca `DELETE` en producción.

5. **Los Delegados nunca ven Facturación ni el Log de acciones completo.**

6. **RLS en Supabase** es la primera línea de defensa de permisos — no solo controles en
   el frontend o en el endpoint NestJS.

7. **TypeScript estricto** en todo el monorepo (`strict: true` en tsconfig). Sin `any`.

8. **No hardcodear strings** en componentes. Usar claves de i18n desde el primer componente.

9. **Mobile-first** en todo el CSS. Breakpoints: 375px, 768px, 1024px, 1440px.

10. **Verificar antes de reportar.** Nada está "listo" hasta que compila, tipea sin errores
    y los tests pasan.

---

## 🔑 Entidades y términos — guía rápida

Ver `CONTEXT.md` para el glosario completo. Los más importantes:

- **Unidad** = la entidad alquilable (depto, cabaña, salón, cancha...)
- **Grupo** = contenedor opcional de Unidades (no factura)
- **Gestor** = usuario que administra Unidades (puede ser dueño o inmobiliaria)
- **Delegado** = colaborador con acceso limitado
- **Inquilino** = registro propio del Gestor (no necesita cuenta)
- **Cupo** = máximo de Unidades Activas simultáneas
- **Alquiler** = historial de arrendamiento (reemplaza "contrato" como campo único)
- **Seña** = pago inicial que bloquea el calendario público

---

## 📋 ADRs cerrados — resumen para no re-discutirlos

| ADR | Decisión |
|---|---|
| 0001 | Next.js SSR/SSG + Capacitor WebView (no SPA pura, no app nativa duplicada) |
| 0002 | JSON dinámico para atributos de Unidad (no tablas rígidas por tipo) |
| 0003 | Historial de Alquileres (no campo "contrato" único) |
| 0004 | Estado manual por Gestor (4 excepciones automáticas exactas) |
| 0005 | Cupo con cooldown 15 días + facturación prorrateada |
| 0006 | AFIP via `afip-apis` open source (no Xubio/Facturante) |
| 0007 | OSM + Leaflet + Nominatim (no Google Maps) |
| 0008 | Facturación Gestor→Inquilino opt-in (misma integración AFIP) |
| 0009 | Supabase Auth+Postgres+Storage+RLS (reemplaza Neon para este proyecto) |

---

## 🚩 Cuándo escalar (parar y consultar a Carlos)

- Una decisión de arquitectura no especificada en los 3 documentos de diseño
- Una regla de negocio que parece contradecirse con el documento base
- Agregar una integración externa no listada en el stack
- Cambiar cualquier ADR cerrado
- Cualquier acción sobre producción real (credenciales, bases de datos reales, stores)
- Después de 3 intentos fallidos en algo que debería funcionar

---

## 🎨 Nota de diseño UI

El diseño visual (colores, tipografía, componentes específicos) está en la skill
`inmobiliaria-ui-ux`. Los mockups y el design system visual **están pendientes de definición**
con Carlos. No improvisar estilos — usar el sistema definido en la skill y escalar cuando
se necesite decisión visual no cubierta.

**Stack UI decidido:**
- shadcn/ui como base de componentes
- Tailwind CSS
- Lucide React para íconos
- Magic UI / Aceternity UI solo para landing Pro (no en panel del Gestor)
- Recharts o Tremor para gráficos de métricas

---

*Última actualización: Septiembre 2026 — Arquitecto: Carlos*
*Proyecto: TFI — Marketplace Inmobiliario, Goya, Corrientes*
