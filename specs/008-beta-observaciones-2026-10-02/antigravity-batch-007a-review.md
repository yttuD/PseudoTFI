# B007a — corrección de entrega

RISK: HIGH
EVIDENCE_PROFILE: API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Mismo alcance y SOLO los dos archivos del brief B007a. No product code, git,
deploy, settings, env, secretos remotos ni datos de usuarios. No leer historial.
Codex revisó diff afectado: entrega no aceptada aún por estos puntos concretos.

1. Cleanup regresó: restaurar comprobaciones de ausencia para TODAS las tablas
   propias: modalidades_precio, delegacion_unidades, invitaciones_delegados,
   log_acciones, users además de las actuales y Auth. Capturar errores de cada
   select/throw sin cortar las demás comprobaciones. IDs/gestor_ids de fixtures
   exclusivamente; comprobar también operaciones parciales. No declarar limpieza
   exhaustiva hasta evidencia ejecutada. No ignorar errores para hacer pasar tests.
2. RPC de configure en detalle delegado (actual línea788) debe verificar error.
   Verificar TODOS los errores de lecturas de DB antes de afirmar sin mutación.
   Comprobar eliminación de alquiler rechazada con permiso ver, nuevas modalidades
   no insertadas, alquiler nuevo no insertado y originales sin cambios exactos.
3. Anon test puede pasar vacío y no hay fixtures privadas: sembrar propias privada
   y soft-deleted públicas, registradas en cleanup desde creación. Restringir
   consulta anon a IDs propios, assert público presente, privado y deleted ausentes.
   Marketplace positivo+negativo con filtros propios/identificador test o paginar:
   no depender de que A1 aparezca en los primeros10 de DB compartida.
4. Cubrir grupos para delegado ver/gestionar en cuenta, grupo e IDs explícitos:
   lectura acotada, update/remove/create permitidos o rechazados según predicates
   reales y contrato; al menos negativo fuera de alcance y fuera de workspace y
   positivo relevante. No inventar GET ID. Cubrir getAlquileres de UnidadesController
   para lector en scope, fuera de scope y workspace, y mutation estado/modalidades
   fuera de scope/workspace. Separar revocación al final para no impedir pruebas.
   Cualquier fallo real = FAIL reproducible, NO cambiar producto ni debilitar test.
5. Evidencia precisa: direct guard/controller/service + Auth/PostgREST real, NO
   HTTP e2e; no prueba wiring, pipes, serialization o navegador. Excepciones no
   son respuestas HTTP observadas. Invitación fue insertada, no create RPC.
   Indicar explícitamente grupo vacío vs IDs vacíos (RPC puede rechazarlos).
   Incorporar SHA256 de harness y fuentes efectivas afectadas y limitaciones.

Mantener una suite compacta, helpers tipados si reducen repetición. No nuevo any.
Ejecutar los mismos comandos EXACTOS permitidos; prod tsc también permitido.
RESULT_PACKET <=2500 caracteres con criterios/comandos/exit/fallos reales/cleanup,
artifacts. No abrir todo tasks ni producir logs en respuesta.
