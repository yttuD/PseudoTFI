# B010 — Verificación remota acotada de N01

RISK: HIGH
EVIDENCE_PROFILE: API | DB | UI | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

## Autoridad humana y límites

Carlos autorizó en este chat reanudar las pruebas remotas de N01 con hasta DOS
Gestores y UN Delegado temporales, archivando exclusivamente sus recursos de
prueba identificados, sin tocar cuentas de testers. NO autorizó eliminar
físicamente identidades Auth. Codex aceptó el cierre de recuperación local:
`unidades.archive.spec.ts` 6/6 y servicio recuperado sin nuevas modificaciones.
La ejecución sigue siendo manual por Antigravity; este archivo no la inicia.

Proyecto: `D:/Programacion-Cosas/Proyecto_inmobiliaria/TFI`.
Web: `https://rendo-beta-web.vercel.app`.
API: `https://rendo-beta-api.vercel.app`.
Supabase: `maeiuaketocznpogmtic` exclusivamente.
API publicada esperada: `dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN`.

## Criterios y fuentes mínimas

Fuente: `specs/008-beta-observaciones-2026-10-02/spec.md`, únicamente US1
(escenarios 1–4), requisitos N01 y SC-001; FR-017 para evidencia responsive.
No leer todo tasks/historial ni reabrir decisiones de producto.

Leer exclusivamente lo necesario en:
- `apps/web/e2e/beta-remote-n01-suite.spec.ts`.
- `apps/web/e2e/remote-tracking.ts`.
- `apps/web/playwright.remote.config.ts`.
- `specs/008-beta-observaciones-2026-10-02/evidence/N01/remote-fixtures-tracking.json`.
- `specs/008-beta-observaciones-2026-10-02/evidence/N01/unit-archive-deployment-verification.md`.
- `.pi/sdd/rules/SECURITY_RULES.md` y `DESIGN_RULES.md`.

AC1: inventario/paginación/recuentos y recuperación de página inválida verifican
contenido propio, ausencia de duplicados y ausencia de inventario ajeno.
AC2: acceso operativo cruzado y escritura no autorizada se rechazan sin cambios
persistidos; Delegado respeta permiso y alcance configurados. Separar acceso
público a publicaciones de acceso a datos operativos: no convertir un fallo
de aislamiento en PASS por el estado publicado de la fixture.
AC3: archivado de Grupo y Unidad por el dueño funciona y queda comprobado
por API/listados según sus contratos, sin acreditar eliminación física.
AC4: interfaz desktop y mobile responsive cuentan con capturas Playwright y
evaluación visual concreta de Antigravity; no equivalen a Android nativo.
AC5: cleanup lógico y revocaciones son acotados a IDs propios de esta ejecución,
se comprueban contractualmente y se conservan errores originales y de limpieza.
AC6: el informe vincula cada escenario de US1/SC-001 a evidencia o a un pendiente
explícito; no dar cobertura integral a escenarios que la suite actual no ejercita
(p. ej. inventario propio de Gestor B o marketplace anónimo, si no se prueban).

## Preflight y única ejecución autorizada

1. Registrar baseline del harness/config/tracking y Git sin mostrar secretos.
   Confirmar destinos exactos, deployment/alias vigentes, salud 200 y acceso sin
   sesión rechazado. Si el deployment difiere, informar antes de ejecutar.
   No publicar el árbol local: contiene cambios productivos recuperados pendientes.
   Su SHA-256 debe permanecer:
   `8016ca91a43c68cb9a3ee543daaf2a41e2ef86ab4feebb5f5cf94ee67d579081`.
2. Comprobar que sólo se selecciona la suite principal y que no hay hooks que
   creen/purguen cuentas adicionales. Limitar el lote completo, incluso ante
   timeout o respuesta incierta, a dos registros Gestor y uno Delegado.
   Si un registro queda incierto, registrar/reconciliar sin volver a registrar
   otra identidad. No lanzar una segunda ejecución ni la suite auxiliar.
3. Ejecutar UNA vez desde la raíz:

   `node apps/web/node_modules/@playwright/test/cli.js test beta-remote-n01-suite.spec.ts --config apps/web/playwright.remote.config.ts --workers=1 --retries=0 --repeat-each=1`

   No reiniciar por un fallo, timeout o resultado incompleto. Conservar evidencia
   y cleanup en finally. Un fallo real requiere entrega para revisión, no relajar
   aserciones, cambiar roles/estados para ocultarlo o desplegar una corrección.
4. Registrar los estados reales de las unidades usadas. La API publicada y el
   servicio local recuperado no son la misma versión. No usar resultados locales
   para afirmar comportamiento remoto ni confundir una publicación pública con
   autorización para leer el recurso operativo completo.

## Evidencia visual y preservación

Usar siempre Playwright y la carpeta de evidencia por batchId ya existente en
`specs/008-beta-observaciones-2026-10-02/evidence/N01/captures-remote/`.
Conservar capturas históricas. Desktop/mobile separados; 375 px, escritorio
y 768 px para paginación según suite. Declarar tamaños/tema/estado/actor exactos
y exclusiones; no afirmar matriz completa de breakpoints/temas si no se ejecutó.
Antigravity debe inspeccionar las capturas y documentar legibilidad, desbordes,
solapamientos, controles, estados vacíos/errores, navegación y paginación.
Si la evaluación visual no es suficiente, mostrar a Carlos las imágenes para
su devolución; Codex no realiza inspección visual de los medios.

No editar código productivo, migraciones, configuración global, autenticaciones
globales ni herramientas. No extraer archivos sobre el árbol de trabajo.
No modificar el harness/config en este lote; si necesita corrección, entregar
el defecto y propuesta dirigida antes de otra ejecución remota.

## Limpieza y entrega

Archivar lógicamente sólo Unidades/Grupos de este batchId; cancelar únicamente
invitaciones pendientes propias y revocar delegaciones propias según contrato.
No borrar físicamente filas ni identidades, no purgar por LIKE/prefijos y no
modificar fixtures históricos. Mantener su inventario de residuales intacto.
Usar tracking acumulativo, nunca truncarlo. Mantener `cleaned: false` mientras
persistan identidades Auth y marcar su purga como pendiente de autorización.
No imprimir contraseñas/tokens/cookies/service keys ni guardarlos en artifacts.
Cerrar únicamente contextos/procesos propios; conservar evidencia y respaldos.

Escribir `specs/008-beta-observaciones-2026-10-02/evidence/N01/b010-remote-verification.md`
y actualizar `.specify/memory/PROJECT_STATE.md` con estado compacto. Escrituras
permitidas: ese informe, tracking acumulativo, capturas por batchId y handoff.
No commit/push automático de artifacts sin revisión de alcance y secretos.

RESULT_PACKET <=500 palabras: PASS/FAIL por AC, escenarios no ejercitados,
comando/exit code y conteos reales, fingerprints de entorno/harness, batchId,
rutas de capturas y evaluación visual concreta, IDs propios y estado de cleanup,
identidades Auth residuales (sin secretos), errores y próximo paso preciso.
N01 permanece ABIERTO hasta decisión de Codex sobre todos sus criterios.
