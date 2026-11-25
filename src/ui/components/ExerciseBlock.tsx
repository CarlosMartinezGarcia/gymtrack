// Tarjeta de un ejercicio dentro de una sesión: se usa en el entrenamiento en curso y al editar el historial.
import { useState } from 'react';
import { get } from '../../data/store';
import { previousPerformance, profile, recommendationFor, sessionExercises, setsOf } from '../../data/queries';
import { cardioLine, cardioMachine, cardioPhases, INCLINE_LABEL, INTENSITY_LABEL, isCardio, isDoneCardio, PHASE_LABEL, type Incline } from '../../domain/cardio';
import type { Intensity } from '../../domain/types';
import * as A from '../../data/actions';
import type { SessionExercise, WorkSet } from '../../domain/types';
import { ACTION_CLASS, fmt, fmtRest, relDay, setsLine } from '../format';
import { attempt, choose, confirm, Sheet } from './Dialogs';
import { Icon } from './Icon';
import { Stepper } from './Stepper';
import { ExercisePicker } from './ExercisePicker';
import { startRest } from '../restTimer';

interface Props {
  se: SessionExercise;
  mode: 'live' | 'edit';
  open: boolean;
  onToggle: () => void;
  sessionStartedAt: number;
  isFirst: boolean;
  isLast: boolean;
}

