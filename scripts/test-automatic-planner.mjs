import assert from 'node:assert/strict';
import {buildAutomaticWorkout,PlannerError,plannerEquipment} from '../supabase/functions/foco-api/automaticPlanner.mjs';
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
  for(const day of input.days){const daily=plan.exercises.filter(ex=>ex.training_day===day);
   assert.ok(daily.length>0);assert.ok(daily.length<=sessionExerciseRange(sessionMinutes).max);
   assert.ok(estimateTrainingSessionMinutes(daily)<=sessionMinutes,'Time is a hard cap, not an estimate allowed to overflow');
   assert.equal(new Set(daily.map(e=>e.exercise_name)).size,daily.length);
  }
  for(const ex of plan.exercises){assert.ok(catalogExercise(ex.exercise_name)?.primary.includes(ex.muscle_group));assert.equal(ex.suggested_load_kg,0);}
  for(const role of priorityMuscles)assert.ok(plan.training_science.direct_sets_by_group[role]>0,'Priorities must have dedicated work');
  assert.ok(auditScientificWorkout(plan.exercises,{...input,enforceExerciseRange:false,requireBalancedCoverage:true,requireRecoveryDay:true}).ok);
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
