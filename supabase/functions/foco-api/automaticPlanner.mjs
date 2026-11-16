import { catalogExercise } from './trainingCatalog.mjs';
import { assessTrainingSafety, normalizeScienceExercises, auditScientificWorkout, sciencePlanSummary,
  sessionExerciseRange, estimateTrainingSessionMinutes } from './trainingScience.mjs';

export const AUTOMATIC_PLANNER_VERSION = 'foco-rules-2026.1';
export class PlannerError extends Error {
  constructor(code, message) { super(message); this.name='PlannerError'; this.status=409; this.code=code; }
}
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const key = value => {
  const n=normalize(value);
  return ({peito:'Peitoral',peitoral:'Peitoral',costas:'Costas',ombros:'Ombros',biceps:'Bíceps',triceps:'Tríceps',quadriceps:'Quadríceps',
    'posterior de coxa':'Posteriores',posteriores:'Posteriores',gluteos:'Glúteos',panturrilhas:'Panturrilhas',
    'abdomen e core':'Core',core:'Core',trapezio:'Trapézio',antebracos:'Antebraços',lombar:'Lombar',adutores:'Adutores',abdutores:'Abdutores'})[n] || null;
};
// Each entry is an exact catalogue movement plus its actual equipment. These
// are versioned product templates derived from the supplied dossier, not claims
// of individual clinical assessment or professional certification of each plan.
const choice = (name, equipment, cue) => ({ name, equipment:equipment.split(','), cue });
const ROLES = {
  Peitoral:[choice('Supino reto com barra','bar,banco','Mantenha punhos alinhados e amplitude confortável.'),choice('Supino reto com halteres','halter,banco','Controle a descida e mantenha apoio estável.'),choice('Supino na máquina','maquina','Ajuste o banco e controle a amplitude.'),choice('Flexão de braços','corpo','Mantenha o tronco estável e amplitude tolerada.')],
  Costas:[choice('Remada curvada com barra','bar','Mantenha o tronco estável e puxe de forma controlada.'),choice('Puxada frontal na polia','polia','Puxe sem embalar o tronco.'),choice('Remada unilateral com halter','halter,banco','Use apoio estável e controle a descida.'),choice('Remada baixa no cabo','polia','Puxe sem compensar com a lombar.'),choice('Remada invertida','bar','Mantenha alinhamento do tronco e apoio estável.')],
  Quadríceps:[choice('Agachamento livre com barra','bar','Mantenha os pés estáveis e amplitude confortável.'),choice('Agachamento goblet','halter','Mantenha apoio estável e controle a descida.'),choice('Leg press 45 graus','maquina','Mantenha a pelve apoiada e amplitude tolerada.'),choice('Agachamento com peso corporal','corpo','Controle a descida com apoio estável.')],
  Posteriores:[choice('Levantamento terra romeno','bar','Faça a dobradiça do quadril com a coluna estável.'),choice('Stiff com halteres','halter','Recue o quadril e controle a amplitude.'),choice('Mesa flexora','maquina','Ajuste os apoios e evite compensações.'),choice('Ponte de glúteos com pés no chão','corpo','Eleve o quadril com controle e tronco estável.')],
  Glúteos:[choice('Hip thrust com barra','bar,banco','Use apoio estável e evite hiperestender a lombar.'),choice('Hip thrust na máquina','maquina','Ajuste os apoios e controle o movimento.'),choice('Ponte de glúteos','corpo','Eleve o quadril com controle, sem compensar com a lombar.')],
  Ombros:[choice('Desenvolvimento com halteres','halter','Use amplitude confortável e tronco estável.'),choice('Desenvolvimento na máquina','maquina','Ajuste o banco e evite compensações.'),choice('Elevação lateral com halteres','halter','Eleve com controle e amplitude confortável.'),choice('Elevação lateral no cabo','polia','Controle a amplitude sem embalar o tronco.')],
  Bíceps:[choice('Rosca direta com barra reta','bar','Mantenha os cotovelos estáveis e controle a descida.'),choice('Rosca direta com halteres','halter','Evite embalar o tronco.'),choice('Rosca direta na polia com barra reta','polia','Mantenha os cotovelos estáveis.')],
  Tríceps:[choice('Tríceps pulley com corda','polia','Mantenha os cotovelos estáveis.'),choice('Tríceps francês unilateral com halter','halter','Use amplitude confortável e evite compensações.'),choice('Flexão de braços com pegada fechada','corpo','Mantenha o tronco alinhado e amplitude tolerada.')],
  Panturrilhas:[choice('Panturrilha em pé na máquina','maquina','Use apoio estável e controle a subida e a descida.'),choice('Panturrilha em pé com halteres','halter','Mantenha equilíbrio e amplitude confortável.'),choice('Panturrilha em pé unilateral','corpo','Use apoio estável e controle o movimento.')],
  Trapézio:[choice('Encolhimento com halteres','halter','Eleve os ombros com controle, sem projetar a cabeça.'),choice('Encolhimento com barra','bar','Mantenha os braços estáveis e controle o movimento.')],
  Antebraços:[choice('Flexão de punho com halteres','halter','Apoie os antebraços e controle a amplitude.'),choice('Flexão de punho com barra','bar','Use apoio estável e amplitude confortável.')],
  Lombar:[choice('Bird dog','corpo','Estenda membros alternados com o tronco estável e respiração livre.')],
  Adutores:[choice('Adução de quadril na máquina','maquina','Controle o retorno com amplitude confortável.'),choice('Adução de quadril deitado de lado','corpo','Mantenha o tronco estável e controle o movimento.')],
  Abdutores:[choice('Abdução de quadril na máquina','maquina','Use amplitude confortável e controle o retorno.'),choice('Abdução de quadril deitado de lado','corpo','Mantenha a pelve estável e controle a amplitude.')],
  Core:[choice('Abdominal reverso','corpo','Controle a elevação da pelve sem embalar as pernas.'),choice('Abdominal crunch','corpo','Controle o movimento sem puxar o pescoço.'),choice('Dead bug','corpo','Mantenha a lombar confortável e respire durante o movimento.')],
};
const MAJOR=['Peitoral','Costas','Quadríceps','Posteriores'];
const TEMPLATES={
  full:['Peitoral','Costas','Quadríceps','Posteriores','Core','Panturrilhas','Ombros','Glúteos','Bíceps','Tríceps','Trapézio','Antebraços','Lombar','Adutores','Abdutores'],
  upper:['Peitoral','Costas','Ombros','Bíceps','Tríceps','Core','Trapézio','Antebraços'],
  lower:['Quadríceps','Posteriores','Glúteos','Panturrilhas','Core','Adutores','Abdutores','Lombar'],
  push:['Peitoral','Ombros','Tríceps','Core'],
  pull:['Costas','Bíceps','Core','Ombros','Trapézio','Antebraços'],
};
const SPLITS={2:['full','full'],3:['full','full','full'],4:['upper','lower','upper','lower'],
  5:['upper','lower','full','upper','lower'],6:['push','pull','lower','push','pull','lower'],7:['push','pull','lower','push','pull','lower','recovery']};
