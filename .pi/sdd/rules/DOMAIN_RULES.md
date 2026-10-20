# DOMAIN_RULES

Load for domain/state/pricing/architecture changes only. Read relevant sections of CONTEXT,
ARQUITECTURA-Y-PRODUCTO, ADRs and active spec/contracts, not every document.

- Canonical: Unidad, Grupo, Gestor, Delegado, Inquilino, Cupo, Modalidad de precio,
  Alquiler, Pago, Depósito, Plan de pago, Zona, Log de acciones, borrado lógico.
  Familiar public copy is allowed only without ambiguity in the underlying model.
- ADRs 0001–0009 remain closed. Stack: Next.js App Router, NestJS, Supabase
  Auth/Postgres/Storage/RLS, Mercado Pago, AFIP, OSM/Leaflet/Nominatim, next-intl,
  Capacitor. A beta hosting exception does not authorize redesigning the stack.
- Gestor controls Unidad states manually; check all four permitted automatic
  transitions when affected. INICIO/constitution and ADR 0004 disagree on enumeration:
  record and resolve before changing transitions; never invent an additional one.
- Logical deletion preserves required history. Cupo counts managed active Unidades,
  not publications; Grupo does not bill. Archival cooldown: 15 days. Lowering Cupo
  must not auto-archive an Unidad with an active Alquiler. Consult ADRs 0004–0005.
- Monthly/daily/hourly Alquiler flows are distinct; price modalities have no category
  restriction. Seña is optional, may be configured for an explicit Grupo with specified
  inheritance/overrides. Only effective collection blocks availability automatically;
  proposed/pending/omitted Seña does not. Source:
  `specs/003-modality-aware-availability/spec.md` and affected contracts.
- Money: management ARS; marketplace ES/EN/PT uses ARS/USD/BRL. Preserve manual regional
  prices; automatic conversion declares source, freshness, rounding and unavailable-rate
  behavior. Distinguish estimates from accounting; never fabricate rates or alter
  historical amounts. See feature 008 `issues.md`.
- Rental payments are recorded, not processed between parties; platform subscription
  billing is separate. Deposits/plans/fiscal retention/billing require MONEY review.
- Beta Cupo/auth exceptions are current configuration, not universal commercial rules.
  Check active feature/deployment evidence before claiming implementation.
