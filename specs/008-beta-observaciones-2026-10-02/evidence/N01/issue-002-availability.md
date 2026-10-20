# Issue #2 — Revalidación de disponibilidad beta (sólo lectura)

Resultado: **DISPONIBLE en los checks de infraestructura autorizados**.
Esto NO acredita registro exitoso de usuarios, aceptación N01 ni paridad con handoff.

- Inicio: `2026-10-20T02:32:30.596Z`, equivalente a
  `2026-10-19 23:32:30 America/Buenos_Aires`.
- Origen: equipo Windows de Carlos, salida HTTPS desde su red local. No se recogió
  ni publicó la IP cliente ni direcciones privadas de su red.
- Baseline de documentación/código local: `305be3633decc5a1499da6fc766b653df5a41b6d`,
  rama `codex/github-handoff-2026-10-19`. No equivale a la fuente del deployment.
- Método: GET no autenticados para front/API; DNS local y DNS-over-HTTPS públicos;
  GET de salud/settings de Supabase con su clave publicable en memoria. Sin POST
  de Auth, sin cookies guardadas, sin cuentas, invitaciones ni tests mutantes.

## Observaciones actuales

| Recurso | Resultado | Latencia observada |
| --- | --- | --- |
| Web `/es` | HTTP 200, HTML recibido | 2279 ms |
| API `/health/live` | HTTP 200, `{"status":"ok"}` | 2533 ms |
| API `/health/ready` | HTTP 200, `{"status":"ok"}` | 4125 ms |
| Web `/es/auth/registro?portal=gestor` | HTTP 200 | consulta separada |
| Supabase `/auth/v1/health` | HTTP 200 | 456 ms |
| Supabase `/auth/v1/settings` | HTTP 200 | 107 ms |

Las latencias son muestras únicas, no un benchmark ni una garantía de rendimiento.
HTTPS completó con validación TLS estándar; no se deshabilitó la validación.

Settings públicos observados: `disable_signup=false`, `external.email=true`,
`mailer_autoconfirm=true`. La infraestructura de Auth responde y el registro por
email está habilitado; no se envió ningún formulario ni se creó una cuenta.

## DNS y hostname: hechos versus límites

Hostname contrastado: `maeiuaketocznpogmtic.supabase.co`.

- DNS local A: `104.18.38.10`, `172.64.149.246`.
- DNS local AAAA y CNAME: `ENODATA`, no NXDOMAIN. La ausencia de registros de esos
  tipos no impide la conexión IPv4 observada.
- Google DNS-over-HTTPS: HTTP 200, DNS Status 0, ambas direcciones A.
- Cloudflare DNS-over-HTTPS: HTTP 200, DNS Status 0, ambas direcciones A.
- Los 16 scripts iniciales de la página publicada de registro se consultaron en
  memoria y referencian ese hostname Supabase. No se archivaron bundles ni claves.

El **hostname efectivo configurado en la API remota no se pudo inspeccionar**:
la sesión estándar Vercel existente está caducada. No se imprimieron ni descifraron
variables privadas. Readiness 200 acredita su chequeo de dependencia, no demuestra
por sí solo qué hostname configuró el servidor ni su igualdad con el front.

## Deployment y estado administrativo

- IDs actuales de deployments Web/API y SHA de fuente: **DESCONOCIDOS** en esta
  comprobación. No se reutilizan IDs históricos como si fueran una inspección actual.
- Vercel: sesión estándar encontrada pero caducada; no se renovó, copió ni modificó.
- Supabase Management: no había sesión CLI estándar accesible; estado administrativo
  privado del proyecto no consultado. Salud pública de Auth sí comprobada.
- `READY` de Vercel no se usó como sustituto de readiness real ni de disponibilidad.

## Conclusión y coordinación

El NXDOMAIN/readiness 503 del 2026-10-13 **no se reproduce ahora**. Front, backend y
dependencia de Auth responden en los checks autorizados. No hay evidencia actual
que justifique corregir código por aquella caída o cambiar proveedor; tampoco se
determinó la causa administrativa del incidente anterior.

No se ejecutaron B010, SQL, migraciones, deploy, purga Auth ni cambios de DNS,
proveedor, configuración o credenciales. No se requiere fase de fix/regresión de
código para una caída que no se reproduce; este lote sólo registra el estado actual.

Siguiente: preparar PR acotado N01b de lectura y reportar la ejecución pendiente.
Crear fixtures, configurar alcance y revocar Delegados son mutaciones aunque el
test posterior use GET: separar esa preparación del alcance de diagnóstico de #2.
Antes de atribuir resultados a una revisión, acreditar deployment/fuente con sesión
Vercel válida. N01 permanece ABIERTO; no se declara aceptado por estos checks.
