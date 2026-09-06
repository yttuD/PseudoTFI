# RENDA - Plataforma Inmobiliaria SaaS

RENDA es una plataforma inmobiliaria integral diseñada para revolucionar la manera en que se gestionan y alquilan espacios. El sistema funciona con una arquitectura multi-tenant orientada a resolver las necesidades tanto de administradores de propiedades (Gestores) como de los clientes finales.

Por un lado, provee un robusto panel de gestión donde las agencias inmobiliarias y propietarios pueden administrar sus unidades, controlar su facturación (SaaS) y coordinar equipos de trabajo mediante un sistema de roles y delegados. Por otro lado, ofrece a los usuarios finales un marketplace público, rápido y dinámico para explorar, buscar y descubrir la propiedad perfecta en alquiler.

Este proyecto fue desarrollado como Trabajo Final Integrador (TFI).

## 🚀 Core Features

- **Arquitectura SaaS Multi-Tenant:** Sistema de membresía y cupos para Gestores con integración real de pagos.
- **Autenticación Segura (OTP):** Login passwordless a través de SMS y correo electrónico, gestionado por Supabase Auth.
- **Control de Acceso (RBAC):** Jerarquía de permisos estricta entre Gestor (dueño), Delegado (colaborador) e Inquilino (cliente).
- **Marketplace Público:** Búsqueda y filtrado avanzado de propiedades (por precio, categoría, zona, etc.).
- **Integración con MercadoPago:** Pasarela de pago completa con procesamiento de webhooks para la habilitación automática de cupos y publicación de unidades.
- **Testing E2E Autónomo:** Suite de pruebas end-to-end estructurada en Playwright para garantizar la estabilidad de los flujos críticos.

## 🛠 Stack Tecnológico

El proyecto es un monorepo gestionado con [Turborepo](https://turbo.build/) y pnpm, dividido en frontend (web) y backend (api).

**Frontend:**
- [Next.js (App Router)](https://nextjs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- Componentes [shadcn/ui](https://ui.shadcn.com/)
- [Next-Intl](https://next-intl-docs.vercel.app/) para Internacionalización

**Backend & Base de Datos:**
- [NestJS](https://nestjs.com/)
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage + Edge Functions)

**QA & Testing:**
- [Playwright](https://playwright.dev/) para tests End-to-End.

## ⚙️ Guía de Instalación Local

Para correr el proyecto en tu entorno local, asegurate de cumplir con los prerrequisitos y seguir estos pasos:

### Prerrequisitos
- **Node.js** (v18+)
- **pnpm** (Gestor de paquetes)
- **Docker** (Debe estar corriendo para levantar Supabase localmente)
- **Supabase CLI** instalada.

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/yttuD/PseudoTFI.git
   cd PseudoTFI
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Levantar la base de datos local (Supabase):**
   Iniciá los servicios de Supabase utilizando Docker:
   ```bash
   npx supabase start
   ```

4. **Configurar Variables de Entorno:**
   Es necesario contar con los archivos `.env` en los directorios de `apps/api` y `.env.local` en `apps/web`.
   *(Ver la sección **Configuración de Entorno** más abajo).*

5. **Iniciar el Backend (NestJS):**
   En una terminal separada, corré la API:
   ```bash
   pnpm --filter api run start:dev
   ```

6. **Iniciar el Frontend (Next.js):**
   En otra terminal, levantá la web:
   ```bash
   pnpm --filter web run dev
   ```

La aplicación web estará disponible en `http://localhost:3000` y la API en `http://localhost:3005`.

## 🔐 Configuración de Entorno (.env)

El sistema requiere llaves para Supabase, Twilio y MercadoPago.

**Para el Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3005
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_local
```

**Para el Backend (`apps/api/.env`):**
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=tu_service_role_key_local
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_de_prueba
MERCADOPAGO_WEBHOOK_SECRET=tu_webhook_secret
```

> **💡 Nota sobre Webhooks de MercadoPago:** Para probar el flujo de pagos completo en local, necesitarás exponer tu puerto `3005` utilizando **Ngrok**. Luego, deberás configurar la URL generada (`https://tu-ngrok-url.app/webhook/mercadopago`) en el panel de desarrolladores de MercadoPago.

## 🧪 QA y Testing (Playwright)

El proyecto cuenta con una robusta suite de pruebas automatizadas que simulan interacciones reales en el navegador y verifican la salud de la aplicación.

Para ejecutar la suite de E2E (asegurate de tener la app corriendo localmente):
```bash
pnpm --filter web exec playwright test
```

Para ver la interfaz gráfica de Playwright durante la ejecución o debuggear visualmente los flujos (Login de gestores, pasarela de MP, búsqueda de clientes):
```bash
pnpm --filter web exec playwright test --ui
```
