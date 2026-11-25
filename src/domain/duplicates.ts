import { alive, type Session } from './types';

export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** Ids de sesiones que parecen duplicadas: misma rutina iniciada con menos de 10 min de diferencia. */
export function possibleDuplicates(sessions: Session[]): Set<string> {
  const out = new Set<string>();
  const list = sessions.filter((s) => alive(s) && s.status !== 'active').sort((a, b) => a.startedAt - b.startedAt);
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    if (a.routineId && a.routineId === b.routineId && b.startedAt - a.startedAt < DUPLICATE_WINDOW_MS) {
      out.add(a.id); out.add(b.id);
    }
  }
  return out;
}
