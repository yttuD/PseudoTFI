# Manifiesto Baseline → Candidato Reconciliado (Lote N01)

## 1. Identificación de Fuentes de Deployments Vigentes

- **API Vigente (Producción Beta)**:
  - Vercel Deployment ID: `dpl_ADgxK4hCp1Rduwa2exgYHTUhTLYT`
  - Alias: `https://rendo-beta-api.vercel.app`
  - Fuente Git verificable: Commit `96b0b3034ce070caaa45690a2205c773105283a2` (`apps/api`)
  - Snapshot completo extraído en: `snapshots/baseline-api/`
- **Web Vigente (Producción Beta)**:
  - Vercel Deployment ID: `dpl_9KwKGgdyxdYLwGQsoBCaRfrdeMy3`
  - Alias: `https://rendo-beta-web.vercel.app`
  - Fuente Git verificable: Commit `a23e7f593a641dac43c096b44854ac83153e989f` (`apps/web`)
  - Snapshot completo extraído en: `snapshots/baseline-web/`

---

## 2. Manifiesto de Hashes SHA256 (Baseline → Candidato)

### API (`snapshots/candidate-api`)
| Archivo | Baseline SHA256 (`96b0b30`) | Candidato SHA256 | Estado / Rol |
| --- | --- | --- | --- |
| `src/unidades/unidades.service.ts` | `ca97d09b60e8153010cf05a2d71de1c0938de0f3c2b18136227eb4db66efc04c` | `13583df9601742908088d9a1f7e963a91ae0e22d7b9b77132f761c83c4046ef2` | Modificado: `findAll` paginado, scoped query y manejo `PGRST103` (out-of-range) |
| `src/grupos/grupos.service.ts` | `60491ce8aa4d6f0486f870fd1e8db54165908da0b0ae4d2e97c4979628094bd3` | `fd53637b00b8ef4361b69425c360e5898dbb3c4aca7fc986d051e5b0e9157334` | Modificado: `remove` mediante RPC auditada `archive_grupo` con validación estricta |

### Web (`snapshots/candidate-web`)
| Archivo | Baseline SHA256 (`a23e7f5`) | Candidato SHA256 | Estado / Rol |
| --- | --- | --- | --- |
| `src/app/[locale]/(gestor)/mis-unidades/page.tsx` | `8fdd19544aa7d2fd7aa09d3135526265c1259107a9b0d5e7ce57959edd973b10` | `97d3740870e4b4f3f1cc1ae635dfbb0c4a866ebb3811fa528025f940a54e701a` | Modificado: Paginación explícita, manejo SSR y vacío localizado |
| `src/components/gestor/BentoGruposGrid.tsx` | `b8cecf95aa2c5366b23a7387f8c576f1d8ba55f819adcbefd45aea1d092d606c` | `352b1b05d68e6871ae13c185f12fb885117069c7a4fcd1e19f79f1f0006953c9` | Modificado: Navegación de páginas accesible, conteo y empty/tabla |
| `src/components/gestor/InventoryLoadError.tsx` | *(Inexistente)* | `f9f3835a5cb676301c387632462245ba3a63140d05813f77f7982fc323cb9111` | Nuevo: Fallback accesible con botón de reintento ante error SSR |
| `src/lib/inventory-loader.ts` | *(Inexistente)* | `5a767be7fc6c1a1caa7e383d027fd85690ba29fdd88743c721b1eed50fcf6791` | Nuevo: Helper tipado con abort signal y estructuración de respuestas |
| `src/components/gestor/QuickActionsDock.tsx` | *(Inexistente)* | `749102d096eff7644c661ccf218c5ecf5fa51bc7ab8076282ad34920760acc51` | Nuevo: Dock condicional oculto en `/nueva` y `/editar` con layout seguro |
| `src/app/[locale]/(gestor)/layout.tsx` | `c5410d7ef490ab43b1505131ed5afd8853e73c6b35fe8d1049add23f74d93f56` | `9c8dea07ffe355fcac34431e5f10e8a1a043b2c1873b6d15cfd7f178ef0d4574` | Modificado: Integra `QuickActionsDock` en reemplazo de dock fijo |
| `messages/es.json` | `c815e0b9acf56ec2a0ce8a4a661188db3eaca8bcd15b01d038daa156aa8c33f1` | `29d11cd97b8d7e81b1bbe9b279ae555af73cb58b715ec0166c54c564eb2bba15` | Modificado: Incorpora únicamente claves `Inventario` en español |
| `messages/en.json` | `da943a1282aed4735e2f850fff620285fc65c91f1a55586828c0b2edcaaa3dad` | `82a625a1a5a26a5a4fbb75c60f59ce42d8f80239d8cffc0436dbb1a90ccb5dec` | Modificado: Incorpora únicamente claves `Inventario` en inglés |
| `messages/pt.json` | `6950d83ba68ec34e607f0571bcf081f53d6df5c031f427986211e6f95127495e` | `4e62eba406b2cef669d5e9ba9a44d55feafe2fa1e7b0d7422d217dcc8456afe5` | Modificado: Incorpora únicamente claves `Inventario` en portugués |

---

## 3. Verificaciones de Build Real sobre los Snapshots

1. **API (`snapshots/candidate-api`)**:
   - `tsc --noEmit -p tsconfig.build.json`: **Exit code 0** (sin errores de tipos).
   - `nest build --path tsconfig.build.json`: **Exit code 0** (compilación completa limpia en `dist/`).
2. **Web (`snapshots/candidate-web`)**:
   - `next build`: **Exit code 0** (compilación optimizada, typecheck, linting y generación estática de 28 rutas completas sin errores).
