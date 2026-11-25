import type { Routine, Session, WorkSet, ProgressionInput } from './_types';
export type { ProgressionInput };

let n = 0;
const id = (p: string) => `${p}-${++n}`;
const DAY = 86_400_000;
export const T0 = Date.UTC(2026, 0, 5, 18); // lunes

export function routine(name: string, position: number): Routine {
  return { id: id('r'), name, position, createdAt: 0, updatedAt: 0 };
}

export function session(opts: Partial<Session> & { day: number }): Session {
  return {
    id: id('s'), routineId: null, routineName: '', status: 'completed', countsForSequence: true,
    startedAt: T0 + opts.day * DAY, endedAt: T0 + opts.day * DAY + 3_600_000, createdAt: 0, updatedAt: 0, ...opts,
  };
}

/** Crea series hechas: [[peso, reps], ...] */
export function sets(sessionId: string, exerciseId: string, list: [number, number][], extra: Partial<WorkSet> = {}): WorkSet[] {
  return list.map(([w, r], i) => ({
    id: id('set'), sessionId, sessionExerciseId: `${sessionId}-${exerciseId}`, exerciseId, position: i,
    weight: w, reps: r, status: 'done', warmup: false, createdAt: 0, updatedAt: 0, ...extra,
  }));
}

export const cfg = (over: Partial<ProgressionInput> = {}, prog: Partial<ProgressionInput['progression']> = {}): ProgressionInput => ({
  sets: 3, repMin: 8, repMax: 12, increment: 2.5,
  progression: { type: 'double', targetRir: null, upSessions: 1, downSessions: 2, ...prog },
  ...over,
});
