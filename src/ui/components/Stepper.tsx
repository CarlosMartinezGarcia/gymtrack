import { useEffect, useState } from 'react';
import { fmt, parseNum } from '../format';

interface Props {
  value: number | null;
  suggestion?: number | null;
  step: number;
  decimals?: boolean;
  label: string;
  onChange: (v: number | null) => void;
}

/** Campo numérico grande con +/−. Si no hay valor real muestra el sugerido atenuado (placeholder). */
export function Stepper({ value, suggestion, step, decimals = true, label, onChange }: Props) {
  const [text, setText] = useState(value == null ? '' : fmt(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(value == null ? '' : fmt(value)); }, [value, editing]);

  const commit = (raw: string) => {
    const n = parseNum(raw);
    if (n == null) return onChange(null);
    if (Number.isNaN(n)) { setText(value == null ? '' : fmt(value)); return; }
    onChange(decimals ? Math.round(n * 100) / 100 : Math.round(n));
  };
  const bump = (dir: 1 | -1) => {
    const base = value ?? suggestion ?? 0;
    const next = Math.max(0, Math.round((base + dir * step) * 100) / 100);
    onChange(decimals ? next : Math.round(next));
  };
  return (
    <div className="stepper">
      <button type="button" onClick={() => bump(-1)} aria-label={`Restar ${label}`}>−</button>
      <input
        inputMode={decimals ? 'decimal' : 'numeric'}
        aria-label={label}
        value={text}
        placeholder={suggestion != null ? fmt(suggestion) : '—'}
        onFocus={(e) => { setEditing(true); e.currentTarget.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => { setEditing(false); commit(e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      <button type="button" onClick={() => bump(1)} aria-label={`Sumar ${label}`}>+</button>
    </div>
  );
}
