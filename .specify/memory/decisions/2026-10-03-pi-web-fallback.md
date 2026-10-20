# 2026-10-03 · Backend web y fallback para Pi · Rendo

Carlos solicitó implementar los chats normales de chatgpt.com y gemini.google.com
conservando los roles del workflow SDD, además de poder usarlos como fallback.

- ChatGPT web: GPT 5.6 Sol, Alto, arquitectura y revisión. Gemini web: Gemini 3.8
  Flash, Avanzado, ejecución. Se comprueba la selección visible; no se sustituyen modelos.
- Pi conserva la ejecución local de las herramientas ya autorizadas. Las webs piden
  herramientas mediante un protocolo JSON; no reciben shell ni acceso directo a archivos.
- Una extensión local usa el navegador del usuario y un puente autenticado en
  127.0.0.1. Cada intervención abre una conversación nueva y se desactiva al cerrar
  el rol. No se altera la memoria ni la personalización global de las cuentas.
- Modo inicial CLI, fallback habilitado. Se activa solo ante un fallo de proveedor
  antes de acciones locales o entregas; después de acciones requiere retomar el lote,
  para evitar repetición. Los fallos de evidencia/implementación conservan la revisión SDD.
- Evidencia visual requiere entrega de las capturas y vistas previas visibles;
  un fallo de adjuntos bloquea la revisión. Uso de tokens web: no disponible.
- Instalación, vinculación y smokes reales pendientes. Se comprobó el código con
  transporte/worker local y páginas de prueba en Edge; no se acredita validación de
  selectores en las cuentas reales. Computer-use detuvo la inspección por no poder
  confirmar la URL del navegador y no se continuó controlando esa ventana.
- El workflow previo 008-plan-discovery-001 terminó con CORRECT: faltaron hallazgos
  verificables y rg no estaba disponible. Se agrega replanteo con TASK_PACKET nuevo
  ante herramientas inexistentes, en vez de repetir comandos inmutables; el límite
  de correcciones conserva la causa y última revisión en la salida visible.

Guía: `.pi/sdd/WEB-CHATS.md`. No autoriza deploy, migraciones remotas, Android ni
transferir secrets o datos de usuarios en paquetes.
