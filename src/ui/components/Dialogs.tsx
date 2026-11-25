// Diálogos (hojas inferiores) y avisos con API de promesas.
import { useEffect, useState, type ReactNode } from 'react';

type Choice<T> = { label: string; value: T; kind?: 'primary' | 'danger' | 'default' };
type DialogReq = {
  id: number;
  title: string;
  message?: ReactNode;
  choices: Choice<unknown>[];
  resolve: (v: unknown) => void;
  typeToConfirm?: string;
};

let push: ((d: DialogReq) => void) | null = null;
let toastPush: ((t: { text: string; err?: boolean }) => void) | null = null;
let seq = 0;

export function choose<T>(title: string, choices: Choice<T>[], message?: ReactNode, typeToConfirm?: string): Promise<T | null> {
  return new Promise((resolve) => {
    if (!push) return resolve(null);
    push({ id: ++seq, title, message, choices: choices as Choice<unknown>[], resolve: resolve as (v: unknown) => void, typeToConfirm });
  });
}

export async function confirm(title: string, message?: ReactNode, okLabel = 'Eliminar', danger = true): Promise<boolean> {
  return (await choose(title, [{ label: okLabel, value: true, kind: danger ? 'danger' : 'primary' }], message)) === true;
}

export function toast(text: string, err = false) {
  toastPush?.({ text, err });
}

/** Ejecuta una acción y muestra el error si falla. Devuelve si tuvo éxito. */
export async function attempt(fn: () => Promise<unknown>, okText?: string): Promise<boolean> {
  try {
    await fn();
    if (okText) toast(okText);
    return true;
  } catch (e) {
    toast((e as Error).message || 'No se pudo guardar.', true);
    return false;
  }
}

export function DialogHost() {
  const [queue, setQueue] = useState<DialogReq[]>([]);
  const [t, setT] = useState<{ text: string; err?: boolean; k: number } | null>(null);
  const [typed, setTyped] = useState('');
  useEffect(() => {
    push = (d) => setQueue((q) => [...q, d]);
    toastPush = (x) => setT({ ...x, k: Date.now() });
    return () => { push = null; toastPush = null; };
  }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), t.err ? 4500 : 2200);
    return () => clearTimeout(id);
  }, [t]);
  const cur = queue[0];
  const close = (v: unknown) => { cur.resolve(v); setTyped(''); setQueue((q) => q.slice(1)); };
  return (
    <>
      {t && <div className={`toast${t.err ? ' err' : ''}`} role="status" key={t.k}>{t.text}</div>}
      {cur && (
        <Sheet onClose={() => close(null)} title={cur.title}>
          {cur.message && <div className="muted" style={{ marginBottom: 14 }}>{cur.message}</div>}
          {cur.typeToConfirm && (
            <input className="input" style={{ marginBottom: 12 }} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Escribe ${cur.typeToConfirm}`} autoFocus />
          )}
          <div className="stack">
            {cur.choices.map((c, i) => (
              <button key={i} className={`btn block ${c.kind === 'primary' ? 'primary' : c.kind === 'danger' ? 'danger' : ''}`}
                disabled={!!cur.typeToConfirm && typed.trim() !== cur.typeToConfirm}
                onClick={() => close(c.value)}>{c.label}</button>
            ))}
            <button className="btn block ghost" onClick={() => close(null)}>Cancelar</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

export function Sheet({ title, children, onClose }: { title?: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grab" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
