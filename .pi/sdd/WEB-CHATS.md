# ChatGPT y Gemini web para Pi · Rendo

El apartado web está construido como una extensión local para Edge/Chrome y un
puente que corre en PowerShell. No necesita Codex desktop, API keys ni las versiones
Work. Usa las sesiones que iniciás normalmente en chatgpt.com y gemini.google.com.

| Rol | Selección configurada | Trabajo |
| --- | --- | --- |
| Arquitecto/revisor | ChatGPT · GPT 5.6 Sol · Alto | Spec Kit, decisiones, lotes y revisión |
| Ejecutor | Gemini · Gemini 3.8 Flash · Avanzado | Leer alcance, proponer cambios y pedir verificaciones |
| Pi local | Orquestador existente | Ejecutar las herramientas aprobadas, comprobar resultados y conservar evidencia |

Cada intervención abre una conversación nueva. Al cerrar el rol se desactiva su
acceso al puente; después se abre el siguiente. Las pestañas quedan disponibles
para revisar lo ocurrido. La cuenta puede aplicar personalización propia del chat:
un chat nuevo separa las intervenciones, pero no constituye un aislamiento de la
memoria o configuración de la cuenta. No se cambian esas preferencias globales.

## Instalación, una vez

1. En Edge abrí `edge://extensions` (en Chrome, `chrome://extensions`). Activá
   **Modo de desarrollador**, elegí **Cargar descomprimida** y seleccioná:

   ```text
   D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI\.pi\browser-extension
   ```

