import { useEffect, useState } from 'react';
import { get } from '../../data/store';
import { exercises, history } from '../../data/queries';
import * as A from '../../data/actions';
import type { ExerciseKind, ExerciseTargets, LoadUnit } from '../../domain/types';
import { useData, go, back } from '../hooks';
import { attempt, confirm } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { Segment } from './Routines';
import { parseNum, relDay } from '../format';
import { LIBRARY, libraryExercise, matchByName } from '../../domain/library';

/** Vincula el ejercicio con la biblioteca (músculos, técnica y alternativas). */
function LibraryLink({ libraryId, name, onChange }: { libraryId: string | null; name: string; onChange: (id: string | null) => void }) {
  const lib = libraryExercise(libraryId);
  const guess = !lib ? matchByName(name) : undefined;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <label className="field"><span>Ejercicio de la biblioteca</span>
        <select className="input" value={libraryId ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Sin vincular</option>
          {[...LIBRARY].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select></label>
      {lib && <button type="button" className="btn sm" onClick={() => go(`/library/${lib.id}`)}>Ver técnica y alternativas</button>}
      {guess && <button type="button" className="btn sm" onClick={() => onChange(guess.id)}>¿Es «{guess.name}»? Vincular</button>}
      <p className="tiny muted">Vincularlo da músculos, técnica y alternativas. No cambia tu historial. Pulsa Guardar después.</p>
    </div>
  );
}

export const KIND_LABEL: Record<ExerciseKind, string> = {
  free: 'Peso libre', machine: 'Máquina', cable: 'Polea', bodyweight: 'Peso corporal', assisted: 'Asistido', other: 'Otro',
};

export function ExerciseList() {
  useData();
  const list = exercises();
  const [q, setQ] = useState('');
  const shown = list.filter((e) => `${e.name} ${e.muscleGroup ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="topbar"><h1>Ejercicios</h1><button className="btn primary sm" onClick={() => go('/exercises/new')}><Icon name="plus" size={18} /> Nuevo</button></div>
      <Segment value="exercises" />
      {list.length > 6 && <input className="input" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />}
      {list.length ? (
        <div className="list">
          {shown.map((e) => {
            const h = history(e.id);
            return (
              <button key={e.id} className="list-item" onClick={() => go(`/exercises/${e.id}`)}>
                <span className="grow"><span style={{ display: 'block' }}>{e.name}</span>
                  <span className="small muted">{[e.muscleGroup, KIND_LABEL[e.kind]].filter(Boolean).join(', ')}{h.length ? `, ${h.length} sesiones, última ${relDay(h[h.length - 1].session.startedAt)}` : ''}</span></span>
                <Icon name="chevR" size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          <h3>Catálogo vacío</h3>
          <p>Crea tus ejercicios o empieza con un catálogo básico que podrás editar.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => attempt(async () => { await A.seedExercises(); }, 'Ejercicios añadidos')}>Añadir catálogo básico</button>
            <button className="btn primary" onClick={() => go('/exercises/new')}>Crear ejercicio</button>
          </div>
        </div>
      )}
    </div>
  );
}

type TargetsValue = Pick<ExerciseTargets, 'sets' | 'repMin' | 'repMax' | 'increment' | 'restSec' | 'progression'>;

function NumField({ label, value, onChange, decimals = false, suffix }: { label: string; value: number | null | undefined; onChange: (n: number | null) => void; decimals?: boolean; suffix?: string }) {
  const [txt, setTxt] = useState(value == null ? '' : String(value).replace('.', ','));
  useEffect(() => {
    const n = parseNum(txt);
    if (txt.trim() !== '' && (n ?? null) !== (value ?? null) && !(Number.isNaN(n))) setTxt(value == null ? '' : String(value).replace('.', ','));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="field"><span>{label}{suffix ? ` (${suffix})` : ''}</span>
      <input className="input num" inputMode={decimals ? 'decimal' : 'numeric'} value={txt}
        onChange={(e) => { setTxt(e.target.value); const n = parseNum(e.target.value); onChange(n == null || Number.isNaN(n) ? null : decimals ? n : Math.round(n)); }} />
    </label>
  );
}

/** Formulario de objetivos y progresión (lo usan la ficha y el ejercicio dentro de una rutina). */
export function TargetsForm({ value, unit, onChange }: { value: TargetsValue; unit: string; onChange: (v: TargetsValue) => void }) {
  const set = (patch: Partial<TargetsValue>) => onChange({ ...value, ...patch });
  const prog = (patch: Partial<TargetsValue['progression']>) => set({ progression: { ...value.progression, ...patch } });
  return (
    <div className="stack">
      <div className="grid3">
        <NumField label="Series" value={value.sets} onChange={(n) => set({ sets: n ?? 0 })} />
        <NumField label="Reps mín." value={value.repMin} onChange={(n) => set({ repMin: n ?? 0 })} />
        <NumField label="Reps máx." value={value.repMax} onChange={(n) => set({ repMax: n ?? 0 })} />
      </div>
      <div className="grid2">
        <NumField label="Incremento" suffix={unit} decimals value={value.increment} onChange={(n) => set({ increment: n ?? 0 })} />
        <NumField label="Descanso" suffix="s" value={value.restSec} onChange={(n) => set({ restSec: n ?? 0 })} />
      </div>
      <label className="switch"><span>Recomendaciones de progresión<br /><span className="tiny muted">Doble progresión: sumar repeticiones y subir carga al llegar al máximo</span></span>
        <input type="checkbox" checked={value.progression.type === 'double'} onChange={(e) => prog({ type: e.target.checked ? 'double' : 'none' })} /></label>
      {value.progression.type === 'double' && (
        <>
          <div className="grid3">
            <NumField label="Sesiones para subir" value={value.progression.upSessions} onChange={(n) => prog({ upSessions: n ?? 0 })} />
            <NumField label="Sesiones para bajar" value={value.progression.downSessions} onChange={(n) => prog({ downSessions: n ?? 0 })} />
            <NumField label="RIR objetivo" value={value.progression.targetRir ?? null} onChange={(n) => prog({ targetRir: n })} />
          </div>
          <p className="tiny muted">
            Sube cuando las {value.sets || 'N'} series con la carga más alta lleguen a {value.repMax || 'máx.'} reps en {value.progression.upSessions || 1} sesión(es) seguida(s){value.progression.targetRir != null ? ` sin bajar de RIR ${value.progression.targetRir}` : ''}.
            Baja si en {value.progression.downSessions || 2} sesiones seguidas la mitad o más quedan por debajo de {value.repMin || 'mín.'}. Si no, mantiene la carga.
          </p>
        </>
      )}
    </div>
  );
}

export function ExerciseEditor({ id }: { id: string }) {
  useData();
  const isNew = id === 'new';
  const existing = isNew ? undefined : get('exercises', id);
  const [v, setV] = useState(() => existing ? { ...existing } : { ...A.newExerciseDefaults() });
  if (!isNew && !existing) return <div className="empty">Ejercicio no encontrado.</div>;
  const set = (patch: Partial<typeof v>) => setV({ ...v, ...patch });
  const h = isNew ? [] : history(id);
  const save = async () => {
    let newId = '';
    if (await attempt(async () => { newId = (await A.saveExercise(v)).id; }, 'Ejercicio guardado')) {
      if (isNew) go(`/exercises/${newId}`, true);
    }
  };
  const remove = async () => {
    if (await confirm(`¿Eliminar «${existing!.name}»?`, `Se quitará del catálogo y de las rutinas. Su historial (${h.length} sesiones) se conserva en el historial de entrenamientos.`)) {
      if (await attempt(() => A.deleteExercise(id), 'Ejercicio eliminado')) go('/exercises', true);
    }
  };
  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/exercises')}><Icon name="chevL" /> Ejercicios</button></div>
      <h1>{isNew ? 'Nuevo ejercicio' : existing!.deletedAt ? `${existing!.name} (eliminado)` : 'Ficha del ejercicio'}</h1>
      <div className="stack">
        <label className="field"><span>Nombre</span><input className="input" value={v.name} onChange={(e) => set({ name: e.target.value })} /></label>
        {!isNew && <p className="tiny muted" style={{ marginTop: 4 }}>Cambiar el nombre conserva todo el historial.</p>}
        <div className="grid2">
          <label className="field"><span>Grupo muscular</span><input className="input" value={v.muscleGroup ?? ''} onChange={(e) => set({ muscleGroup: e.target.value })} /></label>
          <label className="field"><span>Tipo</span>
            <select className="input" value={v.kind} onChange={(e) => set({ kind: e.target.value as ExerciseKind })}>
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
        </div>
        <LibraryLink libraryId={v.libraryId ?? null} name={v.name} onChange={(libraryId) => set({ libraryId })} />
        <label className="field"><span>Unidad de carga</span>
          <select className="input" value={v.unit} onChange={(e) => set({ unit: e.target.value as LoadUnit })}><option value="kg">kg</option><option value="lb">lb</option></select></label>
        {(v.kind === 'bodyweight' || v.kind === 'assisted') && <p className="notice small">En este tipo de ejercicio registra solo la carga añadida (0 si no hay). El volumen y el 1RM estimado no incluyen tu peso corporal y no son comparables con ejercicios con carga externa.</p>}
        <div className="section-title" style={{ marginTop: 10 }}>Valores por defecto al añadirlo a una rutina</div>
        <TargetsForm value={v} unit={v.unit} onChange={(t) => set(t)} />
        <label className="field"><span>Notas y técnica</span><textarea className="input" value={v.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></label>
        <button className="btn primary block big" onClick={save}>Guardar</button>
        {!isNew && (
          <div className="row">
            <button className="btn grow" onClick={() => go(`/progress/${id}`)}>Ver progreso</button>
            {!existing!.deletedAt && <button className="btn danger grow" onClick={remove}>Eliminar</button>}
          </div>
        )}
      </div>
    </div>
  );
}
