-- Required to run the transactional pgTAP authorization checks against the
-- hosted beta database. This migration does not seed or alter application data.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
