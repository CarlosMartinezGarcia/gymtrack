// Sincronización con Supabase vía REST (PostgREST + GoTrue), sin SDK. DECISIONES §9.
import { TABLES, type Base, type TableName } from '../domain/types';
import { getMeta, setMeta } from './idb';
import { all, applyRaw, dirtyCount, dirtyRows, get, markAllDirty, onLocalWrite, strip, type Row } from './store';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

export interface SupabaseConfig { url: string; anonKey: string }
interface AuthSession { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } }

export type SyncState =
  | { kind: 'local' }                       // sin backend configurado o sin sesión
  | { kind: 'syncing' }
  | { kind: 'ok'; at: number }
  | { kind: 'pending'; count: number; at?: number }
  | { kind: 'offline'; count: number; at?: number }
  | { kind: 'error'; message: string; count: number; at?: number };

const REMOTE: Record<TableName, string> = {
  profile: 'gt_profile', exercises: 'gt_exercises', routines: 'gt_routines', routineExercises: 'gt_routine_exercises',
  sessions: 'gt_sessions', sessionExercises: 'gt_session_exercises', sets: 'gt_sets', bodyweights: 'gt_bodyweights',
};
const OVERLAP_MS = 5000;
const PAGE = 1000;

let config: SupabaseConfig | null = null;
let auth: AuthSession | null = null;
let state: SyncState = { kind: 'local' };
let lastOk: number | undefined;
let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

export const getSyncState = () => state;
export const getConfig = () => config;
export const getUser = () => auth?.user ?? null;
export function onSyncState(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function setState(s: SyncState) { state = s; for (const l of listeners) l(); }

function buildConfig(): SupabaseConfig | null {
  try {
    if (__SUPABASE_URL__ && __SUPABASE_ANON_KEY__) return { url: __SUPABASE_URL__, anonKey: __SUPABASE_ANON_KEY__ };
  } catch { /* sin valores de compilación */ }
  return null;
}

export async function initSync() {
  config = (await getMeta<SupabaseConfig>('supabase')) ?? buildConfig();
  auth = (await getMeta<AuthSession>('auth')) ?? null;
  lastOk = await getMeta<number>('lastSyncAt');
  refreshIdleState();
  onLocalWrite(() => { refreshIdleState(); schedule(3000); });
  window.addEventListener('online', () => schedule(500));
  window.addEventListener('offline', refreshIdleState);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(500); });
  setInterval(() => { if (document.visibilityState === 'visible') schedule(0); }, 60_000);
  schedule(500);
}

function refreshIdleState() {
  if (state.kind === 'syncing') return;
  if (!config || !auth) return setState({ kind: 'local' });
  const count = dirtyCount();
  if (!navigator.onLine) return setState({ kind: 'offline', count, at: lastOk });
  if (state.kind === 'error') return setState({ ...state, count });
  setState(count ? { kind: 'pending', count, at: lastOk } : { kind: 'ok', at: lastOk ?? Date.now() });
}

function schedule(ms: number) {
  if (!config || !auth) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { void syncNow(); }, ms);
}

// ---------- Configuración y autenticación ----------
export async function saveConfig(c: SupabaseConfig | null) {
  if (c) {
    const url = c.url.trim().replace(/\/+$/, '');
    if (!/^https:\/\/.+/.test(url)) throw new Error('La URL debe empezar por https://');
    if (!c.anonKey.trim()) throw new Error('Falta la clave pública (anon key).');
    c = { url, anonKey: c.anonKey.trim() };
  }
  config = c;
  await setMeta('supabase', c);
  if (!c) await signOut();
  refreshIdleState();
}

