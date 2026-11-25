import { useSync, go } from '../hooks';
import type { SyncState } from '../../data/sync';

export function syncText(s: SyncState): { text: string; dot: string } {
  const t = (at?: number) => at ? new Date(at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
  switch (s.kind) {
    case 'local': return { text: 'Solo en este dispositivo', dot: '' };
    case 'syncing': return { text: 'Sincronizando…', dot: 'warn' };
    case 'ok': return { text: `Sincronizado ${t(s.at)}`, dot: 'ok' };
    case 'pending': return { text: `${s.count} cambios por subir`, dot: 'warn' };
    case 'offline': return { text: `Sin conexión${s.count ? `, ${s.count} pendientes` : ''}`, dot: 'warn' };
    case 'error': return { text: 'Error al sincronizar', dot: 'err' };
  }
}

export function SyncChip() {
  const s = useSync();
  const { text, dot } = syncText(s);
  return (
    <button className="badge" style={{ border: 0, minHeight: 32 }} onClick={() => go('/settings')} title={s.kind === 'error' ? s.message : text}>
      <span className={`dot ${dot}`} /> <span className="ellipsis" style={{ maxWidth: 140 }}>{text}</span>
    </button>
  );
}
