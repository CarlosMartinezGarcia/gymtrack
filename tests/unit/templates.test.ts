import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, TEMPLATES, freeRoutineName, isCardioItem, resolveExercise, templatesOf } from '../../src/domain/templates';
import { libraryExercise } from '../../src/domain/library';
import { validateTargets } from '../../src/data/actions';
import { DEFAULT_PROGRESSION } from '../../src/domain/types';

test('plantillas: ids únicos, ejercicios de la biblioteca, sin repetir y objetivos válidos', () => {
  const ids = new Set<string>();
  for (const tpl of TEMPLATES) {
    assert.ok(!ids.has(tpl.id), `id repetido ${tpl.id}`);
    ids.add(tpl.id);
    assert.ok(tpl.items.length >= 4, `${tpl.id}: al menos 4 ejercicios`);
    assert.equal(new Set(tpl.items.map((x) => x.lib)).size, tpl.items.length, `${tpl.id}: ejercicio repetido`);
    for (const x of tpl.items) {
      assert.ok(libraryExercise(x.lib), `${tpl.id}: ${x.lib} no está en la biblioteca`);
      const err = validateTargets({ sets: x.sets, repMin: x.reps[0], repMax: x.reps[1], increment: 2.5, restSec: x.restSec, progression: DEFAULT_PROGRESSION });
      assert.equal(err, null, `${tpl.id}/${x.lib}: ${err}`);
    }
    assert.ok(tpl.items.some((x) => !isCardioItem(x)), `${tpl.id}: sin fuerza`);
  }
});

test('plantillas: cada familia tiene rutinas y los programas tienen varias', () => {
  for (const f of FAMILIES) {
    assert.ok(templatesOf(f.id).length >= 1, f.id);
    if (f.program) assert.ok(templatesOf(f.id).length >= 2, `${f.id}: un programa necesita varias rutinas`);
  }
  assert.ok(TEMPLATES.length >= 20);
});

test('resolveExercise: vinculado, después por nombre sin vincular, si no null', () => {
  const own = [
    { id: 'a', name: 'Mi prensa', libraryId: 'prensa' },
    { id: 'b', name: 'Press banca', libraryId: null },
    { id: 'c', name: 'Jalón al pecho', libraryId: null, deletedAt: 123 },
  ];
  assert.equal(resolveExercise('prensa', own), 'a');
  assert.equal(resolveExercise('press-banca-barra', own), 'b');
  assert.equal(resolveExercise('jalon-pecho', own), null, 'los borrados no cuentan');
  assert.equal(resolveExercise('hip-thrust', own), null);
});

test('freeRoutineName: añade (2), (3)… si el nombre ya existe', () => {
  assert.equal(freeRoutineName('Torso', ['Pierna']), 'Torso');
  assert.equal(freeRoutineName('Torso', ['torso']), 'Torso (2)');
  assert.equal(freeRoutineName('Torso', ['Torso', 'Torso (2)']), 'Torso (3)');
});
