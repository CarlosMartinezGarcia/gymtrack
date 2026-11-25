// Controlador del temporizador de descanso. El estado (marcas temporales) se guarda en IndexedDB.
import * as T from '../domain/timer';
import { getMeta, setMeta } from '../data/idb';
import { profile } from '../data/queries';

let state: T.TimerState = T.idle;
let alertedFor: number | null = null;
let minimized = false;
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

export const getTimer = () => state;
export const isMinimized = () => minimized;
export function onTimer(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const l of listeners) l(); }

async function set(s: T.TimerState) {
  state = s;
  if (s.status !== 'running') alertedFor = null;
  emit();
  ensureTicker();
  await setMeta('timer', s);
}

export async function loadTimer() {
  const saved = await getMeta<T.TimerState>('timer');
  if (saved && saved.status !== 'idle') {
    state = saved;
    // Si terminó mientras la app estaba cerrada, no se repite el sonido.
    if (T.isFinished(saved, Date.now()) && saved.status === 'running') alertedFor = saved.endsAt;
  }
  emit();
  ensureTicker();
}

export const startRest = (sec: number, label?: string) => { minimized = false; unlockAudio(); return set(T.start(sec * 1000, Date.now(), label)); };
export const pauseRest = () => set(T.pause(state, Date.now()));
export const resumeRest = () => set(T.resume(state, Date.now()));
export const adjustRest = (sec: number) => set(T.adjust(state, sec * 1000, Date.now()));
export const stopRest = () => set(T.idle);
export function setMinimized(v: boolean) { minimized = v; emit(); }

function ensureTicker() {
  const need = state.status === 'running';
  if (need && !ticker) ticker = setInterval(tick, 250);
  if (!need && ticker) { clearInterval(ticker); ticker = null; }
}

function tick() {
  if (state.status === 'running' && T.isFinished(state, Date.now()) && alertedFor !== state.endsAt) {
    alertedFor = state.endsAt;
    minimized = false;
    void alertDone();
  }
  emit();
}

// ---------- Avisos ----------
let ctx: AudioContext | null = null;
/** iOS solo permite sonido tras un gesto del usuario: se "desbloquea" al tocar. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* sin audio */ }
}

export function beep() {
  if (!ctx) return false;
  const t0 = ctx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = ctx!.createOscillator(), g = ctx!.createGain();
    o.type = 'sine';
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
    o.connect(g).connect(ctx!.destination);
    o.start(t0 + d);
    o.stop(t0 + d + 0.2);
  });
  return true;
}

export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

async function alertDone() {
  const p = profile();
  if (p.sound) beep();
  if (p.vibration && canVibrate()) navigator.vibrate([200, 100, 200]);
}
