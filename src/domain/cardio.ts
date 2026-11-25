// Cardio: registro por minutos e intensidad (y velocidad e inclinación en la cinta). Ver docs/DECISIONES.md §14.
import { libraryExercise, type CardioMachine } from './library';
import type { Exercise, Intensity, WorkSet } from './types';

export type Incline = 'none' | 'low' | 'medium' | 'high';
export type CardioPhase = 'warmup' | 'main' | 'cooldown';

export const INTENSITY_LABEL: Record<Intensity, string> = { light: 'Baja', moderate: 'Media', vigorous: 'Alta' };
export const INCLINE_LABEL: Record<Incline, string> = { none: '0', low: 'Baja', medium: 'Media', high: 'Alta' };
export const PHASE_LABEL: Record<CardioPhase, string> = { warmup: 'Calentamiento', main: 'Cardio', cooldown: 'Enfriamiento' };

/** Un ejercicio es de cardio si se marcó así o si está vinculado a un cardio de la biblioteca. */
export function isCardio(e: Pick<Exercise, 'mode' | 'libraryId'> | undefined | null): boolean {
  if (!e) return false;
  return e.mode === 'cardio' || libraryExercise(e.libraryId)?.equipment === 'cardio';
}

export function cardioMachine(e: Pick<Exercise, 'libraryId'> | undefined | null): CardioMachine | null {
  return libraryExercise(e?.libraryId)?.cardio ?? null;
}

/**
 * Fase de cada ejercicio de cardio según su posición en la sesión:
 * antes del primer ejercicio de fuerza = calentamiento; después del último = enfriamiento;
 * entre medias o en una sesión solo de cardio = cardio.
 */
export function cardioPhases(cardioFlags: boolean[]): (CardioPhase | null)[] {
  const first = cardioFlags.indexOf(false);
  const last = cardioFlags.lastIndexOf(false);
  return cardioFlags.map((c, i) => {
    if (!c) return null;
    if (first === -1) return 'main';
    if (i < first) return 'warmup';
    if (i > last) return 'cooldown';
    return 'main';
  });
}

/** Tramo de cardio hecho: completado y con minutos > 0. Nunca cuenta para progresión, récords ni volumen de fuerza. */
export function isDoneCardio(s: WorkSet): boolean {
  return !s.deletedAt && s.status === 'done' && typeof s.durationMin === 'number' && s.durationMin > 0;
}

export function validateCardio(v: Partial<Pick<WorkSet, 'durationMin' | 'speedKmh'>>): string | null {
  if (v.durationMin != null && (!Number.isFinite(v.durationMin) || v.durationMin < 0 || v.durationMin > 600)) return 'Minutos no válidos.';
  if (v.speedKmh != null && (!Number.isFinite(v.speedKmh) || v.speedKmh < 0 || v.speedKmh > 30)) return 'Velocidad no válida.';
  return null;
}

/** Resumen corto de un tramo: «20 min · Media · 6,5 km/h · incl. Baja». */
export function cardioLine(s: Pick<WorkSet, 'durationMin' | 'cardioIntensity' | 'speedKmh' | 'incline'>): string {
  const parts: string[] = [];
  parts.push(s.durationMin != null ? `${String(s.durationMin).replace('.', ',')} min` : '— min');
  if (s.cardioIntensity) parts.push(INTENSITY_LABEL[s.cardioIntensity]);
  if (s.speedKmh != null) parts.push(`${String(s.speedKmh).replace('.', ',')} km/h`);
  if (s.incline) parts.push(`incl. ${INCLINE_LABEL[s.incline]}`);
  return parts.join(' · ');
}
