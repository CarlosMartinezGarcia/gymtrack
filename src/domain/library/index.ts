// Consultas sobre la biblioteca de ejercicios. Funciones puras. Ver docs/DECISIONES.md §13.
import { LIBRARY, type LibraryExercise } from './catalog';
import { MUSCLE_BY_ID, type MuscleId } from './muscles';

export * from './catalog';
export * from './muscles';

const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]));

export function libraryExercise(id: string | null | undefined): LibraryExercise | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Minúsculas, sin tildes ni signos: para comparar nombres. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface LibraryFilter {
  q?: string;
  group?: string | null;
  equipment?: string | null;
}

export function searchLibrary(f: LibraryFilter = {}): LibraryExercise[] {
  const q = normalize(f.q ?? '');
  return LIBRARY.filter((e) => {
    if (f.equipment && e.equipment !== f.equipment) return false;
    if (f.group) {
      const groups = e.equipment === 'cardio' ? ['Cardio'] : e.primary.map((m) => MUSCLE_BY_ID[m].group);
      if (!groups.includes(f.group as never)) return false;
    }
    if (!q) return true;
    return [e.name, ...e.aliases, ...e.primary.map((m) => MUSCLE_BY_ID[m].name)].some((n) => normalize(n).includes(q));
  });
}

/**
 * Sugiere el ejercicio de la biblioteca que corresponde a un nombre escrito por el usuario.
 * Coincidencia exacta con el nombre o un alias (sin tildes ni mayúsculas); si no, el alias más largo contenido en el nombre.
 */
export function matchByName(name: string): LibraryExercise | undefined {
  const n = normalize(name);
  if (!n) return undefined;
  let best: { e: LibraryExercise; len: number } | undefined;
  for (const e of LIBRARY) {
    for (const a of [e.name, ...e.aliases]) {
      const na = normalize(a);
      if (na === n) return e;
      if (na.length >= 4 && (` ${n} `).includes(` ${na} `) && (!best || na.length > best.len)) best = { e, len: na.length };
    }
  }
  return best?.e;
}

/**
 * Alternativas para variar: mismo patrón de movimiento primero; después, ejercicios que comparten músculo principal.
 * Dentro de cada bloque se priorizan los de otro material (máquina ↔ polea ↔ mancuernas…). El cardio solo se alterna con cardio.
 */
export function alternatives(id: string, max = 6): LibraryExercise[] {
  const base = BY_ID.get(id);
  if (!base) return [];
  const overlap = (e: LibraryExercise) => e.primary.filter((m) => base.primary.includes(m)).length;
  const scored = LIBRARY
    .filter((e) => e.id !== id && (e.equipment === 'cardio') === (base.equipment === 'cardio'))
    .map((e) => ({ e, score: (e.pattern === base.pattern ? 100 : 0) + overlap(e) * 10 + (e.equipment !== base.equipment ? 1 : 0) }))
    .filter((x) => x.score >= 10)
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'es'));
  return scored.slice(0, max).map((x) => x.e);
}

export function musclesOf(e: LibraryExercise): { id: MuscleId; role: 'primary' | 'secondary' }[] {
  return [...e.primary.map((id) => ({ id, role: 'primary' as const })), ...e.secondary.map((id) => ({ id, role: 'secondary' as const }))];
}

/** URL de una imagen (0 = posición inicial, 1 = final). Las imágenes se sirven desde la propia app (public/ex/). */
export function imageUrl(e: LibraryExercise, frame: 0 | 1 = 0): string | null {
  return e.img ? `ex/${e.img}/${frame}.jpg` : null;
}
