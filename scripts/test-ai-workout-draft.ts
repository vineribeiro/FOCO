import assert from 'node:assert/strict';
import { aiWorkoutFingerprint, readAiWorkoutDraft, saveAiWorkoutDraft, clearAiWorkoutDraft, AUTOMATIC_PLANNER_VERSION, readAiWorkoutFormDraft } from '../src/utils/aiWorkoutDraft';
import type { GeneratedWorkoutProposal } from '../src/types';

const store = new Map<string,string>();
Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{
  getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value),removeItem:(key:string)=>store.delete(key),
}});
const plan: GeneratedWorkoutProposal={name:'Proposta sintética',goal:'Hipertrofia',weekly_frequency:2,explanation:'Revisar antes de ativar.',generation:{method:'rules',version:AUTOMATIC_PLANNER_VERSION,ai_calls:0},
  exercises:[{exercise_name:'Supino reto com barra',muscle_group:'Peitoral',sets:2,reps_min:8,reps_max:12,rest_seconds:120,suggested_load_kg:0}]};
const fingerprint=await aiWorkoutFingerprint('clinical-context-synthetic');
assert.equal(fingerprint.length,64);
saveAiWorkoutDraft('account-a',fingerprint,plan);
assert.deepEqual(readAiWorkoutDraft('account-a',fingerprint),plan);
assert.equal(readAiWorkoutDraft('account-b',fingerprint),null);
assert.equal(readAiWorkoutDraft('account-a',await aiWorkoutFingerprint('changed-context')),null);
assert.ok(!JSON.stringify([...store.values()]).includes('clinical-context-synthetic'),'raw health context is never stored');
const key=[...store.keys()][0],draft=JSON.parse(store.get(key)!);
store.set(key,JSON.stringify({...draft,expiresAt:Date.now()-1}));
assert.equal(readAiWorkoutDraft('account-a',fingerprint),null);
saveAiWorkoutDraft('account-a',fingerprint,plan);clearAiWorkoutDraft('account-a');
assert.equal(readAiWorkoutDraft('account-a',fingerprint),null);
saveAiWorkoutDraft('account-a',fingerprint,{...plan,generation:{method:'rules',version:'foco-rules-2026.1',ai_calls:0}});
assert.equal(readAiWorkoutDraft('account-a',fingerprint),null,'Never restore an old unsafe generator proposal');
const form={goal:'Saúde e qualidade de vida',frequency:2,experience:'iniciante' as const,focus:[],equipment:'Academia completa',includeBodyMetrics:false,medicalClearanceConfirmed:false,sessionMinutes:40,availableDays:['quarta','sabado']};
saveAiWorkoutDraft('account-a',fingerprint,plan,{baseFingerprint:fingerprint,form});
assert.deepEqual(readAiWorkoutFormDraft('account-a',fingerprint),form);
saveAiWorkoutDraft('account-a',fingerprint,plan,{baseFingerprint:fingerprint,form:{...form,availableDays:['quarta','quarta']}});
assert.equal(readAiWorkoutFormDraft('account-a',fingerprint),null);
Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('full');},removeItem:()=>{throw new Error('blocked');}}});
assert.doesNotThrow(()=>saveAiWorkoutDraft('account-a',fingerprint,plan));
assert.equal(readAiWorkoutDraft('account-a',fingerprint),null);
console.log('AI PROPOSAL DRAFT: restoration, account/context isolation, expiry, raw-context minimization and unavailable storage passed.');
