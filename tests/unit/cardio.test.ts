import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardioLine, cardioMachine, cardioPhases, isCardio, isDoneCardio, validateCardio } from '../../src/domain/cardio';
import { isValidSet } from '../../src/domain/validity';
import type { WorkSet } from '../../src/domain/types';

const set = (p: Partial<WorkSet>): WorkSet => ({
  id: 'x', createdAt: 0, updatedAt: 0, sessionId: 's', sessionExerciseId: 'se', exerciseId: 'e', position: 0,
  weight: null, reps: null, status: 'done', warmup: false, ...p,
});

test('cardio: se detecta por modo o por vínculo con un cardio de la biblioteca', () => {
  assert.equal(isCardio({ mode: 'cardio', libraryId: null }), true);
  assert.equal(isCardio({ mode: null, libraryId: 'cinta' }), true);
  assert.equal(isCardio({ mode: null, libraryId: 'prensa' }), false);
  assert.equal(isCardio({}), false);
  assert.equal(isCardio(undefined), false);
  assert.equal(cardioMachine({ libraryId: 'cinta' }), 'treadmill');
  assert.equal(cardioMachine({ libraryId: 'bicicleta' }), 'bike');
  assert.equal(cardioMachine({ libraryId: null }), null);
});

test('cardio: la fase depende de la posición respecto a los ejercicios de fuerza', () => {
  assert.deepEqual(cardioPhases([true, false, false, true]), ['warmup', null, null, 'cooldown']);
  assert.deepEqual(cardioPhases([true, true, false]), ['warmup', 'warmup', null]);
  assert.deepEqual(cardioPhases([false, true, false]), [null, 'main', null]);
  assert.deepEqual(cardioPhases([true, true]), ['main', 'main'], 'solo cardio');
  assert.deepEqual(cardioPhases([false, false]), [null, null]);
});

test('cardio: un tramo hecho necesita minutos y nunca cuenta como serie de fuerza', () => {
  const t = set({ durationMin: 20, cardioIntensity: 'moderate', speedKmh: 6.5, incline: 'low' });
  assert.equal(isDoneCardio(t), true);
  assert.equal(isValidSet(t), false, 'no entra en progresión, récords ni volumen');
  assert.equal(isDoneCardio(set({ durationMin: 0 })), false);
  assert.equal(isDoneCardio(set({ durationMin: 10, status: 'pending' })), false);
  assert.equal(isDoneCardio(set({ durationMin: 10, deletedAt: 1 })), false);
  assert.equal(cardioLine(t), '20 min · Media · 6,5 km/h · incl. Baja');
  assert.equal(cardioLine(set({ durationMin: 8 })), '8 min');
});

test('cardio: validación de minutos y velocidad', () => {
  assert.equal(validateCardio({ durationMin: 30, speedKmh: 12 }), null);
  assert.ok(validateCardio({ durationMin: -1 }));
  assert.ok(validateCardio({ durationMin: 601 }));
  assert.ok(validateCardio({ speedKmh: 31 }));
  assert.equal(validateCardio({}), null);
});
