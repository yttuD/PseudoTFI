# B007a — dos correcciones puntuales de pruebas

RISK: HIGH
EVIDENCE_PROFILE: API | DB | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF
Write SOLO harness beta-isolation y evidence/N01/authorization-runtime.md.

1. Defecto del TEST: anonClient se reutilizó para signIn A,B,Delegado, queda con
   sesión Delegado EN MEMORIA aunque persistSession=false. El test llamado anónimo
   NO lo es. Cliente anónimo NUEVO no utilizado para signIn para query pública;
   assert auth.getSession.error=null/session=null antes de consulta. No signOut
   tokens usados por tests otros actores; usar cliente Auth separado por signIn.
2. Marketplace actual limit100 salta Max50 DTO y negativo depende primera página;
   eliminar variable timestamp inútil. Marcador único fixture mem en título que
   permanezca en update positivo; q marcador + limit50 (o paginar correctamente)
   prueba IDs propios exactos, pública incluida/privada/deleted excluidas.
3. Evidencia todavía usa 200 OK/404 HTTP pese sección limitaciones direct-call;
   reemplazar por retorno/excepción con status teórico explícito, no HTTP observado.
   No declaración PASS para anonimato hasta nueva ejecución.
4. Reusar dos comandos exactos vitest/tsc existentes después de aviso Codex sobre
   aplicación de audit migration LOCAL. Si preparación previa, devolver PREPARED,
   no repetir26PASS/1FAIL como verde ni usar DB remoto.
Entrega <=1500 caracteres, sólo cambios/hashes/tests. Sin subagentes.
