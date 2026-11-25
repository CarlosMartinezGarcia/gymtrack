import type { WorkSet } from './types';
import type { ExerciseSessionEntry } from './validity';

/** Volumen = Σ peso × reps de series válidas. Ver limitaciones en DECISIONES §5. */
export function volume(sets: WorkSet[]): number {
  return round2(sets.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0));
}

export const E1RM_MAX_REPS = 12;
export const E1RM_RELIABLE_REPS = 10;

/** 1RM estimado con Epley. Devuelve null por encima de 12 reps o sin carga. */
export function epley(weight: number, reps: number): number | null {
  if (!(weight > 0) || !(reps > 0) || reps > E1RM_MAX_REPS) return null;
  if (reps === 1) return weight;
  return round2(weight * (1 + reps / 30));
}

export interface BestSet { weight: number; reps: number; e1rm: number; reliable: boolean; setId: string }

export function bestSet(sets: WorkSet[]): BestSet | null {
  let best: BestSet | null = null;
  for (const s of sets) {
    const e = epley(s.weight ?? 0, s.reps ?? 0);
    if (e == null) continue;
    if (!best || e > best.e1rm) best = { weight: s.weight!, reps: s.reps!, e1rm: e, reliable: (s.reps ?? 0) <= E1RM_RELIABLE_REPS, setId: s.id };
  }
  return best;
}

export interface SessionMetrics {
  sessionId: string;
  date: number;
  topLoad: number;
  repsAtTop: number[];
  totalReps: number;
  volume: number;
  e1rm: number | null;
  e1rmReliable: boolean;
  setCount: number;
}

export function sessionMetrics(entry: ExerciseSessionEntry): SessionMetrics {
  const topLoad = Math.max(...entry.sets.map((s) => s.weight ?? 0));
  const best = bestSet(entry.sets);
  return {
    sessionId: entry.session.id,
    date: entry.session.startedAt,
    topLoad,
    repsAtTop: entry.sets.filter((s) => s.weight === topLoad).map((s) => s.reps ?? 0),
    totalReps: entry.sets.reduce((a, s) => a + (s.reps ?? 0), 0),
    volume: volume(entry.sets),
    e1rm: best?.e1rm ?? null,
    e1rmReliable: best?.reliable ?? false,
    setCount: entry.sets.length,
  };
}

export interface Records {
  maxLoad: { weight: number; reps: number; sessionId: string; date: number } | null;
  /** Máximas repeticiones conseguidas con cada carga. */
  maxRepsByLoad: { weight: number; reps: number; sessionId: string; date: number }[];
  bestE1rm: { value: number; weight: number; reps: number; reliable: boolean; sessionId: string; date: number } | null;
  maxVolume: { value: number; sessionId: string; date: number } | null;
}

export function records(history: ExerciseSessionEntry[]): Records {
  const r: Records = { maxLoad: null, maxRepsByLoad: [], bestE1rm: null, maxVolume: null };
  const byLoad = new Map<number, Records['maxRepsByLoad'][number]>();
  for (const { session, sets } of history) {
    const date = session.startedAt;
    for (const s of sets) {
      const w = s.weight ?? 0, reps = s.reps ?? 0;
      if (!r.maxLoad || w > r.maxLoad.weight || (w === r.maxLoad.weight && reps > r.maxLoad.reps)) {
        r.maxLoad = { weight: w, reps, sessionId: session.id, date };
      }
      const prev = byLoad.get(w);
      if (!prev || reps > prev.reps) byLoad.set(w, { weight: w, reps, sessionId: session.id, date });
      const e = epley(w, reps);
      if (e != null && (!r.bestE1rm || e > r.bestE1rm.value)) {
        r.bestE1rm = { value: e, weight: w, reps, reliable: reps <= E1RM_RELIABLE_REPS, sessionId: session.id, date };
      }
    }
    const v = volume(sets);
    if (!r.maxVolume || v > r.maxVolume.value) r.maxVolume = { value: v, sessionId: session.id, date };
  }
  r.maxRepsByLoad = [...byLoad.values()].sort((a, b) => b.weight - a.weight);
  return r;
}

export type PrKind = 'maxLoad' | 'repsAtLoad' | 'e1rm' | 'volume';
export interface PersonalRecord { kind: PrKind; label: string; detail: string }

/**
 * Récords conseguidos en una sesión, comparando con las sesiones válidas ANTERIORES.
 * La primera sesión de un ejercicio no genera récords (no hay referencia).
 */
export function sessionPRs(history: ExerciseSessionEntry[], sessionId: string, unit = 'kg'): PersonalRecord[] {
  const idx = history.findIndex((h) => h.session.id === sessionId);
  if (idx <= 0) return [];
  const before = records(history.slice(0, idx));
  const cur = history[idx];
  const out: PersonalRecord[] = [];
  const top = Math.max(...cur.sets.map((s) => s.weight ?? 0));
  if (before.maxLoad && top > before.maxLoad.weight) {
    out.push({ kind: 'maxLoad', label: 'Máxima carga', detail: `${fmt(top)} ${unit} (antes ${fmt(before.maxLoad.weight)} ${unit})` });
  }
  const seen = new Set<number>();
  for (const s of [...cur.sets].sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0))) {
    const w = s.weight ?? 0;
    if (seen.has(w)) continue;
    seen.add(w);
    const prev = before.maxRepsByLoad.find((x) => x.weight === w);
    if (prev && (s.reps ?? 0) > prev.reps) {
      out.push({ kind: 'repsAtLoad', label: 'Más repeticiones con esa carga', detail: `${s.reps} reps con ${fmt(w)} ${unit} (antes ${prev.reps})` });
    }
  }
  const b = bestSet(cur.sets);
  if (b && before.bestE1rm && b.e1rm > before.bestE1rm.value) {
    out.push({ kind: 'e1rm', label: '1RM estimado', detail: `${fmt(b.e1rm)} ${unit} (estimación${b.reliable ? '' : ', baja fiabilidad'})` });
  }
  const v = volume(cur.sets);
  if (before.maxVolume && v > before.maxVolume.value) {
    out.push({ kind: 'volume', label: 'Volumen de sesión', detail: `${fmt(v)} ${unit}·rep (no implica más fuerza máxima)` });
  }
  return out;
}

export type Trend = 'up' | 'flat' | 'down' | 'unknown';

/** Tendencia del 1RM estimado en las últimas n sesiones (pendiente relativa de regresión lineal). */
export function trend(metrics: SessionMetrics[], n = 5): Trend {
  const pts = metrics.filter((m) => m.e1rm != null).slice(-n);
  if (pts.length < 3) return 'unknown';
  const ys = pts.map((p) => p.e1rm!);
  const xs = ys.map((_, i) => i);
  const mx = avg(xs), my = avg(ys);
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const rel = slope / my;
  if (rel > 0.005) return 'up';
  if (rel < -0.005) return 'down';
  return 'flat';
}

export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const round2 = (n: number) => Math.round(n * 100) / 100;
export function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n.toFixed(digits)).toLocaleString('es-ES', { maximumFractionDigits: digits });
}
