import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../../src/domain/progression';
import { exerciseHistory } from '../../src/domain/validity';
import { session, sets, cfg } from './fixtures';
import type { Session, WorkSet } from '../../src/domain/types';

const EX = 'bench';
function build(list: { day: number; sets: [number, number][]; extra?: Partial<WorkSet>; s?: Partial<Session> }[]) {
  const ss: Session[] = [], ws: WorkSet[] = [];
  for (const it of list) {
    const s = session({ day: it.day, ...it.s });
    ss.push(s);
    ws.push(...sets(s.id, EX, it.sets, it.extra));
  }
  return exerciseHistory(EX, ss, ws);
}

test('ejemplo de la especificación: 60 kg 10/10/9 → MANTENER 60', () => {
  const r = recommend(build([{ day: 0, sets: [[60, 10], [60, 10], [60, 9]] }]), cfg())!;
  assert.equal(r.action, 'MANTENER');
  assert.equal(r.nextLoad, 60);
  assert.deepEqual(r.targetReps, [11, 11, 10]);
});

test('ejemplo de la especificación: 60 kg 12/12/12 → SUBIR a 62,5', () => {
  const r = recommend(build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]] }]), cfg())!;
  assert.equal(r.action, 'SUBIR');
  assert.equal(r.nextLoad, 62.5);
  assert.deepEqual(r.targetReps, [8, 8, 8]);
});

test('no sube por una sola serie al máximo', () => {
  const r = recommend(build([{ day: 0, sets: [[60, 12], [60, 10], [60, 9]] }]), cfg())!;
  assert.equal(r.action, 'MANTENER');
});

test('no sube si faltan series objetivo con la carga de trabajo', () => {
  const r = recommend(build([{ day: 0, sets: [[60, 12], [60, 12]] }]), cfg())!;
  assert.equal(r.action, 'MANTENER');
  assert.match(r.reasons.join(' '), /2 de 3 series/);
});

test('series con cargas distintas: solo cuentan las de la carga más alta', () => {
  // Pirámide: una serie con 62,5 y dos con 60 al máximo -> no equivale a 3 series con carga uniforme
  const r = recommend(build([{ day: 0, sets: [[60, 12], [62.5, 12], [60, 12]] }]), cfg())!;
  assert.equal(r.action, 'MANTENER');
  assert.equal(r.currentLoad, 62.5);
  assert.match(r.reasons.join(' '), /otras cargas/);
});

test('ejemplo de serie variable de la especificación (60/62,5/62,5)', () => {
  const r = recommend(build([{ day: 0, sets: [[60, 12], [62.5, 10], [62.5, 9]] }]), cfg())!;
  assert.equal(r.action, 'MANTENER');
  assert.equal(r.currentLoad, 62.5);
});

test('RIR objetivo impide subir si el esfuerzo fue mayor', () => {
  const h = build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]], extra: { rir: 0 } }]);
  assert.equal(recommend(h, cfg({}, { targetRir: 2 }))!.action, 'MANTENER');
  const h2 = build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]], extra: { rir: 2 } }]);
  assert.equal(recommend(h2, cfg({}, { targetRir: 2 }))!.action, 'SUBIR');
});

test('RPE se convierte a RIR', () => {
  const h = build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]], extra: { rpe: 10 } }]);
  assert.equal(recommend(h, cfg({}, { targetRir: 1 }))!.action, 'MANTENER');
});

test('upSessions = 2 exige dos sesiones consolidadas seguidas con la misma carga', () => {
  const one = build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]] }]);
  assert.equal(recommend(one, cfg({}, { upSessions: 2 }))!.action, 'MANTENER');
  const two = build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]] }, { day: 3, sets: [[60, 12], [60, 12], [60, 12]] }]);
  assert.equal(recommend(two, cfg({}, { upSessions: 2 }))!.action, 'SUBIR');
});

test('BAJAR solo tras downSessions fallidas seguidas con la misma carga', () => {
  const one = build([{ day: 0, sets: [[70, 6], [70, 6], [70, 7]] }]);
  const r1 = recommend(one, cfg())!;
  assert.equal(r1.action, 'MANTENER');
  assert.match(r1.reasons.join(' '), /por debajo del mínimo/);
  const two = build([{ day: 0, sets: [[70, 6], [70, 6], [70, 7]] }, { day: 3, sets: [[70, 7], [70, 6], [70, 8]] }]);
  const r2 = recommend(two, cfg())!;
  assert.equal(r2.action, 'BAJAR');
  assert.equal(r2.nextLoad, 67.5);
});

test('un fallo con otra carga no cuenta para bajar', () => {
  const h = build([{ day: 0, sets: [[72.5, 6], [72.5, 6], [72.5, 6]] }, { day: 3, sets: [[70, 6], [70, 6], [70, 9]] }]);
  assert.equal(recommend(h, cfg())!.action, 'MANTENER');
});

test('series de calentamiento, pendientes y sesiones abandonadas se ignoran', () => {
  const ss: Session[] = [], ws: WorkSet[] = [];
  const a = session({ day: 0 }); ss.push(a);
  ws.push(...sets(a.id, EX, [[60, 10], [60, 10], [60, 10]]));
  ws.push(...sets(a.id, EX, [[100, 12], [100, 12], [100, 12]], { warmup: true }));
  ws.push(...sets(a.id, EX, [[90, 12], [90, 12], [90, 12]], { status: 'pending' }));
  const b = session({ day: 1, status: 'abandoned' }); ss.push(b);
  ws.push(...sets(b.id, EX, [[60, 12], [60, 12], [60, 12]]));
  const r = recommend(exerciseHistory(EX, ss, ws), cfg())!;
  assert.equal(r.currentLoad, 60);
  assert.equal(r.action, 'MANTENER');
  assert.equal(r.basedOnSessionIds[0], a.id);
});

test('tras subir, el objetivo vuelve a la zona baja del rango', () => {
  const h = build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]] }, { day: 3, sets: [[62.5, 9], [62.5, 8], [62.5, 8]] }]);
  const r = recommend(h, cfg())!;
  assert.equal(r.action, 'MANTENER');
  assert.equal(r.currentLoad, 62.5);
  assert.deepEqual(r.targetReps, [10, 9, 9]);
});

test('detecta estancamiento con 3 sesiones sin mejora', () => {
  const s: [number, number][] = [[60, 10], [60, 10], [60, 9]];
  const r = recommend(build([{ day: 0, sets: s }, { day: 3, sets: s }, { day: 6, sets: [[60, 10], [60, 9], [60, 9]] }]), cfg())!;
  assert.equal(r.stagnation, true);
  assert.equal(r.action, 'MANTENER');
});

test('sin historial o con progresión desactivada no hay recomendación', () => {
  assert.equal(recommend([], cfg()), null);
  assert.equal(recommend(build([{ day: 0, sets: [[60, 12], [60, 12], [60, 12]] }]), cfg({}, { type: 'none' })), null);
});

test('la recomendación cambia al corregir el historial', () => {
  const ss = [session({ day: 0 })];
  const ws = sets(ss[0].id, EX, [[60, 12], [60, 12], [60, 11]]);
  assert.equal(recommend(exerciseHistory(EX, ss, ws), cfg())!.action, 'MANTENER');
  ws[2] = { ...ws[2], reps: 12 };
  assert.equal(recommend(exerciseHistory(EX, ss, ws), cfg())!.action, 'SUBIR');
  ws[2] = { ...ws[2], deletedAt: 1 };
  assert.equal(recommend(exerciseHistory(EX, ss, ws), cfg())!.action, 'MANTENER');
});
