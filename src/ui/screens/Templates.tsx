// Rutinas predefinidas: bloque en la lista de rutinas y ficha de cada plantilla (§17).
import { useState } from 'react';
import * as A from '../../data/actions';
import { FAMILIES, TEMPLATE_BY_ID, TEMPLATES, templatesOf, isCardioItem, type TemplateFamily } from '../../domain/templates';
import { imageUrl, libraryExercise } from '../../domain/library';
import { cardioPhases, PHASE_LABEL } from '../../domain/cardio';
import { muscleLoad } from '../../domain/muscleMap';
import { useData, go, back } from '../hooks';
import { attempt } from '../components/Dialogs';
import { Icon } from '../components/Icon';
import { BodyMap } from '../components/BodyMap';
import { fmtRest } from '../format';

export function TemplateSection() {
  const [family, setFamily] = useState<TemplateFamily | null>(null);
  const shown = family ? FAMILIES.filter((f) => f.id === family) : FAMILIES;
  return (
    <>
      <div className="section-title">Rutinas predefinidas</div>
      <p className="small muted" style={{ margin: '0 4px 10px' }}>{TEMPLATES.length} rutinas de varias filosofías. Ábrela para ver ejercicios y músculos; al usarla se copia a tus rutinas y puedes cambiarla a tu gusto.</p>
      <div className="chips" style={{ marginBottom: 10 }}>
        {FAMILIES.map((f) => <button key={f.id} className={`chip${family === f.id ? ' on' : ''}`} onClick={() => setFamily(family === f.id ? null : f.id)}>{f.name}</button>)}
      </div>
      <div className="stack" style={{ gap: 14 }}>
        {shown.map((f) => (
          <div key={f.id}>
            <div className="tpl-family"><b>{f.name}</b><span className="tiny muted">{f.about}</span></div>
            <div className="list">
              {templatesOf(f.id).map((tpl) => (
                <button key={tpl.id} className="list-item" onClick={() => go(`/templates/${tpl.id}`)}>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 600 }}>{tpl.name}</span>
                    <span className="small muted">{tpl.items.length} ejercicios · {tpl.level}</span>
                  </span>
                  <Icon name="chevR" size={18} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TemplateDetail({ id }: { id: string }) {
  useData();
  const tpl = TEMPLATE_BY_ID.get(id);
  if (!tpl) return <div className="empty">Rutina no encontrada. <button className="btn ghost" onClick={() => go('/routines', true)}>Volver</button></div>;
  const family = FAMILIES.find((f) => f.id === tpl.family)!;
  const siblings = templatesOf(tpl.family);
  const phases = cardioPhases(tpl.items.map(isCardioItem));
  const map = muscleLoad(tpl.items.map((x) => ({ libraryId: x.lib, sets: x.sets, cardio: isCardioItem(x) })));
  const use = async () => {
    let rid = '';
    if (await attempt(async () => { rid = await A.createRoutineFromTemplate(tpl.id); }, 'Añadida a tus rutinas')) go(`/routines/${rid}`, true);
  };
  const useAll = async () => {
    if (await attempt(async () => { for (const s of siblings) await A.createRoutineFromTemplate(s.id); }, `${siblings.length} rutinas añadidas`)) go('/routines', true);
  };
  return (
    <div>
      <div className="topbar"><button className="back" onClick={() => back('/routines')}><Icon name="chevL" /> Rutinas</button></div>
      <h1>{tpl.name}</h1>
      <div className="chips" style={{ margin: '4px 0 8px' }}>
        <span className="badge blue">{family.name}</span>
        <span className="badge">{tpl.level}</span>
      </div>
      <p className="muted" style={{ margin: '0 0 4px' }}>{tpl.description}</p>
      <p className="tiny muted" style={{ margin: 0 }}>{family.about}</p>

      <button className="btn primary block big" style={{ marginTop: 14 }} onClick={use}><Icon name="plus" size={18} /> Usar esta rutina</button>
      {family.program && siblings.length > 1 && (
        <button className="btn block" style={{ marginTop: 8 }} onClick={useAll}>Añadir las {siblings.length} del programa</button>
      )}

      <div className="section-title">Ejercicios</div>
      <div className="list">
        {tpl.items.map((x, i) => {
          const e = libraryExercise(x.lib)!;
          const phase = phases[i];
          return (
            <button key={x.lib} className="list-item lib-item" onClick={() => go(`/library/${x.lib}`)}>
              {imageUrl(e) ? <img className="lib-thumb" src={imageUrl(e)!} alt="" loading="lazy" /> : <span className="lib-thumb" />}
              <span className="grow">
                <span style={{ display: 'block' }}>{e.name}</span>
                <span className="small muted num">{phase ? `Cardio · ${PHASE_LABEL[phase]}` : `${x.sets} × ${x.reps[0]}–${x.reps[1]}, ${fmtRest(x.restSec)}`}</span>
              </span>
              <Icon name="chevR" size={18} />
            </button>
          );
        })}
      </div>

      {map.max > 0 && (
        <>
          <div className="section-title">Músculos de la rutina</div>
          <div className="card"><BodyMap load={map.load} max={map.max} /></div>
        </>
      )}
      <p className="tiny faint" style={{ marginTop: 12 }}>Si ya tienes alguno de estos ejercicios, se usa el tuyo y se conserva su historial. Los que falten se crean desde la biblioteca.</p>
    </div>
  );
}
