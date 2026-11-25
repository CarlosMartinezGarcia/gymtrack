import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardioMet, estimateByExercise, liftingWorkKcal, treadmillMet, CARDIO_MET, DEFAULT_STRENGTH_MET } from '../../src/domain/exerciseCalories';

test('cinta: ecuación ACSM; la inclinación y la velocidad suben el gasto', () => {
  // 5 km/h llano: v = 83,3 m/min → VO2 = 11,83 → 3,38 MET
  assert.equal(Math.round(treadmillMet(5, 'none') * 100) / 100, 3.38);
  assert.ok(treadmillMet(5, 'high') > treadmillMet(5, 'medium'));
  assert.ok(treadmillMet(5, 'medium') > treadmillMet(5, 'low'));
  assert.ok(treadmillMet(10, 'none') > treadmillMet(7, 'none'), 'correr gasta más que caminar');
  // 10 km/h llano corriendo: v = 166,7 → VO2 = 36,8 → 10,5 MET
  assert.equal(Math.round(treadmillMet(10, null) * 10) / 10, 10.5);
});

test('cardio: sin velocidad se usa la tabla por máquina e intensidad (media por defecto)', () => {
  const t = { durationMin: 10, intensity: null, speedKmh: null, incline: null };
  assert.equal(cardioMet('bike', t), CARDIO_MET.bike.moderate);
  assert.equal(cardioMet('bike', { ...t, intensity: 'vigorous' }), CARDIO_MET.bike.vigorous);
  assert.equal(cardioMet(null, { ...t, intensity: 'light' }), CARDIO_MET.other.light);
  assert.equal(cardioMet('treadmill', { ...t, speedKmh: 5 }), treadmillMet(5, null));
});

test('fuerza: los kilos levantados suman trabajo mecánico', () => {
  assert.equal(liftingWorkKcal([]), 0);
  // 60 kg × 10 reps × 9,81 × 0,5 m / 0,25 = 11.772 J = 2,81 kcal
  assert.equal(Math.round(liftingWorkKcal([{ weight: 60, reps: 10 }]) * 100) / 100, 2.81);
  const light = estimateByExercise([{ kind: 'strength', key: 'a', met: 5, sets: [{ weight: 20, reps: 10 }], restSec: 90 }], 100, 60);
  const heavy = estimateByExercise([{ kind: 'strength', key: 'a', met: 5, sets: [{ weight: 100, reps: 10 }], restSec: 90 }], 100, 60);
  assert.ok(heavy.high > light.high);
});

test('sesión: cardio por minutos, fuerza por series y descanso, total = suma', () => {
  const e = estimateByExercise([
    { kind: 'cardio', key: 'c', machine: 'bike', tramos: [{ durationMin: 10, intensity: 'moderate', speedKmh: null, incline: null }] },
    { kind: 'strength', key: 's', met: null, sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 10 }], restSec: 120 },
  ], 100, 60);
  const c = e.items.find((x) => x.key === 'c')!;
  assert.deepEqual([c.low, c.high, c.minutes], [102, 125, 10]); // 6,8 × 100 × 10/60 = 113,3
  const s = e.items.find((x) => x.key === 's')!;
  assert.equal(s.minutes, 6.3); // (3 × 45 s + 2 × 120 s) / 60
  // + 7 kcal de trabajo mecánico (3 × 50 kg × 10 reps)
  const base = DEFAULT_STRENGTH_MET * 100 * (6.25 / 60);
  assert.ok(s.low >= Math.floor(base * 0.85) && s.high <= Math.ceil(base * 1.1 + 8) && s.high > base * 1.1);
  assert.equal(e.low, c.low + s.low);
  assert.equal(e.high, c.high + s.high);
});

test('sesión: si la fuerza estimada no cabe en la duración real, se ajusta', () => {
  const sets = Array.from({ length: 20 }, () => ({ weight: 40, reps: 10 }));
  const e = estimateByExercise([
    { kind: 'cardio', key: 'c', machine: 'treadmill', tramos: [{ durationMin: 20, intensity: null, speedKmh: 5, incline: 'low' }] },
    { kind: 'strength', key: 's', met: 5, sets, restSec: 180 },
  ], 100, 40);
  assert.equal(e.items.find((x) => x.key === 's')!.minutes, 20, '40 min de sesión − 20 de cardio');
});
