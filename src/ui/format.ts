import { fmt } from '../domain/metrics';
export { fmt };

export function fmtDuration(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}
export function fmtClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}
export function fmtDate(t: number, withTime = false): string {
  return new Date(t).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}
export function fmtDay(t: number): string {
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function relDay(t: number, now = Date.now()): string {
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(t); d1.setHours(0, 0, 0, 0);
  const days = Math.round((d0.getTime() - d1.getTime()) / 86_400_000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return fmtDay(t);
}
export function fmtRest(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
/** "60×10, 62,5×9" */
export function setsLine(sets: { weight: number | null; reps: number | null; warmup?: boolean }[]): string {
  return sets.filter((s) => !s.warmup).map((s) => `${fmt(s.weight)}×${s.reps ?? '—'}`).join(', ');
}
export function parseNum(v: string): number | null {
  const t = v.replace(',', '.').trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
/** Valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fromLocalInput(v: string): number {
  return new Date(v).getTime();
}
export const ACTION_CLASS = { SUBIR: 'up', MANTENER: 'keep', BAJAR: 'down' } as const;
export const STATUS_LABEL = { active: 'En curso', draft: 'Borrador', abandoned: 'Abandonada', completed: 'Completada' } as const;
