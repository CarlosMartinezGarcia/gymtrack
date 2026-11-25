import { get } from '../data/store';
import { isCardio } from '../domain/cardio';
import { choose } from './components/Dialogs';

/**
 * Al añadir un cardio a una rutina o sesión que ya tiene ejercicios, pregunta si va al principio (calentamiento)
 * o al final (enfriamiento). Devuelve true = principio, false = final, null = cancelado.
 */
export function needsPlacement(exerciseId: string, hasOthers: boolean): boolean {
  return hasOthers && isCardio(get('exercises', exerciseId));
}
export function cardioPlacement(): Promise<boolean | null> {
  return choose<boolean>('¿Dónde va este cardio?', [
    { label: 'Al principio (calentamiento)', value: true },
    { label: 'Al final (enfriamiento)', value: false },
  ]);
}
