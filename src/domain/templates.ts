// Rutinas predefinidas (plantillas). Datos fijos dentro de la app; al usarlas se copian como rutinas propias. Ver docs/DECISIONES.md §17.
import { libraryExercise, matchByName } from './library';

export type TemplateFamily = 'fullbody' | 'torso-pierna' | 'upper' | 'ppl' | 'weider' | 'core' | 'gluteo' | 'express' | 'cardio';

export interface TemplateItem {
  /** Id del ejercicio en la biblioteca. */
  lib: string;
  sets: number;
  reps: [number, number];
  restSec: number;
}

export interface RoutineTemplate {
  id: string;
  name: string;
  family: TemplateFamily;
  level: 'Principiante' | 'Intermedio';
  description: string;
  items: TemplateItem[];
}

export const FAMILIES: { id: TemplateFamily; name: string; about: string; program: boolean }[] = [
  { id: 'fullbody', name: 'Full body', about: 'Todo el cuerpo en cada sesión. Ideal 2–3 días por semana alternando A y B.', program: true },
  { id: 'torso-pierna', name: 'Torso / Pierna', about: 'Dos sesiones que se alternan. 4 días por semana: torso, pierna, torso, pierna.', program: true },
  { id: 'upper', name: 'Upper 1 empuje / Upper 2 tracción', about: 'Torso dividido en empujes y tracciones, con una sesión de pierna. 3–4 días.', program: true },
  { id: 'ppl', name: 'Empuje / Tracción / Pierna', about: 'Push, pull, legs. 3 días, o 6 repitiendo el ciclo.', program: true },
  { id: 'weider', name: 'Por grupos musculares', about: 'Clásica de un grupo grande por día. 4–5 días por semana.', program: true },
  { id: 'core', name: 'Core', about: 'Abdomen y zona media, sola o combinada con pierna.', program: false },
  { id: 'gluteo', name: 'Glúteo y pierna', about: 'Énfasis en glúteo e isquios.', program: false },
  { id: 'express', name: 'Express', about: 'Sesiones cortas (30–40 min) para días con poco tiempo.', program: false },
  { id: 'cardio', name: 'Cardio + fuerza', about: 'Calentamiento y final en cardio con fuerza en medio. Más gasto calórico.', program: false },
];

const t = (lib: string, sets: number, a: number, b: number, restSec: number): TemplateItem => ({ lib, sets, reps: [a, b], restSec });
/** Cardio: un tramo; los minutos se apuntan al entrenar (§14). */
const c = (lib: string): TemplateItem => ({ lib, sets: 1, reps: [1, 1], restSec: 0 });

