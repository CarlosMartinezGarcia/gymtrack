import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCalories } from '../../src/domain/calories';
import { weeklyAverages, periodChange, weekStart } from '../../src/domain/bodyweight';
import * as T from '../../src/domain/timer';
import { parseBackup, planMerge, makeBackup, emptyDataset } from '../../src/domain/backup';
import { possibleDuplicates } from '../../src/domain/duplicates';
import { session } from './fixtures';
import type { BodyWeight } from '../../src/domain/types';

const bw = (iso: string, kg: number): BodyWeight => ({ id: iso, measuredAt: new Date(iso).getTime(), weightKg: kg, createdAt: 0, updatedAt: 0 });

test('calorías: intervalo MET × kg × h con el peso anterior a la sesión', () => {
  const e = estimateCalories(3_600_000, 'moderate', [bw('2026-01-01T08:00', 80), bw('2026-02-01T08:00', 90)], new Date('2026-01-15').getTime())!;
  assert.deepEqual([e.low, e.high], [280, 400]);
  assert.equal(e.orientative, false);
});

test('calorías: sin peso ni intensidad es orientativo', () => {
  const e = estimateCalories(1_800_000, null, [], Date.now())!;
  assert.equal(e.orientative, true);
  assert.ok(e.low < e.high);
  assert.equal(estimateCalories(0, null, [], 0), null);
  assert.equal(estimateCalories(30_000, null, [], 0), null, 'menos de 1 minuto no se estima');
});

test('peso: medias semanales y cambio del periodo', () => {
  const list = [bw('2026-03-02T08:00', 80), bw('2026-03-04T08:00', 81), bw('2026-03-10T08:00', 79), bw('2026-03-12T08:00', 79.4)];
  const w = weeklyAverages(list);
  assert.equal(w.length, 2);
  assert.equal(w[0].avgKg, 80.5);
  assert.equal(new Date(w[0].weekStart).getDay(), 1, 'la semana empieza en lunes');
  const c = periodChange(list, 0, Date.now())!;
  assert.equal(c.diffKg, -0.6);
  assert.equal(c.weeklyAvgDiffKg, -1.3);
  assert.equal(weekStart(new Date('2026-03-08T23:00').getTime()), new Date('2026-03-02T00:00').getTime(), 'domingo pertenece a la semana anterior');
});

test('temporizador por marcas temporales: sobrevive a suspensiones', () => {
  let t = T.start(90_000, 1000);
  assert.equal(T.remaining(t, 31_000), 60_000);
  // la pestaña "duerme" 5 minutos: el cálculo sigue siendo correcto
  assert.equal(T.isFinished(t, 301_000), true);
  assert.equal(T.remaining(t, 301_000), -210_000);
  t = T.pause(T.start(60_000, 0), 20_000);
  assert.equal(T.remaining(t, 999_999), 40_000, 'en pausa no avanza');
  t = T.resume(t, 100_000);
  assert.equal(T.remaining(t, 100_000), 40_000);
  t = T.adjust(t, 30_000, 100_000);
  assert.equal(T.remaining(t, 100_000), 70_000);
  t = T.adjust(t, -100_000, 100_000);
  assert.equal(T.remaining(t, 100_000), 0, 'nunca negativo al reducir');
  assert.equal(T.formatClock(65_000), '1:05');
});

test('importación: valida y no duplica al importar dos veces', () => {
  const data = emptyDataset();
  data.exercises.push({ id: 'e1', name: 'Press', createdAt: 1, updatedAt: 1 } as never);
  data.bodyweights.push({ id: 'b1', measuredAt: 1, weightKg: 80, createdAt: 1, updatedAt: 1 });
  const text = JSON.stringify(makeBackup(data));
  const p = parseBackup(text);
  assert.ok(p.ok);
  if (!p.ok) return;
  const first = planMerge(emptyDataset(), p.backup.data);
  assert.equal(first.added, 2);
  const second = planMerge(p.backup.data, p.backup.data);
  assert.equal(second.added + second.updated, 0, 'segunda importación sin cambios');
  const newer = structuredClone(p.backup.data);
  newer.exercises[0].updatedAt = 5;
  assert.equal(planMerge(p.backup.data, newer).updated, 1, 'la versión más reciente gana');
  assert.equal(planMerge(newer, p.backup.data).updated, 0, 'una versión antigua no sobrescribe');
});

test('importación: rechaza archivos ajenos y descarta registros inválidos', () => {
  assert.equal(parseBackup('{').ok, false);
  assert.equal(parseBackup('{"format":"otro"}').ok, false);
  const p = parseBackup(JSON.stringify({ format: 'gymtrack-backup', version: 1, data: { exercises: [{ id: 'x' }] } }));
  assert.ok(p.ok && p.backup.data.exercises.length === 0 && p.warnings.length === 1);
});

test('posibles duplicados: misma rutina con menos de 10 min', () => {
  const a = session({ day: 0, routineId: 'R' });
  const b = { ...session({ day: 0, routineId: 'R' }), startedAt: a.startedAt + 5 * 60_000 };
  const c = session({ day: 1, routineId: 'R' });
  const d = possibleDuplicates([a, b, c]);
  assert.ok(d.has(a.id) && d.has(b.id) && !d.has(c.id));
});
