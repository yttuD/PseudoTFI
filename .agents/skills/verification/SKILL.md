---
name: verification
description: Instrucciones y reglas para verification
---
# SKILL: Verificación Pre-Entrega — El Checklist antes del Juez

Esta skill define **exactamente qué verificás vos mismo** antes de marcar una tarea como "lista para el Juez". El Juez evalúa calidad y corrección; vos ya filtraste los errores obvios.

---

## El checklist completo

Ejecutá este checklist **en orden** antes de cada entrega. Si algo falla, lo corregís antes de seguir.

### ✅ Bloque 1: El código existe y está donde debe

```
[ ] Todos los archivos creados/modificados existen en las rutas correctas
[ ] Las importaciones en cada archivo apuntan a rutas que existen
[ ] No hay rutas hardcodeadas que solo funcionan en tu entorno
[ ] Los archivos de configuración están actualizados si la tarea lo requería
    (package.json, tsconfig, next.config, etc.)
```

### ✅ Bloque 2: El código es válido

```
[ ] Sin errores de sintaxis (si el lenguaje tiene compilador/typechecker, lo corrés)
[ ] TypeScript: npx tsc --noEmit pasa sin errores
[ ] Python: python -m py_compile archivo.py pasa
[ ] Java: mvn compile pasa (o gradle build)
[ ] GDScript: el editor de Godot no muestra errores en Output
[ ] SQL: ejecutado contra la base real, no solo escrito
```

### ✅ Bloque 3: Las convenciones del proyecto se respetan

```
[ ] Los nombres siguen el patrón del proyecto (grep de ejemplos existentes)
[ ] La estructura de archivos/carpetas sigue la arquitectura existente
[ ] Los patrones de manejo de errores son consistentes con el resto del proyecto
[ ] Los comentarios y docstrings tienen el mismo estilo que el resto
[ ] Si el proyecto usa un linter, lo corriste y no hay errores nuevos
```

### ✅ Bloque 4: La funcionalidad se verificó en la realidad

```
[ ] La funcionalidad principal se puede ejecutar (no solo compilar)
[ ] Si es una API: al menos un curl/request de prueba devuelve lo esperado
[ ] Si es SQL: las tablas/funciones existen, verificado con queries reales
[ ] Si es un componente UI: renderiza sin crashear en desarrollo
[ ] Si es un script: se ejecutó y terminó con exit code 0
[ ] Si hay tests automatizados: todos pasan (o los nuevos que fallaban ahora pasan)
```

### ✅ Bloque 5: No rompiste nada existente

```
[ ] El suite de tests completo corre sin nuevas fallas
[ ] Si no hay tests automatizados: revisaste manualmente los flujos que podría afectar tu cambio
[ ] Los componentes/funciones que dependen del código que modificaste siguen funcionando
[ ] El build del proyecto completo sigue pasando (npm run build)
```

### ✅ Bloque 6: Seguridad básica

```
[ ] Sin credenciales, API keys, passwords en el código
[ ] Sin datos de usuarios reales hardcodeados
[ ] Las variables de entorno se leen de process.env / .env, no están en el código
[ ] Las rutas de API que deberían estar protegidas, están protegidas
[ ] Las funciones SQL tienen set search_path = '' y permisos correctos
```

### ✅ Bloque 7: El reporte está listo

```
[ ] El formato del reporte sigue el estándar definido en SKILL-CORE.md
[ ] El reporte tiene evidencia real (outputs de comandos), no asunciones
[ ] Los archivos modificados están listados con rutas completas
[ ] Si hubo decisiones de diseño no especificadas, están documentadas
[ ] El reporte tiene la longitud correcta (30-80 líneas según SKILL-TOKEN-MANAGEMENT)
```

---

## Resultado del checklist

### Si todos los bloques pasan:
```
LISTO PARA JUEZ: SI
[Adjuntar reporte en formato estándar]
```

### Si algún bloque falla:
```
NO LISTO PARA JUEZ
Bloque fallido: [número y nombre del bloque]
Ítem fallido: [descripción exacta]
Acción tomada: [qué estás haciendo para corregirlo]
```
Corregís y corrés el checklist de nuevo desde el principio.

### Si después de 3 intentos un bloque sigue fallando:
→ Escalás según el protocolo de SKILL-ERROR-HANDLING.md.

---

## Casos especiales

### Tarea de solo documentación
Bloques 1, 3, y 7 aplican. Los demás son opcionales según contexto.

### Tarea de solo SQL/migración
Bloques 1, 2 (ejecutar contra la base), 4, 6, y 7 aplican con énfasis especial.

### Tarea de refactoring (sin nueva funcionalidad)
Todos los bloques aplican, con énfasis especial en el Bloque 5 (no romper nada).

### Tarea que incluye escribir tests
Bloque 4 incluye verificar que los tests pasan Y que cubren los casos definidos en el TASK_SPEC.


