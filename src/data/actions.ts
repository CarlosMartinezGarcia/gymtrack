// Operaciones de escritura. Cada operación compuesta se guarda en una sola transacción.
import { commit, del, get, all, uuid, type Change } from './store';
import { DEFAULT_PROGRESSION, type Exercise, type ExerciseTargets, type Profile, type Routine, type RoutineExercise, type Session, type SessionExercise, type SessionStatus, type WorkSet, type BodyWeight } from '../domain/types';
import { PROFILE_ID, byPos, previousPerformance, routineExercises, sessionExercises, setsOf, setsOfSession, profile, targetsFromExercise, recommendationFor } from './queries';

// ---------- Perfil ----------
export async function updateProfile(patch: Partial<Profile>) {
  await commit([{ t: 'profile', row: { ...profile(), ...patch, id: PROFILE_ID } }]);
}

// ---------- Ejercicios ----------
export type ExerciseInput = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export function validateExercise(e: Partial<ExerciseInput>): string | null {
  if (!e.name?.trim()) return 'El nombre es obligatorio.';
  return validateTargets(e);
}
export function validateTargets(e: Partial<ExerciseTargets>): string | null {
  if (!(Number.isInteger(e.sets) && e.sets! >= 1 && e.sets! <= 20)) return 'Las series deben estar entre 1 y 20.';
  if (!(Number.isInteger(e.repMin) && e.repMin! >= 1)) return 'El mínimo de repeticiones debe ser al menos 1.';
  if (!(Number.isInteger(e.repMax) && e.repMax! >= e.repMin!)) return 'El máximo de repeticiones no puede ser menor que el mínimo.';
  if (!(typeof e.increment === 'number' && e.increment > 0 && e.increment <= 100)) return 'El incremento debe ser mayor que 0.';
  if (!(Number.isInteger(e.restSec) && e.restSec! >= 0 && e.restSec! <= 3600)) return 'El descanso debe estar entre 0 y 3600 s.';
  const p = e.progression;
  if (p && (!(p.upSessions >= 1) || !(p.downSessions >= 1))) return 'Las sesiones para subir y bajar deben ser al menos 1.';
  return null;
}

export const newExerciseDefaults = (): ExerciseInput => ({
  name: '', muscleGroup: '', kind: 'free', unit: 'kg', increment: 2.5,
  sets: 3, repMin: 8, repMax: 12, restSec: profile().defaultRestSec, progression: { ...DEFAULT_PROGRESSION }, notes: '',
});

export async function saveExercise(input: ExerciseInput & { id?: string }): Promise<Exercise> {
  const err = validateExercise(input);
  if (err) throw new Error(err);
  const dupe = all('exercises').find((e) => e.id !== input.id && e.name.trim().toLowerCase() === input.name.trim().toLowerCase());
  if (dupe) throw new Error(`Ya existe un ejercicio llamado «${dupe.name}».`);
  const [row] = await commit([{ t: 'exercises', row: { ...input, name: input.name.trim() } }]);
  return row as Exercise;
}

/** Oculta el ejercicio del catálogo y de las rutinas. Su historial se conserva. */
export async function deleteExercise(id: string) {
  const changes: Change[] = [del('exercises', id)];
  for (const re of all('routineExercises').filter((r) => r.exerciseId === id)) changes.push(del('routineExercises', re.id));
  await commit(changes);
}

