import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heatLevel, muscleLoad } from '../../src/domain/muscleMap';

test('mapa: principal 1 por serie, secundario 0,5; el cardio y los no vinculados no suman', () => {
  const r = muscleLoad([
    { libraryId: 'press-pecho-maquina', sets: 3, cardio: false }, // pecho; secundarios deltoide anterior y tríceps
    { libraryId: 'fondos', sets: 2, cardio: false }, // pecho y tríceps; secundario deltoide anterior
    { libraryId: 'cinta', sets: 1, cardio: true },
    { libraryId: null, sets: 3, cardio: false },
  ]);
  assert.equal(r.load.pecho, 5);
  assert.equal(r.load.triceps, 3.5);
  assert.equal(r.load.deltoide_anterior, 2.5);
  assert.equal(r.load.cuadriceps, 0, 'la cinta no cuenta');
  assert.equal(r.load.dorsal, 0);
  assert.equal(r.max, 5);
  assert.equal(r.unlinked, 1);
});

test('mapa: niveles de color por cuartos del máximo', () => {
  assert.equal(heatLevel(0, 5), 0);
  assert.equal(heatLevel(1, 0), 0);
  assert.equal(heatLevel(5, 5), 4);
  assert.equal(heatLevel(2.5, 5), 2);
  assert.equal(heatLevel(0.1, 5), 1);
  assert.equal(heatLevel(3.9, 5), 4);
});
