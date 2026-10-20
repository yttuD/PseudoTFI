# Evidence Directory — Brownfield System Audit

## Naming, Redaction, and Retention Rules

### Retention Rules
- Evidence retained under `specs/001-brownfield-system-audit/evidence/` is permanent audit proof.
- Temporary traces, temporary test caches, and raw intermediate captures are deleted in cleanup.
- Only artifacts explicitly listed in the cleanup ledger are removed.

### Redaction Rules
- Secrets, tokens, service role keys, and passwords must never be stored in plain text.
- User email and personal details from demo seeds are sanitized or replaced with standardized test identifiers.

### Screenshot Naming Convention
Screenshots are saved under `specs/001-brownfield-system-audit/evidence/screenshots/` using the following naming structure:
`{surface_id}__{role}__{viewport}w__{theme}__{state}.png`
Where:
- `surface_id`: Unique identifier of the surface (e.g. `SURF-001`)
- `role`: `anon`, `usuario`, `gestor`, `delegado_ver`, `delegado_gestionar`, `dev`
- `viewport`: `375`, `768`, `1024`, `1440`
- `theme`: `light`, `dark`
- `state`: `default`, `empty`, `loading`, `error`, `submitted`, `modal_open`, etc.
