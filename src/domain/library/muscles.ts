// Músculos que usa la biblioteca de ejercicios y el mapa de calor. Ver docs/DECISIONES.md §13.

export type MuscleId =
  | 'pecho' | 'deltoide_anterior' | 'deltoide_lateral' | 'deltoide_posterior'
  | 'biceps' | 'triceps' | 'antebrazo'
  | 'abdominales' | 'oblicuos'
  | 'dorsal' | 'trapecio' | 'espalda_media' | 'lumbar'
  | 'gluteo' | 'cuadriceps' | 'isquios' | 'aductores' | 'abductores' | 'gemelos';

export interface MuscleInfo {
  id: MuscleId;
  name: string;
  /** Grupo para filtrar la biblioteca. */
  group: 'Pecho' | 'Hombro' | 'Brazos' | 'Core' | 'Espalda' | 'Pierna';
}

export const MUSCLES: MuscleInfo[] = [
  { id: 'pecho', name: 'Pecho', group: 'Pecho' },
  { id: 'deltoide_anterior', name: 'Hombro frontal', group: 'Hombro' },
  { id: 'deltoide_lateral', name: 'Hombro lateral', group: 'Hombro' },
  { id: 'deltoide_posterior', name: 'Hombro posterior', group: 'Hombro' },
  { id: 'biceps', name: 'Bíceps', group: 'Brazos' },
  { id: 'triceps', name: 'Tríceps', group: 'Brazos' },
  { id: 'antebrazo', name: 'Antebrazo', group: 'Brazos' },
  { id: 'abdominales', name: 'Abdominales', group: 'Core' },
  { id: 'oblicuos', name: 'Oblicuos', group: 'Core' },
  { id: 'dorsal', name: 'Dorsal', group: 'Espalda' },
  { id: 'trapecio', name: 'Trapecio', group: 'Espalda' },
  { id: 'espalda_media', name: 'Espalda media', group: 'Espalda' },
  { id: 'lumbar', name: 'Lumbar', group: 'Espalda' },
  { id: 'gluteo', name: 'Glúteo', group: 'Pierna' },
  { id: 'cuadriceps', name: 'Cuádriceps', group: 'Pierna' },
  { id: 'isquios', name: 'Isquiotibiales', group: 'Pierna' },
  { id: 'aductores', name: 'Aductores', group: 'Pierna' },
  { id: 'abductores', name: 'Abductores', group: 'Pierna' },
  { id: 'gemelos', name: 'Gemelos', group: 'Pierna' },
];

export const MUSCLE_BY_ID: Record<MuscleId, MuscleInfo> = Object.fromEntries(MUSCLES.map((m) => [m.id, m])) as Record<MuscleId, MuscleInfo>;
export const MUSCLE_GROUPS = ['Pecho', 'Espalda', 'Hombro', 'Brazos', 'Pierna', 'Core'] as const;
