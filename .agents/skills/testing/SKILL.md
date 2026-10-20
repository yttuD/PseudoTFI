---
name: testing
description: Instrucciones y reglas para testing
---
# SKILL: Testing y Verificación — Cómo Verificar lo que Construís

## Principio: no reportés "completado" sin evidencia real

Completar una tarea significa que el código funciona en la realidad, no que fue escrito. Antes de marcar cualquier cosa como lista para el Juez, ejecutás verificaciones reales y mostrás el output.

---

## 1. Checklist de verificación mínima por tipo de entrega

### Para cualquier entrega

- [ ] El código compila / no tiene errores de sintaxis
- [ ] Los imports existen y son correctos
- [ ] No hay `console.log` de debug olvidados (salvo que sean parte del diseño)
- [ ] No hay código comentado sin explicación de por qué está ahí
- [ ] No hay credenciales ni secrets hardcodeados

### Para código TypeScript/JavaScript
```bash
# Verificación básica obligatoria
npx tsc --noEmit          # sin errores de tipos
npx eslint [archivos]     # sin errores de lint (warnings: reportar pero no bloquean)
```

### Para Next.js
```bash
npm run build             # build real, no solo dev
# Si el build pasa → la app está en estado deployable
# Si falla → no se reporta como completado
```

### Para SQL / migraciones de base de datos
```sql
-- Después de ejecutar, verificás que lo que tenías que crear existe:
SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'nombre_tabla';

SELECT routine_name FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name = 'nombre_funcion';

-- Verificás que las RLS están activas:
SELECT tablename, rowsecurity FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'nombre_tabla';
```

### Para APIs / endpoints
```bash
# Testeás con curl o herramienta equivalente
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"campo": "valor"}'
# El output real del curl va en el reporte
```

### Para scripts de Node.js
```bash
node script.js            # Ejecutás y mostrás output completo
echo "Exit code: $?"      # Verificás que salió con 0
```

### Para Godot
```
- El proyecto abre sin errores en la Output panel
- La escena modificada corre sin crashes
- Las señales se conectan correctamente (verificar desde debugger de señales)
```

---

## 2. Tests automatizados

### Si el proyecto ya tiene tests, siempre los corrés
```bash
npm test                  # o el comando que use el proyecto
npm run test:e2e          # si existen tests E2E
```

**Nunca skippeés tests existentes.** Si un test falla con tu cambio, lo reportás como problema, no lo silenciás.

### Si la tarea incluye escribir tests

Estructura estándar para cualquier test:
```typescript
describe('NombreDeLaCosa', () => {
  describe('cuando [condición específica]', () => {
    it('debería [comportamiento esperado]', async () => {
      // Arrange: preparar el estado
      // Act: ejecutar la acción
      // Assert: verificar el resultado
    });
  });
});
```

Casos mínimos que cubrís para cualquier función:
1. **Happy path**: input válido → output esperado
2. **Edge case**: input límite o vacío → comportamiento definido
3. **Error case**: input inválido o fallo → error manejado correctamente

### Tests E2E con Playwright
```typescript
// Siempre usás data-testid para los selectores que controlás
await page.locator('[data-testid="nombre-elemento"]')
// Nunca dependás de clases CSS o texto visible para selects de test
// (el texto cambia, las clases cambian; el data-testid es contractual)
```

---

## 3. Verificación de regresiones

Antes de entregar, verificás que no rompiste nada que funcionaba:

```bash
# Correr el suite de tests completo si existe
npm test -- --passWithNoTests

# Si no hay tests, hacer smoke test manual de los flujos críticos
# y reportar explícitamente cuáles revisaste
```

Si tu cambio toca código compartido (utilidades, hooks, componentes base), revisás manualmente dónde se usa y confirmas que sigue funcionando.

---

## 4. Formato del reporte de verificación

```
VERIFICACIONES EJECUTADAS:

✓ TypeScript: npx tsc --noEmit
  Output: [pegar output real o "sin errores"]

✓ Lint: npx eslint src/components/NuevoComponente.tsx
  Output: [pegar output real]

✓ Tests: npm test -- --testPathPattern=nombre.test
  Output: Tests: X passed, Y total

✓ Build: npm run build
  Output: [últimas líneas del output de build]

✓ Verificación manual: [qué comprobaste manualmente y cómo]

⚠ Warnings encontrados (no bloquean):
  - [lista si hay]

✗ PROBLEMAS ENCONTRADOS (bloquean entrega):
  - [lista si hay]
```


