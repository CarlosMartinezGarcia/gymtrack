import { all } from '../../data/store';
import { activeSession, history, profile, sessionDuration, routineExercises, suggestion, recommendationFor, setsOfSession } from '../../data/queries';
import { latestWeight } from '../../domain/bodyweight';
import { weekStart } from '../../domain/bodyweight';
import { sessionPRs, type PersonalRecord } from '../../domain/metrics';
import { isValidSession } from '../../domain/validity';
import { useData, useNow, useSync, go } from '../hooks';
import { Icon } from '../components/Icon';
import { ACTION_CLASS, fmt, fmtClock, fmtDuration, relDay } from '../format';
import { startRoutine } from '../startFlow';
import { SyncChip } from '../components/SyncChip';

export function Home() {
  useData();
  useSync();
  const now = useNow(30_000);
  const act = activeSession();
  const sug = suggestion();
  const routines = all('routines');
  const sessions = all('sessions');
  const sets = all('sets');
  const valid = sessions.filter((s) => isValidSession(s, sets.filter((x) => x.sessionId === s.id))).sort((a, b) => b.startedAt - a.startedAt);
  const last = valid[0];
  const thisWeek = valid.filter((s) => s.startedAt >= weekStart(now)).length;
  const bw = latestWeight(all('bodyweights'));
  const goal = profile().weightGoalKg;

  // Récords de los últimos 14 días
  const prs: { name: string; pr: PersonalRecord; date: number }[] = [];
  for (const s of valid.filter((v) => now - v.startedAt < 14 * 86_400_000)) {
    const exIds = [...new Set(sets.filter((x) => x.sessionId === s.id).map((x) => x.exerciseId))];
    for (const id of exIds) {
      const ex = all('exercises', true).find((e) => e.id === id);
      for (const pr of sessionPRs(history(id), s.id, ex?.unit)) if (pr.kind !== 'volume') prs.push({ name: ex?.name ?? '', pr, date: s.startedAt });
    }
  }

  // Objetivos de la próxima sesión (rutina sugerida)
  const nextTargets = sug.routine ? routineExercises(sug.routine.id).map((re) => ({ re, rec: recommendationFor(re.exerciseId, re) })).filter((x) => x.rec) : [];

  return (
    <div>
      <div className="topbar">
        <h1>GymTrack</h1>
        <SyncChip />
        <button className="icon-btn" onClick={() => go('/settings')} aria-label="Configuración"><Icon name="gear" /></button>
      </div>

      {act ? (
        <div className="next-card" style={{ marginBottom: 12 }}>
          <span className="small muted">Entrenamiento en curso</span>
          <div className="next-name">{act.routineName}</div>
          <p className="muted small num">Empezado hace {fmtClock(now - act.startedAt)}, {setsOfSession(act.id).filter((s) => s.status === 'done').length} series hechas</p>
          <button className="btn primary big block" onClick={() => go('/workout')}>Continuar entrenamiento</button>
        </div>
      ) : routines.length ? (
        <div className="next-card">
          <span className="small muted">Te toca</span>
          <div className="next-name">{sug.routine?.name}</div>
          <p className="muted small">{routineExercises(sug.routine!.id).length} ejercicios. {sug.basedOn ? `Última de la secuencia: ${sug.basedOn.routineName}, ${relDay(sug.basedOn.startedAt, now)}.` : 'Primera sesión de la secuencia.'}</p>
          <button className="btn primary big block" onClick={() => startRoutine(sug.routine!.id)}><Icon name="play" fill /> Empezar {sug.routine?.name}</button>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn ghost sm" onClick={() => go('/routines')}>Elegir otra rutina</button>
            <button className="btn ghost sm" onClick={() => startRoutine(null)}>Entreno libre</button>
          </div>
        </div>
      ) : (
        <div className="card empty">
          <h3>Crea tu primera rutina</h3>
          <p>Define los ejercicios, series y rangos de repeticiones. El orden de tus rutinas será la secuencia de entrenamiento.</p>
          <button className="btn primary" onClick={() => go('/routines')}>Crear rutina</button>
          <div><button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => startRoutine(null)}>Entreno libre</button></div>
        </div>
      )}

      <div className="stat-grid">
        <button className="stat" onClick={() => last && go(`/history/${last.id}`)}>
          <div className="l">Último entreno</div>
          <div className="v">{last ? relDay(last.startedAt, now) : '—'}</div>
          <div className="small muted ellipsis">{last ? `${last.routineName}, ${fmtDuration(sessionDuration(last))}` : 'Sin sesiones'}</div>
        </button>
        <button className="stat" onClick={() => go('/history')}>
          <div className="l">Esta semana</div>
          <div className="v">{thisWeek}</div>
          <div className="small muted">{thisWeek === 1 ? 'entrenamiento' : 'entrenamientos'}</div>
        </button>
        <button className="stat" onClick={() => go('/weight')}>
          <div className="l">Peso actual</div>
          <div className="v">{bw ? `${fmt(bw.weightKg, 1)} kg` : '—'}</div>
          <div className="small muted">{bw ? (goal ? `Objetivo ${fmt(goal, 1)} kg (${fmt(bw.weightKg - goal, 1)})` : relDay(bw.measuredAt, now)) : 'Sin registros'}</div>
        </button>
        <button className="stat" onClick={() => go('/progress')}>
          <div className="l">Récords (14 días)</div>
          <div className="v" style={{ color: prs.length ? 'var(--yellow)' : undefined }}>{prs.length}</div>
          <div className="small muted">Ver progreso</div>
        </button>
      </div>

      {nextTargets.length > 0 && !act && (
        <>
          <div className="section-title">Objetivos para {sug.routine?.name}</div>
          <div className="list">
            {nextTargets.slice(0, 6).map(({ re, rec }) => (
              <button key={re.id} className="list-item" onClick={() => go(`/progress/${re.exerciseId}`)}>
                <span className="grow">
                  <span className="ellipsis" style={{ display: 'block' }}>{all('exercises').find((e) => e.id === re.exerciseId)?.name}</span>
                  <span className="small muted">{rec!.goal}</span>
                </span>
                <span className={`badge ${ACTION_CLASS[rec!.action]}`}>{rec!.action}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {prs.length > 0 && (
        <>
          <div className="section-title">Récords recientes</div>
          <div className="list">
            {prs.slice(0, 5).map((p, i) => (
              <div key={i} className="list-item">
                <span style={{ color: 'var(--yellow)' }}><Icon name="star" fill size={18} /></span>
                <span className="grow"><span className="ellipsis" style={{ display: 'block' }}>{p.name}</span><span className="small muted">{p.pr.label}: {p.pr.detail}</span></span>
                <span className="tiny muted">{relDay(p.date, now)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
