// Consultas derivadas. Todo se recalcula desde los datos originales.
import { all, get } from './store';
import { alive, DEFAULT_PROGRESSION, type Exercise, type ExerciseTargets, type Profile, type RoutineExercise, type Session, type SessionExercise, type WorkSet } from '../domain/types';
import { exerciseHistory, isValidSet, type ExerciseSessionEntry } from '../domain/validity';
import { estimateByExercise, type CalorieItem, type SessionEstimate } from '../domain/exerciseCalories';
import { FALLBACK_WEIGHT_KG, weightAt } from '../domain/calories';
import { cardioMachine, isCardio, isDoneCardio } from '../domain/cardio';
import { libraryExercise } from '../domain/library';
import { recommend, type Recommendation } from '../domain/progression';
import { nextRoutine } from '../domain/sequence';

export const PROFILE_ID = 'profile';
export const DEFAULT_PROFILE: Profile = {
  id: PROFILE_ID, createdAt: 0, updatedAt: 0,
  defaultRestSec: 120, autoStartRest: true, sound: true, vibration: true, keepAwake: true, weightGoalKg: null,
};
export function profile(): Profile {
  return { ...DEFAULT_PROFILE, ...(get('profile', PROFILE_ID) ?? {}) };
}

export const byPos = <T extends { position: number; createdAt: number }>(a: T, b: T) => a.position - b.position || a.createdAt - b.createdAt;

export function exercises(): Exercise[] {
  return all('exercises').sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
export function exerciseName(id: string): string {
  const e = get('exercises', id);
  return e ? e.name + (e.deletedAt ? ' (eliminado)' : '') : 'Ejercicio desconocido';
}
export function routineExercises(routineId: string): RoutineExercise[] {
  return all('routineExercises').filter((r) => r.routineId === routineId && alive(get('exercises', r.exerciseId))).sort(byPos);
}
export function sessionExercises(sessionId: string): SessionExercise[] {
  return all('sessionExercises').filter((r) => r.sessionId === sessionId).sort(byPos);
}
export function setsOf(sessionExerciseId: string): WorkSet[] {
  return all('sets').filter((s) => s.sessionExerciseId === sessionExerciseId).sort(byPos);
}
export function setsOfSession(sessionId: string): WorkSet[] {
  return all('sets').filter((s) => s.sessionId === sessionId);
}
export function sessionsSorted(): Session[] {
  return all('sessions').sort((a, b) => b.startedAt - a.startedAt);
}
export function activeSession(): Session | undefined {
  return all('sessions').filter((s) => s.status === 'active').sort((a, b) => b.startedAt - a.startedAt)[0];
}
export function suggestion() {
  return nextRoutine(all('routines'), all('sessions'), all('sets'));
}

export function history(exerciseId: string, beforeSessionId?: string): ExerciseSessionEntry[] {
  const h = exerciseHistory(exerciseId, all('sessions'), all('sets'));
  if (!beforeSessionId) return h;
  const cur = get('sessions', beforeSessionId);
  return cur ? h.filter((e) => e.session.id !== beforeSessionId && e.session.startedAt < cur.startedAt) : h;
}

/** Última aparición del ejercicio en una sesión completada (series hechas, incluido calentamiento) anterior a `before`. */
export function previousPerformance(exerciseId: string, before?: number): { session: Session; sets: WorkSet[] } | null {
  const sessions = all('sessions')
    .filter((s) => s.status === 'completed' && (before == null || s.startedAt < before))
    .sort((a, b) => b.startedAt - a.startedAt);
  const sets = all('sets');
  for (const s of sessions) {
    const ss = sets.filter((x) => x.sessionId === s.id && x.exerciseId === exerciseId && x.status === 'done').sort(byPos);
    if (ss.length) return { session: s, sets: ss };
  }
  return null;
}

export function targetsFromExercise(e: Exercise): ExerciseTargets {
  return { sets: e.sets, repMin: e.repMin, repMax: e.repMax, increment: e.increment, restSec: e.restSec, progression: { ...DEFAULT_PROGRESSION, ...e.progression } };
}

export function recommendationFor(exerciseId: string, cfg: ExerciseTargets, beforeSessionId?: string): Recommendation | null {
  const e = get('exercises', exerciseId);
  return recommend(history(exerciseId, beforeSessionId), cfg, e?.unit ?? 'kg');
}

export function sessionDuration(s: Session, now = Date.now()): number {
  return Math.max(0, (s.endedAt ?? now) - s.startedAt);
}

/** Calorías por ejercicio de una sesión (§15). Null si no hay nada hecho. */
export function sessionCalories(sessionId: string): (SessionEstimate & { bodyKg: number; weighed: boolean }) | null {
  const s = get('sessions', sessionId);
  if (!s) return null;
  const ref = weightAt(all('bodyweights'), s.startedAt);
  const bodyKg = ref?.weightKg ?? FALLBACK_WEIGHT_KG;
  const items: CalorieItem[] = [];
  for (const se of sessionExercises(sessionId)) {
    const ex = get('exercises', se.exerciseId);
    const sets = setsOf(se.id);
    if (isCardio(ex)) {
      const tramos = sets.filter(isDoneCardio).map((t) => ({ durationMin: t.durationMin!, intensity: t.cardioIntensity ?? null, speedKmh: t.speedKmh ?? null, incline: t.incline ?? null }));
      if (tramos.length) items.push({ kind: 'cardio', key: se.id, machine: cardioMachine(ex), tramos });
    } else {
      const done = sets.filter(isValidSet).map((x) => ({ weight: x.weight ?? 0, reps: x.reps ?? 0 }));
      if (done.length) items.push({ kind: 'strength', key: se.id, met: libraryExercise(ex?.libraryId)?.met ?? null, sets: done, restSec: se.restSec });
    }
  }
  if (!items.length) return null;
  return { ...estimateByExercise(items, bodyKg, sessionDuration(s) / 60000), bodyKg, weighed: !!ref };
}
