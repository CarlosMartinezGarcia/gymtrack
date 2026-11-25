import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY, MUSCLE_BY_ID, alternatives, matchByName, searchLibrary, libraryExercise } from '../../src/domain/library';

test('biblioteca: ids únicos, músculos válidos y textos completos', () => {
  const ids = new Set<string>();
  for (const e of LIBRARY) {
    assert.ok(!ids.has(e.id), `id repetido ${e.id}`);
    ids.add(e.id);
    assert.ok(e.primary.length > 0, `${e.id} sin músculo principal`);
    for (const m of [...e.primary, ...e.secondary]) assert.ok(MUSCLE_BY_ID[m], `${e.id}: músculo ${m}`);
    assert.ok(!e.secondary.some((m) => e.primary.includes(m)), `${e.id}: músculo principal y secundario a la vez`);
    assert.ok(e.setup.length && e.technique.length, `${e.id} sin colocación o técnica`);
    assert.ok(e.met >= 3 && e.met <= 10, `${e.id}: MET fuera de rango`);
    assert.equal(e.equipment === 'cardio', e.pattern === 'cardio');
    assert.equal(e.equipment === 'cardio', !!e.cardio);
  }
});

test('biblioteca: vincula los nombres que ya usa Carlos', () => {
  const cases: [string, string][] = [
    ['Press de pecho', 'press-pecho-maquina'],
    ['Press de hombro', 'press-hombro-maquina'],
    ['Mariposas de pecho', 'contractor-pecho'],
    ['Mariposas espalda', 'contractor-inverso'],
    ['Dips', 'fondos'],
    ['Jalon', 'jalon-pecho'],
    ['PullDown', 'jalon-pecho'],
    ['Remo horizontal', 'remo-polea-baja'],
    ['Curl de bíceps', 'curl-mancuernas'],
    ['Leg extension', 'extension-cuadriceps'],
    ['Prensa pierna', 'prensa'],
    ['Bicicleta calentamiento', 'bicicleta'],
    ['Recordatorio Press de hombro', 'press-hombro-maquina'],
  ];
  for (const [name, id] of cases) assert.equal(matchByName(name)?.id, id, name);
  assert.equal(matchByName('Algo inventado'), undefined);
  assert.equal(matchByName(''), undefined);
});

test('alternativas: mismo patrón primero, nunca el propio ejercicio, cardio solo con cardio', () => {
  const alts = alternatives('press-pecho-maquina');
  assert.ok(alts.length > 0);
  assert.ok(!alts.some((a) => a.id === 'press-pecho-maquina'));
  assert.equal(alts[0].pattern, 'empuje_horizontal');
  assert.ok(alts.every((a) => a.equipment !== 'cardio'));
  assert.ok(alternatives('cinta').every((a) => a.equipment === 'cardio'));
  assert.deepEqual(alternatives('no-existe'), []);
});

test('búsqueda: sin tildes, por alias, grupo y material', () => {
  assert.ok(searchLibrary({ q: 'jalon' }).some((e) => e.id === 'jalon-pecho'));
  assert.ok(searchLibrary({ q: 'bíceps' }).length >= 3);
  assert.ok(searchLibrary({ group: 'Pierna' }).every((e) => e.equipment !== 'cardio'));
  assert.ok(searchLibrary({ group: 'Cardio' }).every((e) => e.equipment === 'cardio'));
  assert.ok(searchLibrary({ equipment: 'machine' }).every((e) => e.equipment === 'machine'));
  assert.equal(libraryExercise(undefined), undefined);
});
