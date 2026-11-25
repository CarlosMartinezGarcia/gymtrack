import { alive, type Session, type WorkSet } from './types';

/** Serie válida: hecha, no calentamiento, reps > 0 y peso informado (0 permitido). DECISIONES §3. */
export function isValidSet(s: WorkSet): boolean {
  return alive(s) && s.status === 'done' && !s.warmup
    && typeof s.reps === 'number' && s.reps > 0
    && typeof s.weight === 'number' && s.weight >= 0;
}

/** Sesión válida: completada y con al menos una serie válida. */
export function isValidSession(session: Session, setsOfSession: WorkSet[]): boolean {
  return alive(session) && session.status === 'completed' && setsOfSession.some(isValidSet);
}

export interface ExerciseSessionEntry {
  session: Session;
  /** Series válidas del ejercicio en esa sesión, en su orden. */
  sets: WorkSet[];
}

/**
 * Historial válido de un ejercicio, de la más antigua a la más reciente.
 * Solo incluye sesiones completadas y series válidas.
 */
export function exerciseHistory(exerciseId: string, sessions: Session[], sets: WorkSet[]): ExerciseSessionEntry[] {
  const bySession = new Map<string, WorkSet[]>();
  for (const s of sets) {
    if (s.exerciseId !== exerciseId || !isValidSet(s)) continue;
    const arr = bySession.get(s.sessionId) ?? [];
    arr.push(s);
    bySession.set(s.sessionId, arr);
  }
  const out: ExerciseSessionEntry[] = [];
  for (const session of sessions) {
    if (!alive(session) || session.status !== 'completed') continue;
    const ss = bySession.get(session.id);
    if (!ss || !ss.length) continue;
    out.push({ session, sets: [...ss].sort((a, b) => a.position - b.position) });
  }
  return out.sort((a, b) => a.session.startedAt - b.session.startedAt);
}

/** Convierte RPE a RIR cuando no hay RIR. */
export function effectiveRir(s: WorkSet): number | null {
  if (typeof s.rir === 'number') return s.rir;
  if (typeof s.rpe === 'number') return Math.max(0, 10 - s.rpe);
  return null;
}
