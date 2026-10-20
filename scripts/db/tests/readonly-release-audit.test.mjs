import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(fileURLToPath(new URL('../readonly-release-audit.sql', import.meta.url)), 'utf8');
const withoutComments = sql.replace(/^--.*$/gm, '').trim();
const noLiterals = withoutComments.replace(/'(?:''|[^'])*'/g, "''");

test('release audit: one read-only WITH/SELECT query without DML or DDL', () => {
  assert.match(noLiterals, /^WITH\s+/i);
  assert.match(noLiterals, /\bSELECT\s+/i);
  assert.equal(noLiterals.split(';').filter(x => x.trim()).length, 1);
  assert.doesNotMatch(noLiterals,
    /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|DO|COPY|EXECUTE|CALL)\b/i);
});

test('release audit: outputs only privacy-safe aggregates, no raw IDs, prices or PII', () => {
  const select = withoutComments.slice(withoutComments.lastIndexOf('SELECT'));
  const outputAliases = [...select.matchAll(/\bAS\s+([a-z_][a-z_0-9]*)/gi)].map(m => m[1]);
  assert.deepEqual(outputAliases.sort(), [
    'published_unit_count', 'title_en_missing', 'title_pt_missing',
    'description_en_missing', 'description_pt_missing',
    'possible_duplicate_tariff_groups', 'excess_tariff_rows_if_deduplicated',
    'public_tables_without_rls', 'anonymous_security_definer_rpcs',
  ].sort());
  assert.doesNotMatch(select, /\b(?:id|email|phone|address|direccion_texto|whatsapp|precio)\s*(?:,|FROM|AS)\b/i);
});

test('release audit: excludes archived units/tariffs and limits published translation analysis', () => {
  assert.match(withoutComments, /FROM\s+public\.modalidades_precio\s+WHERE\s+deleted_at\s+IS\s+NULL/i);
  assert.match(withoutComments, /FROM\s+public\.unidades\s+WHERE\s+estado\s*=\s*'publicada'\s+AND\s+deleted_at\s+IS\s+NULL/i);
  assert.match(withoutComments, /GROUP\s+BY\s+unidad_id/i);
  assert.match(withoutComments, /has_function_privilege\('anon'/i);
});
