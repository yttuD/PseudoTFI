---
name: security
description: Instrucciones y reglas para security
---
# SKILL: Security — Seguridad en el Código

Esta skill aplica a **cualquier stack**. Seguridad no es opcional ni "para después". Si construís algo inseguro, el Juez lo va a rechazar.

---

## 1. Credenciales y secretos — regla absoluta

**Nunca, en ningún archivo del repositorio, va una credencial, API key, password, token, o secret.**

```typescript
// ❌ NUNCA hacer esto
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const dbPassword = "miPasswordReal123";
const stripeSecret = "sk_live_...";

// ✓ SIEMPRE así
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const dbPassword = process.env.DB_PASSWORD;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
```

Antes de cada commit, verificás con:
```bash
git diff --cached | grep -iE "(password|secret|api_key|token|sk_live|sk_test)" 
# Si devuelve algo que no es una variable de entorno → no commitees
```

---

## 2. Autenticación y autorización

### Nunca confiés en el cliente
```typescript
// ❌ MAL — el cliente dice quién es, vos le creés
const userId = req.body.userId;
await db.getDataFor(userId);

// ✓ BIEN — el userId viene del token verificado en el servidor
const { userId } = await verifyToken(req.headers.authorization);
await db.getDataFor(userId);
```

### Verificás permisos en el servidor, siempre
- Ocultar un botón en el frontend **no es autorización**. El endpoint que ejecuta la acción también verifica permisos.
- En Supabase: RLS en todas las tablas. Si una tabla no tiene RLS activada, cualquier query con la `anon key` puede leer todo.
- En APIs REST: middleware de autenticación antes de cualquier handler que acceda a datos.

### JWT y sesiones
```typescript
// ✓ Verificar firma del token, no solo decodificarlo
// jwt.decode() NO verifica firma → nunca usarlo para auth
// jwt.verify() SÍ verifica → este es el correcto
const payload = jwt.verify(token, process.env.JWT_SECRET);
```

---

## 3. Validación de inputs

**Todo input externo es potencialmente malicioso.** Esto incluye: parámetros de URL, body de requests, headers, datos de formularios, archivos subidos, y cualquier cosa que venga de la base de datos si fue ingresada por un usuario.

### Validás tipo, formato y rango
```typescript
// ❌ MAL — usar el input directamente
async function getUser(req: Request) {
  const { id } = req.params;
  return db.query(`SELECT * FROM users WHERE id = ${id}`); // SQL injection
}

// ✓ BIEN — validar y usar parámetros
async function getUser(req: Request) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) throw new Error('ID inválido');
  return db.query('SELECT * FROM users WHERE id = $1', [id]); // parametrizado
}
```

### SQL: siempre queries parametrizadas
```sql
-- ❌ NUNCA concatenar strings en SQL
EXECUTE 'SELECT * FROM users WHERE email = ''' || user_email || '''';

-- ✓ SIEMPRE parámetros
SELECT * FROM users WHERE email = $1;
-- o en Node con pg:
await client.query('SELECT * FROM users WHERE email = $1', [email]);
```

### Sanitización de HTML (si renderizás contenido de usuario)
```typescript
// Si mostrás contenido ingresado por usuarios en HTML:
import DOMPurify from 'dompurify';
const safeContent = DOMPurify.sanitize(userContent);
// Nunca: element.innerHTML = userContent
```

---

## 4. Exposición de datos

### Solo devolvés lo que se necesita
```typescript
// ❌ MAL — devuelve todo el objeto incluyendo hash de password
return await db.getUser(id);

// ✓ BIEN — seleccionás solo los campos necesarios
return await db.query(
  'SELECT id, nombre, email, created_at FROM usuarios WHERE id = $1',
  [id]
);
```

### Mensajes de error seguros al cliente
```typescript
// ❌ MAL — expone internals del servidor
catch (error) {
  res.status(500).json({ error: error.message }); 
  // puede exponer: rutas, queries SQL, stack traces
}

// ✓ BIEN — mensaje genérico al cliente, error completo en logs
catch (error) {
  console.error('[getUserHandler] Error interno:', error);
  res.status(500).json({ error: 'Error interno del servidor' });
}
```

### En Supabase: cuidado con las funciones SECURITY DEFINER
```sql
-- Las funciones SECURITY DEFINER corren con permisos del owner (superuser)
-- SIEMPRE incluir set search_path = '' para evitar ataques de search_path
CREATE OR REPLACE FUNCTION mi_funcion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''   -- ← obligatorio en SECURITY DEFINER
AS $$
BEGIN
  -- ...
END;
$$;
```

---

## 5. Rate limiting y abuso

Si construís endpoints públicos o de autenticación, mencionás en el reporte al Juez que no tienen rate limiting implementado, para que Carlos decida si agregarlo. No lo implementás solo por las dudas, pero sí lo señalás.

```
Nota de seguridad: el endpoint POST /api/auth/login no tiene rate limiting.
Recomendación: agregar antes de ir a producción.
```

---

## 6. Archivos y uploads

Si la tarea incluye subida de archivos:
```typescript
// ✓ Validar tipo MIME real, no solo extensión
// ✓ Limitar tamaño máximo
// ✓ Nunca servir archivos subidos desde el mismo origen que la app (usar CDN/storage separado)
// ✓ Nunca ejecutar archivos subidos por usuarios
// ✓ Renombrar el archivo al guardarlo (no usar el nombre original del usuario)
```

---

## 7. Variables de entorno — checklist de verificación

Antes de cualquier entrega, verificás:

```bash
# Buscar credenciales hardcodeadas en el código que tocaste
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.sql" \
  -iE "(password\s*=\s*['\"][^'\"]+['\"]|api.?key\s*=\s*['\"][^'\"]+['\"]|secret\s*=\s*['\"][^'\"]+['\"])" \
  src/ scripts/ supabase/

# Si devuelve algo: analizarlo. Si es un valor real (no process.env.X) → corregir antes de commitear
```

---

## 8. Lo que reportás al Juez sobre seguridad

En el reporte, incluís una sección explícita si la tarea toca áreas sensibles:

```
SEGURIDAD:
✓ Sin credenciales hardcodeadas (verificado con grep)
✓ Inputs validados y sanitizados en: [lista de endpoints/funciones]
✓ Queries parametrizadas en: [lista]
✓ RLS activa en tablas nuevas: [lista]
✓ Permisos verificados en servidor (no solo en cliente)

⚠ Pendiente / no implementado en esta tarea:
- Rate limiting en POST /api/[ruta] (señalado para decisión de Carlos)
```

Si la tarea no toca ninguna área de seguridad → omitís esta sección del reporte.