export const TEMPLATES: RoutineTemplate[] = [
  // Full body
  { id: 'fb-a', name: 'Full body A', family: 'fullbody', level: 'Principiante', description: 'Prensa, empuje y tirón básicos en máquina.',
    items: [t('prensa', 3, 8, 12, 120), t('press-pecho-maquina', 3, 8, 12, 120), t('jalon-pecho', 3, 8, 12, 120), t('press-hombro-maquina', 2, 10, 12, 90), t('curl-femoral-sentado', 2, 10, 15, 90), t('crunch-maquina', 2, 12, 15, 60)] },
  { id: 'fb-b', name: 'Full body B', family: 'fullbody', level: 'Principiante', description: 'Bisagra, inclinado y remo para alternar con la A.',
    items: [t('peso-muerto-rumano-mancuernas', 3, 8, 12, 120), t('press-inclinado-mancuernas', 3, 8, 12, 120), t('remo-maquina', 3, 8, 12, 120), t('elevaciones-laterales', 2, 12, 15, 60), t('triceps-polea-cuerda', 2, 10, 15, 60), t('curl-mancuernas', 2, 10, 15, 60)] },
  { id: 'fb-maquinas', name: 'Full body en máquinas', family: 'fullbody', level: 'Principiante', description: 'Solo máquinas guiadas: fácil de aprender y segura para empezar.',
    items: [t('prensa', 3, 10, 15, 90), t('press-pecho-maquina', 3, 10, 15, 90), t('remo-maquina', 3, 10, 15, 90), t('extension-cuadriceps', 2, 12, 15, 60), t('curl-femoral-tumbado', 2, 12, 15, 60), t('press-hombro-maquina', 2, 10, 15, 90), t('crunch-maquina', 2, 12, 20, 60)] },

  // Torso / Pierna
  { id: 'tp-torso', name: 'Torso', family: 'torso-pierna', level: 'Intermedio', description: 'Pecho, espalda, hombro y brazos.',
    items: [t('press-banca-barra', 4, 6, 10, 150), t('remo-maquina', 4, 8, 12, 120), t('press-inclinado-mancuernas', 3, 8, 12, 120), t('jalon-pecho', 3, 8, 12, 120), t('elevaciones-laterales', 3, 12, 15, 60), t('triceps-polea-cuerda', 2, 10, 15, 60), t('curl-mancuernas', 2, 10, 15, 60)] },
  { id: 'tp-pierna', name: 'Pierna', family: 'torso-pierna', level: 'Intermedio', description: 'Cuádriceps, isquios, glúteo y gemelo.',
    items: [t('sentadilla-hack', 4, 6, 10, 150), t('peso-muerto-rumano', 3, 8, 10, 150), t('prensa', 3, 10, 12, 120), t('curl-femoral-sentado', 3, 10, 15, 90), t('extension-cuadriceps', 2, 12, 15, 60), t('gemelos-de-pie', 3, 10, 15, 60)] },

  // Upper 1 / Upper 2
  { id: 'up-1', name: 'Upper 1 · Empujes', family: 'upper', level: 'Intermedio', description: 'Pecho, hombro y tríceps.',
    items: [t('press-banca-mancuernas', 4, 6, 10, 150), t('press-hombro-mancuernas', 3, 8, 12, 120), t('press-inclinado-maquina', 3, 8, 12, 120), t('contractor-pecho', 3, 12, 15, 60), t('elevaciones-laterales-polea', 3, 12, 15, 60), t('triceps-polea-barra', 3, 10, 15, 60)] },
  { id: 'up-2', name: 'Upper 2 · Tracciones', family: 'upper', level: 'Intermedio', description: 'Espalda, deltoide posterior y bíceps.',
    items: [t('jalon-pecho', 4, 8, 12, 120), t('remo-t-apoyo', 3, 8, 12, 120), t('remo-polea-baja', 3, 10, 12, 90), t('pullover-polea', 2, 12, 15, 60), t('contractor-inverso', 3, 12, 15, 60), t('curl-barra', 3, 8, 12, 60), t('curl-martillo', 2, 10, 15, 60)] },
  { id: 'up-lower', name: 'Lower', family: 'upper', level: 'Intermedio', description: 'Pierna completa para cerrar el ciclo.',
    items: [t('prensa', 4, 8, 12, 150), t('peso-muerto-rumano-mancuernas', 3, 8, 12, 120), t('zancadas', 2, 10, 12, 90), t('curl-femoral-tumbado', 3, 10, 15, 90), t('extension-cuadriceps', 2, 12, 15, 60), t('gemelos-sentado', 3, 12, 15, 60)] },

  // Push / Pull / Legs
  { id: 'ppl-push', name: 'Empuje (push)', family: 'ppl', level: 'Intermedio', description: 'Pecho, hombro y tríceps.',
    items: [t('press-banca-barra', 4, 6, 10, 150), t('press-inclinado-mancuernas', 3, 8, 12, 120), t('press-hombro-maquina', 3, 8, 12, 120), t('cruce-poleas', 3, 12, 15, 60), t('elevaciones-laterales', 3, 12, 15, 60), t('triceps-por-encima', 3, 10, 15, 60)] },
  { id: 'ppl-pull', name: 'Tracción (pull)', family: 'ppl', level: 'Intermedio', description: 'Espalda, trapecio y bíceps.',
    items: [t('jalon-pecho', 4, 8, 12, 120), t('remo-barra', 3, 6, 10, 150), t('remo-bajo-maquina', 3, 10, 12, 90), t('face-pull', 3, 12, 15, 60), t('encogimientos-mancuernas', 2, 10, 15, 60), t('curl-polea', 3, 10, 15, 60)] },
  { id: 'ppl-legs', name: 'Pierna (legs)', family: 'ppl', level: 'Intermedio', description: 'Cuádriceps, femoral, glúteo y gemelo.',
    items: [t('sentadilla-barra', 4, 6, 10, 180), t('peso-muerto-rumano', 3, 8, 10, 150), t('prensa', 3, 10, 12, 120), t('curl-femoral-sentado', 3, 10, 15, 90), t('hip-thrust', 3, 8, 12, 90), t('gemelos-prensa', 3, 12, 15, 60)] },

  // Weider
  { id: 'w-pecho', name: 'Pecho y tríceps', family: 'weider', level: 'Intermedio', description: 'Día de empuje horizontal.',
    items: [t('press-banca-barra', 4, 6, 10, 150), t('press-inclinado-mancuernas', 3, 8, 12, 120), t('press-pecho-maquina', 3, 10, 12, 90), t('contractor-pecho', 3, 12, 15, 60), t('triceps-polea-cuerda', 3, 10, 15, 60), t('press-frances', 2, 8, 12, 90)] },
  { id: 'w-espalda', name: 'Espalda y bíceps', family: 'weider', level: 'Intermedio', description: 'Jalones, remos y curl.',
    items: [t('jalon-pecho', 4, 8, 12, 120), t('remo-maquina', 3, 8, 12, 120), t('remo-mancuerna', 3, 8, 12, 90), t('pullover-polea', 2, 12, 15, 60), t('curl-barra', 3, 8, 12, 60), t('curl-martillo', 2, 10, 15, 60)] },
  { id: 'w-hombro', name: 'Hombro y core', family: 'weider', level: 'Intermedio', description: 'Deltoides completo y abdomen.',
    items: [t('press-hombro-mancuernas', 4, 8, 12, 120), t('elevaciones-laterales', 4, 12, 15, 60), t('contractor-inverso', 3, 12, 15, 60), t('face-pull', 3, 12, 15, 60), t('crunch-polea', 3, 12, 15, 60), t('pallof', 3, 10, 12, 60)] },
  { id: 'w-pierna', name: 'Pierna completa', family: 'weider', level: 'Intermedio', description: 'Todo el tren inferior.',
    items: [t('prensa', 4, 8, 12, 150), t('sentadilla-hack', 3, 8, 12, 150), t('curl-femoral-tumbado', 3, 10, 15, 90), t('extension-cuadriceps', 3, 12, 15, 60), t('aductores-maquina', 2, 12, 15, 60), t('gemelos-de-pie', 4, 10, 15, 60)] },

  // Core
  { id: 'core', name: 'Core', family: 'core', level: 'Principiante', description: 'Abdomen, oblicuos y lumbar. La plancha se apunta en segundos.',
    items: [t('crunch-maquina', 3, 12, 15, 60), t('elevacion-piernas', 3, 10, 15, 60), t('pallof', 3, 10, 12, 60), t('dead-bug', 3, 8, 12, 45), t('plancha', 3, 30, 60, 45), t('hiperextensiones', 2, 12, 15, 60)] },
  { id: 'core-lower', name: 'Core + lower', family: 'core', level: 'Principiante', description: 'Pierna en máquinas y bloque de core al final.',
    items: [t('prensa', 3, 10, 12, 120), t('curl-femoral-sentado', 3, 10, 15, 90), t('extension-cuadriceps', 2, 12, 15, 60), t('hip-thrust', 3, 10, 12, 90), t('crunch-polea', 3, 12, 15, 60), t('plancha-lateral', 2, 20, 40, 45), t('dead-bug', 2, 8, 12, 45)] },
  { id: 'core-upper', name: 'Core + upper', family: 'core', level: 'Principiante', description: 'Torso básico en máquina con core al final.',
    items: [t('press-pecho-maquina', 3, 8, 12, 90), t('remo-maquina', 3, 8, 12, 90), t('press-hombro-maquina', 2, 10, 12, 90), t('jalon-pecho', 2, 10, 12, 90), t('crunch-maquina', 3, 12, 15, 60), t('pallof', 3, 10, 12, 60), t('plancha', 2, 30, 60, 45)] },

  // Glúteo
  { id: 'gluteo', name: 'Glúteo e isquios', family: 'gluteo', level: 'Intermedio', description: 'Hip thrust, bisagra y trabajo accesorio.',
    items: [t('hip-thrust', 4, 8, 12, 120), t('peso-muerto-rumano-mancuernas', 3, 8, 12, 120), t('sentadilla-bulgara', 3, 8, 12, 90), t('patada-gluteo-polea', 3, 12, 15, 60), t('abductores-maquina', 3, 12, 20, 60), t('curl-femoral-sentado', 2, 10, 15, 60)] },
  { id: 'pierna-maquinas', name: 'Pierna en máquinas', family: 'gluteo', level: 'Principiante', description: 'Pierna completa sin peso libre.',
    items: [t('prensa', 3, 10, 15, 120), t('extension-cuadriceps', 3, 12, 15, 60), t('curl-femoral-tumbado', 3, 12, 15, 60), t('aductores-maquina', 2, 12, 15, 60), t('abductores-maquina', 2, 12, 15, 60), t('gemelos-sentado', 3, 12, 15, 60)] },

  // Express
  { id: 'express-fb', name: 'Express full body (35 min)', family: 'express', level: 'Principiante', description: 'Cinco ejercicios, descansos cortos.',
    items: [t('prensa', 3, 10, 12, 75), t('press-pecho-maquina', 3, 10, 12, 75), t('jalon-pecho', 3, 10, 12, 75), t('press-hombro-maquina', 2, 10, 12, 60), t('crunch-maquina', 2, 12, 15, 45)] },
  { id: 'express-torso', name: 'Express torso (30 min)', family: 'express', level: 'Principiante', description: 'Empuje y tirón en pares.',
    items: [t('press-banca-mancuernas', 3, 8, 12, 75), t('remo-maquina', 3, 8, 12, 75), t('press-hombro-mancuernas', 2, 10, 12, 60), t('jalon-pecho', 2, 10, 12, 60), t('curl-polea', 2, 12, 15, 45), t('triceps-polea-cuerda', 2, 12, 15, 45)] },

  // Cardio + fuerza
  { id: 'cardio-fb', name: 'Cardio + full body', family: 'cardio', level: 'Principiante', description: 'Cinta para calentar, fuerza en máquinas y bici para terminar.',
    items: [c('cinta'), t('prensa', 3, 12, 15, 60), t('press-pecho-maquina', 3, 12, 15, 60), t('remo-maquina', 3, 12, 15, 60), t('press-hombro-maquina', 2, 12, 15, 60), c('bicicleta')] },
  { id: 'cardio-core', name: 'Cardio + core', family: 'cardio', level: 'Principiante', description: 'Elíptica, bloque de core y cinta inclinada al final.',
    items: [c('eliptica'), t('crunch-polea', 3, 12, 15, 45), t('pallof', 3, 10, 12, 45), t('dead-bug', 3, 8, 12, 45), t('plancha', 2, 30, 60, 45), c('cinta')] },
];

