import { cardioPlacement, needsPlacement } from '../cardioPlace';
import { useState } from 'react';
import { all, get } from '../../data/store';
import { sessionDuration, sessionExercises, sessionsSorted, setsOfSession } from '../../data/queries';
import * as A from '../../data/actions';
import { possibleDuplicates } from '../../domain/duplicates';
import { estimateCalories, INTENSITY_LABEL } from '../../domain/calories';
import { isValidSet } from '../../domain/validity';
import { volume } from '../../domain/metrics';
import type { Intensity, SessionStatus } from '../../domain/types';
import { useData, go, back } from '../hooks';
import { attempt, confirm } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { ExerciseBlock } from '../components/ExerciseBlock';
import { ExercisePicker } from '../components/ExercisePicker';
import { fmt, fmtDate, fmtDuration, fromLocalInput, STATUS_LABEL, toLocalInput } from '../format';
import { repeatSession } from '../startFlow';

const STATUS_BADGE: Record<SessionStatus, string> = { completed: 'up', draft: 'warn', abandoned: '', active: 'blue' };

export function HistoryList() {
  useData();
  const sessions = sessionsSorted();
  const dupes = possibleDuplicates(sessions);
  const [filter, setFilter] = useState<'all' | 'completed' | 'other'>('all');
  const shown = sessions.filter((s) => filter === 'all' || (filter === 'completed' ? s.status === 'completed' : s.status !== 'completed'));
  const groups = new Map<string, typeof shown>();
  for (const s of shown) {
    const k = new Date(s.startedAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return (
    <div>
      <div className="topbar"><h1>Historial</h1></div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {([['all', 'Todas'], ['completed', 'Completadas'], ['other', 'Borradores y abandonadas']] as const).map(([k, l]) => (
          <button key={k} className={`chip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {!shown.length && <div className="card empty"><h3>Sin sesiones</h3><p>Tus entrenamientos aparecerán aquí.</p></div>}
      {[...groups.entries()].map(([month, list]) => (
        <div key={month}>
          <div className="section-title" style={{ textTransform: 'capitalize' }}>{month}</div>
          <div className="list">
            {list.map((s) => {
              const sets = setsOfSession(s.id).filter(isValidSet);
              return (
                <button key={s.id} className="list-item" onClick={() => go(s.status === 'active' ? '/workout' : `/history/${s.id}`)}>
                  <span className="grow">
                    <span className="row" style={{ gap: 6 }}><b className="ellipsis">{s.routineName}</b>{s.status !== 'completed' && <span className={`badge ${STATUS_BADGE[s.status]}`}>{STATUS_LABEL[s.status]}</span>}</span>
                    <span className="small muted">{fmtDate(s.startedAt, true)}, {fmtDuration(sessionDuration(s))}, {sets.length} series</span>
                    {dupes.has(s.id) && <span className="small" style={{ display: 'block', color: 'var(--yellow)' }}>Posible duplicado</span>}
                  </span>
                  <Icon name="chevR" size={18} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SessionDetail({ id }: { id: string }) {
  useData();
  const s = get('sessions', id);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [picker, setPicker] = useState(false);
  if (!s || s.deletedAt) return <div className="empty"><h3>Sesión no encontrada</h3><button className="btn" onClick={() => go('/history', true)}>Ir al historial</button></div>;
  const list = sessionExercises(id);
  const valid = all('sets').filter((x) => x.sessionId === id && isValidSet(x));
  const dur = sessionDuration(s);
  const kcal = s.status === 'completed' ? estimateCalories(dur, s.intensity, all('bodyweights'), s.startedAt) : null;
  const dupes = possibleDuplicates(all('sessions'));

  const update = (patch: Parameters<typeof A.updateSession>[1]) => attempt(() => A.updateSession(id, patch));
  const remove = async () => {
    if (await confirm('¿Eliminar esta sesión?', 'Se borrarán sus series. Las estadísticas, gráficas y recomendaciones se recalcularán. La rutina y los ejercicios no se borran.')) {
      if (await attempt(() => A.deleteSession(id), 'Sesión eliminada')) go('/history', true);
    }
  };
  const resume = async () => { if (await attempt(() => A.resumeSession(id))) go('/workout'); };

  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/history')}><Icon name="chevL" /> Historial</button></div>
      <h1 style={{ marginBottom: 4 }}>{s.routineName}</h1>
      <p className="muted" style={{ marginBottom: 12 }}>{fmtDate(s.startedAt, true)}, {fmtDuration(dur)}, {valid.length} series válidas, volumen {fmt(volume(valid), 0)}{kcal ? `, ${kcal.low}–${kcal.high} kcal estimadas` : ''}</p>
      {dupes.has(id) && <p className="notice" style={{ marginBottom: 12 }}>Hay otra sesión de esta rutina iniciada con menos de 10 minutos de diferencia. Si es un duplicado, elimina la que sobre.</p>}

      {s.status === 'draft' && <button className="btn primary block" style={{ marginBottom: 12 }} onClick={resume}>Continuar este borrador</button>}

      <div className="card stack">
        <div className="grid2">
          <label className="field"><span>Inicio</span>
            <input className="input" type="datetime-local" defaultValue={toLocalInput(s.startedAt)} key={`st${s.updatedAt}`}
              onBlur={(e) => { const t = fromLocalInput(e.target.value); if (Number.isFinite(t) && t !== s.startedAt) void update({ startedAt: t, endedAt: t + dur }); }} /></label>
          <label className="field"><span>Duración (min)</span>
            <input className="input num" inputMode="numeric" defaultValue={Math.round(dur / 60000)} key={`du${s.updatedAt}`}
              onBlur={(e) => { const m = Number(e.target.value); if (m >= 0 && m < 1440 && m !== Math.round(dur / 60000)) void update({ endedAt: s.startedAt + m * 60000 }); }} /></label>
        </div>
        <div className="grid2">
          <label className="field"><span>Estado</span>
            <select className="input" value={s.status} onChange={(e) => update({ status: e.target.value as SessionStatus })}>
              {(['completed', 'draft', 'abandoned'] as const).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select></label>
          <label className="field"><span>Intensidad</span>
            <select className="input" value={s.intensity ?? ''} onChange={(e) => update({ intensity: (e.target.value || null) as Intensity | null })}>
              <option value="">Sin indicar</option>
              {(['light', 'moderate', 'vigorous'] as const).map((k) => <option key={k} value={k}>{INTENSITY_LABEL[k]}</option>)}
            </select></label>
        </div>
        {s.routineId && (
          <label className="switch"><span>Cuenta para la secuencia de rutinas<br /><span className="tiny muted">Si está activado, la siguiente rutina sugerida se calcula desde esta sesión</span></span>
            <input type="checkbox" checked={s.countsForSequence} onChange={(e) => update({ countsForSequence: e.target.checked })} /></label>
        )}
        <label className="field"><span>Notas</span>
          <textarea className="input" defaultValue={s.notes ?? ''} key={`no${s.updatedAt}`} onBlur={(e) => { if (e.target.value !== (s.notes ?? '')) void update({ notes: e.target.value }); }} /></label>
      </div>

      <div className="section-title">Ejercicios y series</div>
      {list.map((se, i) => (
        <ExerciseBlock key={se.id} se={se} mode="edit" open={openMap[se.id] ?? false} sessionStartedAt={s.startedAt}
          isFirst={i === 0} isLast={i === list.length - 1}
          onToggle={() => setOpenMap((m) => ({ ...m, [se.id]: !m[se.id] }))} />
      ))}
      <button className="btn block" onClick={() => setPicker(true)}><Icon name="plus" /> Añadir ejercicio</button>

      <div className="stack" style={{ marginTop: 22 }}>
        {s.status === 'completed' && <button className="btn block" onClick={() => go(`/summary/${id}`)}>Ver resumen</button>}
        <button className="btn block" onClick={() => repeatSession(id)}>Repetir como nuevo entrenamiento</button>
        <button className="btn danger block" onClick={remove}><Icon name="trash" size={18} /> Eliminar sesión</button>
      </div>

      {picker && <ExercisePicker onClose={() => setPicker(false)} onPick={async (eid) => { setPicker(false); if (!needsPlacement(eid, sessionExercises(id).length > 0)) { const atStart = false; await attempt(() => A.addExerciseToSession(id, eid, atStart)); return; } const atStart = await cardioPlacement(); if (atStart != null) await attempt(() => A.addExerciseToSession(id, eid, atStart)); }} />}
    </div>
  );
}
