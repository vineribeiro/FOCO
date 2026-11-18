import assert from 'node:assert/strict';
import {buildAutomaticWorkout,PlannerError,plannerEquipment,auditAutomaticRecovery,MIN_AUTOMATIC_EXERCISES_PER_DAY} from '../supabase/functions/foco-api/automaticPlanner.mjs';
import {auditScientificWorkout,estimateTrainingSessionMinutes,sessionExerciseRange} from '../supabase/functions/foco-api/trainingScience.mjs';
import {catalogExercise} from '../supabase/functions/foco-api/trainingCatalog.mjs';
const weekdays=['segunda','terca','quarta','quinta','sexta','sabado','domingo'];
const priorities=['Peitoral','Costas','Quadríceps','Posteriores','Glúteos','Ombros','Bíceps','Tríceps','Panturrilhas','Core'];
let passed=0,conflicts=0;
const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Rules must never call a provider or network');};
for(const experience of ['iniciante','intermediario','avancado'])for(let frequency=2;frequency<=7;frequency++)for(const sessionMinutes of [20,30,45,60,75,90])for(const priorityMuscles of [[],['Costas','Panturrilhas'],priorities]){
 const input={days:weekdays.slice(0,frequency),experience,sessionMinutes,priorityMuscles,equipmentAvailable:'Academia completa'};
 try{
  const plan=buildAutomaticWorkout(input);
  assert.deepEqual(plan,buildAutomaticWorkout(input),'Same context must produce exactly the same proposal');
  assert.equal(plan.generation.ai_calls,0);assert.equal(plan.generation.method,'rules');assert.equal(plan.ai_generation,undefined);
  for(const day of plan.planning.strength_days){const daily=plan.exercises.filter(ex=>ex.training_day===day);
   assert.ok(daily.length>=4,'Every chosen day must contain at least four distinct exercises');assert.ok(daily.length<=Math.max(MIN_AUTOMATIC_EXERCISES_PER_DAY,sessionExerciseRange(sessionMinutes).max));
   assert.ok(estimateTrainingSessionMinutes(daily)<=sessionMinutes,'Time is a hard cap, not an estimate allowed to overflow');
   assert.equal(new Set(daily.map(e=>e.exercise_name)).size,daily.length);
  }
  for(const ex of plan.exercises){assert.ok(catalogExercise(ex.exercise_name)?.primary.includes(ex.muscle_group));assert.equal(ex.suggested_load_kg,0);}
  for(const role of priorityMuscles)assert.ok(plan.training_science.estimated_effective_sets_by_group[role]>0,'Every selection must be covered, including all-groups balance');
  assert.ok(auditAutomaticRecovery(plan.exercises).ok,'No adjacent-day overlap, including compound synergists and week wrap');
  assert.equal(plan.weekly_frequency,input.days.length,'Never reduce the chosen frequency');
  assert.equal(plan.weekly_frequency,plan.planning.strength_days.length);
  assert.ok(plan.planning.strength_days.every(day=>input.days.includes(day)));
  assert.equal(plan.planning.recovery_days.length+plan.weekly_frequency,7);
  assert.ok(auditScientificWorkout(plan.exercises,{...input,days:plan.planning.strength_days,enforceExerciseRange:false,countCatalogPrimary:true,requireBalancedCoverage:true}).ok);
  passed++;
 }catch(error){
  if(!(error instanceof PlannerError))throw error;
  assert.ok(sessionMinutes<=30,'Ordinary full-gym sessions must be feasible: '+JSON.stringify(input)+' '+error.message);conflicts++;
 }
}
globalThis.fetch=originalFetch;
const standard={days:['segunda','terca','quinta','sexta'],sessionMinutes:60,experience:'intermediario',priorityMuscles:['Panturrilhas']};
const dumbbells=buildAutomaticWorkout({...standard,equipmentAvailable:'Halteres e banco'});
assert.ok(dumbbells.exercises.every(e=>!/barra|polia|maquina|leg press/i.test(e.exercise_name)),'Never invent equipment');
const excluded='Panturrilha em pé na máquina';
const alternative=buildAutomaticWorkout({...standard,equipmentAvailable:'Academia completa',excludedExercises:[excluded]});
assert.ok(alternative.exercises.every(e=>e.exercise_name!==excluded));
assert.ok(alternative.exercises.some(e=>e.muscle_group==='Panturrilhas'));
assert.throws(()=>buildAutomaticWorkout({...standard,equipmentAvailable:'Peso corporal'}),e=>e.code==='COVERAGE_CONFLICT');
assert.throws(()=>buildAutomaticWorkout({...standard,equipmentAvailable:'Academia completa',restrictions:'Dor no joelho ao agachar'}),e=>e.code==='RESTRICTION_REVIEW');
assert.throws(()=>buildAutomaticWorkout({...standard,equipmentAvailable:'Academia completa',restrictions:'Sem dor no peito; urina escura'}),e=>e.code==='CLINICAL_REVIEW');
assert.throws(()=>buildAutomaticWorkout({...standard,equipmentAvailable:'Academia completa',preferences:'Evitar agachamento'}),e=>e.code==='PREFERENCE_REVIEW');
assert.equal(plannerEquipment('Academia completa sem barras').has('bar'),false);
console.log(`AUTOMATIC PLANNER: ${passed} validated contexts, ${conflicts} explicit short-session conflicts; zero inference calls.`);