2. Abrí normalmente [ChatGPT](https://chatgpt.com/) y
   [Gemini](https://gemini.google.com/app?hl=es) en ese mismo navegador. Iniciá sesión
   vos si hace falta y seleccioná los modelos/niveles anteriores. No se automatizan
   credenciales, verificaciones de identidad ni desafíos del navegador.

3. En una ventana de PowerShell, desde Rendo, iniciá el puente. Dejá esa ventana abierta:

   ```powershell
   Set-Location 'D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI'
   node .pi/sdd/cli.mjs web serve
   ```

4. En otra ventana de PowerShell, desde la misma carpeta, obtené el código:

   ```powershell
   node .pi/sdd/cli.mjs web pair
   ```

5. Abrí la extensión **Rendo · puente de chats para Pi**. Pegá el puerto y el campo
   `token` como **Código de vinculación** y pulsá **Vincular con Pi**. Debe mostrar
   **Conectado con Pi · Rendo**. El código se pega solo en esa extensión; no en los chats.

6. Comprobá la conexión y luego cada chat. Los dos smokes envían instrucciones de
   conexión y piden `RENDO_WEB_OK`; no leen archivos de Rendo ni tienen herramientas:

   ```powershell
   node .pi/sdd/cli.mjs web status
   node .pi/sdd/cli.mjs web smoke architect
   node .pi/sdd/cli.mjs web smoke executor
   ```

   Ambos smokes deben devolver `status: PASS`. `web status` confirma la conexión de
   la extensión y muestra la configuración; por sí solo no comprueba los modelos.

## Trabajar desde los chats web

Con el puente y el navegador abiertos, elegí web como backend principal:

```powershell
node .pi/sdd/cli.mjs web mode web
node .pi/sdd/cli.mjs ui
```

Dentro de Pi usá `/rendo` y las fases `/speckit.*` habituales. Por ejemplo:

```text
/rendo --feature specs/008-beta-observaciones-2026-10-02 Retomá el diagnóstico pendiente de plan. Emití lotes DISCOVERY más pequeños, con búsquedas PowerShell o git grep autorizadas y hallazgos efectivos por criterio. Conservá los cambios existentes y no pases a IMPLEMENT sin tasks y revisión aceptada.
```

También podés ejecutar `node .pi/sdd/cli.mjs workflow "objetivo" --feature specs/...`
desde PowerShell, sin abrir la interfaz de Pi. Las dos formas usan el backend
seleccionado en el archivo de configuración vigente.

El modelo mostrado en el pie del chat ordinario de Pi corresponde a su sesión
nativa. `/rendo` despacha el workflow por el backend configurado; su panel identifica
**ChatGPT web** o **Gemini web**. Para trabajar con las webs usá `/rendo`, no mensajes
ordinarios dirigidos a la sesión nativa de Pi. `/rendo-web-status` comprueba el puente.

## Usarlo solamente como fallback

La configuración inicial conserva los CLI como principales y habilita el fallback.
Después de vincular y comprobar ambos chats, podés mantener ese modo:

```powershell
node .pi/sdd/cli.mjs web mode cli
node .pi/sdd/cli.mjs web fallback on
```

Si un proveedor falla por cuota, autenticación o conexión antes de ejecutar acciones,
Pi abre un chat web nuevo para ese rol. No mezcla historiales entre proveedores.
Si ya hubo comandos, escrituras o una entrega SDD, detiene el lote antes de repetir
acciones. Los fallos de implementación, evidencia, alcance o revisión no activan un
fallback de proveedor: siguen el ciclo de corrección existente.

Para deshabilitarlo: `node .pi/sdd/cli.mjs web fallback off`.
Cambiar modo/modelos requiere que no haya un workflow activo.

## Si la selección o los controles no coinciden

El puente verifica el modelo y el nivel visibles antes de enviar. Puede elegir una
opción única desde sus menús; si no puede identificarla, se detiene con la causa.
Nunca sustituye el modelo requerido por otro disponible.

Los textos configurados deben corresponder a los que muestran los controles:

```powershell
node .pi/sdd/cli.mjs web model architect 'GPT 5.6 Sol' 'Alto'
node .pi/sdd/cli.mjs web model executor 'Gemini 3.8 Flash' 'Avanzado'
```

La interfaz web puede cambiar. En la extensión, **Ajustar controles del chat** permite
sobrescribir los selectores CSS de `composer`, `send`, `response`, `stop`, `model`,
`effort`, `modelOption`, `effortOption`, `file` y `attachment`, por proveedor. El
selector de modelo/nivel debe señalar un botón o selector real de la selección
actual; no sirve señalar todo el documento. Para `response` usá el contenedor de
respuesta del asistente, no el texto del usuario ni el historial completo.

Ejemplo de formato, con controles que deben confirmarse en tu pantalla:

```json
{
  "chatgpt": {
    "model": "button[data-testid='model-switcher-dropdown-button']"
  },
  "gemini": {}
}
```

Si un smoke falla, revisá el aviso y la pestaña creada antes de repetirlo. Si hubo un
envío pero no se recibió una respuesta, no se reenvía automáticamente. Comprobá la
pestaña y resolvé la causa antes de iniciar una intervención nueva.

Para revisión de UI, el puente requiere el control de archivos y vistas previas
visibles de las capturas adjuntas. Si no puede confirmar esa entrega, bloquea la
revisión; no acredita inspección visual. Los contadores de tokens de las webs no se
inventan: `usage.json` los registra como no disponibles.

## Estado de validación

Se probaron el transporte local autenticado, el worker de la extensión, la separación
de roles, herramientas reales de escritura/verificación, aceptación, bloqueos de
alcance y el fallback sin repetir acciones. El controlador de página se probó en
Edge sin interfaz, con páginas locales y red bloqueada: envío, respuestas nuevas,
selección, modelo cambiado, conversación antigua y adjunto con vista previa.

La inspección de tus páginas reales con computer-use se detuvo al no poder confirmar
la URL con suficiente confianza. No se siguió controlando esa ventana. No se instaló
la extensión en tu navegador ni se enviaron paquetes a los chats web reales en esta
puesta en marcha. Falta instalar/vincular y validar ambos smokes; los selectores
incluidos pueden necesitar ajuste a las interfaces de tus cuentas.

Sesiones, respuestas, código de vinculación y logs viven en `.pi/local/`, ignorado
por Git. El servidor solo escucha en `127.0.0.1`, autentica cada conexión y rechaza
orígenes web externos. La extensión no pide acceso a cookies, contraseñas, historial
general ni otros sitios; el protocolo no permite ejecutar shell arbitrario desde
el navegador.

Referencias de implementación: [content scripts aislados de Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts),
[WebSockets en service workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets).
