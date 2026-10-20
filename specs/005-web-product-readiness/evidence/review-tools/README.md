# Review Tools and Conventions (Feature 005)

## Screenshot Conventions

Every visual artifact in Feature 005 follows a strict naming convention to ensure deterministic traceability to inventory items and acceptance matrix cells:

```text
{INVENTORY_ID}__{ACTOR}__{STATE}__{WIDTH}w__{THEME}.png
```

### Components
1. **`INVENTORY_ID`**: Canonical item ID (e.g. `SURF-001`, `FORM-005`, `CTRL-001`).
2. **`ACTOR`**:
   - `anonymous` (unauthenticated)
   - `public_user` (authenticated marketplace user)
   - `gestor` (property manager)
   - `delegado_read` (read-only scope)
   - `delegado_manage` (manage scope)
   - `dev_admin` (platform operator)
3. **`STATE`**: Observable UI state (e.g. `default`, `loading`, `empty`, `modal_open`, `validation_error`, `denied`).
4. **`WIDTH`**: Viewport width in pixels (`375`, `768`, `1024`, `1440`).
5. **`THEME`**: Active visual theme (`light`, `dark`).

## Contact Sheet Tooling

The contact sheet generator compiles directory screenshots into side-by-side comparison matrices across all viewports and themes.

### Generator Usage

```powershell
node specs/005-web-product-readiness/evidence/review-tools/generate-contact-sheets.js all
```

Or for a specific audience:

```powershell
node specs/005-web-product-readiness/evidence/review-tools/generate-contact-sheets.js public
node specs/005-web-product-readiness/evidence/review-tools/generate-contact-sheets.js gestor
node specs/005-web-product-readiness/evidence/review-tools/generate-contact-sheets.js delegado
node specs/005-web-product-readiness/evidence/review-tools/generate-contact-sheets.js dev
```

Output is written to `specs/005-web-product-readiness/evidence/contact-sheets/<audience>/index.html`.
