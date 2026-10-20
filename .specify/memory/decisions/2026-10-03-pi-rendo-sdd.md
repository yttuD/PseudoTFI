# Decisión: orquestación SDD exclusiva de Rendo

Fecha: 2026-10-03. Autoridad: pedido explícito de Carlos en este chat.

Pi coordina Spec Kit sin sustituirlo. Sol gpt-6.1-sol/high se ocupa de especificación,
arquitectura, planificación, revisión, aceptación y converge. El ejecutor es el CLI
oficial de Antigravity con gemini-3.8-flash-medium, autenticado por suscripción.
Pi retiró el OAuth de Google; no se reinstala ese proveedor ni se reutiliza su protocolo.
La extensión local limita las herramientas de Sol; el puente MCP aplica los mismos
contratos de archivos y comandos al ejecutor. Sol finaliza antes de iniciar Gemini.

Los paquetes, sesiones, logs y credenciales son locales e ignorados por Git. El estado
es un resumen de relevo. Las decisiones duraderas se registran aquí sin sobrescribir
decisiones anteriores. Solo criterios aceptados por Sol pueden marcar tareas completas.
Seguridad, dinero, migraciones, RLS, permisos y secrets requieren revisión dirigida.
El pedido vigente determina los roles de Pi; la constitución conserva los invariantes
de producto y evidencia existentes aunque todavía nombre Codex/Antigravity como clientes.

El catálogo local de Codex confirmó gpt-6.1-sol, contexto 272000 y esfuerzo high.
agy models confirmó gemini-3.8-flash-medium. No se sustituyen modelos automáticamente.
Se puede reutilizar únicamente el access token vigente de Codex, sin copiar su refresh
token; Codex conserva la renovación. Un login independiente de Pi es la alternativa.
Los precios de estos modelos no se inventan; se registra el uso de tokens reportado.

Límite: los comandos aprobados ejecutan herramientas reales con permisos del usuario.
El puente controla su invocación y detecta cambios fuera del alcance; no es un sandbox
del sistema operativo. Producción y cambios de decisiones requieren autoridad específica.
