# B007f — expectativa revocación real

RISK: HIGH
EVIDENCE_PROFILE: UI | API | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

PREPARACIÓN solamente, NO comandos/servidores/Git/remoto/subagentes. Nativefiles.
Lee SOLO bloque2.6 de apps/web/e2e/beta_isolation_real.spec.ts, su setup local,
revoke_delegacion en supabase/migrations/20260925120000_delegado_scope_authorization.sql
líneas1546-1624 y resolveAccessContext en authorization.service.ts líneas37-70.
No logs/historial/tasks/env. No implementación producto ni políticas/migraciones.

Contrato existente revoca antigua relación y restaura gestor independiente;
prueba actual requiere access-context-error y FALLA aun cuando devuelve dashboard
propio. No basta quitar assert ni convertirla en prueba vacía. Cambia SOLO2.6:
- Verificar DB perfil delegado revocado rolgestor/workspace_idNULL y relación
  revocada para gestorA+delegado exactos.
- HTTP tokenREAL /delegados/contexto actorgestor/ownerOnlytrue.
- UI inventario propio vacío, contador0de0, ninguna unidad/grupo de A o B.
- HTTP /unidades count0/data[], grupo listvacío; GET detalle viejaunitA1 y PATCH
  viejaunitA1 negados403/404, DBtituloA1 sin cambio. No filtrar resultados enJS.
- Mantener todos los otros asserts/casos; no forceclick ni casos skips.
Datos TestUser y fixtures ya presentes; obtener IDs propios de relación con filtros
exactos, nunca actor falseado. Los HTTP llamanAPI127.0.0.1:3201 directamente.
Puede mostrar dashboardpropio; NO aceptar acceso al antiguo workspace. No afirmar
que revocación elimina permisos personales propios.

Writeexact: bloque2.6 beta_isolation_real.spec.ts y N01/revocation-test-review.md
PREPARED con límites/ACs. Entrega RESULT_PACKET<=1300car, sin ejecutarpruebas.
