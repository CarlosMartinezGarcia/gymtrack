import { useState } from 'react';
import { all, get } from '../../data/store';
import { exercises, history, recommendationFor, targetsFromExercise } from '../../data/queries';
import { records, sessionMetrics, trend, type Trend } from '../../domain/metrics';
import { useData, go, back } from '../hooks';
import { Chart } from '../components/Charts';
import { Icon } from '../components/Icon';
import { ACTION_CLASS, fmt, fmtDay, relDay, setsLine } from '../format';

const TREND: Record<Trend, { icon: string; text: string; color: string }> = {
  up: { icon: 'arrowUp', text: 'Subiendo', color: 'var(--green)' },
  flat: { icon: 'arrowRight', text: 'Estable', color: 'var(--muted)' },
  down: { icon: 'arrowDown', text: 'Bajando', color: 'var(--red)' },
  unknown: { icon: 'dots', text: 'Pocos datos', color: 'var(--faint)' },
};

export function ProgressList() {
  useData();
  const rows = exercises()
    .map((e) => ({ e, h: history(e.id) }))
    .filter((x) => x.h.length)
    .sort((a, b) => b.h[b.h.length - 1].session.startedAt - a.h[a.h.length - 1].session.startedAt);
  return (
    <div>
      <div className="topbar"><h1>Progreso</h1></div>
      {!rows.length && <div className="card empty"><h3>Aún no hay datos</h3><p>Completa entrenamientos para ver la evolución de cada ejercicio.</p></div>}
      <div className="list">
        {rows.map(({ e, h }) => {
          const m = h.map(sessionMetrics);
          const last = m[m.length - 1];
          const tr = TREND[trend(m)];
          return (
            <button key={e.id} className="list-item" onClick={() => go(`/progress/${e.id}`)}>
              <span className="grow">
                <span style={{ display: 'block' }} className="ellipsis">{e.name}</span>
                <span className="small muted num">{fmt(last.topLoad)} {e.unit} × {last.repsAtTop.join('/')}, {relDay(last.date)}</span>
              </span>
              <span style={{ color: tr.color }} title={`Tendencia del 1RM estimado: ${tr.text}`}><Icon name={tr.icon} size={20} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Period = 'last10' | 'month' | 'quarter' | 'all';
const PERIODS: [Period, string][] = [['last10', 'Últimas 10'], ['month', 'Último mes'], ['quarter', '3 meses'], ['all', 'Todo']];

export function ExerciseProgress({ id }: { id: string }) {
  useData();
  const [period, setPeriod] = useState<Period>('last10');
  const ex = get('exercises', id);
  if (!ex) return <div className="empty">Ejercicio no encontrado.</div>;
  const unit = ex.unit;
  const full = history(id);
  const now = Date.now();
  const h = period === 'last10' ? full.slice(-10)
    : period === 'all' ? full
    : full.filter((e) => e.session.startedAt >= now - (period === 'month' ? 31 : 92) * 86_400_000);
  const m = h.map(sessionMetrics);
  const rec = records(full);
  const allM = full.map(sessionMetrics);
  const last = allM[allM.length - 1], prev = allM[allM.length - 2];
  const tr = TREND[trend(allM)];
  // Configuración vigente: la del ejercicio en la primera rutina que lo contiene, o la de la ficha.
  const re = all('routineExercises').find((r) => r.exerciseId === id && get('routines', r.routineId) && !get('routines', r.routineId)!.deletedAt);
  const recommendation = recommendationFor(id, re ?? targetsFromExercise(ex));

  const delta = (a?: number | null, b?: number | null, d = 1) => {
    if (a == null || b == null) return null;
    const v = a - b;
    if (Math.abs(v) < 1e-9) return <span className="muted">(=)</span>;
    return <span style={{ color: v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--muted)' }}>{v > 0 ? '+' : ''}{fmt(v, d)}</span>;
  };

  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/progress')}><Icon name="chevL" /> Progreso</button>
        <span className="grow" /><button className="btn ghost sm" onClick={() => go(`/exercises/${id}`)}>Ficha</button></div>
      <h1 style={{ marginBottom: 4 }}>{ex.name}</h1>
      <p className="muted small" style={{ marginBottom: 14 }}>{full.length === 1 ? '1 sesión válida' : `${full.length} sesiones válidas`}. Tendencia del 1RM estimado: <span style={{ color: tr.color }}>{tr.text.toLowerCase()}</span></p>

      {!full.length ? <div className="card empty small">Sin sesiones completadas con este ejercicio.</div> : (
        <>
          {recommendation && (
            <div className={`rec ${ACTION_CLASS[recommendation.action]}`}>
              <div><span className={`badge ${ACTION_CLASS[recommendation.action]}`}>{recommendation.action}</span> <b className="num">{fmt(recommendation.nextLoad)} {unit}</b></div>
              <p className="small" style={{ margin: '8px 0 0' }}>{recommendation.goal}</p>
              <details className="why"><summary>Por qué</summary><ul>{recommendation.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></details>
            </div>
          )}

          <div className="section-title">Récords</div>
          <div className="records">
            <div className="stat"><div className="l">Máxima carga</div><div className="v">{fmt(rec.maxLoad?.weight)} {unit}</div><div className="small muted">× {rec.maxLoad?.reps} reps, {rec.maxLoad && fmtDay(rec.maxLoad.date)}</div></div>
            <div className="stat"><div className="l">Mejor 1RM estimado</div><div className="v">{rec.bestE1rm ? `${fmt(rec.bestE1rm.value, 1)} ${unit}` : '—'}</div><div className="small muted">{rec.bestE1rm ? `${fmt(rec.bestE1rm.weight)}×${rec.bestE1rm.reps}${rec.bestE1rm.reliable ? '' : ', baja fiabilidad'}` : 'Requiere series de 1–12 reps'}</div></div>
            <div className="stat"><div className="l">Mayor volumen en una sesión</div><div className="v">{fmt(rec.maxVolume?.value, 0)}</div><div className="small muted">{rec.maxVolume && fmtDay(rec.maxVolume.date)}</div></div>
            <div className="stat"><div className="l">Mejor serie</div><div className="v">{rec.bestE1rm ? `${fmt(rec.bestE1rm.weight)}×${rec.bestE1rm.reps}` : '—'}</div><div className="small muted">Por 1RM estimado</div></div>
          </div>
          {rec.maxRepsByLoad.length > 0 && (
            <details className="why" style={{ marginTop: 8 }}><summary>Máximas repeticiones por carga</summary>
              <div className="card" style={{ marginTop: 6 }}>{rec.maxRepsByLoad.map((r) => <div key={r.weight} className="kv small"><span className="num">{fmt(r.weight)} {unit}</span><span className="num">{r.reps} reps, {fmtDay(r.date)}</span></div>)}</div>
            </details>
          )}

          {prev && (
            <>
              <div className="section-title">Última sesión frente a la anterior</div>
              <div className="card small">
                <div className="kv"><span>Carga máxima</span><span className="num">{fmt(last.topLoad)} {unit} {delta(last.topLoad, prev.topLoad)}</span></div>
                <div className="kv"><span>Reps con esa carga</span><span className="num">{last.repsAtTop.join('/')} (antes {prev.repsAtTop.join('/')})</span></div>
                <div className="kv"><span>Volumen</span><span className="num">{fmt(last.volume, 0)} {delta(last.volume, prev.volume, 0)}</span></div>
                <div className="kv"><span>1RM estimado</span><span className="num">{fmt(last.e1rm, 1)} {delta(last.e1rm, prev.e1rm)}</span></div>
              </div>
            </>
          )}

          <div className="chips" style={{ margin: '20px 0 4px' }}>
            {PERIODS.map(([k, l]) => <button key={k} className={`chip${period === k ? ' on' : ''}`} onClick={() => setPeriod(k)}>{l}</button>)}
          </div>
          <div className="section-title">Carga</div>
          <div className="card">
            <Chart unit={unit} series={[
              { label: 'Carga máxima (real)', color: '#4d8df7', points: m.map((x) => ({ x: x.date, y: x.topLoad })) },
              { label: '1RM estimado', color: '#f2c14e', dashed: true, points: m.filter((x) => x.e1rm != null).map((x) => ({ x: x.date, y: x.e1rm! })) },
            ]} />
          </div>
          <div className="section-title">Repeticiones con la carga máxima (total)</div>
          <div className="card"><Chart unit="reps" series={[{ label: 'Repeticiones', color: '#45c486', points: m.map((x) => ({ x: x.date, y: x.repsAtTop.reduce((a, b) => a + b, 0) })) }]} /></div>
          <div className="section-title">Volumen por sesión</div>
          <div className="card">
            <Chart unit={`${unit}·rep`} zeroBased series={[{ label: 'Volumen', color: '#7d8a99', bars: true, points: m.map((x) => ({ x: x.date, y: x.volume })) }]} />
            <p className="tiny faint" style={{ marginTop: 6 }}>Más volumen no significa más fuerza máxima.{ex.kind === 'bodyweight' || ex.kind === 'assisted' ? ' En este ejercicio solo incluye la carga añadida.' : ''}</p>
          </div>

          <div className="section-title">Sesiones</div>
          <div className="list">
            {[...h].reverse().map((e) => (
              <button key={e.session.id} className="list-item" onClick={() => go(`/history/${e.session.id}`)}>
                <span className="grow"><span className="small muted">{fmtDay(e.session.startedAt)}, {e.session.routineName}</span><br /><span className="num">{setsLine(e.sets)} {unit}</span></span>
                <Icon name="chevR" size={18} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
