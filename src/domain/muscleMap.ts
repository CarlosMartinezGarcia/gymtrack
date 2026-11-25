// Mapa de calor muscular de una rutina. Ver docs/DECISIONES.md §16.
import { libraryExercise, MUSCLES, type MuscleId } from './library';

export interface MapEntry { libraryId?: string | null; sets: number; cardio: boolean }
export interface MuscleLoad {
  /** Series ponderadas por músculo: principal = 1 por serie, secundario = 0,5 por serie. */
  load: Record<MuscleId, number>;
  max: number;
  /** Ejercicios de fuerza que no están vinculados a la biblioteca (no suman al mapa). */
  unlinked: number;
}

export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.5;

export function muscleLoad(entries: MapEntry[]): MuscleLoad {
  const load = Object.fromEntries(MUSCLES.map((m) => [m.id, 0])) as Record<MuscleId, number>;
  let unlinked = 0;
  for (const e of entries) {
    if (e.cardio) continue; // el cardio no cuenta para el mapa
    const lib = libraryExercise(e.libraryId);
    if (!lib || lib.equipment === 'cardio') { unlinked++; continue; }
    const sets = Math.max(0, e.sets);
    for (const m of lib.primary) load[m] += sets * PRIMARY_WEIGHT;
    for (const m of lib.secondary) load[m] += sets * SECONDARY_WEIGHT;
  }
  return { load, max: Math.max(0, ...Object.values(load)), unlinked };
}

/** Nivel 0–4 para colorear: 0 = sin trabajo; 1–4 = cuartos respecto al músculo más trabajado. */
export function heatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!(value > 0) || !(max > 0)) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as 1 | 2 | 3 | 4;
}
