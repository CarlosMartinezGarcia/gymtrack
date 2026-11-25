import { test } from 'node:test';
import assert from 'node:assert/strict';
import { epley, volume, records, sessionPRs, trend, sessionMetrics } from '../../src/domain/metrics';
import { exerciseHistory, isValidSet } from '../../src/domain/validity';
import { session, sets } from './fixtures';

test('volumen = Σ peso × reps', () => {
  assert.equal(volume(sets('s', 'e', [[60, 12], [62.5, 10], [62.5, 9]])), 60 * 12 + 62.5 * 19);
});

test('Epley: 1 rep = peso, >12 reps no se calcula', () => {
  assert.equal(epley(100, 1), 100);
  assert.equal(epley(100, 10), 133.33);
  assert.equal(epley(100, 13), null);
  assert.equal(epley(0, 10), null);
});

test('validez de series', () => {
  const [ok] = sets('s', 'e', [[0, 10]]);
  assert.equal(isValidSet(ok), true, 'peso corporal con 0 kg es válido');
  assert.equal(isValidSet({ ...ok, reps: 0 }), false);
  assert.equal(isValidSet({ ...ok, weight: null }), false);
  assert.equal(isValidSet({ ...ok, warmup: true }), false);
  assert.equal(isValidSet({ ...ok, status: 'pending' }), false);
});

test('récords separados por tipo', () => {
  const a = session({ day: 0 }), b = session({ day: 3 });
  const h = exerciseHistory('e', [a, b], [...sets(a.id, 'e', [[60, 12], [60, 12], [60, 12]]), ...sets(b.id, 'e', [[70, 5], [70, 4]])]);
  const r = records(h);
  assert.equal(r.maxLoad?.weight, 70);
  assert.equal(r.maxVolume?.sessionId, a.id, 'el mayor volumen es de la sesión ligera');
  assert.equal(r.maxRepsByLoad.find((x) => x.weight === 60)?.reps, 12);
  assert.equal(r.bestE1rm?.value, epley(60, 12));
});

test('PR de sesión compara solo con sesiones anteriores', () => {
  const a = session({ day: 0 }), b = session({ day: 3 });
  const h = exerciseHistory('e', [a, b], [...sets(a.id, 'e', [[60, 10]]), ...sets(b.id, 'e', [[62.5, 10]])]);
  assert.deepEqual(sessionPRs(h, a.id), [], 'la primera sesión no genera récords');
  const prs = sessionPRs(h, b.id).map((p) => p.kind).sort();
  assert.deepEqual(prs, ['e1rm', 'maxLoad', 'volume']);
});

test('tendencia', () => {
  const ss = [0, 3, 6, 9].map((d) => session({ day: d }));
  const ws = ss.flatMap((s, i) => sets(s.id, 'e', [[60 + i * 2.5, 8]]));
  const m = exerciseHistory('e', ss, ws).map(sessionMetrics);
  assert.equal(trend(m), 'up');
  assert.equal(trend(m.slice(0, 2)), 'unknown');
});
