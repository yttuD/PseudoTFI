# Pi para Rendo — histórico, no ejecutar por defecto

> Desde 2026-10-19 el flujo activo está en `docs/GITHUB_WORKFLOW.md` y `AGENTS.md`.
> Este README conserva instrucciones antiguas; no autoriza iniciar Pi/Antigravity.

Esta instalación permite trabajar desde PowerShell con Pi y delegar a Antigravity CLI.
Todo está ligado a este repositorio de Rendo. Codex desktop no necesita estar abierto.
Sol decide y revisa; Gemini implementa y verifica; Spec Kit conserva los artefactos SDD.

También está construido el backend de **ChatGPT/Gemini web**, principal o fallback:
instalación de la extensión, vinculación y comprobaciones en [WEB-CHATS.md](WEB-CHATS.md).
Los chats reales deben validarse con ambos smokes después de instalarla.

## Inicio diario

Abrí PowerShell o Windows Terminal y ejecutá:

```powershell
Set-Location 'D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI'
node .pi/sdd/cli.mjs ui
```

Es la interfaz de terminal de Pi, con la extensión de Rendo cargada. No uses un `pi`
global para este flujo: podría cargar otra instalación, otros modelos o reglas distintas.
También podés iniciar con `powershell -File .\scripts\rendo-pi.ps1` desde la raíz.

Al abrirlo debe verse **Rendo listo · progreso en vivo v2**, sobre el campo para
escribir. Indica que la extensión está cargada; espera un objetivo para trabajar.

Dentro de Pi:

```text
/rendo-status
/rendo --feature specs/008-beta-observaciones-2026-10-02 Trabajá sobre las observaciones de la beta de Rendo. Completá primero los artefactos Spec Kit faltantes en este mismo directorio. Después ejecutá lotes pequeños, verificá y pedí converge con evidencia. Conservá los cambios locales existentes. Detenete si necesitás cuentas reales o autorización para producción.
```

`/rendo` inicia el workflow autónomo. Recibe un objetivo concreto y encadena fases,
delegación, revisión y correcciones. Al terminar muestra el resultado o la pregunta
imprescindible en Pi. Para responder una pregunta, iniciá otro `/rendo` incluyendo tu
respuesta y el objetivo; las decisiones duraderas y los artefactos persisten en disco.
El chat ordinario sirve para consultar a Sol; `/rendo` es el comando que despacha el trabajo.

Mientras corre `/rendo`, aparece un panel sobre el editor con indicador animado,
tiempo transcurrido, fase activa (Sol/Spec Kit, Gemini o revisión), última actividad
y cuatro eventos recientes. Se actualiza cada segundo y recibe las acciones reales
de los procesos. Si el proveedor tarda, indica el tiempo desde su última actividad;
no muestra porcentajes inventados. Al terminar conserva el estado final y muestra
el resultado o bloqueo. Estos eventos de pantalla no se envían al contexto de Sol.

Si tenés abierta una sesión anterior que sigue mostrando «esta sesión de Sol está
inactiva» y ningún panel, escribí `/quit` y volvé a ejecutar
`node .pi/sdd/cli.mjs ui`. Ese reinicio es necesario una vez: el launcher ahora usa
un cargador que evita conservar los módulos anteriores en memoria. El login se
conserva. Después podés usar `/reload` cuando no haya un workflow activo.
Si una fase intenta solicitarse a sí misma, el workflow se detiene para evitar
consumir cuota sin avanzar.

La feature 008 ahora tiene `issues.md`, `spec.md` y un `plan.md` en preparación;
`tasks.md` sigue pendiente. El sistema permite diagnóstico y preparación SDD;
bloquea implementación sin los artefactos requeridos. Haber instalado Pi no cierra
ninguna observación de la aplicación.

## Login propio, una vez

La conexión inicial a Sol se comprobó con el access token vigente de tu suscripción
en Codex. No se copió su refresh token. Para que Pi renueve su sesión por sí mismo:

```powershell
node .pi/sdd/cli.mjs login architect
```

En la pantalla de Pi escribí `/login`, elegí **ChatGPT Plus/Pro (Codex subscription)**
y completá el login en el navegador. Podés usar la misma cuenta y continuar con
`/rendo` en esa misma sesión: ahora también carga las herramientas de Rendo.
El login propio queda en `.pi/local/agent/auth.json`, ignorado por Git.
Tras un login propio el launcher deja de importar el acceso de Codex.

