/** Visible, specific labels for the muscle groups actually trained that day.
 * Do not reduce every upper-body workout to the ambiguous word "Superiores".
 */
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function conciseWorkoutName(groups: string[], fallback = 'Seu treino'): string {
  const labels: string[] = [];
  let lowerCount = 0;
  let upperCount = 0;
  for (const group of groups) {
    const value = normalize(group);
    if (!value) continue;
    let label = group.trim();
    let area: 'upper' | 'lower' | 'core' | 'other' = 'other';
    if (/peit|chest|pector/.test(value)) { label = 'Peito'; area = 'upper'; }
    else if (/cost|dorsa|latissim|\blats\b|back|row/.test(value)) { label = 'Costas'; area = 'upper'; }
    else if (/omb|delto|shoulder/.test(value)) { label = 'Ombros'; area = 'upper'; }
    else if (/bicep/.test(value)) { label = 'Bíceps'; area = 'upper'; }
    else if (/tricep/.test(value)) { label = 'Tríceps'; area = 'upper'; }
    else if (/antebrac|forearm/.test(value)) { label = 'Antebraços'; area = 'upper'; }
    else if (/trapez|traps/.test(value)) { label = 'Trapézio'; area = 'upper'; }
    else if (/quadr|coxa anterior|quadricep/.test(value)) { label = 'Quadríceps'; area = 'lower'; }
    else if (/posterior|hamstring/.test(value)) { label = 'Posteriores'; area = 'lower'; }
    else if (/glute/.test(value)) { label = 'Glúteos'; area = 'lower'; }
    else if (/panturr|calv/.test(value)) { label = 'Panturrilhas'; area = 'lower'; }
    else if (/adutor|abdutor|adductor|abductor/.test(value)) { label = 'Adutores e abdutores'; area = 'lower'; }
    else if (/perna|leg/.test(value)) { label = 'Pernas'; area = 'lower'; }
    else if (/abdom|core/.test(value)) { label = 'Abdômen'; area = 'core'; }
    else if (/lombar|lower back/.test(value)) { label = 'Lombar'; area = 'core'; }
    if (!labels.some(existing => normalize(existing) === normalize(label))) {
      labels.push(label);
      if (area === 'lower') lowerCount++;
      if (area === 'upper') upperCount++;
    }
  }
  if (!labels.length) return fallback;
  if (upperCount && lowerCount) return 'Corpo inteiro';
  // A full lower-body day is intentionally called "Inferiores" in the plan.
  if (lowerCount >= 3 && upperCount === 0) return 'Inferiores';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels.join(' e ');
  if (labels.length === 3) return labels[0] + ', ' + labels[1] + ' e ' + labels[2];
  return labels[0] + ', ' + labels[1] + ' + ' + (labels.length - 2) + ' grupos';
}
