# B007e — correcciones terminales dirigidas

RISK: HIGH
EVIDENCE_PROFILE: API | UI | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

Preparación solamente: no comandos/tests/servidores/Git/remoto. Usar native files.
Mantener resto de B007e y baseline .tmp/rendo-b007e-baseline. No leer historial,
tasks ni secretos. Modificar exclusivamente los puntos siguientes:

1. unidades.service.ts findAll: PGRST103 por error.code EXACTO, nunca substring
   de message. Agregar unidades.isolation.spec.ts regresión otro código cuyo
   mensaje contiene PGRST103: debe 422 y NO HEAD/segunda consulta. Mantener todas
   las restricciones y recuperación solo from>=count válido.
2. QuickActionsDock wrapper: hidden md:flex justify-end mt-8. Eliminar conflicto
   flex/hidden/md:block y z-index inútil. Mantener enlaces/animación/en flujo.
3. Badge readonly mis-unidades/page: azul de paleta #131F3C para light, dorado
   existente dark. #0D203E no pertenece a la paleta aprobada.
4. beta_isolation_real.spec.ts medición contraste: convertir colores CSS
   computados válidos (incluido oklch) mediante canvas 2D sRGB con CSS.supports;
   color inválido/error debe FALLAR, nunca devolver blanco. Componer backgrounds
   de ancestros desde raíz hasta elemento con alpha, y foreground sobre fondo
   resultante. Exigir fondo efectivo opaco, rechazar medición no soportada
   (background-image/opacity<1/blend/filter relevantes), no afirmar un ratio si
   no hay medición fiable. Luminancia sRGB cutoff0.04045. Guardar ratio y colores
   medidos por proyecto en artifact JSON pequeño sin datos de sesión, al ejecutar.
   No cambiar umbral 4.5 ni usar force clicks. Baseline no tiene herramienta
   de contraste reusable; no nuevas dependencias.
5. N01/ui-runtime.md y failure-log.md: ratios teóricos NO son mediciones reales;
   estado PREPARED, AA pendiente ejecución. Corregir esa distinción.

Entregar RESULT_PACKET <=1800 caracteres con diffstat, cambios, riesgos;
sin afirmar PASS ni empezar ejecución. Próxima etapa esperará CommandStatus
hasta cierre real del comando y guardará reporter JSON, no "aguardando".
