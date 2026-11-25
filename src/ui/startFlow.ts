import { activeSession, suggestion } from '../data/queries';
import { finishSession, startFromSession, startSession } from '../data/actions';
import { get } from '../data/store';
import { attempt, choose } from './components/Dialogs';
import { go } from './hooks';

/** Si hay un entreno en curso, pregunta qué hacer. Devuelve false si el usuario cancela o decide continuar. */
async function handleActive(): Promise<boolean> {
  const act = activeSession();
  if (!act) return true;
  const v = await choose('Ya tienes un entrenamiento en curso', [
    { label: `Continuar ${act.routineName}`, value: 'resume', kind: 'primary' },
    { label: 'Guardarlo como borrador y empezar otro', value: 'draft' },
  ]);
  if (v === 'resume') { go('/workout'); return false; }
  if (v === 'draft') return attempt(() => finishSession(act.id, 'draft'));
  return false;
}

/** Política de secuencia (DECISIONES §4): preguntar solo si no es la rutina sugerida. */
async function askCounts(routineId: string | null): Promise<boolean | null> {
  if (!routineId) return false;
  const sug = suggestion().routine;
  if (!sug || sug.id === routineId) return true;
  const v = await choose('¿Continuar la secuencia desde esta rutina?', [
    { label: `No, la siguiente seguirá siendo ${sug.name}`, value: 'no', kind: 'primary' },
    { label: 'Sí, continuar la secuencia desde aquí', value: 'yes' },
  ], `La rutina que toca es ${sug.name}. Esta sesión contará igualmente para estadísticas y progresión.`);
  if (v == null) return null;
  return v === 'yes';
}

export async function startRoutine(routineId: string | null) {
  if (!(await handleActive())) return;
  const counts = await askCounts(routineId);
  if (counts == null) return;
  if (await attempt(() => startSession(routineId, counts))) go('/workout');
}

export async function repeatSession(sessionId: string) {
  if (!(await handleActive())) return;
  const base = get('sessions', sessionId);
  const counts = await askCounts(base?.routineId ?? null);
  if (counts == null) return;
  if (await attempt(() => startFromSession(sessionId, counts))) go('/workout');
}
