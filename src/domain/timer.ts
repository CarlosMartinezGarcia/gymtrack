// Temporizador basado en marcas temporales. DECISIONES §8.
export type TimerState =
  | { status: 'idle' }
  | { status: 'running'; endsAt: number; totalMs: number; label?: string; startedAt: number }
  | { status: 'paused'; remainingMs: number; totalMs: number; label?: string; startedAt: number };

export const idle: TimerState = { status: 'idle' };

export function start(durationMs: number, now: number, label?: string): TimerState {
  return { status: 'running', endsAt: now + durationMs, totalMs: durationMs, label, startedAt: now };
}

/** Tiempo restante en ms (puede ser negativo: indica cuánto hace que terminó). */
export function remaining(t: TimerState, now: number): number {
  if (t.status === 'running') return t.endsAt - now;
  if (t.status === 'paused') return t.remainingMs;
  return 0;
}

export function isFinished(t: TimerState, now: number): boolean {
  return t.status === 'running' && t.endsAt <= now;
}

export function pause(t: TimerState, now: number): TimerState {
  if (t.status !== 'running') return t;
  return { status: 'paused', remainingMs: Math.max(0, t.endsAt - now), totalMs: t.totalMs, label: t.label, startedAt: t.startedAt };
}

export function resume(t: TimerState, now: number): TimerState {
  if (t.status !== 'paused') return t;
  return { status: 'running', endsAt: now + t.remainingMs, totalMs: t.totalMs, label: t.label, startedAt: t.startedAt };
}

/** Suma (o resta, con ms negativo) tiempo. Nunca deja el restante por debajo de 0. */
export function adjust(t: TimerState, ms: number, now: number): TimerState {
  if (t.status === 'running') {
    const rem = Math.max(0, t.endsAt - now + ms);
    return { ...t, endsAt: now + rem, totalMs: Math.max(1000, t.totalMs + ms) };
  }
  if (t.status === 'paused') {
    return { ...t, remainingMs: Math.max(0, t.remainingMs + ms), totalMs: Math.max(1000, t.totalMs + ms) };
  }
  return t;
}

export function formatClock(ms: number): string {
  const neg = ms < 0;
  const s = Math.ceil(Math.abs(ms) / 1000);
  const str = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return neg ? `-${str}` : str;
}
