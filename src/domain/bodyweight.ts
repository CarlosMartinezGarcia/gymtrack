import { alive, type BodyWeight } from './types';
import { avg, round2 } from './metrics';

/** Lunes 00:00 (hora local) de la semana que contiene `t`. */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

export interface WeeklyAverage { weekStart: number; avgKg: number; count: number }

export function weeklyAverages(entries: BodyWeight[]): WeeklyAverage[] {
  const map = new Map<number, number[]>();
  for (const e of entries.filter(alive)) {
    const k = weekStart(e.measuredAt);
    map.set(k, [...(map.get(k) ?? []), e.weightKg]);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ weekStart: k, avgKg: round2(avg(v)), count: v.length }));
}

export interface PeriodChange { first: BodyWeight; last: BodyWeight; diffKg: number; days: number; weeklyAvgDiffKg: number | null }

/** Cambio entre el primer y el último registro del periodo [from, to]. */
export function periodChange(entries: BodyWeight[], from: number, to: number): PeriodChange | null {
  const list = entries.filter((e) => alive(e) && e.measuredAt >= from && e.measuredAt <= to).sort((a, b) => a.measuredAt - b.measuredAt);
  if (list.length < 2) return null;
  const first = list[0], last = list[list.length - 1];
  const weeks = weeklyAverages(list);
  return {
    first, last,
    diffKg: round2(last.weightKg - first.weightKg),
    days: Math.round((last.measuredAt - first.measuredAt) / 86_400_000),
    weeklyAvgDiffKg: weeks.length >= 2 ? round2(weeks[weeks.length - 1].avgKg - weeks[0].avgKg) : null,
  };
}

export function latestWeight(entries: BodyWeight[]): BodyWeight | null {
  return entries.filter(alive).sort((a, b) => b.measuredAt - a.measuredAt)[0] ?? null;
}