const allDays={days:weekdays,sessionMinutes:40,experience:'iniciante',equipmentAvailable:'Academia completa',priorityMuscles:priorities};
const health=buildAutomaticWorkout({...allDays,goal:'Saúde e qualidade de vida'});
assert.deepEqual(health.planning.strength_days,weekdays);
assert.equal(health.weekly_frequency,7);assert.equal(health.planning.priority_mode,'balanced');
for(const day of weekdays)assert.ok(health.exercises.filter(ex=>ex.training_day===day).length>=4,'Screenshot context: all seven days must have at least four exercises, including Sunday');
assert.ok(health.exercises.every(e=>e.muscle_group!=='Cardio'),'Recovery must not become a fictitious resistance exercise');
const signature=p=>JSON.stringify(p.exercises.map(({notes,...ex})=>ex));
const goals=['Saúde e qualidade de vida','Hipertrofia Máxima','Força Pura & Cargas','Definição & Emagrecimento','Recomposição corporal','Condicionamento & Resistência'];
const goalPlans=goals.map(goal=>buildAutomaticWorkout({...allDays,goal}));
assert.equal(new Set(goalPlans.map(signature)).size,goals.length,'Goals must change the prescription, not just its title');
for(let i=0;i<goals.length;i++)assert.equal(signature(buildAutomaticWorkout({...allDays,goal:goals[i],previousGoal:'Saúde e qualidade de vida',previousExercises:health.exercises})),signature(goalPlans[i]),'Old goal cannot override the selected goal');
const balanced=buildAutomaticWorkout({...standard,equipmentAvailable:'Academia completa',priorityMuscles:[]});
const focused=buildAutomaticWorkout({...standard,equipmentAvailable:'Academia completa',priorityMuscles:['Bíceps']});
assert.ok((focused.training_science.direct_sets_by_group['Bíceps']||0)>(balanced.training_science.direct_sets_by_group['Bíceps']||0),'Focus must redistribute direct dose');
assert.notEqual(signature(buildAutomaticWorkout({...standard,sessionMinutes:30,equipmentAvailable:'Academia completa'})),signature(alternative),'Session length must change the actual prescription');
assert.equal(buildAutomaticWorkout({...allDays,days:['sexta','sabado'],priorityMuscles:[]}).weekly_frequency,2,'Consecutive availability can use upper/lower');
const movement=(exercise_name,training_day,sets=2)=>({exercise_name,training_day,sets,muscle_group:catalogExercise(exercise_name).primary[0]});
assert.equal(auditAutomaticRecovery([movement('Supino reto com barra','domingo'),movement('Tríceps pulley com corda','segunda')]).ok,false,'Sunday press must block Monday triceps');
assert.equal(auditAutomaticRecovery([movement('Levantamento terra romeno','terca'),movement('Hip thrust com barra','quarta')]).ok,false,'Co-primary glutes must count');
assert.equal(auditAutomaticRecovery([movement('Agachamento livre com barra','terca'),movement('Hip thrust com barra','quarta')]).ok,false,'Squat hip extensors must count');
assert.equal(auditAutomaticRecovery([movement('Supino reto com barra','segunda'),movement('Abdominal crunch','terca')]).ok,true,'Incidental trunk stabilization is not a dedicated core session');
assert.equal(auditAutomaticRecovery([movement('Supino reto com barra','domingo'),movement('Tríceps pulley com corda','terca')]).ok,true);
// Every subset of available weekdays: no solution is accepted by relaxing the
// calendar; all ordinary 45-minute full-gym contexts must remain usable.
for(let mask=1;mask<128;mask++){
 const days=weekdays.filter((_,i)=>mask&(1<<i));if(days.length<2)continue;
 for(const experience of ['iniciante','intermediario','avancado']){
  const p=buildAutomaticWorkout({days,experience,sessionMinutes:45,equipmentAvailable:'Academia completa'});
  assert.equal(p.weekly_frequency,days.length);assert.ok(auditAutomaticRecovery(p.exercises).ok);assert.ok(p.exercises.every(e=>days.includes(e.training_day)));
  for(const day of days)assert.ok(p.exercises.filter(ex=>ex.training_day===day).length>=4);
 }
}
console.log('PASS: screenshot reproduction, six distinct goal prescriptions, focus dose, duration, every calendar subset, direct/indirect recovery and Sunday/Monday.');

