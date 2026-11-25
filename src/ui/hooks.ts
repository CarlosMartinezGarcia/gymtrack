import { useEffect, useState, useSyncExternalStore } from 'react';
import { getVersion, subscribe } from '../data/store';
import { getSyncState, onSyncState } from '../data/sync';

/** Re-renderiza cuando cambian los datos locales. */
export function useData(): number {
  return useSyncExternalStore(subscribe, getVersion);
}

export function useSync() {
  return useSyncExternalStore(onSyncState, getSyncState);
}

export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [intervalMs, enabled]);
  return now;
}

// ---------- Router por hash ----------
function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}
export function useRoute(): string[] {
  const path = useSyncExternalStore(
    (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); },
    currentPath,
  );
  return path.split('/').filter(Boolean);
}
export function go(path: string, replace = false) {
  if (replace) history.replaceState(null, '', '#' + path);
  else location.hash = path;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.scrollTo(0, 0);
}
export function back(fallback = '/') {
  if (history.length > 1) history.back();
  else go(fallback, true);
}
