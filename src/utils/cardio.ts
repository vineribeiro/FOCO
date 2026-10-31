import type { WorkoutSession } from '../types';

export type CardioMachine = 'esteira' | 'bicicleta' | 'escada' | 'eliptico';
export type CardioEffort = 'leve' | 'moderado' | 'intenso';
export const CARDIO_TYPES: { id: CardioMachine; label: string; metric: 'km' | 'andares' }[] = [
  { id: 'esteira', label: 'Esteira', metric: 'km' },
  { id: 'bicicleta', label: 'Bicicleta', metric: 'km' },
  { id: 'escada', label: 'Escada', metric: 'andares' },
  { id: 'eliptico', label: 'Elíptico', metric: 'km' },
];

export function isCardioSession(session: Pick<WorkoutSession, 'plan_name' | 'notes'>): boolean {
  return session.notes?.includes('[FOCO_CARDIO_V1]') === true
    || session.plan_name?.startsWith('Cardio · ') === true;
}

export function cardioDetails(session: Pick<WorkoutSession, 'plan_name' | 'notes'>) {
  if (!isCardioSession(session)) return null;
  const notes = session.notes || '';
  const metric = notes.match(/^Métrica: (.+)$/m)?.[1] || null;
  const effort = notes.match(/^Intensidade: (.+)$/m)?.[1] || null;
  const machine = notes.match(/^Equipamento: (.+)$/m)?.[1]
    || session.plan_name?.replace(/^Cardio · /, '') || 'Cardio';
  return { machine, metric, effort };
}
