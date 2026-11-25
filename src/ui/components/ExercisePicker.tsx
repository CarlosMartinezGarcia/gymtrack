import { useState } from 'react';
import { exercises } from '../../data/queries';
import { newExerciseDefaults, saveExercise } from '../../data/actions';
import { Sheet, attempt } from './Dialogs';
import { Icon } from './Icon';

export function ExercisePicker({ title = 'Añadir ejercicio', exclude = [], onPick, onClose }: { title?: string; exclude?: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = exercises().filter((e) => !exclude.includes(e.id) && norm(`${e.name} ${e.muscleGroup ?? ''}`).includes(norm(q)));
  const exact = exercises().some((e) => norm(e.name) === norm(q.trim()));
  const create = () => attempt(async () => {
    const e = await saveExercise({ ...newExerciseDefaults(), name: q.trim() });
    onPick(e.id);
  });
  return (
    <Sheet title={title} onClose={onClose}>
      <input className="input" placeholder="Buscar o escribir un nombre nuevo" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="list" style={{ maxHeight: '50dvh', overflow: 'auto' }}>
        {q.trim() && !exact && (
          <button className="list-item" onClick={create}>
            <Icon name="plus" />
            <span className="grow">Crear «{q.trim()}»<br /><span className="tiny muted">Con valores por defecto; podrás editar la ficha después</span></span>
          </button>
        )}
        {list.map((e) => (
          <button key={e.id} className="list-item" onClick={() => onPick(e.id)}>
            <span className="grow">{e.name}{e.muscleGroup ? <span className="muted small"> {e.muscleGroup}</span> : null}</span>
            <Icon name="plus" />
          </button>
        ))}
        {!list.length && !q.trim() && <div className="empty small">Aún no hay ejercicios. Escribe un nombre para crear el primero.</div>}
      </div>
    </Sheet>
  );
}
