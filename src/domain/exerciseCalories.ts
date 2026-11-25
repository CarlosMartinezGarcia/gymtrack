// Calorías por ejercicio. Ver docs/DECISIONES.md §15. Siempre son estimaciones, nunca mediciones.
import type { CardioMachine } from './library';
import type { Incline } from './cardio';
import type { Intensity } from './types';

export interface StrengthItem {
  kind: 'strength';
  key: string;
  /** MET del ejercicio (biblioteca) o null si no está vinculado. */
  met: number | null;
  /** Series hechas (no calentamiento): carga registrada y repeticiones. */
  sets: { weight: number; reps: number }[];
  restSec: number;
}
export interface CardioItem {
  kind: 'cardio';
  key: string;
  machine: CardioMachine | null;
  tramos: { durationMin: number; intensity: Intensity | null; speedKmh: number | null; incline: Incline | null }[];
}
export type CalorieItem = StrengthItem | CardioItem;

export interface ItemEstimate { key: string; low: number; high: number; minutes: number }
export interface SessionEstimate { items: ItemEstimate[]; low: number; high: number }

/** MET de fuerza sin vincular a la biblioteca: valor medio del Compendium. */
export const DEFAULT_STRENGTH_MET = 4.5;
/** Tiempo activo estimado por serie. */
export const ACTIVE_SEC_PER_SET = 45;
/** Desplazamiento medio por repetición y eficiencia muscular para el trabajo mecánico de los kilos levantados. */
const REP_METERS = 0.5, EFFICIENCY = 0.25, J_PER_KCAL = 4184, G = 9.81;

/** MET por máquina e intensidad (Compendium of Physical Activities, 2024). */
export const CARDIO_MET: Record<CardioMachine | 'other', Record<Intensity, number>> = {
  treadmill: { light: 3.5, moderate: 5.0, vigorous: 8.3 },
  bike: { light: 3.5, moderate: 6.8, vigorous: 8.8 },
  elliptical: { light: 4.0, moderate: 5.0, vigorous: 6.5 },
  rower: { light: 4.8, moderate: 7.0, vigorous: 8.5 },
  stairs: { light: 6.0, moderate: 8.8, vigorous: 9.5 },
  other: { light: 4.0, moderate: 6.0, vigorous: 8.0 },
};
export const INCLINE_GRADE: Record<Incline, number> = { none: 0, low: 0.03, medium: 0.07, high: 0.12 };

/**
 * MET en cinta con la ecuación del ACSM cuando hay velocidad:
 * caminando (< 8 km/h) VO2 = 0,1·v + 1,8·v·i + 3,5; corriendo VO2 = 0,2·v + 0,9·v·i + 3,5 (v en m/min, i = pendiente). MET = VO2 / 3,5.
 */
export function treadmillMet(speedKmh: number, incline: Incline | null): number {
  const v = (speedKmh * 1000) / 60;
  const g = INCLINE_GRADE[incline ?? 'none'];
  const vo2 = speedKmh < 8 ? 0.1 * v + 1.8 * v * g + 3.5 : 0.2 * v + 0.9 * v * g + 3.5;
  return vo2 / 3.5;
}

export function cardioMet(machine: CardioMachine | null, t: CardioItem['tramos'][number]): number {
  if (machine === 'treadmill' && t.speedKmh != null && t.speedKmh > 0) return treadmillMet(t.speedKmh, t.incline);
  return CARDIO_MET[machine ?? 'other'][t.intensity ?? 'moderate'];
}

/** kcal del trabajo mecánico de levantar la carga (pequeño frente al gasto total, pero depende de los kilos). */
export function liftingWorkKcal(sets: StrengthItem['sets']): number {
  const joules = sets.reduce((a, s) => a + Math.max(0, s.weight) * Math.max(0, s.reps) * G * REP_METERS, 0) / EFFICIENCY;
  return joules / J_PER_KCAL;
}

/**
 * Reparte la sesión por ejercicio:
 * - Cardio: MET × kg × minutos registrados (±10 %).
 * - Fuerza: MET del ejercicio × kg × tiempo estimado (45 s por serie + descanso entre series), más el trabajo mecánico
 *   de los kilos levantados. Si el tiempo estimado de fuerza supera el que queda de la sesión, se ajusta a ese tiempo.
 *   Intervalo: −15 % / +10 % sobre el MET.
 */
export function estimateByExercise(items: CalorieItem[], bodyKg: number, sessionMin: number): SessionEstimate {
  const out: ItemEstimate[] = [];
  let cardioMin = 0;
  for (const it of items) if (it.kind === 'cardio') cardioMin += it.tramos.reduce((a, t) => a + t.durationMin, 0);
  const strengthMin = (it: StrengthItem) => it.sets.length ? (it.sets.length * ACTIVE_SEC_PER_SET + (it.sets.length - 1) * Math.min(it.restSec, 300)) / 60 : 0;
  const wanted = items.reduce((a, it) => a + (it.kind === 'strength' ? strengthMin(it) : 0), 0);
  const available = Math.max(0, sessionMin - cardioMin);
  const scale = wanted > 0 && sessionMin > 0 && wanted > available ? available / wanted : 1;
  for (const it of items) {
    if (it.kind === 'cardio') {
      const kcal = it.tramos.reduce((a, t) => a + cardioMet(it.machine, t) * bodyKg * (t.durationMin / 60), 0);
      out.push({ key: it.key, low: Math.round(kcal * 0.9), high: Math.round(kcal * 1.1), minutes: it.tramos.reduce((a, t) => a + t.durationMin, 0) });
    } else {
      const min = strengthMin(it) * scale;
      const met = it.met ?? DEFAULT_STRENGTH_MET;
      const base = met * bodyKg * (min / 60);
      const work = liftingWorkKcal(it.sets);
      out.push({ key: it.key, low: Math.round(base * 0.85 + work), high: Math.round(base * 1.1 + work), minutes: Math.round(min * 10) / 10 });
    }
  }
  return { items: out, low: out.reduce((a, x) => a + x.low, 0), high: out.reduce((a, x) => a + x.high, 0) };
}
