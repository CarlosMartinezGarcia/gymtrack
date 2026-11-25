import { useEffect, useState } from 'react';
import { all } from '../../data/store';
import * as A from '../../data/actions';
import {
  alternatives, EQUIPMENT_LABEL, imageUrl, libraryExercise, MUSCLE_BY_ID, MUSCLE_GROUPS, searchLibrary,
  type Equipment, type LibraryExercise,
} from '../../domain/library';
import { useData, go, back } from '../hooks';
import { attempt } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { Segment } from './Routines';

const GROUPS = [...MUSCLE_GROUPS, 'Cardio'];
const EQUIPMENT = Object.keys(EQUIPMENT_LABEL).filter((k) => k !== 'cardio') as Equipment[];

function sub(e: LibraryExercise) {
  if (e.equipment === 'cardio') return 'Cardio';
  return `${EQUIPMENT_LABEL[e.equipment]} · ${e.primary.map((m) => MUSCLE_BY_ID[m].name).join(', ')}`;
}

export function LibraryList() {
  useData();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const list = searchLibrary({ q, group, equipment: group === 'Cardio' ? null : equipment });
  const mine = new Set(all('exercises').filter((e) => !e.deletedAt && e.libraryId).map((e) => e.libraryId));
  return (
    <div>
      <div className="topbar"><h1>Biblioteca</h1></div>
      <Segment value="library" />
      <input className="input" placeholder="Buscar (press, jalón, prensa…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div className="chips" style={{ marginBottom: 8 }}>
        {GROUPS.map((g) => <button key={g} className={`chip${group === g ? ' on' : ''}`} onClick={() => setGroup(group === g ? null : g)}>{g}</button>)}
      </div>
      {group !== 'Cardio' && (
        <div className="chips" style={{ marginBottom: 12 }}>
          {EQUIPMENT.map((k) => <button key={k} className={`chip${equipment === k ? ' on' : ''}`} onClick={() => setEquipment(equipment === k ? null : k)}>{EQUIPMENT_LABEL[k]}</button>)}
        </div>
      )}
      <div className="list">
        {list.map((e) => (
          <button key={e.id} className="list-item lib-item" onClick={() => go(`/library/${e.id}`)}>
            {imageUrl(e) ? <img className="lib-thumb" src={imageUrl(e)!} alt="" loading="lazy" /> : <span className="lib-thumb" />}
            <span className="grow"><span style={{ display: 'block' }}>{e.name}</span>
              <span className="small muted">{sub(e)}</span></span>
            {mine.has(e.id) && <span className="badge blue">Tuyo</span>}
            <Icon name="chevR" size={18} />
          </button>
        ))}
        {!list.length && <div className="empty small muted" style={{ padding: 16 }}>Nada con ese filtro.</div>}
      </div>
      <p className="tiny muted" style={{ marginTop: 16 }}>Imágenes: Free Exercise DB (dominio público). Textos de técnica orientativos.</p>
    </div>
  );
}

function Frames({ e }: { e: LibraryExercise }) {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f ? 0 : 1)), 1400);
    return () => clearInterval(id);
  }, [e.id]);
  if (!e.img) return null;
  return (
    <div className="lib-frames" aria-label="Posición inicial y final">
      <img src={imageUrl(e, 0)!} alt="Posición inicial" style={{ opacity: frame === 0 ? 1 : 0 }} />
      <img src={imageUrl(e, 1)!} alt="Posición final" style={{ opacity: frame === 1 ? 1 : 0 }} />
    </div>
  );
}

function Steps({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <>
      <div className="section-title">{title}</div>
      <ol className="card lib-steps">{items.map((t, i) => <li key={i}>{t}</li>)}</ol>
    </>
  );
}

export function LibraryDetail({ id }: { id: string }) {
  useData();
  const e = libraryExercise(id);
  if (!e) return <div className="empty">Ejercicio no encontrado.</div>;
  const mine = all('exercises').find((x) => !x.deletedAt && x.libraryId === e.id);
  const alts = alternatives(e.id);
  const add = async () => {
    let newId = '';
    if (await attempt(async () => { newId = await A.addFromLibrary(e.id); }, 'Añadido a tus ejercicios')) go(`/exercises/${newId}`);
  };
  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/library')}><Icon name="chevL" /> Biblioteca</button></div>
      <h1>{e.name}</h1>
      <Frames e={e} />
      <div className="chips" style={{ margin: '12px 0 4px' }}>
        <span className="badge">{EQUIPMENT_LABEL[e.equipment]}</span>
        {e.equipment !== 'cardio' && e.primary.map((m) => <span key={m} className="badge up">{MUSCLE_BY_ID[m].name}</span>)}
        {e.equipment !== 'cardio' && e.secondary.map((m) => <span key={m} className="badge">{MUSCLE_BY_ID[m].name}</span>)}
      </div>
      {e.equipment !== 'cardio' && <p className="tiny muted">Verde: músculo principal. Gris: secundario.</p>}
      <Steps title="Colocación" items={e.setup} />
      <Steps title="Técnica" items={e.technique} />
      <Steps title="Errores comunes" items={e.errors} />
      <div style={{ marginTop: 16 }}>
        {mine
          ? <button className="btn block" onClick={() => go(`/exercises/${mine.id}`)}>Ya está en tus ejercicios: «{mine.name}»</button>
          : <button className="btn primary block big" onClick={add}><Icon name="plus" size={18} /> Añadir a mis ejercicios</button>}
      </div>
      {alts.length > 0 && (
        <>
          <div className="section-title">Alternativas para variar</div>
          <div className="list">
            {alts.map((a) => (
              <button key={a.id} className="list-item lib-item" onClick={() => go(`/library/${a.id}`)}>
                {imageUrl(a) ? <img className="lib-thumb" src={imageUrl(a)!} alt="" loading="lazy" /> : <span className="lib-thumb" />}
                <span className="grow"><span style={{ display: 'block' }}>{a.name}</span><span className="small muted">{sub(a)}</span></span>
                <Icon name="chevR" size={18} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
