// Exportación e importación. DECISIONES §10.
import { TABLES, type Base, type TableMap, type TableName } from './types';

export const BACKUP_FORMAT = 'gymtrack-backup';
export const BACKUP_VERSION = 1;

export type Dataset = { [K in TableName]: TableMap[K][] };

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: Dataset;
}

export function emptyDataset(): Dataset {
  return Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Dataset;
}

export function makeBackup(data: Dataset, now = new Date()): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

const REQUIRED: { [K in TableName]: string[] } = {
  profile: [],
  exercises: ['name'],
  routines: ['name', 'position'],
  routineExercises: ['routineId', 'exerciseId', 'position'],
  sessions: ['startedAt', 'status'],
  sessionExercises: ['sessionId', 'exerciseId', 'position'],
  sets: ['sessionId', 'sessionExerciseId', 'exerciseId', 'position', 'status'],
  bodyweights: ['measuredAt', 'weightKg'],
};

export interface ParseResult { ok: true; backup: BackupFile; warnings: string[] }
export interface ParseError { ok: false; error: string }

/** Valida estructura y registros. Los registros inválidos se descartan con aviso; el formato incorrecto se rechaza. */
export function parseBackup(text: string): ParseResult | ParseError {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'El archivo no es JSON válido.' }; }
  const obj = raw as Partial<BackupFile>;
  if (!obj || obj.format !== BACKUP_FORMAT) return { ok: false, error: 'No es una copia de GymTrack.' };
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) return { ok: false, error: `Versión de copia no compatible (${obj.version}).` };
  if (!obj.data || typeof obj.data !== 'object') return { ok: false, error: 'La copia no contiene datos.' };
  const warnings: string[] = [];
  const data = emptyDataset();
  for (const t of TABLES) {
    const rows = (obj.data as Record<string, unknown>)[t];
    if (rows == null) continue;
    if (!Array.isArray(rows)) return { ok: false, error: `La tabla ${t} no es una lista.` };
    let bad = 0;
    for (const r of rows) {
      if (isValidRecord(r, REQUIRED[t])) (data[t] as Base[]).push(r as Base);
      else bad++;
    }
    if (bad) warnings.push(`${bad} registros inválidos descartados en ${t}.`);
  }
  return { ok: true, backup: { format: BACKUP_FORMAT, version: obj.version, exportedAt: String(obj.exportedAt ?? ''), data }, warnings };
}

function isValidRecord(r: unknown, required: string[]): boolean {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return false;
  if (typeof o.updatedAt !== 'number' || typeof o.createdAt !== 'number') return false;
  return required.every((k) => o[k] !== undefined && o[k] !== null);
}

export interface MergePlan { toWrite: { [K in TableName]: TableMap[K][] }; added: number; updated: number; unchanged: number }

/**
 * Fusión por id: se escribe un registro importado si no existe localmente o si es más reciente.
 * Importar dos veces el mismo archivo no produce cambios ni duplicados.
 */
export function planMerge(local: Dataset, incoming: Dataset): MergePlan {
  const toWrite = emptyDataset();
  let added = 0, updated = 0, unchanged = 0;
  for (const t of TABLES) {
    const byId = new Map((local[t] as Base[]).map((r) => [r.id, r]));
    for (const r of incoming[t] as Base[]) {
      const cur = byId.get(r.id);
      if (!cur) { added++; (toWrite[t] as Base[]).push(r); }
      else if (r.updatedAt > cur.updatedAt) { updated++; (toWrite[t] as Base[]).push(r); }
      else unchanged++;
    }
  }
  return { toWrite, added, updated, unchanged };
}