Si tenías abierta una pantalla de login de la versión anterior y `/rendo` responde
que no tiene herramientas, salí con `/quit` y ejecutá `node .pi/sdd/cli.mjs ui`.
El login ya guardado se conserva; no es necesario repetirlo.

Antigravity ya tenía un login de suscripción funcional. Si necesitás renovarlo:

```powershell
node .pi/sdd/cli.mjs login executor
```

Se abre el CLI oficial: seguí su login en navegador y cerralo cuando termine. Sus
credenciales quedan en el almacén oficial de Antigravity. No pegues claves en paquetes.
Los seis permisos MCP de Rendo ya fueron autorizados y agregados a sus preferencias.

Comprobaciones disponibles:

```powershell
node .pi/sdd/cli.mjs doctor
node .pi/sdd/cli.mjs smoke architect
node .pi/sdd/cli.mjs smoke executor
```

`doctor` verifica configuración local sin inferencias; los dos `smoke` consultan los
modelos reales y consumen una pequeña parte de la cuota. No es necesario repetirlos
en cada inicio. Si el login falla, renová únicamente el proveedor que falla.

## Dar un objetivo sin abrir la interfaz de Pi

```powershell
node .pi/sdd/cli.mjs workflow 'Prepará los artefactos SDD de la feature actual de Rendo a partir de issues.md; luego continuá con los lotes autorizados y evidencia.' --feature specs/008-beta-observaciones-2026-10-02
```

El proceso trabaja mientras esa terminal esté abierta. No es un servicio permanente
ni una tarea programada. Ctrl+C lo interrumpe; revisá el último resultado antes de
retomar. Si quedó `.pi/local/orchestrator.lock`, comprobá su PID con `Get-Process -Id
<pid>`: retiralo solo cuando ese proceso y sus hijos hayan terminado. No ejecutes
otro agente o edites los mismos archivos mientras corre un lote.

## Roles y delegación

| Rol | Modelo configurado | Responsabilidad |
| --- | --- | --- |
| Arquitecto | `openai-codex/gpt-6.1-sol`, high | Especificación, decisiones, plan, tareas, revisión, aceptación y converge |
| Ejecutor | `gemini-3.8-flash-medium`, medium, Antigravity CLI | Exploración acotada, código, debugging, tests, builds y evidencia |

Pi inicia un proceso nuevo de Sol con el estado compacto. Sol puede solicitar una
skill Spec Kit existente o registrar un `TASK_PACKET`. Ese proceso termina antes de
arrancar Gemini. Antigravity recibe su contexto separado, usa el MCP `rendo_sdd` y
registra un `RESULT_PACKET`. Pi registra códigos de salida, archivos modificados y el
diff del lote respecto del estado local inicial, preservando cambios anteriores. Review
NO inyecta ese diff automáticamente, tampoco en MEDIUM/HIGH: Sol lo lee explícitamente
por rutas y rangos dirigidos. Finalmente otro proceso de Sol decide `ACCEPT`, `CORRECT`
o `DECISION_REQUIRED`.

Solo `ACCEPT` marca los IDs del lote en `tasks.md`. Una corrección conserva el alcance
y el punto inicial del diff. Converge exige implementación aceptada y evidencia vigente
resumida por Gemini; solo permite añadir tareas, conservando el resto del documento.

El cambio de roles es automático. No cambies `/model` durante una sesión de Rendo.
Para elegir otro modelo de un mismo rol, primero consultá su catálogo:

```powershell
node .pi/sdd/cli.mjs models architect
node .pi/sdd/cli.mjs models executor
node .pi/sdd/cli.mjs configure architect gpt-6.1-sol openai-codex
node .pi/sdd/cli.mjs configure executor gemini-3.8-flash-medium
node .pi/sdd/cli.mjs doctor
```

No hay sustituciones silenciosas. Un modelo nuevo de Sol debe existir en el registro
de Pi; el catálogo adicional comprobado está en `.pi/sdd/models.json`.

## Spec Kit

Dentro de Pi están disponibles `/speckit.constitution`, `/speckit.specify`,
`/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.checklist`,
`/speckit.analyze` y `/speckit.converge`. Cargan las skills existentes de
`.agents/skills/speckit-*/SKILL.md`, una por invocación. No se reemplazaron ni editaron.

Ejemplo para preparar únicamente el plan:

```text
/speckit.plan --feature specs/008-beta-observaciones-2026-10-02 Planificá los cambios de la beta según su spec y la constitución de Rendo.
```

Equivalente desde PowerShell:

```powershell
node .pi/sdd/cli.mjs speckit.plan 'Planificá según la spec y constitución de Rendo.' --feature specs/008-beta-observaciones-2026-10-02
```

La implementación de tareas se enruta con `/rendo` y los paquetes del ejecutor.
Los scripts administrativos existentes de Spec Kit se conservan. Si agregás hooks
obligatorios de extensiones externas, necesitarán herramientas específicas para
ejecutarse; el agente debe informar el bloqueo, nunca declarar un hook cumplido sin
haberlo ejecutado. Actualmente el proyecto no tiene `.specify/extensions.yml`.

## Control del contexto y de la autonomía

| Límite por defecto | Valor |
| --- | --- |
| Estado inicial | 2.400 caracteres |
| TASK_PACKET | 9.000 caracteres |
| RESULT_PACKET final | 6.000 caracteres |
| Lectura individual | 6.000 caracteres |
| Lecturas totales de Sol por intervención | 24.000 caracteres |
| Lecturas totales de Gemini por intervención | 90.000 caracteres |
| Contexto de revisión | 28.000 caracteres |
| Lotes por workflow | 4 |
| Correcciones por lote | 2 |
| Transiciones por workflow | 16 |
| Turnos de Sol por intervención | 24 |
| Tiempo por intervención | 30 minutos |

Los límites se configuran en `.pi/sdd/config.json`. Son límites de caracteres y
ejecución; no prometen un gasto exacto de tokens. Los proveedores añaden instrucciones
propias y pueden contabilizar prefijos reiterados y caché. Pi guarda `usage.json` por
intervención; no inventa precios ni mide el porcentaje restante de la suscripción.

LOW normalmente revisa resultado y criterios; MEDIUM requiere leer rangos dirigidos
del diff afectado con contexto suficiente; HIGH exige el diff afectado entero y evidencia
ejecutable. Review no inyecta diffs automáticamente en ningún nivel. SECURITY/MONEY/
MIGRATION y auth/RLS/permisos/secrets nunca son PACKET_ONLY: requieren como mínimo
revisión dirigida. UI requiere Playwright y análisis de capturas reales por Antigravity;
Sol evalúa el informe técnico, no las imágenes/videos. Si el análisis no es suficiente,
Carlos revisa esas capturas en el chat antes de aceptación visual. Los logs completos quedan en disco y solo se leen ante fallos o inconsistencias
justificadas.

Usá el estado vigente sin releer PROJECT_STATE ni la constitución ya presentes en la
intervención. Antes de cada nuevo TASK_PACKET consultá `.pi/sdd/templates/TASK_PACKET.json`
o usá un contrato completo vigente ya incluido; reservá contexto para el contrato antes
de leer reglas. Tras dos rechazos del contrato sin registro, terminá con BLOCKED y el
error exacto del validador, sin bucles ni rebajar controles. Las tareas se solicitan por
IDs y las reglas especializadas son punteros a documentación existente.
Los contextos de implementación y sus eventos
no se copian al arquitecto. Al alcanzar un límite, retomá con otro `/rendo` desde los
artefactos persistidos. Para ahorrar más, reducí los lotes por ejecución, dividí cambios
grandes y pedí evidencia que responda directamente a los criterios de aceptación.

Para leer datos de texto desde PowerShell usá `Get-Content -Encoding UTF8` o una lectura
UTF8 explícita. `Length` de `Get-Item` son bytes, no caracteres. UTF8 es una prevención,
no un diagnóstico de causa; los conteos y mediciones actuales quedan pendientes hasta
su ejecución, sin extrapolar nuevos resultados del antecedente de suite 55/55.

## Git y publicación gradual de la beta

Carlos autorizó subir lotes de arreglos aceptados al repositorio actual y publicar
gradualmente. Staging/commit/push deben incluir solo el alcance validado de cada lote,
sin incorporar dirty work ajeno ni secrets; conservar la línea base local y evitar
staging indiscriminado. Verificá la conexión Git de Vercel y la revisión realmente
desplegada frente a la revisión aceptada: no asumas auto deploy después de un push ni
que un build exitoso identifica lo publicado. La beta no queda cerrada por esta política;
se mantienen bloqueos de cuentas reales/acceso y las autorizaciones específicas para
operaciones productivas ajenas al alcance. No modifica permisos de agentes.
En esta intervención documental no se realiza commit, push ni deploy.

