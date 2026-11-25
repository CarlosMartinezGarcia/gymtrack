import { cardioPlacement, needsPlacement } from '../cardioPlace';
import { useState } from 'react';
import { all, get } from '../../data/store';
import { exercises, routineExercises, suggestion } from '../../data/queries';
import * as A from '../../data/actions';
import { orderedRoutines, reorder } from '../../domain/sequence';
import type { RoutineExercise } from '../../domain/types';
import { useData, go, back } from '../hooks';
import { SortableList } from '../components/Sortable';
import { attempt, confirm, Sheet } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { ExercisePicker } from '../components/ExercisePicker';
import { fmt, fmtRest } from '../format';
import { startRoutine } from '../startFlow';
import { TargetsForm } from './Exercises';
import { cardioPhases, isCardio, PHASE_LABEL } from '../../domain/cardio';
import { muscleLoad } from '../../domain/muscleMap';
import { BodyMap } from '../components/BodyMap';

export function Segment({ value }: { value: 'routines' | 'exercises' | 'library' }) {
  return (
    <div className="segmented" role="tablist">
      <button className={value === 'routines' ? 'on' : ''} role="tab" aria-selected={value === 'routines'} onClick={() => go('/routines', true)}>Rutinas</button>
      <button className={value === 'exercises' ? 'on' : ''} role="tab" aria-selected={value === 'exercises'} onClick={() => go('/exercises', true)}>Ejercicios</button>
      <button className={value === 'library' ? 'on' : ''} role="tab" aria-selected={value === 'library'} onClick={() => go('/library', true)}>Biblioteca</button>
    </div>
  );
}

export function RoutineList() {
  useData();
  const routines = orderedRoutines(all('routines'));
  const sug = suggestion().routine;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const create = async () => {
    let id = '';
    if (await attempt(async () => { id = (await A.saveRoutine({ name })).id; })) { setCreating(false); setName(''); go(`/routines/${id}`); }
  };
  return (
    <div>
      <div className="topbar"><h1>Rutinas</h1><button className="btn primary sm" onClick={() => setCreating(true)}><Icon name="plus" size={18} /> Nueva</button></div>
      <Segment value="routines" />
      {routines.length ? (
        <>
          <p className="small muted" style={{ margin: '0 4px 10px' }}>El orden es tu secuencia de entrenamiento: después de la última se vuelve a la primera. Arrastra desde el asa o usa las flechas.</p>
          <SortableList items={routines} getId={(r) => r.id} label={(r) => r.name}
            onReorder={(from, to) => attempt(() => A.reorderRoutines(reorder(routines, from, to).map((x) => x.id)))}
            render={(r) => (
              <button className="row" style={{ background: 'none', border: 0, width: '100%', textAlign: 'left', minHeight: 48, padding: 0 }} onClick={() => go(`/routines/${r.id}`)}>
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: 600 }} className="ellipsis">{r.name}</span>
                  <span className="small muted">{routineExercises(r.id).length} ejercicios{r.description ? `, ${r.description}` : ''}</span>
                </span>
                {sug?.id === r.id && <span className="badge blue">Siguiente</span>}
              </button>
            )} />
        </>
      ) : (
        <div className="card empty">
          <h3>Sin rutinas</h3>
          <p>Crea rutinas como «A — Torso» o «B — Pierna». Se sugerirán en orden.</p>
          <button className="btn primary" onClick={() => setCreating(true)}>Crear rutina</button>
        </div>
      )}
      {creating && (
        <Sheet title="Nueva rutina" onClose={() => setCreating(false)}>
          <input className="input" autoFocus placeholder="Nombre, por ejemplo A — Torso" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} />
          <button className="btn primary block" style={{ marginTop: 12 }} disabled={!name.trim()} onClick={create}>Crear y añadir ejercicios</button>
        </Sheet>
      )}
    </div>
  );
}

