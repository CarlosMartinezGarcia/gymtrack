import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRoutine, reorder } from '../../src/domain/sequence';
import { routine, session, sets } from './fixtures';

const A = routine('A — Torso', 0), B = routine('B — Pierna', 1), C = routine('C — Accesorios', 2);
const R = [A, B, C];

test('sin sesiones sugiere la primera rutina', () => {
  assert.equal(nextRoutine(R, [], []).routine?.id, A.id);
});

test('A → B → C → A', () => {
  const s1 = session({ day: 0, routineId: A.id });
  assert.equal(nextRoutine(R, [s1], sets(s1.id, 'e', [[50, 10]])).routine?.id, B.id);
  const s2 = session({ day: 1, routineId: B.id });
  const s3 = session({ day: 2, routineId: C.id });
  const all = [...sets(s1.id, 'e', [[50, 10]]), ...sets(s2.id, 'e', [[50, 10]]), ...sets(s3.id, 'e', [[50, 10]])];
  assert.equal(nextRoutine(R, [s1, s2], all).routine?.id, C.id);
  assert.equal(nextRoutine(R, [s1, s2, s3], all).routine?.id, A.id);
});

test('ignora sesiones abandonadas, borradores y sin series válidas', () => {
  const s1 = session({ day: 0, routineId: A.id });
  const s2 = session({ day: 1, routineId: B.id, status: 'abandoned' });
  const s3 = session({ day: 2, routineId: B.id, status: 'draft' });
  const s4 = session({ day: 3, routineId: B.id }); // completada pero solo calentamiento
  const all = [
    ...sets(s1.id, 'e', [[50, 10]]), ...sets(s2.id, 'e', [[50, 10]]), ...sets(s3.id, 'e', [[50, 10]]),
    ...sets(s4.id, 'e', [[20, 10]], { warmup: true }),
  ];
  assert.equal(nextRoutine(R, [s1, s2, s3, s4], all).routine?.id, B.id);
});

test('una rutina iniciada manualmente que no cuenta no altera la secuencia', () => {
  const s1 = session({ day: 0, routineId: A.id });
  const s2 = session({ day: 1, routineId: C.id, countsForSequence: false });
  const all = [...sets(s1.id, 'e', [[50, 10]]), ...sets(s2.id, 'e', [[50, 10]])];
  assert.equal(nextRoutine(R, [s1, s2], all).routine?.id, B.id);
});

test('una rutina manual que sí cuenta continúa desde ella', () => {
  const s1 = session({ day: 0, routineId: A.id });
  const s2 = session({ day: 1, routineId: C.id, countsForSequence: true });
  const all = [...sets(s1.id, 'e', [[50, 10]]), ...sets(s2.id, 'e', [[50, 10]])];
  assert.equal(nextRoutine(R, [s1, s2], all).routine?.id, A.id);
});

test('al reordenar se aplica el nuevo orden', () => {
  const s1 = session({ day: 0, routineId: A.id });
  const all = sets(s1.id, 'e', [[50, 10]]);
  const newOrder = reorder(R, 2, 1); // A, C, B
  const reordered = R.map((r) => ({ ...r, position: newOrder.find((x) => x.id === r.id)!.position }));
  assert.equal(nextRoutine(reordered, [s1], all).routine?.id, C.id);
});

test('si la rutina de la última sesión se borró, usa la sesión anterior', () => {
  const s1 = session({ day: 0, routineId: A.id });
  const s2 = session({ day: 1, routineId: B.id });
  const all = [...sets(s1.id, 'e', [[50, 10]]), ...sets(s2.id, 'e', [[50, 10]])];
  const withoutB = [A, { ...B, deletedAt: 1 }, C];
  assert.equal(nextRoutine(withoutB, [s1, s2], all).routine?.id, C.id);
});

test('sesiones borradas no cuentan', () => {
  const s1 = session({ day: 0, routineId: A.id });
  const s2 = session({ day: 1, routineId: B.id, deletedAt: 5 });
  const all = [...sets(s1.id, 'e', [[50, 10]]), ...sets(s2.id, 'e', [[50, 10]])];
  assert.equal(nextRoutine(R, [s1, s2], all).routine?.id, B.id);
});