export const TEMPLATE_BY_ID = new Map(TEMPLATES.map((x) => [x.id, x]));
export const templatesOf = (family: TemplateFamily) => TEMPLATES.filter((x) => x.family === family);

/** Ejercicios mínimos que necesita saber la resolución: id, nombre, vínculo y si está borrado. */
export interface OwnExercise { id: string; name: string; libraryId?: string | null; deletedAt?: number | null }

/**
 * Qué ejercicio propio usar para una entrada de la plantilla, para no duplicar ni partir historiales:
 * 1) el vinculado a esa entrada de la biblioteca; 2) uno sin vincular cuyo nombre corresponde a ella (matchByName);
 * 3) ninguno (null): hay que crearlo desde la biblioteca.
 */
export function resolveExercise(libId: string, own: OwnExercise[]): string | null {
  const alive = own.filter((e) => !e.deletedAt);
  const linked = alive.find((e) => e.libraryId === libId);
  if (linked) return linked.id;
  const byName = alive.find((e) => !e.libraryId && matchByName(e.name)?.id === libId);
  return byName?.id ?? null;
}

/** Nombre libre para la copia: el de la plantilla, o con «(2)», «(3)»… si ya hay una rutina con ese nombre. */
export function freeRoutineName(name: string, taken: string[]): string {
  const set = new Set(taken.map((n) => n.trim().toLowerCase()));
  if (!set.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) if (!set.has(`${name} (${i})`.toLowerCase())) return `${name} (${i})`;
}

export function isCardioItem(item: TemplateItem): boolean {
  return libraryExercise(item.lib)?.equipment === 'cardio';
}