const BASIC: [string, string, Exercise['kind'], number, number, number][] = [
  ['Press banca', 'Pecho', 'free', 6, 10, 2.5],
  ['Press inclinado con mancuernas', 'Pecho', 'free', 8, 12, 2],
  ['Remo con barra', 'Espalda', 'free', 6, 10, 2.5],
  ['Jalón al pecho', 'Espalda', 'cable', 8, 12, 2.5],
  ['Dominadas', 'Espalda', 'bodyweight', 5, 10, 2.5],
  ['Press militar', 'Hombro', 'free', 6, 10, 2.5],
  ['Elevaciones laterales', 'Hombro', 'free', 10, 15, 1],
  ['Sentadilla', 'Pierna', 'free', 5, 8, 2.5],
  ['Peso muerto rumano', 'Pierna', 'free', 6, 10, 2.5],
  ['Prensa', 'Pierna', 'machine', 8, 12, 5],
  ['Curl femoral', 'Pierna', 'machine', 10, 15, 2.5],
  ['Curl de bíceps', 'Brazo', 'free', 8, 12, 1],
  ['Extensión de tríceps en polea', 'Brazo', 'cable', 10, 15, 2.5],
];

/** Catálogo de ejemplo (solo bajo petición, para no duplicar entre dispositivos). */
export async function seedExercises(): Promise<number> {
  const existing = new Set(all('exercises').map((e) => e.name.toLowerCase()));
  const changes: Change[] = BASIC.filter(([n]) => !existing.has(n.toLowerCase())).map(([name, muscleGroup, kind, repMin, repMax, increment]) => ({
    t: 'exercises', row: { ...newExerciseDefaults(), name, muscleGroup, kind, repMin, repMax, increment },
  }));
  if (changes.length) await commit(changes);
  return changes.length;
}

// ---------- Rutinas ----------
export async function saveRoutine(r: Partial<Routine> & { name: string }): Promise<Routine> {
  if (!r.name.trim()) throw new Error('El nombre de la rutina es obligatorio.');
  const position = r.id ? get('routines', r.id)?.position ?? 0 : Math.max(-1, ...all('routines').map((x) => x.position)) + 1;
  const [row] = await commit([{ t: 'routines', row: { position, ...r, name: r.name.trim() } }]);
  return row as Routine;
}

export async function reorderRoutines(orderedIds: string[]) {
  await commit(orderedIds.map((id, position) => ({ t: 'routines', row: { id, position } })));
}

/** Duplica la rutina; los ejercicios conservan su identidad (y por tanto su historial). */
export async function duplicateRoutine(id: string): Promise<string> {
  const src = get('routines', id);
  if (!src) throw new Error('Rutina no encontrada.');
  const newId = uuid();
  const position = Math.max(...all('routines').map((x) => x.position)) + 1;
  const changes: Change[] = [{ t: 'routines', row: { id: newId, name: `${src.name} (copia)`, description: src.description, notes: src.notes, position } }];
  for (const re of routineExercises(id)) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = re;
    void _id; void _c; void _u;
    changes.push({ t: 'routineExercises', row: { ...rest, routineId: newId } });
  }
  await commit(changes);
  return newId;
}

/** Borra la rutina. Las sesiones realizadas con ella se conservan intactas. */
export async function deleteRoutine(id: string) {
  const changes: Change[] = [del('routines', id)];
  for (const re of all('routineExercises').filter((r) => r.routineId === id)) changes.push(del('routineExercises', re.id));
  await commit(changes);
}

export async function addExerciseToRoutine(routineId: string, exerciseId: string) {
  const e = get('exercises', exerciseId);
  if (!e) throw new Error('Ejercicio no encontrado.');
  const position = Math.max(-1, ...routineExercises(routineId).map((r) => r.position)) + 1;
  await commit([{ t: 'routineExercises', row: { routineId, exerciseId, position, ...targetsFromExercise(e) } }]);
}

export async function updateRoutineExercise(id: string, patch: Partial<RoutineExercise>) {
  const cur = get('routineExercises', id);
  const err = validateTargets({ ...cur, ...patch });
  if (err) throw new Error(err);
  await commit([{ t: 'routineExercises', row: { id, ...patch } }]);
}

export async function removeRoutineExercise(id: string) {
  await commit([del('routineExercises', id)]);
}

export async function reorderRoutineExercises(orderedIds: string[]) {
  await commit(orderedIds.map((id, position) => ({ t: 'routineExercises', row: { id, position } })));
}