export function ExerciseBlock({ se, mode, open, onToggle, sessionStartedAt, isFirst, isLast }: Props) {
  const ex = get('exercises', se.exerciseId);
  const unit = ex?.unit ?? 'kg';
  const sets = setsOf(se.id);
  const work = sets.filter((s) => !s.warmup);
  const doneWork = work.filter((s) => s.status === 'done').length;
  const prev = previousPerformance(se.exerciseId, sessionStartedAt);
  const cardio = isCardio(ex);
  const siblings = sessionExercises(se.sessionId);
  const phase = cardio ? cardioPhases(siblings.map((x) => isCardio(get('exercises', x.exerciseId))))[siblings.findIndex((x) => x.id === se.id)] : null;
  const rec = mode === 'live' && !cardio ? recommendationFor(se.exerciseId, se, se.sessionId) : null;
  const [picker, setPicker] = useState(false);
  const [notesOpen, setNotesOpen] = useState(!!se.notes);
  const [setSheet, setSetSheet] = useState<WorkSet | null>(null);
  const complete = cardio ? sets.length > 0 && sets.every(isDoneCardio) : doneWork >= se.sets && work.length > 0 && work.every((s) => s.status === 'done');

  const menu = async () => {
    const v = await choose(ex?.name ?? 'Ejercicio', [
      ...(!isFirst ? [{ label: 'Mover arriba', value: 'up' }] : []),
      ...(!isLast ? [{ label: 'Mover abajo', value: 'down' }] : []),
      ...(ex?.libraryId ? [{ label: 'Ver técnica y alternativas', value: 'library' }] : []),
      { label: 'Cambiar por otro ejercicio', value: 'replace' },
      { label: notesOpen ? 'Ocultar notas' : 'Añadir notas', value: 'notes' },
      { label: 'Quitar de la sesión', value: 'remove', kind: 'danger' as const },
    ]);
    if (v === 'up') await A.moveSessionExercise(se.id, -1);
    if (v === 'down') await A.moveSessionExercise(se.id, 1);
    if (v === 'replace') setPicker(true);
    if (v === 'library' && ex?.libraryId) location.hash = `/library/${ex.libraryId}`;
    if (v === 'notes') setNotesOpen(!notesOpen);
    if (v === 'remove' && await confirm('¿Quitar este ejercicio de la sesión?', `Se eliminarán sus ${sets.length} series de esta sesión. La ficha del ejercicio y el resto del historial no cambian.`, 'Quitar')) {
      await attempt(() => A.removeSessionExercise(se.id));
    }
  };

  const toggleDone = async (s: WorkSet) => {
    if (s.status === 'done') return attempt(() => A.uncompleteSet(s.id));
    const ok = await attempt(() => A.completeSet(s.id));
    if (ok && mode === 'live' && profile().autoStartRest && se.restSec > 0) {
      void startRest(se.restSec, ex?.name);
    }
  };

  return (
    <div className={`ex${open ? ' open' : ''}${complete ? ' complete' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <button className="ex-head grow" onClick={onToggle} aria-expanded={open}>
          <span className="chev"><Icon name="chevR" size={20} /></span>
          <span className="grow">
            <h3>{ex?.name ?? 'Ejercicio desconocido'}</h3>
            {cardio
              ? <span className="small muted">{sets.some(isDoneCardio) ? `${sets.filter(isDoneCardio).reduce((a, x) => a + (x.durationMin ?? 0), 0)} min hechos` : 'Minutos e intensidad'}</span>
              : <span className="small muted">{se.sets} × {se.repMin}–{se.repMax} reps, descanso {fmtRest(se.restSec)}</span>}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {cardio ? <span className="badge blue">{phase ? PHASE_LABEL[phase] : 'Cardio'}</span> : <span className="ex-done-count">{doneWork}/{Math.max(se.sets, work.length)}</span>}
            {rec && <span className={`badge ${ACTION_CLASS[rec.action]}`}>{rec.action}</span>}
          </span>
        </button>
        <button className="icon-btn" style={{ marginTop: 8 }} onClick={menu} aria-label={`Opciones de ${ex?.name}`}><Icon name="dots" stroke={3} /></button>
      </div>

      {open && cardio && (
        <div className="ex-body">
          <div className="prev-line">
            {prev && prev.sets.some(isDoneCardio) ? <>Última vez ({relDay(prev.session.startedAt)}): {prev.sets.filter(isDoneCardio).map(cardioLine).join(' + ')}</> : 'Primera vez con este cardio.'}
          </div>
          {sets.map((s, i) => <CardioRow key={s.id} set={s} n={i + 1} treadmill={cardioMachine(ex) === 'treadmill'} />)}
          <div className="ex-actions">
            <button className="btn sm" onClick={() => attempt(() => A.addSet(se.id))}><Icon name="plus" size={18} /> Añadir tramo</button>
          </div>
        </div>
      )}

      {open && !cardio && (
        <div className="ex-body">
          <div className="prev-line">
            {prev ? <>Última vez ({relDay(prev.session.startedAt)}): <span className="num">{setsLine(prev.sets)}</span> {unit}</> : 'Primera vez con este ejercicio.'}
          </div>

          {rec && sets.some((s) => s.status === 'pending') && (
            <div className={`rec ${ACTION_CLASS[rec.action]}`}>
              <div className="row spread wrap">
                <span style={{ whiteSpace: 'nowrap' }}><span className={`badge ${ACTION_CLASS[rec.action]}`}>{rec.action}</span> <b className="num">{fmt(rec.nextLoad)} {unit}</b></span>
                <button className="btn sm" onClick={() => attempt(() => A.applyRecommendation(se.id), 'Sugerencia aplicada')}>Usar como sugerencia</button>
              </div>
              <p className="small" style={{ margin: '8px 0 0' }}>{rec.goal}</p>
              {rec.stagnation && <p className="small" style={{ color: 'var(--yellow)', margin: '4px 0 0' }}>Posible estancamiento</p>}
              <details className="why"><summary>Por qué</summary><ul>{rec.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                <p className="tiny faint" style={{ marginTop: 6 }}>Recomendación orientativa según las reglas configuradas para este ejercicio.</p></details>
            </div>
          )}

          <div className="set-head"><span /><span>Peso ({unit})</span><span>Reps</span><span /><span /></div>
          {sets.map((s) => {
            const n = s.warmup ? 'C' : String(work.indexOf(s) + 1);
            const meta = [s.rir != null ? `RIR ${s.rir}` : '', s.rpe != null ? `RPE ${s.rpe}` : '', s.notes ?? ''].filter(Boolean).join(', ');
            return (
              <div key={s.id} className={`set${s.status === 'done' ? ' done' : ''}`}>
                <span className={`set-idx${s.warmup ? ' w' : ''}`} title={s.warmup ? 'Calentamiento' : undefined}>{n}</span>
                <Stepper label={`peso serie ${n}`} value={s.weight} suggestion={s.sugWeight} step={se.increment} onChange={(v) => attempt(() => A.updateSet(s.id, { weight: v }))} />
                <Stepper label={`repeticiones serie ${n}`} value={s.reps} suggestion={s.sugReps} step={1} decimals={false} onChange={(v) => attempt(() => A.updateSet(s.id, { reps: v }))} />
                <button className="check" onClick={() => toggleDone(s)} aria-label={s.status === 'done' ? `Serie ${n} hecha; tocar para desmarcar` : `Completar serie ${n}`} aria-pressed={s.status === 'done'}>
                  <Icon name="check" size={26} stroke={3} />
                </button>
                <button className="more" onClick={() => setSetSheet(s)} aria-label={`Más opciones serie ${n}`}><Icon name="dots" stroke={3} size={18} /></button>
                {meta && <span className="set-meta">{meta}</span>}
              </div>
            );
          })}

          <div className="ex-actions">
            <button className="btn sm" onClick={() => attempt(() => A.addSet(se.id))}><Icon name="plus" size={18} /> Añadir serie</button>
            {mode === 'live' && se.restSec > 0 && (
              <button className="btn sm" onClick={() => startRest(se.restSec, ex?.name)}><Icon name="clock" size={18} /> Descanso {fmtRest(se.restSec)}</button>
            )}
          </div>

          {notesOpen && (
            <textarea className="input" style={{ marginTop: 10, minHeight: 60 }} placeholder="Notas del ejercicio en esta sesión" defaultValue={se.notes ?? ''}
              onBlur={(e) => { if (e.target.value !== (se.notes ?? '')) void attempt(() => A.updateSessionExercise(se.id, { notes: e.target.value })); }} />
          )}
        </div>
      )}

      {picker && (
        <ExercisePicker title="Cambiar por" exclude={[se.exerciseId]} onClose={() => setPicker(false)}
          onPick={async (id) => { setPicker(false); await attempt(() => A.replaceSessionExercise(se.id, id), 'Ejercicio corregido'); }} />
      )}
      {setSheet && <SetSheet set={get('sets', setSheet.id) ?? setSheet} onClose={() => setSetSheet(null)} />}
    </div>
  );
}

function SetSheet({ set, onClose }: { set: WorkSet; onClose: () => void }) {
  const [rir, setRir] = useState(set.rir ?? null);
  const [rpe, setRpe] = useState(set.rpe ?? null);
  const [warmup, setWarmup] = useState(set.warmup);
  const [notes, setNotes] = useState(set.notes ?? '');
  const save = async () => {
    if (await attempt(() => A.updateSet(set.id, { rir, rpe, warmup, notes }))) onClose();
  };
  const remove = async () => {
    if (await confirm('¿Eliminar esta serie?')) { await attempt(() => A.deleteSet(set.id)); onClose(); }
  };
  return (
    <Sheet title="Serie" onClose={onClose}>
      <p className="small muted">Opcional: registra el esfuerzo con RIR (repeticiones en reserva) o RPE.</p>
      <span className="small muted">RIR</span>
      <div className="chips" style={{ margin: '6px 0 14px' }}>
        {[0, 1, 2, 3, 4, 5].map((v) => <button key={v} className={`chip${rir === v ? ' on' : ''}`} onClick={() => setRir(rir === v ? null : v)}>{v === 5 ? '5+' : v}</button>)}
      </div>
      <span className="small muted">RPE</span>
      <div className="chips" style={{ margin: '6px 0 14px' }}>
        {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => <button key={v} className={`chip${rpe === v ? ' on' : ''}`} onClick={() => setRpe(rpe === v ? null : v)}>{fmt(v)}</button>)}
      </div>
      <label className="switch"><span>Serie de calentamiento<br /><span className="tiny muted">No cuenta para progresión, récords ni volumen</span></span><input type="checkbox" checked={warmup} onChange={(e) => setWarmup(e.target.checked)} /></label>
      <label className="field" style={{ marginTop: 8 }}><span>Notas</span><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="btn primary block" onClick={save}>Guardar</button>
        <button className="btn danger block" onClick={remove}><Icon name="trash" size={18} /> Eliminar serie</button>
      </div>
    </Sheet>
  );
}

/** Un tramo de cardio: minutos e intensidad; en la cinta, velocidad e inclinación (§14). */
function CardioRow({ set: s, n, treadmill }: { set: WorkSet; n: number; treadmill: boolean }) {
  const done = s.status === 'done';
  const up = (patch: Partial<WorkSet>) => attempt(() => A.updateSet(s.id, patch));
  const toggle = () => done ? attempt(() => A.uncompleteSet(s.id)) : attempt(() => A.completeSet(s.id));
  return (
    <div className={`cardio-row${done ? ' done' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="grow"><span className="tiny muted">Minutos</span>
          <Stepper label={`minutos tramo ${n}`} value={s.durationMin ?? null} step={1} decimals={false} onChange={(v) => up({ durationMin: v })} /></div>
        {treadmill && <div className="grow"><span className="tiny muted">Velocidad (km/h)</span>
          <Stepper label={`velocidad tramo ${n}`} value={s.speedKmh ?? null} step={0.5} onChange={(v) => up({ speedKmh: v })} /></div>}
        <button className="check" onClick={toggle} aria-label={done ? `Tramo ${n} hecho; tocar para desmarcar` : `Completar tramo ${n}`} aria-pressed={done}>
          <Icon name="check" size={26} stroke={3} />
        </button>
      </div>
      <span className="tiny muted">Intensidad</span>
      <div className="chips" style={{ margin: '4px 0 8px' }}>
        {(Object.keys(INTENSITY_LABEL) as Intensity[]).map((k) => <button key={k} className={`chip${s.cardioIntensity === k ? ' on' : ''}`} onClick={() => up({ cardioIntensity: s.cardioIntensity === k ? null : k })}>{INTENSITY_LABEL[k]}</button>)}
      </div>
      {treadmill && (
        <>
          <span className="tiny muted">Inclinación</span>
          <div className="chips" style={{ margin: '4px 0 8px' }}>
            {(Object.keys(INCLINE_LABEL) as Incline[]).map((k) => <button key={k} className={`chip${s.incline === k ? ' on' : ''}`} onClick={() => up({ incline: s.incline === k ? null : k })}>{INCLINE_LABEL[k]}</button>)}
          </div>
        </>
      )}
      {n > 1 && <button className="btn sm danger" onClick={async () => { if (await confirm('¿Eliminar este tramo?')) await attempt(() => A.deleteSet(s.id)); }}>Eliminar tramo</button>}
    </div>
  );
}
