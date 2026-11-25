import { alive, type Routine, type Session, type WorkSet } from './types';
import { isValidSession } from './validity';

export interface SequenceSuggestion {
  routine: Routine | null;
  /** Sesión en la que se basa la sugerencia (null si no hay ninguna). */
  basedOn: Session | null;
  reason: string;
}

/** Rutinas activas en el orden de la secuencia. */
export function orderedRoutines(routines: Routine[]): Routine[] {
  return routines.filter(alive).sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
}

/**
 * Siguiente rutina según la secuencia. DECISIONES §4.
 * Se basa en la última sesión válida que cuenta para la secuencia y cuya rutina siga existiendo.
 */
export function nextRoutine(routines: Routine[], sessions: Session[], sets: WorkSet[]): SequenceSuggestion {
  const order = orderedRoutines(routines);
  if (!order.length) return { routine: null, basedOn: null, reason: 'No hay rutinas creadas.' };

  const setsBySession = new Map<string, WorkSet[]>();
  for (const s of sets) {
    const arr = setsBySession.get(s.sessionId) ?? [];
    arr.push(s);
    setsBySession.set(s.sessionId, arr);
  }
  const candidates = sessions
    .filter((s) => s.countsForSequence && s.routineId && isValidSession(s, setsBySession.get(s.id) ?? []))
    .sort((a, b) => b.startedAt - a.startedAt);

  for (const last of candidates) {
    const idx = order.findIndex((r) => r.id === last.routineId);
    if (idx === -1) continue; // la rutina ya no existe: probamos con la sesión anterior
    const next = order[(idx + 1) % order.length];
    return {
      routine: next,
      basedOn: last,
      reason: `Última sesión de la secuencia: ${order[idx].name}.`,
    };
  }
  return { routine: order[0], basedOn: null, reason: 'Aún no hay sesiones de la secuencia: se empieza por la primera rutina.' };
}

/** Mueve un elemento de posición y devuelve los nuevos valores de `position` (0..n-1). */
export function reorder<T extends { id: string }>(items: T[], from: number, to: number): { id: string; position: number }[] {
  const arr = [...items];
  const [moved] = arr.splice(from, 1);
  arr.splice(Math.max(0, Math.min(to, arr.length)), 0, moved);
  return arr.map((it, i) => ({ id: it.id, position: i }));
}
