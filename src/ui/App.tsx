import { Component, type ReactNode } from 'react';
import { useData, useNow, useRoute } from './hooks';
import { activeSession } from '../data/queries';
import { Icon } from './components/Icon';
import { DialogHost } from './components/Dialogs';
import { RestTimer } from './components/RestTimer';
import { Home } from './screens/Home';
import { Workout } from './screens/Workout';
import { Summary } from './screens/Summary';
import { RoutineEditor, RoutineList } from './screens/Routines';
import { ExerciseEditor, ExerciseList } from './screens/Exercises';
import { HistoryList, SessionDetail } from './screens/History';
import { ExerciseProgress, ProgressList } from './screens/Progress';
import { Bodyweight } from './screens/Bodyweight';
import { Settings } from './screens/Settings';
import { fmtClock } from './format';

const TABS = [
  { path: '/', label: 'Inicio', icon: 'home', match: ['', 'settings'] },
  { path: '/routines', label: 'Rutinas', icon: 'list', match: ['routines', 'exercises'] },
  { path: '/history', label: 'Historial', icon: 'clock', match: ['history', 'summary'] },
  { path: '/progress', label: 'Progreso', icon: 'chart', match: ['progress'] },
  { path: '/weight', label: 'Peso', icon: 'scale', match: ['weight'] },
];

function Screen({ parts }: { parts: string[] }) {
  const [a, b] = parts;
  switch (a) {
    case undefined: return <Home />;
    case 'workout': return <Workout />;
    case 'summary': return <Summary id={b} />;
    case 'routines': return b ? <RoutineEditor id={b} /> : <RoutineList />;
    case 'exercises': return b ? <ExerciseEditor id={b} key={b} /> : <ExerciseList />;
    case 'history': return b ? <SessionDetail id={b} key={b} /> : <HistoryList />;
    case 'progress': return b ? <ExerciseProgress id={b} key={b} /> : <ProgressList />;
    case 'weight': return <Bodyweight />;
    case 'settings': return <Settings />;
    default: return <Home />;
  }
}

function LiveBar() {
  useData();
  const act = activeSession();
  const now = useNow(1000, !!act);
  if (!act) return null;
  return (
    <a className="live-bar" href="#/workout">
      <Icon name="play" fill size={18} />
      <span className="grow ellipsis">{act.routineName}</span>
      <span className="num">{fmtClock(now - act.startedAt)}</span>
    </a>
  );
}

export function App() {
  const parts = useRoute();
  const inWorkout = parts[0] === 'workout';
  const top = parts[0] ?? '';
  return (
    <ErrorBoundary>
      <main className={`app${inWorkout ? ' no-nav' : ' has-nav'}`}>
        <Screen parts={parts} />
      </main>
      {!inWorkout && <LiveBar />}
      {!inWorkout && (
        <nav className="nav" aria-label="Secciones">
          <div className="nav-inner">
            {TABS.map((t) => (
              <a key={t.path} href={`#${t.path}`} className={t.match.includes(top) ? 'on' : ''} aria-current={t.match.includes(top) ? 'page' : undefined}>
                <Icon name={t.icon} />{t.label}
              </a>
            ))}
          </div>
        </nav>
      )}
      <div className={inWorkout ? '' : 'timer-above-nav'}><RestTimer /></div>
      <DialogHost />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <h1>Algo ha fallado</h1>
        <p className="muted">Tus datos están guardados en el dispositivo. Recarga la app para continuar.</p>
        <pre className="small" style={{ whiteSpace: 'pre-wrap', color: 'var(--red)' }}>{this.state.error.message}</pre>
        <button className="btn primary" onClick={() => { location.hash = '/'; location.reload(); }}>Recargar</button>
      </div>
    );
  }
}
