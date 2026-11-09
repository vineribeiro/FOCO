/** Calendar helpers for the FOCO workout plan.
 * Legacy third-party exercise dataset has been removed; images are served by RepDB.
 */
export const TRAINING_DAYS = [
  { value: 'segunda', label: 'Segunda-feira', shortLabel: 'Segunda' },
  { value: 'terca', label: 'Terça-feira', shortLabel: 'Terça' },
  { value: 'quarta', label: 'Quarta-feira', shortLabel: 'Quarta' },
  { value: 'quinta', label: 'Quinta-feira', shortLabel: 'Quinta' },
  { value: 'sexta', label: 'Sexta-feira', shortLabel: 'Sexta' },
  { value: 'sabado', label: 'Sábado', shortLabel: 'Sábado' },
  { value: 'domingo', label: 'Domingo', shortLabel: 'Domingo' },
] as const;

export type TrainingDay = (typeof TRAINING_DAYS)[number]['value'];

export function getCurrentTrainingDay(): TrainingDay {
  const day = new Date().getDay();
  return (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const)[day];
}

export function getPreferredTrainingDay(): TrainingDay {
  try {
    const saved = localStorage.getItem('foco_selected_training_day');
    if (TRAINING_DAYS.some((day) => day.value === saved)) return saved as TrainingDay;
  } catch {
    // Local storage may be unavailable; use the actual current weekday.
  }
  return getCurrentTrainingDay();
}

export function savePreferredTrainingDay(value: string): void {
  if (!TRAINING_DAYS.some((day) => day.value === value)) return;
  try {
    localStorage.setItem('foco_selected_training_day', value);
  } catch {
    // The current screen state remains usable without local persistence.
  }
}

export function getTrainingDayLabel(value?: string | null): string {
  return TRAINING_DAYS.find((day) => day.value === value)?.label || 'Qualquer dia';
}


export function normalizeExerciseText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