export function plannerEquipment(value) {
  const n=normalize(value), set=new Set(['corpo']);
  const residual=n.replace(/\b(?:sem|evitar) (?:uso de )?(?:equipamentos?|barras?|halteres?|maquinas?|polias?|cabos?|bancos?|esteiras?)\b/g,'');
  if(/\b(sem|evitar|nao)\b/.test(residual))throw new PlannerError('EQUIPMENT_REVIEW','Descreva os equipamentos disponíveis e use o campo de restrições para condições ou movimentos a evitar.');
  const full=/academia completa/.test(n)&&!/sem equipamentos?/.test(n);
  for(const [tag,pattern] of [['bar',/barra|anilha/],['halter',/halter/],['maquina',/maquina/],['polia',/polia|cabo/],['banco',/banco/],['esteira',/esteira/]]) {
    if(full||pattern.test(n))set.add(tag);
  }
  for(const [tag,word] of [['bar','barras?'],['halter','halteres?'],['maquina','maquinas?'],['polia','polias?|cabos?'],['banco','bancos?'],['esteira','esteiras?']]) {
    if(new RegExp('(?:sem|evitar) (?:uso de )?(?:'+word+')\\b').test(n))set.delete(tag);
  }
  if(!n || set.size===1&&!/peso corporal|sem equipamento|treino em casa/.test(n))
    throw new PlannerError('EQUIPMENT_REQUIRED','Informe os equipamentos disponíveis, por exemplo: academia completa, halteres e banco, ou peso corporal.');
  if(/\b(apenas|somente|exceto)\b/.test(n))throw new PlannerError('EQUIPMENT_REVIEW','Descreva os equipamentos disponíveis diretamente, por exemplo “halteres e banco”, para evitar escolhas ambíguas.');
  return set;
}
const benign = value => String(value||'').split(/[;,]/).every(part=>!normalize(part) || /^(sem (restricoes|lesoes|dores|limitacoes|preferencias)( conhecidas| atuais| especificas)?|nenhuma|nenhum|nao tenho (restricoes|lesoes|dores|limitacoes))$/.test(normalize(part)));

