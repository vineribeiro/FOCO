/** Short, data-driven training headline that fits a narrow mobile hero. */
export function conciseWorkoutName(groups: string[], fallback = 'Seu treino'): string {
  if (!groups.length) return fallback;
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalized = groups.map(norm);
  const upper = normalized.some(g => /(peit|cost|dorsa|omb|bicep|tricep|deltoid|braco)/.test(g));
  const lower = normalized.some(g => /(quadr|perna|glute|posterior|panturr|coxa|adutor|abdutor)/.test(g));
  const core = normalized.some(g => /(core|abdom|lombar)/.test(g));
  if (upper && lower) return 'Corpo inteiro';
  if (upper) return 'Superiores';
  if (lower) return 'Inferiores';
  if (core) return 'Core e mobilidade';
  return groups.slice(0, 2).join(' + ');
}