// ---------- Sesiones ----------
type Source = { exerciseId: string; targets: ExerciseTargets; suggestions?: { weight: number | null; reps: number | null }[] };

function suggestedSets(exerciseId: string, targets: ExerciseTargets, before: number) {
  const prev = previousPerformance(exerciseId, before);
  const work = prev?.sets.filter((s) => !s.warmup) ?? [];
  const n = Math.max(targets.sets, work.length);
  const out: { weight: number | null; reps: number | null; warmup: boolean }[] = [];
  for (const w of prev?.sets.filter((s) => s.warmup) ?? []) out.push({ weight: w.weight, reps: w.reps, warmup: true });
  for (let i = 0; i < n; i++) {
    const p = work[i] ?? work[work.length - 1];
    out.push({ weight: p?.weight ?? null, reps: p?.reps ?? null, warmup: false });
  }
  return out;
}

function sessionChanges(sessionId: string, sources: Source[], startedAt: number): Change[] {
  const changes: Change[] = [];
  sources.forEach((src, i) => {
    const seId = uuid();
    changes.push({ t: 'sessionExercises', row: { id: seId, sessionId, exerciseId: src.exerciseId, position: i, ...src.targets } });
    const sug = src.suggestions?.map((s) => ({ ...s, warmup: false })) ?? suggestedSets(src.exerciseId, src.targets, startedAt);
    sug.forEach((s, j) => changes.push({
      t: 'sets', row: {
        sessionId, sessionExerciseId: seId, exerciseId: src.exerciseId, position: j,
        weight: null, reps: null, sugWeight: s.weight, sugReps: s.reps, status: 'pending', warmup: s.warmup,
      },
    }));
  });
  return changes;
}

/** Inicia un entrenamiento a partir de una rutina (o vacío si routineId es null). */
export async function startSession(routineId: string | null, countsForSequence: boolean): Promise<string> {
  const now = Date.now();
  const routine = routineId ? get('routines', routineId) : undefined;
  const id = uuid();
  const sources: Source[] = routine
    ? routineExercises(routine.id).map((re) => ({
      exerciseId: re.exerciseId,
      targets: { sets: re.sets, repMin: re.repMin, repMax: re.repMax, increment: re.increment, restSec: re.restSec, progression: { ...DEFAULT_PROGRESSION, ...re.progression } },
    }))
    : [];
  await commit([
    { t: 'sessions', row: { id, routineId: routine?.id ?? null, routineName: routine?.name ?? 'Entrenamiento libre', startedAt: now, endedAt: null, status: 'active', countsForSequence: !!routine && countsForSequence } },
    ...sessionChanges(id, sources, now),
  ]);
  return id;
}

/** Nueva sesión usando otra como base: mismos ejercicios y sus series como valores sugeridos. */
export async function startFromSession(baseId: string, countsForSequence: boolean): Promise<string> {
  const base = get('sessions', baseId);
  if (!base) throw new Error('Sesión no encontrada.');
  const now = Date.now();
  const id = uuid();
  const sources: Source[] = sessionExercises(baseId).map((se) => ({
    exerciseId: se.exerciseId,
    targets: { sets: se.sets, repMin: se.repMin, repMax: se.repMax, increment: se.increment, restSec: se.restSec, progression: se.progression },
    suggestions: setsOf(se.id).filter((s) => !s.warmup).map((s) => ({ weight: s.weight ?? s.sugWeight ?? null, reps: s.reps ?? s.sugReps ?? null })),
  }));
  const routineExists = !!(base.routineId && get('routines', base.routineId) && !get('routines', base.routineId)?.deletedAt);
  await commit([
    { t: 'sessions', row: { id, routineId: routineExists ? base.routineId : null, routineName: base.routineName, startedAt: now, endedAt: null, status: 'active', countsForSequence: routineExists && countsForSequence } },
    ...sessionChanges(id, sources, now),
  ]);
  return id;
}

