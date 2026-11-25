import { all, get } from '../../data/store';
import { history, sessionDuration, sessionExercises, setsOf, recommendationFor } from '../../data/queries';
import { updateSession } from '../../data/actions';
import { estimateCalories, INTENSITY_LABEL } from '../../domain/calories';
import { sessionMetrics, sessionPRs, volume } from '../../domain/metrics';
import { isValidSet } from '../../domain/validity';
import type { Intensity } from '../../domain/types';
import { useData, go } from '../hooks';
import { Icon } from '../components/Icon';
import { attempt } from '../components/Dialogs';
import { ACTION_CLASS, fmt, fmtDate, fmtDuration, setsLine } from '../format';

export function Summary({ id }: { id: string }) {
  useData();
  const s = get('sessions', id);
  if (!s || s.deletedAt) return <div className="empty">Sesión no encontrada.</div>;
  const ses = sessionExercises(id);
  const validSets = all('sets').filter((x) => x.sessionId === id && isValidSet(x));
  const dur = sessionDuration(s);
  const kcal = estimateCalories(dur, s.intensity, all('bodyweights'), s.startedAt);
  const mixedUnits = new Set(ses.map((se) => get('exercises', se.exerciseId)?.unit ?? 'kg')).size > 1;

  return (
    <div>
      <div className="topbar"><h1>Resumen</h1><button className="btn ghost" onClick={() => go('/', true)}>Listo</button></div>
      <p className="muted" style={{ marginTop: -4 }}>{s.routineName}, {fmtDate(s.startedAt, true)}</p>

      <div className="stat-grid">
        <div className="stat"><div className="l">Duración</div><div className="v">{fmtDuration(dur)}</div></div>
        <div className="stat"><div className="l">Series completadas</div><div className="v">{validSets.length}</div><div className="small muted">{new Set(validSets.map((x) => x.exerciseId)).size} ejercicios</div></div>
        <div className="stat"><div className="l">Volumen total</div><div className="v">{mixedUnits ? '—' : fmt(volume(validSets), 0)}</div><div className="small muted">{mixedUnits ? 'Unidades mezcladas' : 'kg × reps, series válidas'}</div></div>
        <div className="stat"><div className="l">Calorías estimadas</div><div className="v">{kcal ? `${kcal.low}–${kcal.high}` : '—'}</div><div className="small muted">{kcal?.orientative ? 'Orientativo' : 'kcal, intervalo'}</div></div>
      </div>
      {kcal && <p className="tiny faint" style={{ margin: '8px 4px' }}>Estimación con METs de entrenamiento de fuerza: {kcal.basis}. No es una medición.</p>}
      <div className="chips" style={{ margin: '8px 0' }}>
        <span className="small muted" style={{ alignSelf: 'center' }}>Intensidad:</span>
        {(['light', 'moderate', 'vigorous'] as Intensity[]).map((k) => (
          <button key={k} className={`chip${s.intensity === k ? ' on' : ''}`} onClick={() => attempt(() => updateSession(id, { intensity: s.intensity === k ? null : k }))}>{INTENSITY_LABEL[k]}</button>
        ))}
      </div>

      <div className="section-title">Ejercicios</div>
      {ses.map((se) => {
        const ex = get('exercises', se.exerciseId);
        const unit = ex?.unit ?? 'kg';
        const h = history(se.exerciseId);
        const idx = h.findIndex((e) => e.session.id === id);
        const prs = sessionPRs(h, id, unit);
        const cur = idx >= 0 ? sessionMetrics(h[idx]) : null;
        const prev = idx > 0 ? sessionMetrics(h[idx - 1]) : null;
        const rec = recommendationFor(se.exerciseId, se);
        const done = setsOf(se.id).filter(isValidSet);
        return (
          <div key={se.id} className="card">
            <div className="row spread"><h3>{ex?.name}</h3>{prs.length > 0 && <span className="badge pr"><Icon name="star" fill size={13} /> {prs.length} récord{prs.length > 1 ? 's' : ''}</span>}</div>
            <p className="small muted num" style={{ margin: '4px 0 8px' }}>{done.length ? `${setsLine(done)} ${unit}` : 'Sin series válidas'}</p>
            {cur && prev && (
              <div className="small">
                <div className="kv"><span>Carga máxima</span><span className="num">{fmt(prev.topLoad)} → {fmt(cur.topLoad)} {unit}</span></div>
                <div className="kv"><span>Volumen</span><span className="num">{fmt(prev.volume, 0)} → {fmt(cur.volume, 0)}</span></div>
                {cur.e1rm && prev.e1rm && <div className="kv"><span>1RM estimado</span><span className="num">{fmt(prev.e1rm, 1)} → {fmt(cur.e1rm, 1)} {unit}</span></div>}
              </div>
            )}
            {!prev && cur && <p className="tiny muted">Primera sesión registrada: servirá de referencia.</p>}
            {prs.map((p, i) => <p key={i} className="small" style={{ color: 'var(--yellow)', margin: '6px 0 0' }}>{p.label}: {p.detail}</p>)}
            {rec && <p className="small" style={{ marginTop: 10 }}><span className={`badge ${ACTION_CLASS[rec.action]}`}>{rec.action}</span> {rec.goal}</p>}
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn grow" onClick={() => go(`/history/${id}`)}>Editar sesión</button>
        <button className="btn primary grow" onClick={() => go('/', true)}>Volver a inicio</button>
      </div>
    </div>
  );
}
