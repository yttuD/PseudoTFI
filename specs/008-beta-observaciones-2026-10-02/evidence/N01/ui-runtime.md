# Evidencia N01 — B007e: Inventario y Runtime Navegador Real

## Estado: PREPARED (Batch 007e Correcciones Terminales Preparadas)
- **Fase:** PREPARED (Sin comandos, servidores ni subagentes; baseline intacto; a la espera de autorización).
- **Alcance acotado:**
  1. `unidades.service.ts`: Coincidencia estricta de `error.code === 'PGRST103'` (sin búsqueda de substring en `error.message`).
  2. `QuickActionsDock.tsx`: Wrapper limpio `hidden md:flex justify-end mt-8` sin conflictos ni `z-index` redundante.
  3. `mis-unidades/page.tsx`: Badge solo lectura utiliza azul `#131F3C` de paleta oficial aprobada en light mode.
  4. `beta_isolation_real.spec.ts`: Medición sRGB Canvas 2D con `CSS.supports`, composición alpha de ancestros, cutoff 0.04045 y registro en artifact JSON por proyecto sin sesión.
  5. `unidades.isolation.spec.ts`: Regresión añadida que verifica que errores con otro código pero mensaje que mencione PGRST103 no ejecuten HEAD.

---

## 1. Estimación Teórica de Contraste vs Medición Real (Badge Readonly)
- **Aclaración crítica:** Los ratios calculados sobre valores hexadecimales nominales son exclusivamente **estimaciones teóricas**, NO mediciones reales de renderizado.
- **Color de paleta oficial:** `#131F3C` en light mode y `#B89355` en dark mode.
- **Estimación teórica:**
  - `#131F3C` sobre fondo blanco `#FFFFFF`: estimación teórica ~14.8:1 (umbral nominal 4.5:1).
  - `#B89355` sobre fondo nocturno `#09090B`: estimación teórica ~7.1:1.
- **Estado de verificación AA:** **PENDIENTE DE EJECUCIÓN**. La comprobación real se ejecutará en Playwright mediante Canvas 2D con composición de ancestros y verificación de opacidad de fondo, guardando el reporte en artifact JSON.

## 2. Plan de Ejecución Siguiente
- Ejecución controlada con `CommandStatus` nativo esperando finalización completa de `beta-real-runtime.mjs`.
- Guardado de reporte JSON como artifact además de `RESULT_PACKET`.
- Cero afirmaciones de PASS o mediciones sin ejecución real.