async function _addExerciseToSession(sessionId: string, exerciseId: string) {
  const e = get('exercises', exerciseId);
  const s = get('sessions', sessionId);
  if (!e || !s) throw new Error('No encontrado.');
  const position = Math.max(-1, ...sessionExercises(sessionId).map((x) => x.position)) + 1;
  const changes = sessionChanges(sessionId, [{ exerciseId, targets: targetsFromExercise(e) }], s.startedAt);
  (changes[0].row as Partial<SessionExercise>).position = position;
  await commit(changes);
}

async function _removeSessionExercise(seId: string) {
  await commit([del('sessionExercises', seId), ...setsOf(seId).map((s) => del('sets', s.id))]);
}

/** Corrige qué ejercicio se hizo: cambia la referencia del ejercicio y de todas sus series. */
async function _replaceSessionExercise(seId: string, exerciseId: string) {
  await commit([
    { t: 'sessionExercises', row: { id: seId, exerciseId } },
    ...setsOf(seId).map((s) => ({ t: 'sets', row: { id: s.id, exerciseId } }) as Change),
  ]);
}

async function _moveSessionExercise(seId: string, dir: -1 | 1) {
  const se = get('sessionExercises', seId);
  if (!se) return;
  const list = sessionExercises(se.sessionId);
  const i = list.findIndex((x) => x.id === seId), j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await commit(list.map((x, position) => ({ t: 'sessionExercises', row: { id: x.id, position } }) as Change));
}

async function _updateSessionExercise(id: string, patch: Partial<SessionExercise>) {
  await commit([{ t: 'sessionExercises', row: { id, ...patch } }]);
}

async function _addSet(seId: string): Promise<string> {
  const se = get('sessionExercises', seId)!;
  const list = setsOf(seId);
  const last = [...list].reverse().find((s) => !s.warmup) ?? list[list.length - 1];
  const id = uuid();
  await commit([{
    t: 'sets', row: {
      id, sessionId: se.sessionId, sessionExerciseId: seId, exerciseId: se.exerciseId,
      position: Math.max(-1, ...list.map((s) => s.position)) + 1,
      weight: null, reps: null,
      sugWeight: last ? last.weight ?? last.sugWeight ?? null : null,
      sugReps: last ? last.reps ?? last.sugReps ?? null : null,
      status: 'pending', warmup: false,
    },
  }]);
  return id;
}

export function validateSetValues(weight: number | null | undefined, reps: number | null | undefined): string | null {
  if (weight != null && (!Number.isFinite(weight) || weight < 0 || weight > 2000)) return 'Peso no válido.';
  if (reps != null && (!Number.isInteger(reps) || reps < 0 || reps > 500)) return 'Repeticiones no válidas.';
  return null;
}

async function _updateSet(id: string, patch: Partial<WorkSet>) {
  const cur = get('sets', id);
  if (!cur) throw new Error('Serie no encontrada.');
  const next = { ...cur, ...patch };
  const err = validateSetValues(next.weight, next.reps);
  if (err) throw new Error(err);
  await commit([{ t: 'sets', row: { id, ...patch } }]);
}

/** Marca la serie como hecha usando los valores sugeridos si no se escribió nada. */
async function _completeSet(id: string): Promise<WorkSet> {
  const s = get('sets', id)!;
  const weight = s.weight ?? s.sugWeight ?? null;
  const reps = s.reps ?? s.sugReps ?? null;
  if (weight == null || reps == null || reps <= 0) throw new Error('Indica peso y repeticiones antes de completar la serie.');
  const [row] = await commit([{ t: 'sets', row: { id, weight, reps, status: 'done' } }]);
  return row as WorkSet;
}

async function _uncompleteSet(id: string) {
  await commit([{ t: 'sets', row: { id, status: 'pending' } }]);
}

async function _deleteSet(id: string) {
  await commit([del('sets', id)]);
}