export function buildAutomaticWorkout({ days=/** @type {string[]} */([]), experience='iniciante', goal='Hipertrofia', sessionMinutes=60,
  priorityMuscles=/** @type {string[]} */([]), equipmentAvailable='', restrictions='', preferences='', previousExercises=/** @type {(string|{exercise_name:string})[]} */([]), excludedExercises=/** @type {string[]} */([]) }={}) {
  if(!Array.isArray(days)||days.length<2||days.length>7||new Set(days).size!==days.length
    ||days.some(d=>!['segunda','terca','quarta','quinta','sexta','sabado','domingo'].includes(d)))
    throw new PlannerError('SCHEDULE_INVALID','Escolha de 2 a 7 dias diferentes para montar a semana.');
  if(!['iniciante','intermediario','avancado'].includes(experience)||!Number.isFinite(sessionMinutes)||sessionMinutes<20||sessionMinutes>180)
    throw new PlannerError('PROFILE_INVALID','Confira experiência e duração da sessão, entre 20 e 180 minutos.');
  const safety=assessTrainingSafety({notes:restrictions,consent:true});
  if(safety.acuteRedFlag)throw new PlannerError('CLINICAL_REVIEW','Há um sinal de alerta informado. Interrompa o treino e procure avaliação clínica antes de montar uma ficha.');
  if(safety.highRisk||!benign(restrictions))throw new PlannerError('RESTRICTION_REVIEW','As restrições informadas precisam de avaliação individual. Use a montagem manual com orientação profissional; o gerador não vai ignorar essas condições.');
  if(!benign(preferences))throw new PlannerError('PREFERENCE_REVIEW','Há preferências livres na anamnese que precisam ser conferidas. Revise-as na anamnese ou use a montagem manual para preservar suas escolhas.');
  const unsupported=priorityMuscles.filter(value=>normalize(value)&&!key(value)&&!['corpo inteiro','equilibrio global','corpo inteiro com distribuicao equilibrada'].includes(normalize(value)));
  if(unsupported.length)throw new PlannerError('PRIORITY_UNSUPPORTED','Confira os nomes dos grupos prioritários: '+unsupported.join(', ')+'.');
  const priorities=[...new Set(priorityMuscles.map(key).filter(Boolean))];
  if(excludedExercises.some(name=>!catalogExercise(name)))throw new PlannerError('EXCLUSION_UNKNOWN','Selecione os exercícios a evitar usando os nomes completos do catálogo.');
  const equipment=plannerEquipment(equipmentAvailable), excluded=new Set(excludedExercises.map(normalize));
  const history=new Set(previousExercises.map(ex=>normalize(typeof ex==='string'?ex:ex.exercise_name)));
  const max=sessionExerciseRange(sessionMinutes).max, kinds=SPLITS[days.length];
  const entries=[];
  const auditOptions={days,experience,sessionMinutes,enforceExerciseRange:false};
  const fits=items=>days.every(day=>{
    const daily=items.filter(ex=>ex.training_day===day);
    return daily.length<=max&&estimateTrainingSessionMinutes(daily)<=sessionMinutes;
  })&&auditScientificWorkout(items,auditOptions).ok;
  const eligible=(role,di)=>ROLES[role].filter(c=>c.equipment.every(tag=>equipment.has(tag))&&!excluded.has(normalize(c.name)))
    .map((c,i)=>({...c,rank:history.has(normalize(c.name))?-100:(i-di+ROLES[role].length)%ROLES[role].length}))
    .sort((a,b)=>a.rank-b.rank);
  const make=(choice,role,di,sets)=>{
    const force=/forca|powerbuilding/.test(normalize(goal)), endurance=/resistencia|condicionamento/.test(normalize(goal));
    const reps=role==='Core'?[10,15]:force&&experience!=='iniciante'&&MAJOR.includes(role)?[4,6]:endurance?[12,20]:[8,12];
    return normalizeScienceExercises([{exercise_name:choice.name,muscle_group:role,training_day:days[di],sets,
      reps_min:reps[0],reps_max:reps[1],rest_seconds:force?180:120,suggested_load_kg:0,
      notes:choice.cue}],{experience})[0];
  };
  const place=(role,onlyDay=-1,second=false)=>{
    const ranked=days.map((day,di)=>({di,count:entries.filter(e=>e.training_day===day).length}))
      .filter(({di})=>kinds[di]!=='recovery'&&(onlyDay<0||di===onlyDay)&&TEMPLATES[kinds[di]].includes(role))
      .sort((a,b)=>a.count-b.count||a.di-b.di);
    for(const {di} of ranked){
      const existing=entries.filter(e=>e.training_day===days[di]&&e.muscle_group===role);
      if(existing.length>=(second?2:1))continue;
      if(role==='Core'&&new Set(entries.filter(e=>e.muscle_group==='Core').map(e=>e.training_day)).size>=3)continue;
      for(const c of eligible(role,di)){
        if(entries.some(e=>e.training_day===days[di]&&e.exercise_name===c.name))continue;
        const sets=role==='Core'?2:experience==='iniciante'?2:3;
        // A small template may need two sets to respect the user's hard time cap.
        for(const count of [...new Set([sets,2,1])]){
          const ex=make(c,role,di,count);
          if(!catalogExercise(ex.exercise_name)?.primary.includes(role))continue;
          if(fits([...entries,ex])){entries.push(ex);return true;}
        }
      }
    }
    return false;
  };
  // Reserve weekly coverage first; never fill cosmetic exercise counts before
  // the user's priorities or invent a movement to hide insufficient equipment.
  for(const role of MAJOR)if(!place(role))throw new PlannerError('COVERAGE_CONFLICT',
    'Não foi possível cobrir '+role+' com esse tempo e equipamento. Confira os equipamentos, amplie a duração ou use a montagem manual.');
  for(const role of priorities)if(!entries.some(e=>e.muscle_group===role)&&!place(role))throw new PlannerError('PRIORITY_CONFLICT',
    'A prioridade '+role+' não cabe com as condições escolhidas. Amplie o tempo, reveja os equipamentos ou redistribua as prioridades; nenhuma ficha foi salva.');
  // Fill the selected split purposefully. Repeated days use catalogue variants,
  // with a preference for exercises already present in the person's own plan.
  for(let di=0;di<days.length;di++){
    if(kinds[di]==='recovery'){
      if(!equipment.has('esteira'))throw new PlannerError('RECOVERY_SCHEDULE','Para sete dias, é preciso reservar recuperação ativa. Escolha até seis dias de força e registre o cardio livre separadamente.');
      entries.push({exercise_name:'Caminhada na esteira',muscle_group:'Cardio',training_day:days[di],sets:1,reps_min:1,reps_max:1,
        rest_seconds:45,suggested_load_kg:0,rir_target:4,notes:'Recuperação ativa: cerca de 8 minutos em ritmo leve, conversável e confortável. Sem meta de carga.'});
      continue;
    }
    for(const role of TEMPLATES[kinds[di]])place(role,di);
  }
  // Allocate remaining room to selected priorities. Targets are conservative
  // starting heuristics, never guarantees of optimal individual stimulus.
  const target=experience==='iniciante'?4:experience==='intermediario'?8:10;
  for(const role of priorities){
    while(entries.filter(e=>e.muscle_group===role).reduce((n,e)=>n+e.sets,0)<target){
      let improved=false;
      for(let i=0;i<entries.length;i++){
        const ex=entries[i];if(ex.muscle_group!==role||ex.sets>=4||role==='Core'&&ex.sets>=2)continue;
        const candidate=entries.map((e,j)=>j===i?{...e,sets:e.sets+1}:e);
        if(fits(candidate)){entries[i]=candidate[i];improved=true;break;}
      }
      if(!improved&&MAJOR.includes(role))improved=place(role,-1,true);
      if(!improved)break;
    }
  }
  const finalOptions={...auditOptions,priorityMuscles:priorities,requireBalancedCoverage:true,requireRecoveryDay:true};
  const audit=auditScientificWorkout(entries,finalOptions);
  if(!audit.ok||!fits(entries)||days.some(day=>!entries.some(e=>e.training_day===day)))
    throw new PlannerError('PLAN_CONFLICT','As condições escolhidas não produziram uma semana recuperável dentro do tempo. Ajuste dias, duração ou prioridades; nenhuma ficha foi salva.');
  const ordered=entries.map((ex,i)=>({ex,i})).sort((a,b)=>days.indexOf(a.ex.training_day)-days.indexOf(b.ex.training_day)
    ||Number(!priorities.includes(a.ex.muscle_group))-Number(!priorities.includes(b.ex.muscle_group))||a.i-b.i).map(x=>x.ex);
  const report=sciencePlanSummary({frequency:days.length,experience},audit);
  const limited=priorities.filter(p=>(audit.directSetsByGroup[p]||0)<target);
  if(limited.length)report.alerts.unshift('Tempo e recuperação limitaram a dose inicial de '+limited.join(', ')+'. A cobertura foi mantida; acompanhe a resposta antes de aumentar o volume.');
  return {name:'FOCO · '+({2:'Corpo inteiro A/B',3:'Corpo inteiro A/B/C',4:'Superior / inferior A/B',5:'Superior / inferior + corpo inteiro',6:'Empurrar / puxar / pernas A/B',7:'Força + recuperação'})[days.length],
    goal,weekly_frequency:days.length,explanation:'Ficha montada pelo motor de regras FOCO, sem chamada à IA. As escolhas consideram dias, tempo, equipamentos, prioridades e exercícios já cadastrados. Mesmas condições geram a mesma proposta. Revise antes de aprovar.',
    exercises:ordered,training_science:report,generation:{method:'rules',version:AUTOMATIC_PLANNER_VERSION,ai_calls:0},
  };
}
