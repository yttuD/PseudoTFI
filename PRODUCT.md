# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14 App Router, Tailwind CSS, shadcn/ui, Supabase.

## Users

- **Gestor (Administrador/Dueño):** Administra sus unidades, define modalidades de alquiler y visualiza reservas.
- **Inquilino (Usuario Final):** Busca unidades, filtra por fecha/categoría y realiza reservas.

## Product Purpose

Un marketplace inmobiliario de alquiler temporal y permanente en Goya, Corrientes, que elimina la fricción entre buscar disponibilidad y cerrar un alquiler, empoderando al Gestor con control total sobre sus unidades.

## Positioning

El único marketplace regional con reservas en tiempo real y modalidades de alquiler flexibles (por hora, día, mes) gestionadas directamente por los propietarios sin intermediarios bloqueantes.

## Operating Context

- **Gestor:** Usa el panel de control frecuentemente desde escritorio o móvil para actualizar estados de unidades (disponible/mantenimiento/reservada) y cargar fotos.
- **Inquilino:** Principalmente navegación móvil rápida, buscando disponibilidad urgente o planificada.

## Capabilities and Constraints

- Borrado lógico siempre, nunca DELETE físico en BD.
- El Gestor controla el estado de las unidades manualmente (excepto por 4 casos automáticos).
- Sin modo oscuro en V1.

## Brand Commitments

- Terminología canónica estricta: Unidad, Gestor, Alquiler, Cupo, Delegado, Inquilino.
- Colores: Primario #1A56DB, Secundario #0E9F6E, Acento #F05252.
- Tipografía: Inter y JetBrains Mono.
