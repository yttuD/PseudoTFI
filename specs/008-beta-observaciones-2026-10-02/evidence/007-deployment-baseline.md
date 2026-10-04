# Baseline de publicación — 2026-10-04

Consulta de solo lectura mediante Vercel CLI 62.2.0 autenticada y API de proyectos.
No commit, push, enlace Git ni despliegue nuevo en esta comprobación.

| Proyecto | ID de producción actual | Estado | Git link |
| --- | --- | --- | --- |
| rendo-beta-api | dpl_3i2b2EdBhpRW7aMWsZr9LoHuRL3L | READY | null |
| rendo-beta-web | dpl_9KwKGgdyxdYLwGQsoBCaRfrdeMy3 | READY | null |

Ambos reportan meta.githubCommitSha=a23e7f593a641dac43c096b44854ac83153e989f,
githubCommitRef=codex/rendo-beta-deploy y gitDirty=1. Ese SHA **no identifica por
sí solo todo el código publicado**, pues se desplegó un árbol con cambios sin commit.
La API de proyecto indica ausencia de vinculación Git: un push no garantiza redeploy.

GET públicos actuales: API /health/live=200, /health/ready=200; web /es=200.
Son checks de disponibilidad, no aceptación funcional ni visual del lote nuevo.

Gate antes de publicación incremental: aceptar fix y reconciliar baseline publicado
con fuentes comprometidas para no revertir otros cambios previos. No activar Git
deploy ni publicar HEAD aislado suponiendo que equivale a la beta actual. Preservar
árbol sucio; staging explícito; nunca incluir .env, estado Auth, runtime ni logs.
Registrar fuente exacta, nuevo deployment ID/READY/alias y smoke del flujo afectado.
