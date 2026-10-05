# B007c — aceptación puntual de auditoría

Codex, 2026-10-04. HIGH / DB SECURITY MIGRATION / FULL_AFFECTED_DIFF.
Revisión completa de función histórica y reemplazo19056E79A0618AC7F7F48B06903AB989F8F4F6348BF2E0FF0EA6A0118E8077E9.
Misma firma/SECURITY DEFINER/search_path vacío, actor/workspace/recurso/acciones,
sin nuevos grants/policies ni desactivar triggers. JSON usado sólo para extracción
local de deleted_at/estado; no se registra contenido completo de filas privadas.
La rama estado sólo se aplica a unidades. No captura errores de auditoría.

Regresión independiente real pgTAP local, test010 con33 aserciones y rollback:
- Antes: exit1, 12 fallos. SQLSTATE42703 exacto en grupos/inquilinos/modalidades,
  persistencia y logs correspondientes ausentes. Alquileres no mostró ese fallo;
  no generalizar error a una tabla que no lo reprodujo.
- Aplicación explícita `supabase migration up --local`: exit0, aplicada sólo
  20261005010000; histórico anterior último20261002030000.
- Después: exit1, sólo3 fallos20-22 por RLS de archivado grupos, independiente
  del registro. Los9 fallos ligados a auditoría desaparecieron; no llamar batería verde.
- Harness Auth/JWT/PostgREST REAL, clientes separados y anon sin sesión comprobada:
  vitest e2e beta-isolation exit0, 27/27, 7.12s, cleanup porIDs y ausencia DB/Auth.
  Invocación guard/controllers/services directa: NO listener HTTP ni Playwright.

Aceptación: reemplazo puntual del trigger sí; feature/archivado completo no.
B007d conserva la prueba roja de archivado y prepara RPC estrecha sin ampliar
lectura de filas archivadas. Prueba de atomicidad con fallo inducido aún no ejecutada;
atomicidad preservada por código/semántica transaccional, no afirmar evidencia extra.
Sin esquema remoto aplicado: autorización humana solicitada. Git/push no modifica DB
Supabase; Vercel tampoco aplica migraciones automáticamente. UI/beta sin nueva publicación.
SQL fixtures ejecutadas bajo transacción, rollback; no cuentas remotas ni datos testers.
