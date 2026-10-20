# B007d — corrección final de fixture antes de ejecutar

RISK: HIGH
EVIDENCE_PROFILE: DB | SECURITY | MIGRATION
SOL_REVIEW: FULL_AFFECTED_DIFF

Mismo scope007d; no comandos, servidores, remoto, Git ni cambios de producto.
En SQL011 la delegación pending usa estado `pendiente` con gestionar/cuenta.
Eso viola el schema real: estado `aceptada_sin_configurar`, permiso/alcance/grupo
NULL. Corregir SOLO esa fila y confirmar conteo plan24 contra assertions reales.
No modificar la RPC ni inventar PASS. Entrega PREPARED <=800 caracteres.