async function authRequest(path: string, body: unknown): Promise<AuthSession | { needsConfirmation: true }> {
  if (!config) throw new Error('Configura primero Supabase.');
  const res = await fetch(`${config.url}/auth/v1/${path}`, {
    method: 'POST', headers: { apikey: config.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.msg || json.message || `Error de autenticación (${res.status})`);
  if (!json.access_token) return { needsConfirmation: true };
  return { ...json, expires_at: json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600) } as AuthSession;
}

async function setAuth(a: AuthSession | null) {
  const prevUser = await getMeta<string>('syncUserId');
  auth = a;
  await setMeta('auth', a);
  if (a && prevUser !== a.user.id) {
    // Nueva cuenta en este dispositivo: se suben todos los datos locales y se descarga todo lo remoto.
    await setMeta('syncUserId', a.user.id);
    await setMeta('cursors', {});
    await markAllDirty();
  }
  refreshIdleState();
  if (a) schedule(0);
}

export async function previousAccountId() { return getMeta<string>('syncUserId'); }

export async function signIn(email: string, password: string) {
  const r = await authRequest('token?grant_type=password', { email, password });
  if ('needsConfirmation' in r) throw new Error('Confirma tu email antes de iniciar sesión.');
  await setAuth(r);
}

export async function signUp(email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const r = await authRequest('signup', { email, password });
  if ('needsConfirmation' in r) return 'confirm-email';
  await setAuth(r);
  return 'signed-in';
}

export async function signOut() {
  if (auth && config) {
    fetch(`${config.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: config.anonKey, Authorization: `Bearer ${auth.access_token}` } }).catch(() => {});
  }
  auth = null;
  await setMeta('auth', null);
  refreshIdleState();
}

async function ensureFreshToken(force = false) {
  if (!auth) throw new Error('Sin sesión.');
  if (!force && auth.expires_at * 1000 - Date.now() > 60_000) return;
  const r = await authRequest('token?grant_type=refresh_token', { refresh_token: auth.refresh_token });
  if ('needsConfirmation' in r) throw new Error('Sesión caducada.');
  auth = r;
  await setMeta('auth', r);
}

async function api(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  await ensureFreshToken();
  const res = await fetch(`${config!.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: config!.anonKey, Authorization: `Bearer ${auth!.access_token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 401 && !retried) { await ensureFreshToken(true); return api(path, init, true); }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message ? `${j.message}${j.hint ? ` (${j.hint})` : ''}` : `Error del servidor (${res.status})`);
  }
  return res;
}

// ---------- Sincronización ----------
export function syncNow(): Promise<void> {
  if (!config || !auth) return Promise.resolve();
  if (!navigator.onLine) { refreshIdleState(); return Promise.resolve(); }
  if (running) return running;
  running = (async () => {
    setState({ kind: 'syncing' });
    try {
      await push();
      await pull();
      lastOk = Date.now();
      await setMeta('lastSyncAt', lastOk);
      state = { kind: 'ok', at: lastOk };
      refreshIdleState();
    } catch (e) {
      state = { kind: 'error', message: (e as Error).message || 'Error de red', count: dirtyCount(), at: lastOk };
      setState(state);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function push() {
  for (const t of TABLES) {
    const rows = dirtyRows(t);
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const body = chunk.map((r) => ({
        id: r.id, user_id: auth!.user.id, data: strip(r), updated_at: r.updatedAt, deleted_at: r.deletedAt ?? null,
      }));
      await api(`${REMOTE[t]}?on_conflict=user_id,id`, {
        method: 'POST', body: JSON.stringify(body), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      });
      // Se limpia la marca solo si el registro no ha cambiado mientras se subía.
      const clean = chunk.map((r) => get(t, r.id) as Row<typeof t>).filter((cur, k) => cur && cur.updatedAt === chunk[k].updatedAt).map((cur) => strip(cur) as Row<typeof t>);
      await applyRaw(t, clean);
    }
  }
}

async function pull() {
  const cursors = (await getMeta<Record<string, string>>('cursors')) ?? {};
  for (const t of TABLES) {
    let cursor = cursors[t];
    // Primera página: desde el cursor guardado menos un solape. Siguientes: paginación por (fecha, id).
    let page: { at: string; id: string } | null = null;
    for (;;) {
      let filter = '';
      if (page) {
        const at = encodeURIComponent(page.at);
        filter = `&or=(server_updated_at.gt.${at},and(server_updated_at.eq.${at},id.gt.${encodeURIComponent(page.id)}))`;
      } else if (cursor) {
        filter = `&server_updated_at=gt.${encodeURIComponent(new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString())}`;
      }
      const q = `${REMOTE[t]}?select=id,data,updated_at,deleted_at,server_updated_at&order=server_updated_at.asc,id.asc&limit=${PAGE}${filter}`;
      const rows = (await (await api(q)).json()) as { id: string; data: Base; updated_at: number; deleted_at: number | null; server_updated_at: string }[];
      const toApply: Row<typeof t>[] = [];
      for (const r of rows) {
        const local = get(t, r.id) as Row<typeof t> | undefined;
        if (!local || r.updated_at > local.updatedAt) {
          toApply.push({ ...(r.data as Row<typeof t>), id: r.id, updatedAt: r.updated_at, deletedAt: r.deleted_at });
        } else if (r.updated_at === local.updatedAt && local._dirty) {
          toApply.push(strip(local) as Row<typeof t>);
        }
      }
      await applyRaw(t, toApply);
      if (rows.length) {
        const lastRow = rows[rows.length - 1];
        page = { at: lastRow.server_updated_at, id: lastRow.id };
        if (!cursor || new Date(lastRow.server_updated_at) > new Date(cursor)) cursor = lastRow.server_updated_at;
      }
      if (rows.length < PAGE) break;
    }
    if (cursor) { cursors[t] = cursor; await setMeta('cursors', cursors); }
  }
}

/** Número de registros locales (para mostrar en configuración). */
export function localRecordCount() { return TABLES.reduce((n, t) => n + all(t, true).length, 0); }
