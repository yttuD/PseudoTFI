# Codex — aceptación técnica N01a

2026-10-04. RISK HIGH; revisión exacta contra .tmp/rendo-b006-baseline,
no contra todo HEAD sucio. Archivos/productores no cubiertos por grafo del revisor:
lectura directa dirigida, no afirmación de cobertura exhaustiva del repositorio.

Aceptado: filtro workspace y alcance Delegado antes del rango/count; resolución
de contexto única; rechazo por vacío de contexto inesperado; IDs vacíos sin query;
desempate created_at desc/id asc. Sin N+1, any nuevo productivo, políticas nuevas,
cambios de marketplace ni edición de funciones productivas ajenas a findAll.

Revisión: diff completo controller/service del lote; nuevo aislamiento unitario;
adaptación puntual delegado-read-authorization; harness local completo y sucesivas
correcciones de cleanup. Se rechazaron el any nuevo, mock roto etiquetado como
preexistente, feature detection productivo para mocks y errores de cleanup ignorados.

Evidencia Agy final: unit 12/12, regresión 73/73, real local 3/3, tipos productivos exit0.
Confirmación independiente por riesgo HIGH y discrepancias previas:
- regresión relevante 73/73 exit0, antes del último cambio de orden;
- tipos productivos tsconfig.build.json exit0 sobre fuente final;
- integración local 3/3 exit0 sobre fuente final, Auth/JWT/PostgREST reales y cleanup
  acumulativo comprobado por IDs propios en DB/Auth. No HTTP/AppModule/UI.

Tipos generales exit1: problemas abiertos en auth/supabase-auth.guard.spec.ts,
authorization/test-adapter.spec.ts, delegados/delegados.controller.spec.ts,
test/app.e2e-spec.ts. No afirmar typecheck global verde ni beta íntegra.

SHA256 finales productivos:
- controller: 8CA4082587E5FE5C7A28FDF616D2D1FBF74DA9C606958F342154B5E2CF965845
- service: 7C8BB85BC7EC453C4210E7D4639325EC6FFA24A0AAFCCDD13F9E5E2EB9B81E65
- unit isolation: DE8107B4647A696EAD3C5F53534981562F5D3D1C1C7D7A225A5873E76970A3F9
- delegado read: 6748BAF5FE07AF0172E257A806AAA1CCFCC3FB48C76B3F2F702221CC48F08595
- harness: BAACF8EBF549B36CE030C206A47504F5121ACF39098D7351BA1084B637A60AA8

N01a puede publicarse como arreglo parcial. N01 sigue ABIERTO: B007 debe probar
accesos directos/escrituras, alcance real cuenta/IDs/revocación y UI desktop/mobile.
Git/push/READY/alias/smoke del deploy nuevo requieren evidencia separada, no implícita.
