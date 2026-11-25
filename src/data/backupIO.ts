import { TABLES, type Base } from '../domain/types';
import { makeBackup, parseBackup, planMerge, type MergePlan } from '../domain/backup';
import { applyRaw, dataset, type Row } from './store';

export function exportJson(): string {
  return JSON.stringify(makeBackup(dataset(true)), null, 1);
}

export function downloadBackup() {
  const blob = new Blob([exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `gymtrack-${d.toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export type ImportPreview = { ok: true; plan: MergePlan; warnings: string[]; exportedAt: string } | { ok: false; error: string };

export function previewImport(text: string): ImportPreview {
  const p = parseBackup(text);
  if (!p.ok) return p;
  return { ok: true, plan: planMerge(dataset(true), p.backup.data), warnings: p.warnings, exportedAt: p.backup.exportedAt };
}

/** Aplica la fusión. Los registros importados quedan pendientes de sincronizar. */
export async function applyImport(plan: MergePlan) {
  for (const t of TABLES) {
    const rows = (plan.toWrite[t] as Base[]).map((r) => ({ ...r, _dirty: 1 as const }));
    await applyRaw(t, rows as Row<typeof t>[]);
  }
}
