# Sincronización inicial de Rendo con GitHub

Fecha: 2026-10-19. Repositorio público: `yttuD/PseudoTFI`.
Rama de handoff: `codex/github-handoff-2026-10-19` (no confundir con `main`).
Baseline local/remoto: `3cb5a47`, rama anterior `codex/rendo-beta-deploy`.
La rama principal remota observada antes de esta sincronización era `05a1f1a`.

## Qué se publica

- Código fuente y tests locales pendientes, explícitamente WIP, no aprobados como release.
- Todas las carpetas existentes de specs 001–008: requisitos, planes, tareas cuando
  existían, contratos, investigación y evidencia textual sanitizada.
- Spec Kit: scripts core, plantillas, workflows, decisiones y skills de integración.
- Reglas/agentes de proyecto, skills locales y nueve guías de apoyo que antes dependían
  del perfil de Carlos. No se publica el perfil global completo ni sus credenciales.
- Configuración versionable y manifests/lockfiles; `.env.example` con placeholders.
- Pi/Antigravity y sus briefs como historia inactiva. Gobernanza vigente v3.0.0,
  AGENTS.md y guía GitHub prevalecen sobre esos prompts y ejemplos antiguos.

Subir todos los archivos existentes NO completa requisitos ausentes. En particular,
`specs/003-modality-aware-availability/tasks.md` no existe localmente: no se inventó
ni se presentó como generado. N01–N08 conservan sus pendientes reales.

## Qué NO se publica (se conserva en esta máquina)

- `.env` reales, claves, tokens, cookies/sesiones `.auth`, configuración local de agentes,
  `.vercel`, credenciales, certificados/keystores y configuraciones Android de máquina.
- Dependencias instaladas, ejecutables de agentes, cachés, logs y builds regenerables.
- `snapshots/`, `snapshots-vercel/`, candidatos duplicados y respaldos de recuperación.
- Capturas/vídeos, HAR/trazas y documentos binarios de evidencia sin revisión de
  privacidad. Sus referencias históricas se conservan, pero esos medios no están
  disponibles desde GitHub y no acreditan aceptación nueva. Si el implementador los
  necesita, pedir a Carlos el artifact específico, sanitizado; no todo Downloads.
- Helpers locales de cuentas demo que pueden contener credenciales reutilizables.

Los archivos anteriormente versionados que ahora corresponden a sesión/caché o
evidencia no revisada se retiran sólo del índice de la rama; no se borran del equipo.
No se reescribe historia de Git. Esta operación no demuestra que la historia antigua
carezca de secretos; cualquier rotación/limpieza histórica requiere un lote específico.

## Auditoría reproducible

Desde raíz:

```text
node scripts/audit-github-sync.mjs
node scripts/audit-github-sync.mjs --manifest
git diff --cached --stat
```

El script inventaría archivos versionados y nuevos no ignorados, calcula hashes,
aplica exclusiones y busca patrones de credenciales sin imprimir valores.
`--stage` sólo añade las rutas explícitas auditadas y desversiona el estado privado
anterior conservando los archivos físicos. Ningún escáner prueba ausencia absoluta
de secretos; se complementó con revisión de candidatos genéricos, todos clasificados
como ejemplos, identificadores de protocolo, etiquetas o fixtures locales.
Las carpetas ignoradas no se confunden con material pendiente de publicación.

## Validación de esta sincronización

- Resolución oficial de `constitution-template`: correcta; no existe extensions.yml.
- Scripts core de Spec Kit sin modificaciones; plantilla tasks conserva la compactación
  previamente autorizada, no una nueva implementación de Spec Kit.
- Auditoría previa al commit: 1127 rutas publicables, cero patrones bloqueantes;
  17 rutas antes versionadas retiradas del índice conservando sus copias locales.
  No quedaron cambios publicables fuera del staging. Recalcular con el script si
  cambian las entradas; el conteo no incluye los directorios ignorados.
- `node --check scripts/audit-github-sync.mjs`: aprobado.
- Suite API real mediante runner instalado: **34 suites, 281 tests aprobados**.
  Comando: `node node_modules/vitest/vitest.mjs run --reporter=dot`, desde `apps/api`.
- El launcher pnpm disponible intentó un install implícito y falló al abrir su SQLite;
  no se presenta ese comando como aprobado ni se instalaron dependencias para eludirlo.
- No se verificó toda la UI, ni se cerraron errores de typecheck históricos ni criterios
  funcionales remotos. No hubo nuevas cuentas, migraciones, purga Auth ni deploy.
- `git diff --cached --check` detectó whitespace heredado en skills/documentación
  importadas. Se conserva como limitación del handoff; no se presenta como gate verde
  ni se reescribe evidencia histórica para ocultarlo.
- Última disponibilidad comprobada de beta (2026-10-13): front 200, liveness 200,
  readiness 503, dominio Supabase NXDOMAIN. No fue revalidada en este lote de GitHub.

## Siguiente paso para el chat implementador

Abrir la rama de handoff, leer AGENTS.md y PROJECT_STATE.md, y trabajar en un PR
acotado contra esta base. Empezar por diagnosticar la dependencia Supabase con Codex
y completar los criterios pendientes de N01. No asumir que `main` o la beta contienen
esta instantánea ni reutilizar autorizaciones antiguas para operaciones diferentes.
