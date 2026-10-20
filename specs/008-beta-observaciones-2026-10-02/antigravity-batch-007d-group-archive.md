# B007d — archivado grupos sin debilitar RLS

RISK: HIGH
EVIDENCE_PROFILE: DB | API | SECURITY | MIGRATION
SOL_REVIEW: FULL_AFFECTED_DIFF
Trabajo descubierto N01/T005, N07-N08. Preparar sin ejecutar hasta review.

Rojo comprobado Codex: test010 antes auditfix 12/33FAIL; despuésauditfix3/33FAIL
exactos20-22, SQLSTATE42501 al UPDATEgrupos deleted_at. API27/27directcalls verdes,
pero positive remove no cubierto. B007c auditfix aplicado SOLOlocal, no remoto.

Read: brief, SECURITY/DOMAIN_RULES pertinentes; GruposController.remove/service.remove,
SQLcan_manage_grupo_membership y grupos SELECT/UPDATE/DELETE policies incl migration
20261002030000. Test010 completo, harnessB007a pertinenteseams. No tasks/historial/env.
Hipótesis: SELECT deleted_at NULL se verifica sobre fila updated ->42501; WITHCHECK
can_manage_grupo descarta deleted rows; helper scope malresuelto. Probar schema real
sin tocar policiesglobales. Causa y safe alternative deben quedar precisas.

Decisión arquitectura: NO ampliar SELECT a archivados ni policies WITHCHECKtrue,
no adminclient.service remove bypass, no DELETE físico. Función RPC estrecha
public.archive_grupo(p_grupo_id uuid) SECURITY DEFINER search_path='' para softdelete
atómico sólo dueño gestor o delegado ACTIVO gestionar/CUENTA de ese workspace.
Auth.uid real requerido, public.user actor nondeleted/role/workspace validado,
can_manage_grupo_membership consistente; grupo lock FORUPDATE y verificar no deleted.
Bloquear delegado grupo/IDs/ver/pending/revocado, otrogestor/buscador/anon y reparent.
Evitar carrera revocación/configuración: lock apropiado de delegación pertinente,
orden compatibleRPCs existentes; explicar si evidencia no cubre carrera.
Preservar audittrigger atómico con auth.uid del caller, no logsmanuales, error notfound
genérico sin exponer grupoajeno. RevocarPUBLIC/anon y grantauthenticated/service_role
mínimo, no nuevosgrants/policies más amplios. Acción borrado no cobro ni cuota.

Write SOLO:
- supabase/migrations/20261005020000_group_archive_rpc.sql nuevo
- apps/api/src/grupos/grupos.service.ts SOLO remove cambia update/select por RPC
- apps/api/src/grupos/grupos.service.spec.ts SOLO remove unit regression RPCpayload
- apps/api/test/beta-isolation.e2e-spec.ts añadir positiva removeowner/delegadocuenta
  y negativas para scopegrupo/ver/ID/revocado/workspace DB/log intactos; cleanup propios
- supabase/tests/010_beta_operational_audit.sql ajustar seam: directoUPDATEdeleted
  esperadoDENIED/no persist/audit; RPC archive permitido+audit correcto. Mantener rojo
  original documentado, no cambiar otros tests verdes. INSERT/DELETEfísico test preservado
- supabase/tests/011_beta_group_archive.sql nuevo actor/scope/security regression
- evidence/N01/group-archive-runtime.md y audit-runtime.md/authorization-runtime.md
  sólo resultados honestos/fuente/nuevo seam y limitaciones
Antes sourcewritebaseline copia service y service.spec + harness/test010 SHA, usa
native file tools; no shell copias ni hashcommand improvisados (Codex prepara exacto).
No ejecutar/migrar/test ni SQLremoto, otros campos/productsource/UI/settings/git/deploy.
No subagentes, no nuevoany, alcance compacto.

Entrega PREPARED <=2000 caracteres. Codex revisa función/locks/privilegios y diff
serviceremove; después ejecuta localrojo-verde+HTTPUI pertinente en B007b. No marcar
N01N07N08 cerrados ni auditoría globalPASS mientrasSQLbatería todavíafalla.
