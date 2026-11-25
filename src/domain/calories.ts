import type { BodyWeight, Intensity } from './types';
import { alive } from './types';

/** Rangos MET para entrenamiento de fuerza (Compendium of Physical Activities). DECISIONES §7. */
export const MET_RANGES: Record<Intensity | 'unknown', [number, number]> = {
  unknown: [3.5, 6.0],
  light: [3.0, 3.5],
  moderate: [3.5, 5.0],
  vigorous: [5.0, 6.0],
};
export const FALLBACK_WEIGHT_KG = 70;

export interface CalorieEstimate {
  low: number;
  high: number;
  orientative: boolean;
  basis: string;
}

/** Peso corporal de referencia: el más cercano anterior a la fecha; si no hay, el más próximo. */
export function weightAt(entries: BodyWeight[], at: number): BodyWeight | null {
  const list = entries.filter(alive).sort((a, b) => a.measuredAt - b.measuredAt);
  if (!list.length) return null;
  let before: BodyWeight | null = null;
  for (const e of list) if (e.measuredAt <= at) before = e;
  return before ?? list[0];
}

export function estimateCalories(durationMs: number, intensity: Intensity | null | undefined, bodyweights: BodyWeight[], at: number): CalorieEstimate | null {
  if (!(durationMs >= 60_000)) return null; // menos de 1 minuto: no se estima
  const hours = durationMs / 3_600_000;
  const ref = weightAt(bodyweights, at);
  const kg = ref?.weightKg ?? FALLBACK_WEIGHT_KG;
  const [mLow, mHigh] = MET_RANGES[intensity ?? 'unknown'];
  const minutes = Math.round(durationMs / 60000);
  const parts = [`${minutes} min`, ref ? `${ref.weightKg} kg de peso corporal` : `sin peso registrado (se usan ${FALLBACK_WEIGHT_KG} kg)`, intensity ? `intensidad ${INTENSITY_LABEL[intensity]}` : 'intensidad no indicada'];
  return {
    low: Math.round(mLow * kg * hours),
    high: Math.round(mHigh * kg * hours),
    orientative: !ref || !intensity,
    basis: parts.join(', '),
  };
}

export const INTENSITY_LABEL: Record<Intensity, string> = { light: 'suave', moderate: 'moderada', vigorous: 'intensa' };
