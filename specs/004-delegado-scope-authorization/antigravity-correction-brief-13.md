# Antigravity correction brief 13 — contraste real en editor de permisos

## Objetivo único

Corregir y demostrar visualmente el defecto de contraste que todavía aparece en modo oscuro en UI-008, UI-009 y UI-010 del editor de permisos de delegados. No cerrar esta tarea sólo porque las clases Tailwind parezcan correctas: las capturas actuales contradicen el código fuente y son la evidencia que manda.

## Contexto verificado por Codex

- Repositorio: `D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI`.
- Feature: `specs/004-delegado-scope-authorization`.
- Captura defectuosa de referencia: `evidence/screenshots/UI-008__gestor__scope-cuenta__375w__dark.png`.
- En UI-008/UI-009/UI-010 dark, el cuerpo del modal aparece lavado/gris y los textos blancos o azulados quedan con contraste muy pobre. El pie sticky se ve considerablemente más oscuro, lo que puede indicar un problema de capas/stacking u overlay, no solamente de tokens.
- `DialogOverlay` y `DialogPrimitive.Popup` usan ambos `z-50` en `apps/web/src/components/ui/dialog.tsx`.
- `DelegationAccessEditor.tsx` declara colores dark explícitos. No asumir por eso que el resultado renderizado es correcto.
- UI-017 ya fue estabilizado en el brief 12; no alterar ese comportamiento.

## Trabajo requerido

1. Reproducir UI-008, UI-009 y UI-010 exclusivamente con Playwright.
2. Antes de modificar, obtener desde Playwright para light y dark los estilos computados de:
   - backdrop/overlay;
   - popup del diálogo;
   - título y descripción;
   - una tarjeta de permiso no seleccionada;
   - resumen de alcance;
   - pie sticky.
3. Determinar la causa exacta. Inspeccionar también el orden de pintura/capas: `z-index`, stacking contexts, elementos en el punto central del modal con `document.elementsFromPoint`, opacidad y cualquier overlay que esté por encima del popup.
4. Corregir el producto en el nivel compartido correcto si la causa está en `dialog.tsx`; evitar un parche exclusivo para una captura. El backdrop debe quedar inequívocamente detrás del popup. No degradar los demás diálogos.
5. Mantener la paleta Rendo:
   - dark principal `#0B1428` / `#131F3C`;
   - texto principal `#F5F3EE`;
   - secundario `#AEB7C7`;
   - bordes `#293956`;
   - acento `#B89355` / `#D2AD68`.
6. Incorporar aserciones Playwright permanentes y objetivas para UI-008/UI-009/UI-010 que fallen si:
   - el backdrop queda por encima del popup;
   - el popup dark no tiene superficie oscura real;
   - título, descripción, tarjetas, resumen o pie no alcanzan contraste WCAG AA normal (4.5:1) para texto pequeño; para texto grande sólo puede usarse 3:1 cuando su tamaño/peso computado realmente lo habilite.
   Las aserciones deben usar los colores computados/renderizados, incluyendo alpha y fondo efectivo; no comparar solamente nombres de clases.
7. Conservar todas las aserciones funcionales existentes, tamaños táctiles >=44 px y contenido seleccionado visible.

## Verificación obligatoria

- `pnpm --filter web lint`.
- Ejecutar con Playwright el subconjunto UI-008, UI-009 y UI-010 al menos dos veces consecutivas.
- Capturar evidencia nueva para cada caso en 375, 768, 1024 y 1440 px, light y dark: 24 PNG en total.
- Todas las capturas deben mostrar el modal completo o una composición suficiente para juzgar título, controles, resumen y acciones.
- Entregar una tabla compacta con colores computados, contraste resultante y estado PASS para cada elemento exigido.
- Confirmar rutas exactas de las 24 capturas.
- Confirmar que no quedan servidores, listeners 3000/3001, archivos PID, `test-results` ni temporales creados por esta tarea.

## Límites

- No actualizar todavía el cierre global, `tasks.md` ni los informes finales de Feature 004; Codex revisará primero esta corrección.
- No debilitar, eliminar, omitir ni convertir en condicional ninguna aserción existente.
- No tocar contratos de dominio, autorización, API o base de datos.
- No iniciar trabajo de Feature 005.
- Eliminar solamente residuos creados por esta ejecución.

## Formato de entrega

Responder únicamente al completar la tarea con:

1. causa raíz demostrada;
2. archivos modificados y razón;
3. comandos y resultados exactos;
4. tabla de estilos/contrastes;
5. inventario de las 24 capturas;
6. limpieza realizada;
7. riesgos o pendientes reales (si ninguno, decir `ninguno`).
