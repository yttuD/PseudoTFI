# B007c — review preparación

RISK: HIGH
EVIDENCE_PROFILE: DB | SECURITY | MIGRATION
SOL_REVIEW: FULL_AFFECTED_DIFF

Migración revisada: reemplazo conservador aceptable, NO cambiarla por ahora.
Test NO aceptable aún. Write sólo test010, evidence/N01/audit-runtime.md, harness
beta-isolation y authorization-runtime.md para feedback007a-final-corrections.

Correcciones concretas SQL:
- Quitar TODOS ON CONFLICT DO NOTHING y auth-schema-exists: host/schema real local
  obligatorio, conflictos abortan. auth.users dispara perfil; seed metadata gestor
  luego mutación protegida explícita rendo.allow_user_mutation para delegado dentro
  de transacción como tests008. Evitar doble INSERT users autoexistentes.
- Delegación requiere invitacion_id NOT NULL: fixture invitación propia aceptada
  + delegación con su ID, estado/checkconstraints reales. Usar esquema real.
- Claims auth.uid en SQL NO aplican RLS mientras ROLE postgres. Mutaciones positivas
  deben SET LOCAL ROLE authenticated; assertion logs privados bajo postgres entre
  operaciones, preservar claims. Atribución debeassert actor_id/rol/gestor/recurso.
- RLS UPDATE/DELETE de log pueden devolver 0, no throw: asertar cero affected y
  contenido inmutable, INSERT throws42501. No debilitar policy. Consultar tests004
  625-639 patrón exacto. No esperar error donde comportamiento actual0legítimo.
- plan22 actual sólo21 calls: ajustar plan a todas aserciones reales y agregar
  persistencia exacta para cadaupdate; pruebas rollback y no cruce deworkspace.
- Test retorno de INSERT y DELETE físico conserva acciones/metadata, actualmente
  migracióncubiertospero no probados. Si auditfailureatomicidad no probado decirlo.
- Actualizar evidencia: sin hashes/propertiesejecutadas declaradas comoPASS,
  tablasde alquileres sí tieneestado_pago, confirmar estado según schema no asumir.

Aplicar además brief antigravity-batch-007a-final-corrections.md sólo PREPARACIÓN
de 2 errores tests y redacción. NO ejecutar suite hasta aviso Codex (DBaúnroja).
No subagentes ni ejecución SQL/migration. Entrega <=1500 caracteres PREPARED.
