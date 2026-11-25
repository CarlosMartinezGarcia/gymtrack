// Motor de progresión. Reglas exactas en docs/DECISIONES.md §6.
// Interfaz estable: (historial válido, configuración) -> Recommendation.
import type { ExerciseTargets, WorkSet } from './types';
import { effectiveRir, type ExerciseSessionEntry } from './validity';
import { avg, fmt } from './metrics';

export type Action = 'SUBIR' | 'MANTENER' | 'BAJAR';

export interface Recommendation {
  action: Action;
  currentLoad: number;
  nextLoad: number;
  /** Repeticiones objetivo por serie para la próxima sesión. */
  targetReps: number[];
  /** Explicación concreta, en orden. */
  reasons: string[];
  /** Objetivo resumido de la próxima sesión. */
  goal: string;
  stagnation: boolean;
  basedOnSessionIds: string[];
}

export type ProgressionInput = Pick<ExerciseTargets, 'sets' | 'repMin' | 'repMax' | 'increment' | 'progression'>;

interface Eval {
  entry: ExerciseSessionEntry;
  load: number;
  work: WorkSet[];
  mixedLoads: boolean;
  enoughSets: boolean;
  atMax: number;
  belowMin: number;
  rirAvg: number | null;
  rirBlocks: boolean;
  consolidated: boolean;
  failed: boolean;
  workReps: number;
}

export function evaluateSession(entry: ExerciseSessionEntry, cfg: ProgressionInput): Eval {
  const load = Math.max(...entry.sets.map((s) => s.weight ?? 0));
  const work = entry.sets.filter((s) => s.weight === load);
  const mixedLoads = work.length !== entry.sets.length;
  const atMax = work.filter((s) => (s.reps ?? 0) >= cfg.repMax).length;
  const belowMin = work.filter((s) => (s.reps ?? 0) < cfg.repMin).length;
  const rirs = work.map(effectiveRir).filter((r): r is number => r != null);
  const rirAvg = rirs.length ? avg(rirs) : null;
  const target = cfg.progression.targetRir;
  const rirBlocks = typeof target === 'number' && rirAvg != null && rirAvg < target;
  const enoughSets = work.length >= cfg.sets;
  const consolidated = atMax >= cfg.sets && !rirBlocks;
  const failed = belowMin >= Math.ceil(cfg.sets / 2);
  return {
    entry, load, work, mixedLoads, enoughSets, atMax, belowMin, rirAvg, rirBlocks, consolidated, failed,
    workReps: work.reduce((a, s) => a + (s.reps ?? 0), 0),
  };
}

const repsStr = (sets: WorkSet[]) => sets.map((s) => s.reps).join(' / ');

/** Devuelve null si no hay historial válido o la progresión está desactivada. */
export function recommend(history: ExerciseSessionEntry[], cfg: ProgressionInput, unit = 'kg'): Recommendation | null {
  if (cfg.progression.type === 'none' || !history.length) return null;
  const evals = history.map((h) => evaluateSession(h, cfg));
  const last = evals[evals.length - 1];
  const load = last.load;
  // Sesiones consecutivas más recientes con la misma carga de trabajo.
  const sameLoad: Eval[] = [];
  for (let i = evals.length - 1; i >= 0 && evals[i].load === load; i--) sameLoad.unshift(evals[i]);

  const reasons: string[] = [];
  reasons.push(`Última sesión con ${fmt(load)} ${unit}: ${repsStr(last.work)} (rango ${cfg.repMin}–${cfg.repMax}, ${cfg.sets} series objetivo).`);
  if (last.mixedLoads) {
    reasons.push(`Hubo series con otras cargas; solo cuentan las ${last.work.length} series con la carga más alta (${fmt(load)} ${unit}).`);
  }

  const up = Math.max(1, cfg.progression.upSessions);
  const down = Math.max(1, cfg.progression.downSessions);
  const recent = (n: number) => sameLoad.slice(-n);
  const base = (n: number) => recent(n).map((e) => e.entry.session.id);

  // Estancamiento: 3 sesiones con la misma carga, sin consolidar y sin aumentar reps de trabajo.
  const last3 = sameLoad.slice(-3);
  const stagnation = last3.length === 3 && last3.every((e) => !e.consolidated) && last3[2].workReps <= last3[0].workReps;

  const upWindow = recent(up);
  if (upWindow.length === up && upWindow.every((e) => e.consolidated)) {
    const next = load + cfg.increment;
    reasons.push(up === 1
      ? `Las ${cfg.sets} series objetivo llegaron al máximo del rango (${cfg.repMax}).`
      : `Las ${cfg.sets} series objetivo llegaron al máximo del rango en ${up} sesiones seguidas.`);
    if (last.rirAvg != null) reasons.push(`RIR medio registrado: ${fmt(last.rirAvg, 1)}.`);
    return {
      action: 'SUBIR', currentLoad: load, nextLoad: next,
      targetReps: Array(cfg.sets).fill(cfg.repMin),
      reasons, goal: `Subir a ${fmt(next)} ${unit} y trabajar desde ${cfg.repMin} repeticiones.`,
      stagnation: false, basedOnSessionIds: base(up),
    };
  }

  const downWindow = recent(down);
  if (downWindow.length === down && downWindow.every((e) => e.failed)) {
    const next = Math.max(0, load - cfg.increment);
    reasons.push(`En ${down} sesiones seguidas, al menos ${Math.ceil(cfg.sets / 2)} series quedaron por debajo del mínimo (${cfg.repMin}).`);
    return {
      action: 'BAJAR', currentLoad: load, nextLoad: next,
      targetReps: Array(cfg.sets).fill(cfg.repMin),
      reasons, goal: `Bajar a ${fmt(next)} ${unit} y completar ${cfg.sets} series dentro del rango ${cfg.repMin}–${cfg.repMax}.`,
      stagnation, basedOnSessionIds: base(down),
    };
  }

  // MANTENER
  const targetReps: number[] = [];
  for (let i = 0; i < cfg.sets; i++) {
    const r = last.work[i]?.reps ?? cfg.repMin;
    targetReps.push(Math.min(cfg.repMax, Math.max(cfg.repMin, r < cfg.repMax ? r + 1 : r)));
  }
  if (!last.enoughSets) reasons.push(`Solo ${last.work.length} de ${cfg.sets} series objetivo con esta carga: completa las ${cfg.sets} antes de subir.`);
  else if (last.rirBlocks) reasons.push(`Se llegó al máximo, pero el RIR medio (${fmt(last.rirAvg, 1)}) es menor que el objetivo (${cfg.progression.targetRir}): conviene consolidar.`);
  else if (last.consolidated && up > 1) reasons.push(`Sesión consolidada; se necesitan ${up} seguidas para subir (${upWindow.filter((e) => e.consolidated).length} de ${up}).`);
  else if (last.failed) reasons.push(`${last.belowMin} series por debajo del mínimo. Si se repite en ${down} sesiones seguidas se recomendará bajar.`);
  else reasons.push(`${last.atMax} de ${cfg.sets} series en el máximo del rango: aún hay margen para sumar repeticiones.`);
  if (stagnation) reasons.push(`Estancamiento: 3 sesiones con ${fmt(load)} ${unit} sin aumentar las repeticiones. Revisa descanso, técnica o recuperación.`);

  return {
    action: 'MANTENER', currentLoad: load, nextLoad: load, targetReps, reasons,
    goal: `Mantener ${fmt(load)} ${unit} y buscar ${targetReps.join(' / ')} repeticiones con buena técnica.`,
    stagnation, basedOnSessionIds: [last.entry.session.id],
  };
}