## Archivos y límites prácticos

| Ubicación | Contenido |
| --- | --- |
| `.pi/sdd/config.json`, `models.json` | Roles, modelos y presupuestos |
| `.pi/sdd/agents/`, `rules/`, `templates/` | Instrucciones de roles, punteros y paquetes |
| `.pi/sdd/cli.mjs`, `runner.mjs`, `tools.mjs`, `core.mjs` | Entrada, routing y validación |
| `.pi/sdd/mcp.mjs`, `executor-gate.mjs` | Puente de Antigravity y control de herramientas |
| `.pi/runtime/sdd-extension.mjs` | Comandos y herramientas dentro de Pi |
| `.pi/runtime/package.json`, `package-lock.json` | Pi aislado, versión fijada 0.73.1 |
| `.specify/memory/PROJECT_STATE.md` | Estado operativo compacto, sin historial |
| `.specify/memory/decisions/` | Decisiones duraderas |
| `.pi/local/runs/` | Sesiones, logs, propuestas, revisiones y uso; ignorados |
| `<feature>/evidence/pi-sdd/<lote>/` | Resultado aceptado y decisión persistente |

Se fijó Pi 0.73.1 compatible con el Node instalado. El namespace nuevo de Pi requiere
una versión de Node posterior. Pi retiró los logins nativos de Google: por eso el
ejecutor usa el CLI oficial de Antigravity en lugar de OAuth Google dentro de Pi.

El MCP autoriza archivos exactos y comandos por ID. Un hook bloquea las herramientas
nativas de Antigravity, salvo leer los seis esquemas generados del MCP y finalizar.
Los comandos aprobados ejecutan programas reales con tus permisos: esto no constituye
un sandbox del sistema operativo. El inventario detecta cambios fuera del alcance en
archivos incluidos o no ignorados por Git; los archivos ignorados no están cubiertos
por ese inventario. Operaciones productivas y credenciales requieren autorización
específica. El sistema no revierte cambios automáticamente.

Los permisos MCP son persistentes y exactos, no un wildcard. El respaldo local de
preferencias anteriores está en `.pi/local/install/antigravity-settings-before.json`.
Para retirarlos, eliminá únicamente las seis entradas `mcp(rendo_sdd/sdd_...)` de las
preferencias de Antigravity, conservando los demás permisos.

En una instalación nueva del mismo repositorio:

```powershell
npm install --prefix .pi/runtime --ignore-scripts --no-audit --no-fund
node .pi/sdd/cli.mjs install-executor
node .pi/sdd/cli.mjs configure-executor
node .pi/sdd/cli.mjs login architect
node .pi/sdd/cli.mjs login executor
node .pi/sdd/cli.mjs doctor
node .pi/sdd/cli.mjs ui
```

`configure-executor` agrega los seis permisos exactos; usalo cuando quieras autorizar
esa instalación. El instalador verifica SHA512 del binario oficial antes de activarlo.
La suite local del orquestador se ejecuta con `node --test .pi/sdd/tests/*.test.mjs`; no ejecuta los tests
de la aplicación ni utiliza datos productivos.

Antecedente informado: suite local 55/55; no reejecutada en este mantenimiento
documental. Las mediciones actuales y la validación documental integral siguen
pendientes de evidencia y aceptación; ese antecedente no cierra la beta.
La evidencia histórica de conexiones a ambos modelos y del diagnóstico de Gemini
aceptado por Sol está en
`specs/008-beta-observaciones-2026-10-02/evidence/pi-sdd/rendo-orchestration-check/`.

Fuentes: [Pi 0.73.1](https://github.com/earendil-works/pi/tree/v0.73.1/packages/coding-agent),
[Antigravity headless](https://antigravity.google/docs/cli/headless),
[hooks de Antigravity](https://antigravity.google/docs/hooks/).
# Aviso de vigencia

Desde 2026-10-19 este coordinador se conserva como implementación histórica.
El flujo activo está en `docs/GITHUB_WORKFLOW.md` y `AGENTS.md` de la raíz.
No instalar ni iniciar Pi/Antigravity ni reconfigurar credenciales por este README.
Las reglas especializadas de `rules/` siguen vigentes bajo la constitución actual.

