// Gráficas SVG ligeras. Las series estimadas se dibujan discontinuas.
import { useEffect, useRef, useState } from 'react';
import { fmt } from '../../domain/metrics';

export interface Pt { x: number; y: number }
export interface Series { label: string; points: Pt[]; color: string; dashed?: boolean; bars?: boolean }

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const shortDate = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export function Chart({ series, height = 180, unit = '', zeroBased = false, xLabel = shortDate }: { series: Series[]; height?: number; unit?: string; zeroBased?: boolean; xLabel?: (x: number) => string }) {
  const [ref, w] = useWidth();
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return <div ref={ref} className="muted small" style={{ padding: '24px 0' }}>Sin datos en este periodo.</div>;
  const padL = 44, padR = 10, padT = 10, padB = 24;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 86_400_000; x1 += 86_400_000; }
  let y0 = zeroBased ? 0 : Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const span = y1 - y0;
  if (!zeroBased) y0 -= span * 0.1;
  y1 += span * 0.1;
  const X = (x: number) => padL + ((x - x0) / (x1 - x0)) * (w - padL - padR);
  const Y = (y: number) => padT + (1 - (y - y0) / (y1 - y0)) * (height - padT - padB);
  const raw = (y1 - y0) / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.ceil(y0 / step) * step; t <= y1 + 1e-9; t += step) ticks.push(t);
  const barW = Math.max(4, Math.min(18, (w - padL - padR) / Math.max(8, pts.length * 1.6)));
  return (
    <div ref={ref}>
      <svg className="chart" width={w} height={height} role="img">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="#2a323c" />
            <text x={padL - 6} y={Y(t) + 4} textAnchor="end">{fmt(t, step >= 1 ? 0 : 1)}</text>
          </g>
        ))}
        <text x={padL} y={height - 6}>{xLabel(x0)}</text>
        <text x={w - padR} y={height - 6} textAnchor="end">{xLabel(x1)}</text>
        {series.map((s) => s.bars ? (
          <g key={s.label}>{s.points.map((p, i) => (
            <rect key={i} x={X(p.x) - barW / 2} y={Y(p.y)} width={barW} height={Math.max(1, Y(zeroBased ? 0 : y0) - Y(p.y))} rx={3} fill={s.color} opacity={0.85}><title>{`${shortDate(p.x)}: ${fmt(p.y)} ${unit}`}</title></rect>
          ))}</g>
        ) : (
          <g key={s.label}>
            <path d={s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x)},${Y(p.y)}`).join('')} fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? '5 5' : undefined} strokeLinejoin="round" />
            {s.points.map((p, i) => (
              <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={s.dashed ? 2.5 : 3.5} fill={s.dashed ? 'var(--iron-2)' : s.color} stroke={s.color} strokeWidth={1.5}><title>{`${shortDate(p.x)}: ${fmt(p.y)} ${unit}`}</title></circle>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 || series.some((s) => s.dashed) ? (
        <div className="legend">{series.map((s) => <span key={s.label}><i className={s.dashed ? 'dash' : ''} style={{ borderColor: s.color }} />{s.label}</span>)}</div>
      ) : null}
    </div>
  );
}