/** Aplica la recomendación de progresión a las series pendientes del ejercicio. */
async function _applyRecommendation(seId: string) {
  const se = get('sessionExercises', seId)!;
  const rec = recommendationFor(se.exerciseId, se, se.sessionId);
  if (!rec) return;
  const pending = setsOf(seId).filter((s) => s.status === 'pending' && !s.warmup);
  await commit(pending.map((s, i) => ({ t: 'sets', row: { id: s.id, sugWeight: rec.nextLoad, sugReps: rec.targetReps[i] ?? rec.targetReps[rec.targetReps.length - 1] } }) as Change));
}

async function _finishSession(id: string, status: Exclude<SessionStatus, 'active'>, extra: Partial<Session> = {}) {
  const s = get('sessions', id);
  if (!s) throw new Error('Sesión no encontrada.');
  const changes: Change[] = [{ t: 'sessions', row: { id, status, endedAt: s.endedAt && s.status !== 'active' ? s.endedAt : Date.now(), ...extra } }];
  if (status === 'completed') {
    // Las series pendientes sin datos reales se eliminan para no contaminar el historial.
    for (const set of setsOfSession(id)) if (set.status === 'pending' && set.weight == null && set.reps == null) changes.push(del('sets', set.id));
  }
  await commit(changes);
}

export async function resumeSession(id: string) {
  const other = all('sessions').find((s) => s.status === 'active' && s.id !== id);
  if (other) throw new Error('Ya hay otro entrenamiento en curso.');
  await commit([{ t: 'sessions', row: { id, status: 'active', endedAt: null } }]);
}

async function _updateSession(id: string, patch: Partial<Session>) {
  if (patch.startedAt != null && !Number.isFinite(patch.startedAt)) throw new Error('Fecha no válida.');
  const cur = get('sessions', id)!;
  const next = { ...cur, ...patch };
  if (next.endedAt != null && next.endedAt < next.startedAt) throw new Error('La hora de fin es anterior al inicio.');
  await commit([{ t: 'sessions', row: { id, ...patch } }]);
}

/** Borra la sesión con sus ejercicios y series. Nunca borra la rutina ni los ejercicios del catálogo. */
export async function deleteSession(id: string) {
  await commit([
    del('sessions', id),
    ...sessionExercises(id).map((se) => del('sessionExercises', se.id)),
    ...setsOfSession(id).map((s) => del('sets', s.id)),
  ]);
}

// Las operaciones del entrenamiento se ejecutan en serie: así, si se escribe un valor y se toca
// inmediatamente «completar», la serie se completa con el valor recién escrito.
let chain: Promise<unknown> = Promise.resolve();
function serial<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  return (...a: A): Promise<R> => {
    const r = chain.then(() => fn(...a));
    chain = r.catch(() => {});
    return r;
  };
}
export const updateSet = serial(_updateSet);
export const completeSet = serial(_completeSet);
export const uncompleteSet = serial(_uncompleteSet);
export const addSet = serial(_addSet);
export const deleteSet = serial(_deleteSet);
export const applyRecommendation = serial(_applyRecommendation);
export const finishSession = serial(_finishSession);
export const updateSession = serial(_updateSession);
export const addExerciseToSession = serial(_addExerciseToSession);
export const removeSessionExercise = serial(_removeSessionExercise);
export const replaceSessionExercise = serial(_replaceSessionExercise);
export const moveSessionExercise = serial(_moveSessionExercise);
export const updateSessionExercise = serial(_updateSessionExercise);

// ---------- Peso corporal ----------
export async function saveBodyweight(b: Partial<BodyWeight> & { measuredAt: number; weightKg: number }) {
  if (!(b.weightKg > 20 && b.weightKg < 400)) throw new Error('Peso fuera de rango (20–400 kg).');
  if (!Number.isFinite(b.measuredAt)) throw new Error('Fecha no válida.');
  await commit([{ t: 'bodyweights', row: b }]);
}
export async function deleteBodyweight(id: string) {
  await commit([del('bodyweights', id)]);
}

export { byPos };
