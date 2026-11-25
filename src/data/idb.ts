// Envoltorio mínimo de IndexedDB con transacciones multi-tabla.
import { TABLES, type TableName } from '../domain/types';

const DB_NAME = 'gymtrack';
const DB_VERSION = 1;
export const META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const t of TABLES) if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña. Cierra las demás pestañas de GymTrack.'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
});

export async function getAll<T>(store: TableName | typeof META): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export type Write = { store: TableName | typeof META; put?: unknown[]; del?: string[] };

/** Escribe en varias tablas dentro de UNA transacción: o se guarda todo o nada. */
export async function writeAtomic(writes: Write[]): Promise<void> {
  if (!writes.length) return;
  const db = await openDb();
  const stores = [...new Set(writes.map((w) => w.store))];
  const tx = db.transaction(stores, 'readwrite');
  const p = done(tx);
  for (const w of writes) {
    const os = tx.objectStore(w.store);
    for (const row of w.put ?? []) os.put(row);
    for (const key of w.del ?? []) os.delete(key);
  }
  await p;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(META, 'readonly').objectStore(META).get(key);
    req.onsuccess = () => resolve((req.result as { value: T } | undefined)?.value);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await writeAtomic([{ store: META, put: [{ key, value }] }]);
}

export async function clearAll(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([...TABLES, META], 'readwrite');
  const p = done(tx);
  for (const t of [...TABLES, META]) tx.objectStore(t).clear();
  await p;
}
