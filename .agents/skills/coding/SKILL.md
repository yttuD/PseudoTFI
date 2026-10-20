---
name: coding
description: Instrucciones y reglas para coding
---
# SKILL: Coding — Buenas Prácticas Universales

Aplicá estas reglas en **cualquier stack o lenguaje**. Son no negociables.

---

## 1. Antes de escribir una sola línea

- **Leé el código existente** en los archivos que vas a tocar. No asumas cómo funciona, verificá.
- Si el proyecto tiene convenciones de nombrado, estructura de carpetas, patrones arquitectónicos — seguílos. Hacé `grep` de ejemplos existentes antes de inventar uno nuevo.
- Si la tarea no especifica dónde va algo, buscá dónde va lo más parecido que ya existe.

## 2. Principios de código que siempre se cumplen

### Nombres
- Nombres que explican **qué hace**, no cómo lo hace internamente.
- Sin abreviaturas salvo las universalmente conocidas (`id`, `url`, `db`, `req`, `res`).
- Funciones: verbos (`crearUsuario`, `validarToken`, `ejecutarMigracion`).
- Booleans: prefijo `es`, `tiene`, `puede`, `esta` (`estaActivo`, `tienePermisos`).

### Funciones
- Una función hace **una sola cosa**. Si necesitás el conector "y" para describirla, la partís.
- Máximo 20-25 líneas. Si crece, extraé helpers con nombre.
- Parámetros: máximo 3-4. Si necesitás más, usá un objeto de configuración.

### Estructura
- No más de 3 niveles de indentación. Si se anida más, refactorizás.
- Fail fast: validaciones y guards al principio, lógica principal sin anidamiento innecesario.
- Código duplicado → función compartida. Dos copias iguales ya es demasiado.

### Comentarios
- Solo comentás el **por qué**, nunca el qué (el qué lo dice el código).
- Si necesitás comentar qué hace una línea, el código necesita un mejor nombre.
- TODOs con contexto: `// TODO(Carlos): revisar cuando implementemos rate limiting`.

---

## 3. Por stack específico

### TypeScript / JavaScript
```
- Siempre tipado explícito. Sin `any` salvo que sea absolutamente inevitable (y ahí comentás por qué).
- Interfaces para contratos, Types para unions/aliases.
- async/await sobre callbacks o .then() chains.
- Importaciones ordenadas: librerías externas → internas → locales.
- No mutés arrays/objetos directamente: spread operator, map, filter, reduce.
```

### React / Next.js
```
- Componentes pequeños. Si supera 150 líneas, probablemente necesita dividirse.
- Props tipadas siempre con interface o type.
- Efectos secundarios en useEffect con cleanup si corresponde.
- No lógica de negocio en componentes de presentación.
- Server Components por defecto en Next.js App Router; 'use client' solo cuando es necesario.
- Cargá datos en el servidor cuando puedas, no en el cliente.
```

### SQL / Supabase / PostgreSQL
```
- Seguí las convenciones del proyecto: hacé grep de funciones existentes antes de escribir nuevas.
- set search_path = '' en todas las funciones (seguridad por defecto).
- RLS en todas las tablas nuevas sin excepción.
- grant execute explícito para los roles que necesitan la función.
- Nunca SELECT *; listá las columnas explícitamente.
- Índices en foreign keys y columnas usadas en WHERE frecuentes.
- Transacciones para operaciones que modifican múltiples tablas.
```

### Node.js / Scripts
```
- Variables de entorno por dotenv o process.env. Nunca hardcodear credenciales.
- Manejo de errores en todas las llamadas async (try/catch o .catch()).
- Scripts con salida clara: qué está haciendo, qué salió bien, qué falló.
- Exit codes correctos: process.exit(0) success, process.exit(1) error.
```

### Godot / GDScript
```
- Nombres de nodos descriptivos en la escena.
- Señales para comunicación entre nodos desacoplados.
- @export para valores configurables desde el editor.
- await para operaciones async (animaciones, timers, I/O).
- Separar lógica de juego de lógica de UI.
```

### Java / Spring Boot
```
- Una clase, una responsabilidad.
- Inyección de dependencias vía constructor (no @Autowired en campo).
- DTOs para request/response, Entities para persistencia. No mezclar.
- Excepciones custom con mensajes claros y HTTP status apropiado.
- Logging con SLF4J. Nunca System.out.println en producción.
```

---

## 4. Archivos que nunca tocás sin permiso explícito
- Archivos de configuración de entorno (`.env`, `.env.local`, `*.env.*`)
- Archivos de CI/CD (`.github/workflows/`, `Dockerfile`, configuración de deploy)
- Archivos de base de datos en producción
- Cualquier archivo que no esté en el alcance definido por el TASK_SPEC


