// Lista ordenable: arrastrar desde el asa (táctil y ratón) y botones alternativos para subir/bajar.
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props<T> {
  items: T[];
  getId: (t: T) => string;
  render: (t: T, i: number) => ReactNode;
  onReorder: (from: number, to: number) => void;
  label?: (t: T) => string;
}

export function SortableList<T>({ items, getId, render, onReorder, label }: Props<T>) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number; h: number } | null>(null);
  const st = useRef<{ startY: number; mids: number[]; from: number; h: number } | null>(null);

  const onDown = (e: PointerEvent, i: number) => {
    const el = refs.current.get(getId(items[i]));
    if (!el) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const mids = items.map((it) => {
      const r = refs.current.get(getId(it))!.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    const h = el.getBoundingClientRect().height;
    st.current = { startY: e.clientY, mids, from: i, h };
    setDrag({ from: i, to: i, dy: 0, h });
  };
  const onMove = (e: PointerEvent) => {
    const s = st.current;
    if (!s) return;
    const dy = e.clientY - s.startY;
    const center = s.mids[s.from] + dy;
    let to = s.from;
    for (let k = 0; k < s.mids.length; k++) {
      if (k < s.from && center < s.mids[k]) { to = k; break; }
    }
    for (let k = s.mids.length - 1; k > s.from; k--) {
      if (center > s.mids[k]) { to = k; break; }
    }
    setDrag({ from: s.from, to, dy, h: s.h });
    // auto-scroll cerca de los bordes
    if (e.clientY < 80) window.scrollBy(0, -8);
    else if (e.clientY > window.innerHeight - 120) window.scrollBy(0, 8);
  };
  const onUp = () => {
    const d = drag;
    st.current = null;
    setDrag(null);
    if (d && d.from !== d.to) onReorder(d.from, d.to);
  };

  return (
    <div className="list">
      {items.map((it, i) => {
        const id = getId(it);
        let ty = 0;
        if (drag) {
          if (i === drag.from) ty = drag.dy;
          else if (drag.from < drag.to && i > drag.from && i <= drag.to) ty = -drag.h;
          else if (drag.from > drag.to && i >= drag.to && i < drag.from) ty = drag.h;
        }
        const isDrag = drag?.from === i;
        return (
          <div key={id} ref={(el) => { if (el) refs.current.set(id, el); else refs.current.delete(id); }}
            className={`sortable-item list-item${isDrag ? ' dragging' : ''}`}
            style={{ transform: ty ? `translateY(${ty}px)` : undefined, transition: isDrag || !drag ? 'none' : 'transform .15s', padding: '6px 8px 6px 4px' }}>
            <button className="handle" aria-label={`Arrastrar ${label?.(it) ?? ''}`}
              onPointerDown={(e) => onDown(e, i)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <Icon name="grip" stroke={3} />
            </button>
            <div className="grow">{render(it, i)}</div>
            <div className="move-btns">
              <button disabled={i === 0} onClick={() => onReorder(i, i - 1)} aria-label={`Subir ${label?.(it) ?? ''}`}><Icon name="up" size={18} /></button>
              <button disabled={i === items.length - 1} onClick={() => onReorder(i, i + 1)} aria-label={`Bajar ${label?.(it) ?? ''}`}><Icon name="down" size={18} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
