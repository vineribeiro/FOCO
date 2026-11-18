import { catalogExercise } from './trainingCatalog.mjs';
import { assessTrainingSafety, normalizeScienceExercises, auditScientificWorkout, sciencePlanSummary,
  sessionExerciseRange, estimateTrainingSessionMinutes } from './trainingScience.mjs';

export const AUTOMATIC_PLANNER_VERSION = 'foco-rules-2026.4';
// Explicit product requirement; not a universal clinical dose recommendation.
export const MIN_AUTOMATIC_EXERCISES_PER_DAY = 4;
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
const choice = (name, equipment, cue, pattern = name) => ({ name, equipment:equipment.split(','), cue, pattern });
const ROLES = {
  Peitoral:[choice('Supino reto com barra','bar,banco','Mantenha punhos alinhados e amplitude confortável.','horizontal'),choice('Supino reto com halteres','halter,banco','Controle a descida e mantenha apoio estável.','horizontal'),choice('Supino na máquina','maquina','Ajuste o banco e controle a amplitude.','horizontal'),choice('Flexão de braços','corpo','Mantenha o tronco estável e amplitude tolerada.','horizontal'),choice('Supino inclinado com halteres','halter,banco','Use apoio estável e controle a descida.','inclinado'),choice('Crucifixo com halteres','halter,banco','Mantenha leve flexão dos cotovelos e amplitude confortável.','aducao'),choice('Peck deck','maquina','Ajuste os apoios e aproxime os braços sem embalar o tronco.','aducao'),choice('Crossover nas polias','polia','Mantenha o tronco estável e controle a abertura dos braços.','aducao')],
  Costas:[choice('Remada curvada com barra','bar','Mantenha o tronco estável e puxe de forma controlada.'),choice('Puxada frontal na polia','polia','Puxe sem embalar o tronco.'),choice('Remada unilateral com halter','halter,banco','Use apoio estável e controle a descida.'),choice('Remada baixa no cabo','polia','Puxe sem compensar com a lombar.'),choice('Remada invertida','bar','Mantenha alinhamento do tronco e apoio estável.')],
  Quadríceps:[choice('Agachamento livre com barra','bar','Mantenha os pés estáveis e amplitude confortável.'),choice('Agachamento goblet','halter','Mantenha apoio estável e controle a descida.'),choice('Leg press 45 graus','maquina','Mantenha a pelve apoiada e amplitude tolerada.'),choice('Agachamento com peso corporal','corpo','Controle a descida com apoio estável.')],
  Posteriores:[choice('Levantamento terra romeno','bar','Faça a dobradiça do quadril com a coluna estável.'),choice('Stiff com halteres','halter','Recue o quadril e controle a amplitude.'),choice('Mesa flexora','maquina','Ajuste os apoios e evite compensações.'),choice('Ponte de glúteos com pés no chão','corpo','Eleve o quadril com controle e tronco estável.')],
  Glúteos:[choice('Hip thrust com barra','bar,banco','Use apoio estável e evite hiperestender a lombar.'),choice('Hip thrust na máquina','maquina','Ajuste os apoios e controle o movimento.'),choice('Ponte de glúteos','corpo','Eleve o quadril com controle, sem compensar com a lombar.')],
  Ombros:[choice('Desenvolvimento com halteres','halter','Use amplitude confortável e tronco estável.'),choice('Desenvolvimento na máquina','maquina','Ajuste o banco e evite compensações.'),choice('Elevação lateral com halteres','halter','Eleve com controle e amplitude confortável.'),choice('Elevação lateral no cabo','polia','Controle a amplitude sem embalar o tronco.')],
  Bíceps:[choice('Rosca direta com barra reta','bar','Mantenha os cotovelos estáveis e controle a descida.'),choice('Rosca direta com halteres','halter','Evite embalar o tronco.'),choice('Rosca direta na polia com barra reta','polia','Mantenha os cotovelos estáveis.')],
  Tríceps:[choice('Tríceps pulley com corda','polia','Mantenha os cotovelos estáveis.'),choice('Tríceps francês unilateral com halter','halter','Use amplitude confortável e evite compensações.'),choice('Flexão de braços com pegada fechada','corpo','Mantenha o tronco alinhado e amplitude tolerada.')],
  Panturrilhas:[choice('Panturrilha em pé na máquina','maquina','Use apoio estável e controle a subida e a descida.'),choice('Panturrilha em pé com halteres','halter','Mantenha equilíbrio e amplitude confortável.'),choice('Panturrilha em pé unilateral','corpo','Use apoio estável e controle o movimento.')],
  Trapézio:[choice('Encolhimento com halteres','halter','Eleve os ombros com controle, sem projetar a cabeça.'),choice('Encolhimento com barra','bar','Mantenha os braços estáveis e controle o movimento.')],
  Antebraços:[choice('Flexão de punho com halteres','halter','Apoie os antebraços e controle a amplitude.','flexao'),choice('Flexão de punho com barra','bar','Use apoio estável e amplitude confortável.','flexao'),choice('Flexão de punho na polia','polia','Apoie os antebraços e mantenha os cotovelos estáveis.','flexao'),choice('Extensão de punho com halteres','halter','Apoie os antebraços e eleve o dorso das mãos com controle.','extensao'),choice('Extensão de punho com barra','bar','Apoie os antebraços e use amplitude confortável.','extensao'),choice('Extensão de punho na polia','polia','Mantenha o apoio dos antebraços e controle o retorno.','extensao')],
  Lombar:[choice('Bird dog','corpo','Estenda membros alternados com o tronco estável e respiração livre.')],
  Adutores:[choice('Adução de quadril na máquina','maquina','Controle o retorno com amplitude confortável.'),choice('Adução de quadril deitado de lado','corpo','Mantenha o tronco estável e controle o movimento.')],
  Abdutores:[choice('Abdução de quadril na máquina','maquina','Use amplitude confortável e controle o retorno.'),choice('Abdução de quadril deitado de lado','corpo','Mantenha a pelve estável e controle a amplitude.')],
  Core:[choice('Abdominal reverso','corpo','Controle a elevação da pelve sem embalar as pernas.'),choice('Abdominal crunch','corpo','Controle o movimento sem puxar o pescoço.'),choice('Dead bug','corpo','Mantenha a lombar confortável e respire durante o movimento.')],
};
const MAJOR=['Peitoral','Costas','Quadríceps','Posteriores'];
const WEEKDAYS=['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
const BALANCED=['Peitoral','Costas','Quadríceps','Posteriores','Glúteos','Ombros','Bíceps','Tríceps','Panturrilhas','Core'];
const TEMPLATES={
  full:['Peitoral','Costas','Quadríceps','Posteriores','Panturrilhas','Core','Ombros','Glúteos','Bíceps','Tríceps','Trapézio','Antebraços','Lombar','Adutores','Abdutores'],
  upper:['Peitoral','Costas','Ombros','Bíceps','Tríceps','Trapézio','Antebraços'],
  lower:['Quadríceps','Posteriores','Panturrilhas','Glúteos','Core','Adutores','Abdutores','Lombar'],
  push:['Peitoral','Ombros','Tríceps'],
  pull:['Costas','Bíceps','Trapézio','Antebraços'],
  accessory:['Core','Antebraços','Lombar'],
};
// Calendar policy for NEW automatic proposals only. One full calendar day
// separates targeted work, including compound synergists and the week boundary.
// Stabilizer recruitment is not treated as a dedicated training session.
const SYNERGISTS=new Set(['Peitoral','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posteriores','Glúteos','Panturrilhas']);
function exposure(ex) {
  const c=catalogExercise(ex.exercise_name);
  const direct=new Set(c?.primary || [ex.muscle_group]);
  const secondary=new Set((c?.secondary || []).filter(g=>SYNERGISTS.has(g)&&!direct.has(g)));
  if (/agachamento|leg press/i.test(ex.exercise_name)&&direct.has('Quadríceps')) secondary.add('Glúteos');
  return {direct,secondary};
}
export function auditAutomaticRecovery(exercises) {
  const byDay=Object.fromEntries(WEEKDAYS.map(d=>[d,{}]));
  for(const ex of exercises){
    if(!byDay[ex.training_day])return {ok:false,issue:'Dia inválido na revisão de recuperação.'};
    const {direct,secondary}=exposure(ex);
    for(const group of new Set([...direct,...secondary])){
      const dose=byDay[ex.training_day][group] ||= {direct:0,indirect:0};
      dose[direct.has(group)?'direct':'indirect']+=Number(ex.sets);
    }
  }
  const conflicts=[];
  for(let i=0;i<7;i++){
    const a=WEEKDAYS[i],b=WEEKDAYS[(i+1)%7];
    for(const group of Object.keys(byDay[a])){
      const x=byDay[a][group],y=byDay[b][group];if(!y)continue;
      // 0.5 is a planning estimate, not a measured biological equivalent.
      if(x.direct&&y.direct || x.direct&&y.indirect || x.indirect&&y.direct || x.indirect*.5>=2&&y.indirect*.5>=2)
        conflicts.push({group,days:[a,b]});
    }
  }
  return {ok:conflicts.length===0,conflicts,exposureByDay:byDay,
    issue:conflicts.length?'Sem um dia completo de intervalo para '+conflicts.map(c=>c.group+' ('+c.days.join('/')+')').join(', ')+'.':null};
}
function goalProfile(goal,experience) {
  const n=normalize(goal),novice=experience==='iniciante',advanced=experience==='avancado';
  if(/forca|powerbuilding|cargas/.test(n))return {id:'strength',label:'Força e técnica',sets:novice?2:3,reps:novice?[6,10]:[4,6],accessory:[8,12],rest:novice?180:240,accessoryRest:90,rir:novice?4:3,target:novice?6:10};
  if(/resistencia|condicionamento/.test(n))return {id:'endurance',label:'Resistência muscular',sets:2,reps:[15,20],accessory:[15,20],rest:120,accessoryRest:60,rir:novice?4:3,target:novice?6:10};
  if(/saude|qualidade de vida/.test(n))return {id:'health',label:'Saúde e consistência',sets:2,reps:[10,15],accessory:[12,15],rest:120,accessoryRest:60,rir:novice?4:3,target:novice?6:8};
  if(/emagrec|definicao/.test(n))return {id:'fat-loss',label:'Preservação de força e massa',sets:novice?2:3,reps:[6,10],accessory:[10,15],rest:150,accessoryRest:75,rir:novice?3:2,target:novice?6:10};
  if(/recompos/.test(n))return {id:'recomposition',label:'Força e hipertrofia',sets:novice?2:3,reps:[8,12],accessory:[12,15],rest:150,accessoryRest:75,rir:novice?3:2,target:novice?8:12};
  return {id:'hypertrophy',label:'Hipertrofia',sets:novice?2:3,reps:[8,12],accessory:[10,15],rest:120,accessoryRest:75,rir:novice?3:2,target:novice?8:advanced?16:12};
}
function scheduleCandidates(available) {
  const count=available.length;
  const gaps=available.map((d,i)=>(WEEKDAYS.indexOf(available[(i+1)%count])-WEEKDAYS.indexOf(d)+7)%7);
  const separated=gaps.every(g=>g>=2);
  const kinds=count<=3&&separated?available.map(()=>'full'):
    ({2:['upper','lower'],3:['push','pull','lower'],4:['upper','lower','upper','lower'],
      5:['upper','lower','push','pull','lower'],6:['push','pull','lower','push','pull','lower'],
      7:['push','pull','lower','push','pull','lower','accessory']})[count];
  return [{days:available,kinds}];
}
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
  priorityMuscles=/** @type {string[]} */([]), equipmentAvailable='', restrictions='', preferences='', previousExercises=/** @type {(string|{exercise_name:string})[]} */([]), previousGoal='', excludedExercises=/** @type {string[]} */([]) }={}) {
  if(!Array.isArray(days)||days.length<2||days.length>7||new Set(days).size!==days.length||days.some(d=>!WEEKDAYS.includes(d)))
    throw new PlannerError('SCHEDULE_INVALID','Escolha de 2 a 7 dias diferentes para treinar na semana.');
  if(!['iniciante','intermediario','avancado'].includes(experience)||!Number.isFinite(sessionMinutes)||sessionMinutes<20||sessionMinutes>180)
    throw new PlannerError('PROFILE_INVALID','Confira experiência e duração da sessão, entre 20 e 180 minutos.');
  const safety=assessTrainingSafety({notes:restrictions,consent:true});
  if(safety.acuteRedFlag)throw new PlannerError('CLINICAL_REVIEW','Há um sinal de alerta informado. Interrompa o treino e procure avaliação clínica antes de montar uma ficha.');
  if(safety.highRisk||!benign(restrictions))throw new PlannerError('RESTRICTION_REVIEW','As restrições informadas precisam de avaliação individual. Use a montagem manual com orientação profissional; o gerador não vai ignorar essas condições.');
  if(!benign(preferences))throw new PlannerError('PREFERENCE_REVIEW','Há preferências livres na anamnese que precisam ser conferidas. Revise-as na anamnese ou use a montagem manual para preservar suas escolhas.');
  const unsupported=priorityMuscles.filter(value=>normalize(value)&&!key(value)&&!['corpo inteiro','equilibrio global','corpo inteiro com distribuicao equilibrada'].includes(normalize(value)));
  if(unsupported.length)throw new PlannerError('PRIORITY_UNSUPPORTED','Confira os nomes dos grupos prioritários: '+unsupported.join(', ')+'.');
  const selected=[...new Set(priorityMuscles.map(key).filter(Boolean))];
  const balanced=selected.length===0||selected.length===BALANCED.length&&BALANCED.every(group=>selected.includes(group));
  const priorities=balanced?[]:selected;
  if(excludedExercises.some(name=>!catalogExercise(name)))throw new PlannerError('EXCLUSION_UNKNOWN','Selecione os exercícios a evitar usando os nomes completos do catálogo.');
  const equipment=plannerEquipment(equipmentAvailable), excluded=new Set(excludedExercises.map(normalize));
  const profile=goalProfile(goal,experience);
  const history=new Set(goalProfile(previousGoal,experience).id===profile.id?previousExercises.map(ex=>normalize(typeof ex==='string'?ex:ex.exercise_name)):[]);
  const available=WEEKDAYS.filter(d=>days.includes(d)),max=Math.max(MIN_AUTOMATIC_EXERCISES_PER_DAY,sessionExerciseRange(sessionMinutes).max);
  // Frequency is an explicit user choice. Distribute the weekly dose across
  // every selected day; reject a conflict instead of silently dropping sessions.
  let lastIssue='Tempo insuficiente para cobrir os padrões e prioridades.';
  for(const schedule of scheduleCandidates(available)){
    const trainingDays=schedule.days,kinds=schedule.kinds,entries=[];
    let reservingMinimum=true;
    const auditOptions={days:trainingDays,experience,sessionMinutes,enforceExerciseRange:false,countCatalogPrimary:true};
    const fits=items=>trainingDays.every(day=>{
      const daily=items.filter(ex=>ex.training_day===day);
      // Reserve the minimum time for missing movements before adding sets.
      // One set + transition costs at least 2.5 minutes in the shared estimate.
      const reservedMinutes=Math.max(0,MIN_AUTOMATIC_EXERCISES_PER_DAY-daily.length)*2.5;
      return daily.length<=max&&estimateTrainingSessionMinutes(daily)+reservedMinutes<=sessionMinutes;
    })&&auditAutomaticRecovery(items).ok&&auditScientificWorkout(items,auditOptions).ok;
    const eligible=(role,di)=>ROLES[role].filter(c=>c.equipment.every(tag=>equipment.has(tag))&&!excluded.has(normalize(c.name)))
      .map((c,i)=>{
        const stable=c.equipment.some(tag=>tag==='maquina'||tag==='polia')||/goblet|dead bug/.test(normalize(c.name));
        const bar=/com barra|terra romeno/.test(c.name);
        // Goal/level choices outrank continuity; history is only a tie-breaker.
        const preferred=profile.id==='strength'?bar:experience==='iniciante'||profile.id==='health'||profile.id==='endurance'?stable:false;
        return {...c,rank:(preferred?0:20)+(history.has(normalize(c.name))?0:8)+((i-Math.floor(di/2)+ROLES[role].length)%ROLES[role].length)};
      }).sort((a,b)=>a.rank-b.rank);
    const make=(choice,role,di,sets)=>{
      const compound=MAJOR.includes(role)||role==='Glúteos';
      const reps=role==='Core'?[10,15]:compound?profile.reps:profile.accessory;
      return normalizeScienceExercises([{exercise_name:choice.name,muscle_group:role,training_day:trainingDays[di],sets,
        reps_min:reps[0],reps_max:reps[1],rest_seconds:role==='Core'?60:compound?profile.rest:profile.accessoryRest,
        rir_target:profile.rir,suggested_load_kg:0,notes:choice.cue}],{experience})[0];
    };
    const place=(role,onlyDay=-1,allowAdditional=false)=>{
      const ranked=trainingDays.map((day,di)=>({di,count:entries.filter(e=>e.training_day===day).length}))
        .filter(({di})=>(onlyDay<0||di===onlyDay)&&TEMPLATES[kinds[di]].includes(role))
        .sort((a,b)=>a.count-b.count||a.di-b.di);
      for(const {di} of ranked){
        const sameRole=entries.filter(e=>e.training_day===trainingDays[di]&&e.muscle_group===role);
        if(sameRole.length&&(!allowAdditional||sameRole.length>=2))continue;
        const usedPatterns=new Set(sameRole.map(e=>ROLES[role].find(c=>c.name===e.exercise_name)?.pattern));
        const choices=eligible(role,di).sort((a,b)=>Number(usedPatterns.has(a.pattern))-Number(usedPatterns.has(b.pattern))||a.rank-b.rank);
        for(const c of choices){
          if(entries.some(e=>e.training_day===trainingDays[di]&&normalize(e.exercise_name)===normalize(c.name)))continue;
          if(!catalogExercise(c.name)?.primary.includes(role))continue;
          for(const count of reservingMinimum?[1]:[...new Set([role==='Core'?2:profile.sets,2,1])]){
            const ex=make(c,role,di,count);
            if(fits([...entries,ex])){entries.push(ex);return true;}
          }
        }
      }
      return false;
    };
    const coverage=()=>new Set(entries.flatMap(ex=>{
      const catalog=catalogExercise(ex.exercise_name);return [...catalog.primary,...catalog.secondary];
    }));
    let failed=false;
    // Reserve major patterns and chosen priorities before spending room on extras.
    for(const role of [...new Set([...MAJOR,...priorities])]){
      if(priorities.includes(role)&&!MAJOR.includes(role)&&entries.some(e=>exposure(e).direct.has(role)))continue;
      if(!place(role)){lastIssue='Não foi possível reservar '+role+' no tempo e equipamento disponíveis.';failed=true;break;}
    }
    if(failed)continue;
    // Dedicated calves and core are not covered by a squat/row stabilizer label.
    for(const role of ['Panturrilhas','Core'])if(!entries.some(e=>exposure(e).direct.has(role)))place(role);
    // Complete the most constrained sessions first (notably the seventh day),
    // before neighboring days spend their recovery slots on optional core work.
    const minimumOrder=trainingDays.map((_,di)=>di).sort((a,b)=>TEMPLATES[kinds[a]].length-TEMPLATES[kinds[b]].length||a-b);
    for(const di of minimumOrder){
      const daily=()=>entries.filter(e=>e.training_day===trainingDays[di]);
      for(const role of TEMPLATES[kinds[di]]){
        if(daily().length>=MIN_AUTOMATIC_EXERCISES_PER_DAY)break;
        place(role,di);
      }
      // Distinct movements may share a muscle group. This fills a push day
      // without inventing a fourth muscle or using a duplicate exercise.
      for(const role of TEMPLATES[kinds[di]]){
        if(daily().length>=MIN_AUTOMATIC_EXERCISES_PER_DAY)break;
        place(role,di,true);
      }
      if(daily().length<MIN_AUTOMATIC_EXERCISES_PER_DAY){
        lastIssue='Não foi possível montar pelo menos quatro exercícios distintos em '+trainingDays[di]+' respeitando tempo, equipamentos, volume e recuperação.';
        failed=true;break;
      }
    }
    if(failed)continue;
    reservingMinimum=false;
    // Start with one set per reserved movement, then grow toward the goal/level
    // dose. Earlier greedy three-set choices must not starve a fourth movement.
    let raised=true;
    while(raised){
      raised=false;
      const indices=entries.map((e,i)=>({e,i})).sort((a,b)=>Number(!priorities.includes(a.e.muscle_group))-Number(!priorities.includes(b.e.muscle_group))||a.e.sets-b.e.sets||a.i-b.i);
      for(const {i} of indices){
        if(entries[i].sets>=(entries[i].muscle_group==='Core'?2:profile.sets))continue;
        const candidate=entries.map((e,j)=>j===i?{...e,sets:e.sets+1}:e);
        if(fits(candidate)){entries[i]=candidate[i];raised=true;}
      }
    }
    // Allocate focus dose BEFORE generic filling. Round-robin avoids starving a
    // later priority; caps and time can still limit the requested emphasis.
    let improved=true;
    while(improved){
      improved=false;
      for(const role of priorities){
        const total=entries.filter(e=>exposure(e).direct.has(role)).reduce((n,e)=>n+e.sets,0);
        if(total>=profile.target)continue;
        const indices=entries.map((e,i)=>({e,i})).filter(({e})=>exposure(e).direct.has(role)&&e.sets<(role==='Core'?2:4)).sort((a,b)=>a.e.sets-b.e.sets);
        for(const {i} of indices){const candidate=entries.map((e,j)=>j===i?{...e,sets:e.sets+1}:e);
          if(fits(candidate)){entries[i]=candidate[i];improved=true;break;}}
        if(total<profile.target&&place(role))improved=true;
      }
    }
    // Balance major exposure across eligible days, then cover useful accessories.
    for(let di=0;di<trainingDays.length;di++){
      for(const role of TEMPLATES[kinds[di]].filter(r=>MAJOR.includes(r)))place(role,di);
    }
    for(const role of ['Panturrilhas','Core','Ombros','Glúteos','Bíceps','Tríceps']){
      if(!coverage().has(role))place(role);
    }
    for(let di=0;di<trainingDays.length;di++){
      for(const role of TEMPLATES[kinds[di]].filter(r=>['Panturrilhas','Core','Ombros','Bíceps','Tríceps'].includes(r)))place(role,di);
    }
    const audit=auditScientificWorkout(entries,{...auditOptions,priorityMuscles:balanced?BALANCED:priorities,requireBalancedCoverage:true});
    if(!audit.ok||!fits(entries)||trainingDays.some(day=>entries.filter(ex=>ex.training_day===day).length<MIN_AUTOMATIC_EXERCISES_PER_DAY)){lastIssue=audit.issue||'A combinação não respeita o mínimo de quatro exercícios e a recuperação.';continue;}
    const report=sciencePlanSummary({frequency:trainingDays.length,experience},audit);
    report.recovery='Um dia completo sem trabalho direcionado do mesmo grupo entre sessões, incluindo sinergistas relevantes e domingo/segunda. É uma regra conservadora de calendário: horários reais e recuperação individual precisam ser acompanhados.';
    report.split_rationale=profile.label+': '+trainingDays.length+' sessões nos '+available.length+' dias escolhidos. '+(kinds[0]==='full'?'Corpo inteiro em dias intercalados.':kinds[0]==='push'?'Empurrar, puxar e pernas, com sinergias conferidas.':'Divisão de superiores/inferiores e padrões de movimento.');
    if(trainingDays.length===7)report.alerts.unshift('Sete sessões com volume semanal distribuído: o último dia concentra core e acessórios com dose reduzida, enquanto os outros grupos recuperam. Não é uma sétima sessão pesada de corpo inteiro.');
    if(priorities.some(p=>(audit.directSetsByGroup[p]||0)<profile.target))report.alerts.unshift('Tempo e recuperação limitaram a dose de algumas prioridades; confira as séries por grupo antes de aprovar.');
    if(profile.id==='fat-loss')report.alerts.unshift('A musculação preserva força e massa; repetições altas não garantem emagrecimento. Cardio pode ser registrado separadamente conforme tolerância.');
    const ordered=entries.map((ex,i)=>({ex,i})).sort((a,b)=>trainingDays.indexOf(a.ex.training_day)-trainingDays.indexOf(b.ex.training_day)||Number(!priorities.includes(a.ex.muscle_group))-Number(!priorities.includes(b.ex.muscle_group))||a.i-b.i).map(x=>x.ex);
    return {name:'FOCO · '+profile.label+' · '+trainingDays.length+' dias',goal,weekly_frequency:trainingDays.length,
      explanation:report.split_rationale+' Cada sessão tem pelo menos quatro exercícios distintos. Objetivo e nível definem repetições, séries, pausas e escolhas. A ficha ativa só muda após sua aprovação.',
      exercises:ordered,training_science:report,generation:{method:'rules',version:AUTOMATIC_PLANNER_VERSION,ai_calls:0},
      planning:{available_days:available,strength_days:trainingDays,recovery_days:WEEKDAYS.filter(d=>!trainingDays.includes(d)),
        goal_profile:profile.id,priority_mode:balanced?'balanced':'focused',priorities,
        recovery_policy:'full-calendar-day',session_focus:Object.fromEntries(trainingDays.map((d,i)=>[d,kinds[i]==='accessory'?'Core e acessórios · dose reduzida':kinds[i]==='push'?'Empurrar':kinds[i]==='pull'?'Puxar':kinds[i]==='lower'?'Inferiores':kinds[i]==='upper'?'Superiores':'Corpo inteiro'])),reason:'Todos os dias escolhidos têm sessão. A recuperação acontece por grupo muscular, com volume distribuído e um dia completo entre estímulos direcionados do mesmo grupo.'}};
  }
  throw new PlannerError('COVERAGE_CONFLICT',lastIssue+' Amplie a duração, redistribua os dias ou reveja equipamentos/prioridades; a frequência escolhida foi mantida. Nenhuma ficha foi salva.');
}
