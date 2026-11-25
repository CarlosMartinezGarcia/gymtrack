// Modelo de datos de GymTrack. Ver docs/DECISIONES.md §2.

export interface Base {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export type ProgressionType = 'double' | 'none';

export interface ProgressionConfig {
  type: ProgressionType;
  /** RIR objetivo opcional. Si se informa, impide subir cuando el RIR medio real es menor. */
  targetRir?: number | null;
  /** Sesiones consecutivas consolidadas necesarias para subir. */
  upSessions: number;
  /** Sesiones consecutivas fallidas necesarias para bajar. */
  downSessions: number;
}

export type ExerciseKind = 'free' | 'machine' | 'cable' | 'bodyweight' | 'assisted' | 'other';
export type LoadUnit = 'kg' | 'lb';

export interface ExerciseTargets {
  sets: number;
  repMin: number;
  repMax: number;
  increment: number;
  restSec: number;
  progression: ProgressionConfig;
}

export interface Exercise extends Base, ExerciseTargets {
  name: string;
  muscleGroup?: string;
  kind: ExerciseKind;
  unit: LoadUnit;
  notes?: string;
}

export interface Routine extends Base {
  name: string;
  description?: string;
  notes?: string;
  position: number;
}

export interface RoutineExercise extends Base, ExerciseTargets {
  routineId: string;
  exerciseId: string;
  position: number;
}

export type SessionStatus = 'active' | 'draft' | 'abandoned' | 'completed';
export type Intensity = 'light' | 'moderate' | 'vigorous';

export interface Session extends Base {
  routineId: string | null;
  routineName: string;
  startedAt: number;
  endedAt?: number | null;
  status: SessionStatus;
  countsForSequence: boolean;
  intensity?: Intensity | null;
  notes?: string;
}

export interface SessionExercise extends Base, ExerciseTargets {
  sessionId: string;
  exerciseId: string;
  position: number;
  notes?: string;
}

export type SetStatus = 'pending' | 'done';

export interface WorkSet extends Base {
  sessionId: string;
  sessionExerciseId: string;
  exerciseId: string;
  position: number;
  weight: number | null;
  reps: number | null;
  sugWeight?: number | null;
  sugReps?: number | null;
  status: SetStatus;
  rir?: number | null;
  rpe?: number | null;
  warmup: boolean;
  notes?: string;
}

export interface BodyWeight extends Base {
  measuredAt: number;
  weightKg: number;
}

export interface Profile extends Base {
  defaultRestSec: number;
  autoStartRest: boolean;
  sound: boolean;
  vibration: boolean;
  keepAwake: boolean;
  weightGoalKg?: number | null;
}

export interface TableMap {
  profile: Profile;
  exercises: Exercise;
  routines: Routine;
  routineExercises: RoutineExercise;
  sessions: Session;
  sessionExercises: SessionExercise;
  sets: WorkSet;
  bodyweights: BodyWeight;
}
export type TableName = keyof TableMap;
export const TABLES: TableName[] = [
  'profile', 'exercises', 'routines', 'routineExercises',
  'sessions', 'sessionExercises', 'sets', 'bodyweights',
];

export const DEFAULT_PROGRESSION: ProgressionConfig = { type: 'double', targetRir: null, upSessions: 1, downSessions: 2 };

export const alive = <T extends Base>(r: T | undefined | null): r is T => !!r && !r.deletedAt;
