import assert from 'node:assert/strict';
import {beginWorkoutReplacement,readWorkoutReplacement,clearWorkoutReplacement,replacementOriginal,buildWorkoutReplacement} from '../src/utils/workoutReplacement';
import type {WorkoutPlan} from '../src/types';

const plan:WorkoutPlan={id:'plan-a',user_id:'owner-a',name:'Ficha de teste',version:3,goal:'Hipertrofia',weekly_frequency:2,status:'ativo',created_at:'2026-11-18',
  exercises:['segunda','quinta'].flatMap(day=>['Supino reto com barra','Puxada frontal na polia','Agachamento goblet','Panturrilha em pé unilateral'].map((exercise_name,i)=>({
    id:day+'-'+i,plan_id:'plan-a',position:i,exercise_name,repdb_id:i===0?'bench-press':null,muscle_group:i===0?'Peitoral':'Geral',training_day:day as 'segunda'|'quinta',
    sets:3,reps_min:8,reps_max:12,rest_seconds:120,suggested_load_kg:40,rir_target:3,notes:'Orientação do movimento original.'}))) };
const before=structuredClone(plan);
assert.throws(()=>beginWorkoutReplacement('other-owner',plan,'segunda-0'));
assert.throws(()=>beginWorkoutReplacement('owner-a',{...plan,status:'inativo'},'segunda-0'));
assert.throws(()=>beginWorkoutReplacement('owner-a',plan,'missing'));
beginWorkoutReplacement('owner-a',plan,'segunda-0');
assert.equal(readWorkoutReplacement('other-owner'),null,'Cross-account reads clear the navigation intent');
assert.equal(readWorkoutReplacement('owner-a'),null);
beginWorkoutReplacement('owner-a',plan,'segunda-0');
const intent=readWorkoutReplacement('owner-a')!;
assert.equal(replacementOriginal(plan,intent,'owner-a')?.id,'segunda-0');
assert.equal(replacementOriginal(plan,intent,'other-owner'),null);
const movement={exercise_name:'Abdominal bicicleta',muscle_group:'Core',repdb_id:'bicycle-crunch'};
const result=buildWorkoutReplacement(plan,intent,'owner-a',movement);
assert.equal(result.version,4);assert.equal(result.status,'ativo');assert.equal(result.exercises.length,8);
assert.equal(result.exercises.filter(ex=>ex.training_day==='segunda').length,4);
const {id:_targetId,plan_id:_targetPlan,...originalPrescription}=plan.exercises![0];
assert.deepEqual(result.exercises[0],{...originalPrescription,...movement,suggested_load_kg:0,notes:''},'Only the selected movement changes, its load resets and old cues are not copied');
for(let i=1;i<result.exercises.length;i++){
  const {id:_id,plan_id:_planId,...prescription}=plan.exercises![i];assert.deepEqual(result.exercises[i],prescription);
}
assert.deepEqual(plan,before,'Building a replacement cannot mutate the active plan or its history');
assert.throws(()=>buildWorkoutReplacement({...plan,name:'Changed elsewhere'},intent,'owner-a',movement),/mudou/);
assert.throws(()=>buildWorkoutReplacement({...plan,exercises:plan.exercises!.map((ex,i)=>i===4?{...ex,sets:4}:ex)},intent,'owner-a',movement),/mudou/);
assert.throws(()=>buildWorkoutReplacement(plan,intent,'other-owner',movement),/mudou/);
assert.throws(()=>buildWorkoutReplacement(plan,{...intent,expiresAt:Date.now()-1},'owner-a',movement),/expirou/);
assert.throws(()=>buildWorkoutReplacement(plan,intent,'owner-a',{...movement,exercise_name:'Puxada frontal na polia'}),/já está/);
assert.throws(()=>buildWorkoutReplacement(plan,intent,'owner-a',{...movement,repdb_id:'bench-press'}),/diferente/);
assert.throws(()=>buildWorkoutReplacement(plan,intent,'owner-a',{...movement,repdb_id:null}),/identificado/);
clearWorkoutReplacement('owner-a',intent.key+1);assert.ok(readWorkoutReplacement('owner-a'),'Unrelated cleanup cannot erase a newer intent');
clearWorkoutReplacement('owner-a',intent.key);assert.equal(readWorkoutReplacement('owner-a'),null);
console.log('WORKOUT REPLACEMENT: account isolation, expiry, stale plan, exact movement/media, no duplicates, four-per-day preservation and immutable prescriptions passed.');
