import test from 'node:test';
import assert from 'node:assert/strict';
import {
  needsTranslation, planMissingTranslations, summarizeTranslationPlan,
} from '../translation-backfill-plan.mjs';

test('N05: missing/empty fields are candidates, completed manual fields remain untouched', () => {
  const units = [
    { id: 'u1', titulo_es: 'Casa', descripcion_es: 'Vista al río',
      titulo_en: null, descripcion_en: 'Hand-edited English text',
      titulo_pt: '', descripcion_pt: null },
  ];
  const plan = planMissingTranslations(units);
  assert.equal(plan.length, 2);
  const en = plan.find(x => x.lang === 'en');
  const pt = plan.find(x => x.lang === 'pt');
  assert.deepEqual(en.fields.map(f => f[0]), ['titulo']);
  assert.deepEqual(pt.fields.map(f => f[0]), ['titulo', 'descripcion']);
  assert.deepEqual(summarizeTranslationPlan(units, plan), {
    unidadesPublicadas: 1, paresPendientes: 2, camposPendientes: 3,
  });
});

test('N05: ambiguous bracket-prefixed manual text is never overwritten', () => {
  const unit = { id: 'u1', titulo_es: 'Casa', descripcion_es: 'Vista',
    titulo_en: '[en] Texto personalizado', descripcion_en: '[en] Vista editada',
    titulo_pt: '[pt] Outro nome', descripcion_pt: 'Descrição pessoal' };
  assert.deepEqual(planMissingTranslations([unit]), []);
  assert.equal(needsTranslation('Casa', '[en] Casa', 'en'), true);
  assert.equal(needsTranslation('Casa', '[en] Edición humana', 'en'), false);
});

test('N05: an exact legacy placeholder may be replaced, never missing Spanish source', () => {
  const unit = { id: 'u1', titulo_es: 'Casa', descripcion_es: ' ',
    titulo_en: '[en] Casa', descripcion_en: null,
    titulo_pt: '[pt] Casa', descripcion_pt: '' };
  const plan = planMissingTranslations([unit]);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.flatMap(x => x.fields.map(f => f[0])), ['titulo', 'titulo']);
});

test('N05: cap inventory to 25 units and require IDs', () => {
  assert.throws(() => planMissingTranslations(Array(26).fill({ id:'x' })), /Volumen/);
  assert.throws(() => planMissingTranslations([{ titulo_es: 'Sin ID' }]), /identificador/);
  assert.throws(() => planMissingTranslations(null), /Volumen/);
});

test('N05: duplicate and blank IDs fail closed before any translation request', () => {
  assert.throws(() => planMissingTranslations([{ id: 'u1' }, { id: 'u1' }]), /duplicados/);
  assert.throws(() => planMissingTranslations([{ id: '  ' }]), /identificador/);
});
