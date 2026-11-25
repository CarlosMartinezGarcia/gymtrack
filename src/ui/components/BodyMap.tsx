// Mapa de calor muscular: figura de frente y de espalda coloreada según las series ponderadas de cada músculo (§16).
import { useState } from 'react';
import { MUSCLE_BY_ID, MUSCLES, type MuscleId } from '../../domain/library';
import { heatLevel } from '../../domain/muscleMap';
import { fmt } from '../format';

type Shape = { m: MuscleId | null; d?: string; e?: [number, number, number, number]; r?: [number, number, number, number, number] };

const mirror = (s: Shape): Shape[] => {
  if (s.e) return [s, { ...s, e: [120 - s.e[0], s.e[1], s.e[2], s.e[3]] }];
  if (s.d) return [s, { ...s, d: s.d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${120 - Number(x)},${y}`) }];
  return [s];
};

// Silueta neutra común (cabeza, cuello, manos, espinillas).
const BASE: Shape[] = [
  { m: null, e: [60, 20, 12, 14] },
  { m: null, r: [54, 32, 12, 10, 3] },
  ...mirror({ m: null, e: [27, 128, 4, 6] }),
  ...mirror({ m: null, e: [48, 214, 5, 20] }),
];

const FRONT: Shape[] = [
  ...mirror({ m: 'trapecio', d: 'M46,42 L54,36 L55,45 Z' }),
  ...mirror({ m: 'deltoide_lateral', e: [33, 56, 5, 10] }),
  ...mirror({ m: 'deltoide_anterior', e: [41, 52, 7, 9] }),
  ...mirror({ m: 'pecho', d: 'M45,47 L59,46 L59,70 L47,70 L42,61 Z' }),
  ...mirror({ m: 'biceps', e: [33, 81, 6, 13] }),
  ...mirror({ m: 'antebrazo', e: [29, 108, 5, 14] }),
  { m: 'abdominales', r: [51, 72, 18, 42, 5] },
  ...mirror({ m: 'oblicuos', d: 'M44,74 L49.5,74 L49.5,112 L45,109 L42,92 Z' }),
  ...mirror({ m: 'abductores', e: [41, 124, 4.5, 10] }),
  ...mirror({ m: 'cuadriceps', e: [48.5, 153, 8.5, 25] }),
  ...mirror({ m: 'aductores', e: [56.5, 141, 3, 14] }),
];

const BACK: Shape[] = [
  { m: 'trapecio', d: 'M44,44 L60,35 L76,44 L70,62 L60,70 L50,62 Z' },
  ...mirror({ m: 'deltoide_lateral', e: [33, 56, 5, 10] }),
  ...mirror({ m: 'deltoide_posterior', e: [41, 52, 7, 9] }),
  { m: 'espalda_media', d: 'M50,63 L60,71 L70,63 L70,85 L50,85 Z' },
  ...mirror({ m: 'dorsal', d: 'M42,62 L49,64 L49,100 L45,104 L40,84 Z' }),
  ...mirror({ m: 'triceps', e: [33, 81, 6, 13] }),
  ...mirror({ m: 'antebrazo', e: [29, 108, 5, 14] }),
  { m: 'lumbar', r: [51, 88, 18, 24, 5] },
  ...mirror({ m: 'abductores', e: [40.5, 121, 4, 9] }),
  ...mirror({ m: 'gluteo', e: [51, 128, 9.5, 11] }),
  ...mirror({ m: 'isquios', e: [49, 161, 8.5, 22] }),
  ...mirror({ m: 'gemelos', e: [48, 200, 7, 15] }),
];

const HEAT = ['var(--iron-3)', '#5a3d24', '#8f5a24', '#d17a2a', '#ffa142'];

function Figure({ shapes, load, max, label, onPick }: { shapes: Shape[]; load: Record<MuscleId, number>; max: number; label: string; onPick: (m: MuscleId) => void }) {
  return (
    <figure className="bodymap-fig">
      <svg viewBox="0 0 120 240" role="img" aria-label={`Músculos trabajados, vista de ${label.toLowerCase()}`}>
        {[...BASE, ...shapes].map((s, i) => {
          const fill = s.m ? HEAT[heatLevel(load[s.m], max)] : 'var(--iron-2)';
          const common = { fill, stroke: 'var(--iron)', strokeWidth: 1, onClick: s.m ? () => onPick(s.m!) : undefined, style: s.m ? { cursor: 'pointer' } : undefined };
          const title = s.m ? <title>{`${MUSCLE_BY_ID[s.m].name}: ${fmt(load[s.m])} series`}</title> : null;
          if (s.e) return <ellipse key={i} cx={s.e[0]} cy={s.e[1]} rx={s.e[2]} ry={s.e[3]} {...common}>{title}</ellipse>;
          if (s.r) return <rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} {...common}>{title}</rect>;
          return <path key={i} d={s.d} {...common}>{title}</path>;
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function BodyMap({ load, max, compact = false }: { load: Record<MuscleId, number>; max: number; compact?: boolean }) {
  const [picked, setPicked] = useState<MuscleId | null>(null);
  const worked = MUSCLES.filter((m) => load[m.id] > 0).sort((a, b) => load[b.id] - load[a.id]);
  const idle = MUSCLES.filter((m) => !(load[m.id] > 0));
  return (
    <div className="bodymap">
      <div className="bodymap-figs">
        <Figure shapes={FRONT} load={load} max={max} label="Frente" onPick={setPicked} />
        <Figure shapes={BACK} load={load} max={max} label="Espalda" onPick={setPicked} />
      </div>
      {picked && <p className="small center" style={{ margin: '4px 0 0' }}><b>{MUSCLE_BY_ID[picked].name}</b>: {load[picked] > 0 ? `${fmt(load[picked])} series` : 'sin trabajo'}</p>}
      <div className="bodymap-legend tiny muted"><span>Menos</span>{HEAT.slice(1).map((c) => <i key={c} style={{ background: c }} />)}<span>Más</span><i style={{ background: HEAT[0] }} /><span>Nada</span></div>
      {!compact && (
        <>
          <div className="stack" style={{ gap: 6, marginTop: 10 }}>
            {worked.map((m) => (
              <div key={m.id} className="bodymap-row small">
                <span className="bodymap-name">{m.name}</span>
                <span className="bodymap-bar"><i style={{ width: `${(load[m.id] / max) * 100}%`, background: HEAT[heatLevel(load[m.id], max)] }} /></span>
                <span className="num muted">{fmt(load[m.id])}</span>
              </div>
            ))}
          </div>
          {idle.length > 0 && <p className="small muted" style={{ marginTop: 10 }}><b>Sin trabajo:</b> {idle.map((m) => m.name).join(', ')}.</p>}
          <p className="tiny faint">Series de una sesión de esta rutina: cada serie cuenta 1 para el músculo principal y 0,5 para los secundarios. Toca un músculo para ver su valor.</p>
        </>
      )}
    </div>
  );
}
