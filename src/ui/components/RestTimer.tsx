import { useSyncExternalStore } from 'react';
import * as T from '../../domain/timer';
import { adjustRest, getTimer, isMinimized, onTimer, pauseRest, resumeRest, setMinimized, stopRest } from '../restTimer';
import { Icon } from './Icon';

const snap = () => `${JSON.stringify(getTimer())}|${isMinimized()}|${Math.floor(Date.now() / 250)}`;

export function RestTimer() {
  useSyncExternalStore(onTimer, snap);
  const t = getTimer();
  if (t.status === 'idle') return null;
  const now = Date.now();
  const rem = T.remaining(t, now);
  const finished = rem <= 0 && t.status === 'running';
  const pct = Math.max(0, Math.min(100, (1 - rem / t.totalMs) * 100));

  if (isMinimized()) {
    return (
      <div className={`rest-mini${finished ? ' finished' : ''}`}>
        <button className="num" style={{ background: 'none', border: 0, textAlign: 'left' }} onClick={() => setMinimized(false)} aria-label="Abrir descanso">
          {finished ? '0:00' : T.formatClock(rem)}
        </button>
        <button className="icon-btn" onClick={() => void stopRest()} aria-label="Detener descanso"><Icon name="x" /></button>
      </div>
    );
  }

  return (
    <div className={`rest${finished ? ' finished' : ''}`} role="timer" aria-live={finished ? 'assertive' : 'off'}>
      <div className="rest-inner">
        <div className="row spread">
          <span className="small muted">{finished ? 'Descanso terminado' : t.status === 'paused' ? 'Descanso en pausa' : `Descanso${t.label ? ` tras ${t.label}` : ''}`}</span>
          <button className="btn sm" onClick={() => setMinimized(true)}>Volver al entreno</button>
        </div>
        <div className="rest-clock">{finished ? (rem > -5000 ? '0:00' : `+${T.formatClock(-rem)}`) : T.formatClock(rem)}</div>
        {finished && rem <= -5000 && <p className="center small muted" style={{ marginTop: -6 }}>Terminó hace {T.formatClock(-rem)}</p>}
        <div className="rest-bar"><div style={{ width: `${finished ? 100 : pct}%` }} /></div>
        {finished ? (
          <button className="btn primary block big" onClick={() => void stopRest()}>Siguiente serie</button>
        ) : (
          <div className="grid4">
            <button className="btn" onClick={() => void adjustRest(-15)}>−15 s</button>
            <button className="btn" onClick={() => void adjustRest(30)}>+30 s</button>
            {t.status === 'paused'
              ? <button className="btn" onClick={() => void resumeRest()} aria-label="Reanudar"><Icon name="play" /></button>
              : <button className="btn" onClick={() => void pauseRest()} aria-label="Pausar"><Icon name="pause" /></button>}
            <button className="btn primary" onClick={() => void stopRest()}>Saltar</button>
          </div>
        )}
      </div>
    </div>
  );
}
