import { cardioPlacement, needsPlacement } from '../cardioPlace';
import { useEffect, useRef, useState } from 'react';
import { activeSession, sessionExercises, setsOfSession, profile } from '../../data/queries';
import * as A from '../../data/actions';
import type { Intensity } from '../../domain/types';
import { useData, useNow, go } from '../hooks';
import { ExerciseBlock } from '../components/ExerciseBlock';
import { ExercisePicker } from '../components/ExercisePicker';
import { attempt, Sheet } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { fmtClock } from '../format';
import { stopRest } from '../restTimer';
import { setsOf } from '../../data/queries';
import { INTENSITY_LABEL } from '../../domain/calories';

export function Workout() {
  useData();
  const s = activeSession();
  const now = useNow(1000, !!s);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [picker, setPicker] = useState(false);
  const [finishing, setFinishing] = useState(false);
  useWakeLock(!!s && profile().keepAwake);

  if (!s) {
    return (
      <div className="empty">
        <h3>No hay ningún entrenamiento en curso</h3>
        <p>Empieza la rutina que te toca desde Inicio.</p>
        <button className="btn primary" onClick={() => go('/', true)}>Ir a Inicio</button>
      </div>
    );
  }
  const list = sessionExercises(s.id);
  // Por defecto se abre el primer ejercicio con series pendientes.
  const firstPending = list.find((se) => setsOf(se.id).some((x) => x.status === 'pending'))?.id ?? list[0]?.id;
  const isOpen = (id: string) => openMap[id] ?? id === firstPending;

  return (
    <div>
      <div className="wk-head">
        <button className="icon-btn" onClick={() => go('/')} aria-label="Volver a inicio"><Icon name="chevL" /></button>
        <div className="grow">
          <div className="ellipsis" style={{ fontWeight: 700 }}>{s.routineName}</div>
          <div className="clock">{fmtClock(now - s.startedAt)}</div>
        </div>
        <button className="btn primary" onClick={() => setFinishing(true)}>Terminar</button>
      </div>

      {list.map((se, i) => (
        <ExerciseBlock key={se.id} se={se} mode="live" open={isOpen(se.id)} sessionStartedAt={s.startedAt}
          isFirst={i === 0} isLast={i === list.length - 1}
          onToggle={() => setOpenMap((m) => ({ ...m, [se.id]: !isOpen(se.id) }))} />
      ))}
      {!list.length && <div className="card empty small">Sesión sin ejercicios. Añade el primero.</div>}

      <button className="btn block" style={{ marginTop: 4 }} onClick={() => setPicker(true)}><Icon name="plus" /> Añadir ejercicio</button>
      <p className="tiny faint center" style={{ marginTop: 16 }}>Cada cambio se guarda al momento en este dispositivo. Puedes cerrar la app y continuar después.</p>

      {picker && <ExercisePicker onClose={() => setPicker(false)} onPick={async (id) => { setPicker(false); if (!needsPlacement(id, list.length > 0)) { const atStart = false; await attempt(() => A.addExerciseToSession(s.id, id, atStart)); return; } const atStart = await cardioPlacement(); if (atStart != null) await attempt(() => A.addExerciseToSession(s.id, id, atStart)); }} />}
      {finishing && <FinishSheet sessionId={s.id} onClose={() => setFinishing(false)} />}
    </div>
  );
}

function FinishSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const sets = setsOfSession(sessionId);
  const done = sets.filter((x) => x.status === 'done' && !x.warmup).length;
  const unconfirmed = sets.filter((x) => x.status === 'pending' && (x.weight != null || x.reps != null));
  const finish = async (status: 'completed' | 'draft' | 'abandoned') => {
    if (busy) return;
    setBusy(true);
    const ok = await attempt(() => A.finishSession(sessionId, status, { intensity }));
    setBusy(false);
    if (!ok) return;
    void stopRest();
    onClose();
    go(status === 'completed' ? `/summary/${sessionId}` : '/', true);
  };
  const confirmAll = () => attempt(async () => { for (const x of unconfirmed) await A.completeSet(x.id); });
  return (
    <Sheet title="Terminar entrenamiento" onClose={onClose}>
      <p className="muted small">{done} series de trabajo completadas.</p>
      {unconfirmed.length > 0 && (
        <div className="notice" style={{ marginBottom: 12 }}>
          {unconfirmed.length} series tienen datos pero no están marcadas como hechas y no contarán.
          <div><button className="btn sm" style={{ marginTop: 8 }} onClick={confirmAll}>Marcarlas como hechas</button></div>
        </div>
      )}
      <span className="small muted">Intensidad percibida (mejora la estimación de calorías)</span>
      <div className="chips" style={{ margin: '6px 0 16px' }}>
        {(['light', 'moderate', 'vigorous'] as Intensity[]).map((k) => (
          <button key={k} className={`chip${intensity === k ? ' on' : ''}`} onClick={() => setIntensity(intensity === k ? null : k)}>{INTENSITY_LABEL[k]}</button>
        ))}
      </div>
      <div className="stack">
        <button className="btn primary block big" disabled={busy || done === 0} onClick={() => finish('completed')}>Finalizar y ver resumen</button>
        {done === 0 && <p className="tiny muted center">Completa al menos una serie para finalizar, o guárdalo como borrador.</p>}
        <button className="btn block" disabled={busy} onClick={() => finish('draft')}>Guardar como borrador</button>
        <button className="btn danger block" disabled={busy} onClick={() => finish('abandoned')}>Abandonar entrenamiento</button>
      </div>
      <p className="tiny faint" style={{ marginTop: 12 }}>Los borradores se pueden continuar desde el historial. Las sesiones abandonadas se guardan pero no cuentan para la secuencia, los récords ni la progresión.</p>
    </Sheet>
  );
}

/** Mantiene la pantalla encendida durante el entrenamiento cuando el navegador lo permite. */
function useWakeLock(enabled: boolean) {
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let cancelled = false;
    const req = async () => {
      try {
        const l = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
        if (cancelled) void l.release(); else lock.current = l;
      } catch { /* no disponible */ }
    };
    void req();
    const onVis = () => { if (document.visibilityState === 'visible') void req(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); void lock.current?.release().catch(() => {}); lock.current = null; };
  }, [enabled]);
}