for(const equipmentAvailable of ['Máquinas e polias','Barras e banco','Academia completa sem halteres','Academia completa sem barras']){
 const p=buildAutomaticWorkout({...standard,equipmentAvailable,priorityMuscles:priorities,sessionMinutes:45});
 assert.ok(auditAutomaticRecovery(p.exercises).ok);
 assert.ok(p.exercises.some(e=>e.muscle_group==='Panturrilhas'),'Hamstring-curl secondary recruitment must not replace dedicated calf work');
}

let goalContexts=0;
for(const goal of goals)for(const experience of ['iniciante','intermediario','avancado'])for(let frequency=2;frequency<=7;frequency++)for(const sessionMinutes of [20,30,40,60]){
 const p=buildAutomaticWorkout({goal,experience,days:weekdays.slice(0,frequency),sessionMinutes,equipmentAvailable:'Academia completa'});
 for(const day of p.planning.strength_days){
  const daily=p.exercises.filter(ex=>ex.training_day===day);
  assert.ok(daily.length>=4);assert.equal(new Set(daily.map(ex=>ex.exercise_name)).size,daily.length);
  assert.ok(estimateTrainingSessionMinutes(daily)<=sessionMinutes);
 }
 assert.ok(auditAutomaticRecovery(p.exercises).ok);goalContexts++;
}
for(const equipmentAvailable of ['Máquinas e polias','Halteres e banco','Academia completa sem halteres','Academia completa sem barras']){
 const p=buildAutomaticWorkout({...allDays,equipmentAvailable});
 for(const day of weekdays)assert.ok(p.exercises.filter(ex=>ex.training_day===day).length>=4,'Equipment changes must preserve the minimum, including the accessory day');
 assert.ok(auditAutomaticRecovery(p.exercises).ok);
}
// Only one eligible chest, shoulder and triceps movement: a push day cannot
// reach four. Reject explicitly rather than duplicate a name or drop the day.
assert.throws(()=>buildAutomaticWorkout({days:weekdays.slice(0,3),sessionMinutes:45,equipmentAvailable:'Academia completa',excludedExercises:[
 'Supino reto com halteres','Supino na máquina','Flexão de braços','Supino inclinado com halteres','Crucifixo com halteres','Peck deck','Crossover nas polias',
 'Desenvolvimento na máquina','Elevação lateral com halteres','Elevação lateral no cabo','Tríceps francês unilateral com halter','Flexão de braços com pegada fechada',
]}),error=>error instanceof PlannerError&&error.code==='COVERAGE_CONFLICT'&&/quatro exercícios distintos/.test(error.message)&&/Nenhuma ficha foi salva/.test(error.message));
console.log(`PASS: four-exercise minimum across ${goalContexts} goal/level/frequency/duration contexts, alternative equipment and explicit unsatisfied-minimum conflict.`);
