# N01 — contención de clave de protección expuesta

Fecha: 2026-10-08 (America/Buenos_Aires).
Autoridad: Carlos autorizó expresamente revocar y reemplazar únicamente la clave
de bypass de protección del proyecto Web. Ejecución/revisión: Codex; incidente
administrativo acotado, sin implementación de funcionalidades nuevas.

RISK: HIGH
EVIDENCE_PROFILE: SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

## Alcance y aceptación

- Proyecto exacto: `rendo-beta-web`, `prj_ccBNuSoRrobUZtTwY8PpsYr8PlHR`.
- La clave literal de `remote-verification.spec.ts` coincidía con un bypass activo
  de alcance `automation-bypass`. Ningún valor secreto se reproduce aquí.
- Sesión existente de Vercel CLI; PATCH oficial del endpoint de protection-bypass
  mediante cuerpo por stdin: revocar la clave exacta y regenerar su reemplazo.
- Relectura: clave anterior ausente, exactamente una clave nueva y otras entradas
  preservadas. Configuración SSO y protección por contraseña sin cambios.
- Reemplazo conservado en Vercel; no se escribió en archivos locales ni se mostró.

## Evidencia ejecutada, no simulada

Ruta protegida: `https://rendo-beta-gvbwluonh-dutty.vercel.app/es`.

| Comprobación | Antes | Después |
| --- | --- | --- |
| Sin bypass | 302 | 302 |
| Clave expuesta | 200 | 302 |
| Clave nueva | No existía | 200 |

`https://rendo-beta-web.vercel.app/es` siguió respondiendo 200 sin bypass.
La ejecución de rotación/verificación terminó con exit 0.

## Contención local y límites

- Se retiró el literal y las dos llamadas a `setExtraHTTPHeaders` de la prueba
  remota. Conservadas ambas pruebas y sus comprobaciones originales; el alias
  público no necesita bypass. Sin nueva ejecución Playwright atribuida a este cambio.
- Validación sintáctica TypeScript: cero errores. No es un typecheck completo.
- Búsqueda literal de la clave revocada en 3219 archivos de texto del workspace:
  cero coincidencias. Excluidos dependencias, generados, sesiones, env y archivos
  mayores de 2 MB; no se afirma limpieza de toda la computadora.
- Logs/adjuntos históricos no fueron borrados. La credencial que contienen está
  revocada. No se modificaron usuarios, Supabase, API, otras claves, datos o Git.
- No se redeployó: la clave nueva funcionó en la ruta protegida existente. Las
  automatizaciones que usaban la clave anterior deberán adoptar el reemplazo sin
  escribirlo en código/logs; esta operación no actualiza sus variables locales.
- N01 sigue abierto por validación remota autenticada de gestores/delegados.

Referencia: https://vercel.com/docs/rest-api/projects/update-protection-bypass-for-automation
