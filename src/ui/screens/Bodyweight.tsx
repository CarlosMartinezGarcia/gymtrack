import { useState } from 'react';
import { all } from '../../data/store';
import { profile } from '../../data/queries';
import { deleteBodyweight, saveBodyweight, updateProfile } from '../../data/actions';
import { latestWeight, periodChange, weeklyAverages } from '../../domain/bodyweight';
import type { BodyWeight } from '../../domain/types';
import { useData } from '../hooks';
import { attempt, confirm, Sheet } from '../components/Dialogs';
import { Chart } from '../components/Charts';
import { Icon } from '../components/Icon';
import { fmt, fmtDate, fromLocalInput, parseNum, toLocalInput } from '../format';

type Period = 30 | 90 | 180 | 0;

export function Bodyweight() {
  useData();
  const entries = all('bodyweights').sort((a, b) => b.measuredAt - a.measuredAt);
  const latest = latestWeight(entries);
  const goal = profile().weightGoalKg;
  const [period, setPeriod] = useState<Period>(90);
  const [kg, setKg] = useState('');
  const [when, setWhen] = useState(toLocalInput(Date.now()));
  const [editing, setEditing] = useState<BodyWeight | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const now = Date.now();
  const from = period ? now - period * 86_400_000 : 0;
  const inPeriod = entries.filter((e) => e.measuredAt >= from).sort((a, b) => a.measuredAt - b.measuredAt);
  const weeks = weeklyAverages(inPeriod);
  const change = periodChange(entries, from, now);

  const add = async () => {
    const n = parseNum(kg);
    if (n == null || Number.isNaN(n)) return;
    if (await attempt(() => saveBodyweight({ weightKg: n, measuredAt: fromLocalInput(when) }), 'Peso registrado')) {
      setKg('');
      setWhen(toLocalInput(Date.now()));
    }
  };

  return (
    <div>
      <div className="topbar"><h1>Peso corporal</h1></div>
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="field grow"><span>Peso (kg)</span>
            <input className="input num" style={{ fontSize: 26, fontWeight: 700, minHeight: 58 }} inputMode="decimal" placeholder={latest ? fmt(latest.weightKg, 1) : '75,0'} value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} /></label>
          <button className="btn primary big" onClick={add} disabled={!kg.trim()}>Guardar</button>
        </div>
        <label className="field" style={{ marginTop: 10 }}><span>Fecha y hora</span>
          <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="l">Actual</div><div className="v">{latest ? `${fmt(latest.weightKg, 1)} kg` : '—'}</div><div className="small muted">{latest && fmtDate(latest.measuredAt)}</div></div>
        <button className="stat" onClick={() => setGoalOpen(true)}><div className="l">Objetivo</div><div className="v">{goal ? `${fmt(goal, 1)} kg` : 'Definir'}</div>
          <div className="small muted">{goal && latest ? `Faltan ${fmt(Math.abs(latest.weightKg - goal), 1)} kg` : 'Opcional'}</div></button>
      </div>

      <div className="chips" style={{ margin: '18px 0 8px' }}>
        {([[30, '1 mes'], [90, '3 meses'], [180, '6 meses'], [0, 'Todo']] as [Period, string][]).map(([p, l]) => (
          <button key={p} className={`chip${period === p ? ' on' : ''}`} onClick={() => setPeriod(p)}>{l}</button>
        ))}
      </div>
      <div className="card">
        <Chart unit="kg" series={[
          { label: 'Registros', color: '#7d8a99', points: inPeriod.map((e) => ({ x: e.measuredAt, y: e.weightKg })) },
          { label: 'Media semanal', color: '#4d8df7', points: weeks.map((w) => ({ x: w.weekStart + 3.5 * 86_400_000, y: w.avgKg })) },
        ]} />
        {change ? (
          <p className="small" style={{ marginTop: 10 }}>
            Cambio en el periodo: <b className="num">{change.diffKg > 0 ? '+' : ''}{fmt(change.diffKg, 1)} kg</b> en {change.days} días
            {change.weeklyAvgDiffKg != null && <> (media semanal {change.weeklyAvgDiffKg > 0 ? '+' : ''}{fmt(change.weeklyAvgDiffKg, 1)} kg)</>}.
          </p>
        ) : <p className="small muted" style={{ marginTop: 10 }}>Se necesitan al menos dos registros en el periodo para calcular el cambio.</p>}
        <p className="tiny faint">El peso por sí solo no indica cambios de grasa o músculo.</p>
      </div>

      {weeks.length > 0 && (
        <>
          <div className="section-title">Medias semanales</div>
          <div className="card small">{[...weeks].reverse().slice(0, 8).map((w) => (
            <div key={w.weekStart} className="kv"><span>Semana del {new Date(w.weekStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span><span className="num">{fmt(w.avgKg, 1)} kg ({w.count})</span></div>
          ))}</div>
        </>
      )}

      <div className="section-title">Registros</div>
      {entries.length ? (
        <div className="list">{entries.slice(0, 60).map((e) => (
          <button key={e.id} className="list-item" onClick={() => setEditing(e)}>
            <span className="grow num">{fmt(e.weightKg, 1)} kg</span><span className="small muted">{fmtDate(e.measuredAt, true)}</span>
          </button>
        ))}</div>
      ) : <div className="card empty small">Sin registros todavía.</div>}

      {editing && <EditSheet entry={editing} onClose={() => setEditing(null)} />}
      {goalOpen && <GoalSheet onClose={() => setGoalOpen(false)} />}
    </div>
  );
}

function EditSheet({ entry, onClose }: { entry: BodyWeight; onClose: () => void }) {
  const [kg, setKg] = useState(String(entry.weightKg).replace('.', ','));
  const [when, setWhen] = useState(toLocalInput(entry.measuredAt));
  const save = async () => {
    const n = parseNum(kg);
    if (n == null || Number.isNaN(n)) return;
    if (await attempt(() => saveBodyweight({ id: entry.id, weightKg: n, measuredAt: fromLocalInput(when) }))) onClose();
  };
  const remove = async () => { if (await confirm('¿Eliminar este registro?')) { await attempt(() => deleteBodyweight(entry.id)); onClose(); } };
  return (
    <Sheet title="Editar registro" onClose={onClose}>
      <div className="stack">
        <label className="field"><span>Peso (kg)</span><input className="input num" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} /></label>
        <label className="field"><span>Fecha y hora</span><input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
        <button className="btn primary block" onClick={save}>Guardar</button>
        <button className="btn danger block" onClick={remove}><Icon name="trash" size={18} /> Eliminar</button>
      </div>
    </Sheet>
  );
}

function GoalSheet({ onClose }: { onClose: () => void }) {
  const g = profile().weightGoalKg;
  const [kg, setKg] = useState(g ? String(g).replace('.', ',') : '');
  const save = async (v: number | null) => { if (await attempt(() => updateProfile({ weightGoalKg: v }))) onClose(); };
  return (
    <Sheet title="Objetivo de peso" onClose={onClose}>
      <input className="input num" inputMode="decimal" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value)} autoFocus />
      <div className="stack" style={{ marginTop: 12 }}>
        <button className="btn primary block" onClick={() => { const n = parseNum(kg); if (n && n > 20 && n < 400) void save(n); }}>Guardar objetivo</button>
        {g && <button className="btn block" onClick={() => save(null)}>Quitar objetivo</button>}
      </div>
    </Sheet>
  );
}
