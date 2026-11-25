// Almacén local: caché en memoria + escritura persistente en IndexedDB.
// Las lecturas son síncronas sobre la caché; cada escritura se confirma en IndexedDB ANTES de actualizar la caché.
import { TABLES, type Base, type TableMap, type TableName } from '../domain/types';
import { emptyDataset, type Dataset } from '../domain/backup';
import { getAll, writeAtomic, type Write } from './idb';

export type Row<K extends TableName> = TableMap[K] & { _dirty?: 1 };
type Cache = { [K in TableName]: Map<string, Row<K>> };

const cache = Object.fromEntries(TABLES.map((t) => [t, new Map()])) as unknown as Cache;
let version = 0;
let loaded = false;
const listeners = new Set<() => void>();
const writeListeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
/** Avisos tras escrituras locales (los usa la sincronización). */
export function onLocalWrite(fn: () => void): () => void {
  writeListeners.add(fn);
  return () => writeListeners.delete(fn);
}
export const getVersion = () => version;
export const isLoaded = () => loaded;

function notify() {
  version++;
  for (const l of listeners) l();
}

export async function loadAll(): Promise<void> {
  for (const t of TABLES) {
    const rows = await getAll<Row<typeof t>>(t);
    const m = cache[t] as Map<string, Base>;
    m.clear();
    for (const r of rows) m.set(r.id, r);
  }
  loaded = true;
  notify();
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------- Lectura ----------
export function all<K extends TableName>(t: K, includeDeleted = false): TableMap[K][] {
  const rows = [...(cache[t] as Map<string, Row<K>>).values()];
  return includeDeleted ? rows : rows.filter((r) => !r.deletedAt);
}
export function get<K extends TableName>(t: K, id: string | null | undefined): TableMap[K] | undefined {
  if (!id) return undefined;
  return (cache[t] as Map<string, Row<K>>).get(id);
}
export function dataset(includeDeleted = true): Dataset {
  const d = emptyDataset();
  for (const t of TABLES) (d[t] as Base[]) = all(t, includeDeleted).map(strip);
  return d;
}
export function dirtyRows<K extends TableName>(t: K): Row<K>[] {
  return [...(cache[t] as Map<string, Row<K>>).values()].filter((r) => r._dirty);
}
export function dirtyCount(): number {
  return TABLES.reduce((n, t) => n + dirtyRows(t).length, 0);
}
export function strip<T extends object>(r: T): T {
  const { _dirty, ...rest } = r as T & { _dirty?: 1 };
  void _dirty;
  return rest as T;
}

// ---------- Escritura ----------
export type Change = { [K in TableName]: { t: K; row: Partial<TableMap[K]> & { id?: string } } }[TableName];

/**
 * Inserta o actualiza registros (fusión con el existente) en una única transacción.
 * Marca los registros como pendientes de sincronizar.
 */
export async function commit(changes: Change[]): Promise<Base[]> {
  const now = Date.now();
  const byStore = new Map<TableName, Base[]>();
  const results: Base[] = [];
  for (const c of changes) {
    const prev = c.row.id ? get(c.t, c.row.id) : undefined;
    const id = c.row.id ?? uuid();
    const merged = {
      ...(prev ?? {}), ...c.row, id,
      createdAt: prev?.createdAt ?? now,
      // updatedAt siempre creciente para que "gana el más reciente" sea fiable
      updatedAt: Math.max(now, (prev?.updatedAt ?? 0) + 1),
      _dirty: 1 as const,
    } as unknown as Base;
    byStore.set(c.t, [...(byStore.get(c.t) ?? []), merged]);
    results.push(merged);
  }
  const writes: Write[] = [...byStore.entries()].map(([store, put]) => ({ store, put }));
  await writeAtomic(writes);
  for (const [t, rows] of byStore) for (const r of rows) (cache[t] as Map<string, Base>).set(r.id, r);
  notify();
  for (const l of writeListeners) l();
  return results;
}

/** Borrado lógico (se propaga a otros dispositivos). */
export function del<K extends TableName>(t: K, id: string): Change {
  return { t, row: { id, deletedAt: Date.now() } } as Change;
}

/** Escritura que no marca pendiente ni cambia updatedAt (aplicar datos remotos o limpiar la marca). */
export async function applyRaw<K extends TableName>(t: K, rows: Row<K>[]): Promise<void> {
  if (!rows.length) return;
  await writeAtomic([{ store: t, put: rows }]);
  const m = cache[t] as Map<string, Row<K>>;
  for (const r of rows) m.set(r.id, r);
  notify();
}

export async function markAllDirty(): Promise<void> {
  for (const t of TABLES) {
    const rows = all(t, true).map((r) => ({ ...r, _dirty: 1 as const }));
    await applyRaw(t, rows as Row<typeof t>[]);
  }
}

export async function wipeCache(): Promise<void> {
  for (const t of TABLES) cache[t].clear();
  notify();
}
