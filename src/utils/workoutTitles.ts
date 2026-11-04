/** Create an informative workout title from real muscle groups, not a generic split.
 * Unlike "Superiores", this distinguishes Peito + Tríceps from Costas + Bíceps.
 * Lower body can remain "Inferiores" when the day genuinely trains the whole region.
 */
const translateGroup = (value: string): string => {
  const normalized=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  if (/^(peito|peitoral|chest|pector)/.test(normalized)) return 'Peito';
  if (/^(costas|dorsal|lats|middle back|upper back|back)/.test(normalized)) return 'Costas';
  if (/^(ombro|deltoid|shoulder)/.test(normalized)) return 'Ombros';
  if (/^(bicep|biceps)/.test(normalized)) return 'Bíceps';
  if (/^(tricep|triceps)/.test(normalized)) return 'Tríceps';
  if (/^(antebraco|forearm)/.test(normalized)) return 'Antebraços';
  if (/^(trap|trapezio)/.test(normalized)) return 'Trapézio';
  if (/^(quadr|coxa anterior|anterior de coxa)/.test(normalized)) return 'Quadríceps';
  if (/^(posterior|hamstring|isquiotib)/.test(normalized)) return 'Posteriores';
  if (/^(glute|gluteo|gluteos)/.test(normalized)) return 'Glúteos';
  if (/^(panturr|calf|calves)/.test(normalized)) return 'Panturrilhas';
  if (/^(adutor|adductor)/.test(normalized)) return 'Adutores';
  if (/^(abdutor|abductor)/.test(normalized)) return 'Abdutores';
  if (/^(perna|leg|inferior)/.test(normalized)) return 'Inferiores';
  if (/^(abdom|abs|core)/.test(normalized)) return 'Abdômen';
  if (/^(lombar|lower back)/.test(normalized)) return 'Lombar';
  if (/^(cardio|aerobic)/.test(normalized)) return 'Cardio';
  return value.trim();
};
const lowerGroups=new Set(['Inferiores','Quadríceps','Posteriores','Glúteos','Panturrilhas','Adutores','Abdutores']);
const upperGroups=new Set(['Peito','Costas','Ombros','Bíceps','Tríceps','Antebraços','Trapézio']);

export function conciseWorkoutName(groups: string[], fallback = 'Seu treino'): string {
  const names=[...new Set(groups.filter(Boolean).map(translateGroup))];
  if(!names.length)return fallback;
  const hasUpper=names.some(name=>upperGroups.has(name));
  const hasLower=names.some(name=>lowerGroups.has(name));
  if(hasUpper&&hasLower)return 'Corpo inteiro';
  // The complete lower-body routine is intentionally grouped, not every leg isolation session.
  if(names.includes('Inferiores') || names.filter(name=>lowerGroups.has(name)).length>=3) {
    if(!hasUpper && names.every(name=>lowerGroups.has(name))) return 'Inferiores';
  }
  if(names.length===1)return names[0];
  if(names.length===2)return names.join(' + ');
  if(names.length===3)return names.join(' + ');
  return names.slice(0,2).join(' + ')+' + '+(names.length-2)+' grupos';
}