export function RoutineEditor({ id }: { id: string }) {
  useData();
  const r = get('routines', id);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<RoutineExercise | null>(null);
  if (!r || r.deletedAt) return <div className="empty">Rutina no encontrada. <button className="btn ghost" onClick={() => go('/routines', true)}>Volver</button></div>;
  const list = routineExercises(id);
  const saveField = (patch: Partial<typeof r>) => attempt(() => A.saveRoutine({ ...r, ...patch }));

  const remove = async () => {
    if (await confirm(`¿Eliminar «${r.name}»?`, 'Las sesiones ya realizadas con esta rutina se conservan en el historial. Los ejercicios siguen en el catálogo.')) {
      if (await attempt(() => A.deleteRoutine(id), 'Rutina eliminada')) go('/routines', true);
    }
  };
  const phases = cardioPhases(list.map((x) => isCardio(get('exercises', x.exerciseId))));
  const duplicate = async () => {
    let nid = '';
    if (await attempt(async () => { nid = await A.duplicateRoutine(id); }, 'Rutina duplicada')) go(`/routines/${nid}`, true);
  };

  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/routines')}><Icon name="chevL" /> Rutinas</button></div>
      <input className="input" aria-label="Nombre de la rutina" defaultValue={r.name} key={`n${r.updatedAt}`} style={{ font: '700 24px/1.2 var(--num)', background: 'transparent', border: '1px solid transparent', padding: '6px 8px', marginLeft: -8 }}
        onBlur={(e) => { if (e.target.value.trim() && e.target.value !== r.name) void saveField({ name: e.target.value }); else e.target.value = r.name; }} />
      <input className="input" placeholder="Descripción (opcional)" defaultValue={r.description ?? ''} key={`d${r.updatedAt}`} style={{ marginTop: 6 }}
        onBlur={(e) => { if (e.target.value !== (r.description ?? '')) void saveField({ description: e.target.value }); }} />

      <button className="btn primary block big" style={{ marginTop: 14 }} disabled={!list.length} onClick={() => startRoutine(id)}><Icon name="play" fill /> Empezar esta rutina</button>

      <div className="section-title">Ejercicios</div>
      {list.length ? (
        <SortableList items={list} getId={(x) => x.id} label={(x) => get('exercises', x.exerciseId)?.name ?? ''}
          onReorder={(from, to) => attempt(() => A.reorderRoutineExercises(reorder(list, from, to).map((x) => x.id)))}
          render={(re) => {
            const ex = get('exercises', re.exerciseId);
            const phase = phases[list.indexOf(re)];
            return (
              <button className="row" style={{ background: 'none', border: 0, width: '100%', textAlign: 'left', minHeight: 48, padding: 0 }} onClick={() => setEditing(re)}>
                <span className="grow">
                  <span className="ellipsis" style={{ display: 'block', fontWeight: 600 }}>{ex?.name}</span>
                  {phase
                    ? <span className="small muted">Cardio · {PHASE_LABEL[phase]}</span>
                    : <span className="small muted num">{re.sets} × {re.repMin}–{re.repMax}, +{fmt(re.increment)} {ex?.unit}, {fmtRest(re.restSec)}{re.progression.type === 'none' ? ', sin progresión' : ''}</span>}
                </span>
                <Icon name="edit" size={18} />
              </button>
            );
          }} />
      ) : <div className="card empty small">Añade los ejercicios de esta rutina.</div>}
      <button className="btn block" style={{ marginTop: 10 }} onClick={() => setPicker(true)}><Icon name="plus" /> Añadir ejercicio</button>

      {list.length > 0 && (() => {
        const map = muscleLoad(list.map((re) => { const ex = get('exercises', re.exerciseId); return { libraryId: ex?.libraryId, sets: re.sets, cardio: isCardio(ex) }; }));
        return (
          <>
            <div className="section-title">Músculos de la rutina</div>
            <div className="card">
              {map.max > 0 ? <BodyMap load={map.load} max={map.max} /> : <p className="small muted" style={{ margin: 0 }}>Vincula tus ejercicios con la biblioteca (ficha del ejercicio) para ver qué músculos trabaja esta rutina.</p>}
              {map.unlinked > 0 && map.max > 0 && <p className="tiny" style={{ color: 'var(--yellow)', marginBottom: 0 }}>{map.unlinked} ejercicio{map.unlinked > 1 ? 's' : ''} sin vincular a la biblioteca no cuenta{map.unlinked > 1 ? 'n' : ''} en el mapa.</p>}
            </div>
          </>
        );
      })()}

      <label className="field" style={{ marginTop: 18 }}><span>Notas</span>
        <textarea className="input" defaultValue={r.notes ?? ''} key={`no${r.updatedAt}`} onBlur={(e) => { if (e.target.value !== (r.notes ?? '')) void saveField({ notes: e.target.value }); }} />
      </label>

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn grow" onClick={duplicate}>Duplicar</button>
        <button className="btn danger grow" onClick={remove}>Eliminar</button>
      </div>
      <p className="tiny faint" style={{ marginTop: 12 }}>Cambiar la rutina no modifica los entrenamientos ya registrados.</p>

      {picker && <ExercisePicker exclude={list.map((x) => x.exerciseId)} onClose={() => setPicker(false)}
        onPick={async (eid) => { setPicker(false); if (!needsPlacement(eid, list.length > 0)) { const atStart = false; await attempt(() => A.addExerciseToRoutine(id, eid, atStart)); return; } const atStart = await cardioPlacement(); if (atStart != null) await attempt(() => A.addExerciseToRoutine(id, eid, atStart)); }} />}
      {editing && <RoutineExerciseSheet re={get('routineExercises', editing.id)!} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RoutineExerciseSheet({ re, onClose }: { re: RoutineExercise; onClose: () => void }) {
  const ex = get('exercises', re.exerciseId);
  const [t, setT] = useState({ sets: re.sets, repMin: re.repMin, repMax: re.repMax, increment: re.increment, restSec: re.restSec, progression: re.progression });
  const save = async () => { if (await attempt(() => A.updateRoutineExercise(re.id, t))) onClose(); };
  const remove = async () => {
    if (await confirm('¿Quitar de la rutina?', 'El ejercicio y su historial se conservan.', 'Quitar')) { await attempt(() => A.removeRoutineExercise(re.id)); onClose(); }
  };
  const fromFicha = () => ex && setT({ sets: ex.sets, repMin: ex.repMin, repMax: ex.repMax, increment: ex.increment, restSec: ex.restSec, progression: ex.progression });
  return (
    <Sheet title={ex?.name} onClose={onClose}>
      {isCardio(ex)
        ? <p className="small muted">Cardio: se apunta en minutos e intensidad durante el entrenamiento. Muévelo arriba o abajo en la lista para que sea calentamiento o enfriamiento.</p>
        : <>
          <p className="small muted">Parámetros de este ejercicio dentro de la rutina.</p>
          <TargetsForm value={t} unit={ex?.unit ?? 'kg'} onChange={setT} />
        </>}
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="btn primary block" onClick={save}>Guardar</button>
        <div className="row">
          <button className="btn grow sm" onClick={fromFicha}>Copiar de la ficha</button>
          <button className="btn grow sm" onClick={() => { onClose(); go(`/exercises/${re.exerciseId}`); }}>Abrir ficha</button>
        </div>
        <button className="btn danger block" onClick={remove}>Quitar de la rutina</button>
      </div>
    </Sheet>
  );
}

export { exercises };
