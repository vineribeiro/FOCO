import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createAiRouter, AiError } from '../supabase/functions/foco-api/aiRouter.mjs';
import { catalogExercise } from '../supabase/functions/foco-api/trainingCatalog.mjs';
import * as science from '../supabase/functions/foco-api/trainingScience.mjs';
import * as automatic from '../supabase/functions/foco-api/automaticPlanner.mjs';
import * as personal from '../supabase/functions/foco-api/personalCoach.mjs';

const source = readFileSync(new URL('../supabase/functions/foco-api/index.ts', import.meta.url), 'utf8');
const catalogText = source.slice(source.indexOf('const OFFICIAL_EXERCISES:'), source.indexOf('const officialExerciseName'));
const catalog = new Function(stripTypeScriptTypes(catalogText) + ';return OFFICIAL_EXERCISES;')();
const schema = {type:'OBJECT',properties:{name:{type:'STRING'},goal:{type:'STRING'},weekly_frequency:{type:'INTEGER'},
  explanation:{type:'STRING'},exercises:{type:'ARRAY',items:{type:'OBJECT',properties:{
    exercise_name:{type:'STRING'},muscle_group:{type:'STRING'},sets:{type:'INTEGER'},reps_min:{type:'INTEGER'},
    reps_max:{type:'INTEGER'},rest_seconds:{type:'INTEGER'},suggested_load_kg:{type:'NUMBER'},notes:{type:'STRING'},
    training_day:{type:'STRING'},rir_target:{type:'INTEGER'},
  }}}}};
const exercise = (name, day) => ({exercise_name:name,muscle_group:catalogExercise(name).primary[0],sets:2,
  reps_min:8,reps_max:12,rest_seconds:120,suggested_load_kg:0,notes:'Amplitude controlada.',training_day:day,rir_target:2});
const plan = {name:'Ficha sintética',goal:'Hipertrofia',weekly_frequency:2,explanation:'Distribuição equilibrada.',
  exercises:['segunda','quinta'].flatMap(day => ['Supino reto com barra','Remada curvada com barra','Agachamento livre com barra','Mesa flexora'].map(name=>exercise(name,day)))};
const wire = value => ({n:value.name,g:value.goal,f:value.weekly_frequency,x:value.explanation,es:value.exercises.map(e=>({
  e:catalog.indexOf(e.exercise_name),s:e.sets,a:e.reps_min,b:e.reps_max,r:e.rest_seconds,n:e.notes,d:e.training_day,i:e.rir_target,
}))});
const gemini = value => new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(wire(value))}]}}],
  usageMetadata:{promptTokenCount:1200,candidatesTokenCount:700,thoughtsTokenCount:100,totalTokenCount:2000}}),{status:200});
const groq = value => new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(wire(value))}}],
  usage:{prompt_tokens:900,completion_tokens:600,total_tokens:1500}}),{status:200});
const options = {prompt:'Contexto sintético privado',schema,catalog,scope:'account-a'};
const logs = [];
const router = (fetchImpl, more={}) => createAiRouter({geminiKey:'synthetic-gemini-secret',groqKey:'synthetic-groq-secret',
  fetchImpl,log:entry=>logs.push(entry),...more});
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('PASS '+name);};

await check('Gemini success takes one call and exposes real provider/token metadata',async()=>{
  let calls=0;const r=router(async url=>{calls++;assert.ok(url.includes('generativelanguage'));return gemini(plan);});
  const out=await r.generate(options);
  assert.equal(calls,1);assert.equal(out.ai_generation.provider,'gemini');assert.equal(out.ai_generation.calls,1);
  assert.equal(out.exercises[0].exercise_name,plan.exercises[0].exercise_name);
  assert.equal(out.exercises[0].suggested_load_kg,0);assert.equal(out.ai_generation.attempts[0].total_tokens,2000);
});
await check('quota uses one Groq fallback; circuit respects full Retry-After',async()=>{
  const calls=[];let clock=100_000;
  const r=router(async url=>{calls.push(url);return url.includes('generativelanguage')
    ? new Response('{}',{status:429,headers:{'retry-after':'120'}}):groq(plan);},{now:()=>clock});
  const out=await r.generate(options);
  assert.equal(calls.length,2);assert.equal(out.ai_generation.provider,'groq');assert.equal(out.ai_generation.calls,2);
  clock+=61_000;await r.generate({...options,prompt:'outro contexto'});
  assert.equal(calls.length,3);assert.ok(calls[2].includes('api.groq.com'));
});
await check('timeout aborts the primary; backup can finish in shared deadline',async()=>{
  let calls=0,aborted=false;
  const r=router(async(url,args)=>{calls++;if(url.includes('generativelanguage')){
    args.signal.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});
  }return groq(plan);},{attemptTimeoutMs:15,timeoutMs:1000});
  assert.equal((await r.generate(options)).ai_generation.provider,'groq');assert.equal(calls,2);assert.equal(aborted,true);
});
await check('both quotas exhausted stop at two calls; cooldown prevents new waste',async()=>{
  let calls=0;const r=router(async()=>{calls++;return new Response('{}',{status:429});});
  await assert.rejects(r.generate(options),error=>error.status===429&&error.code==='AI_RATE_LIMIT');assert.equal(calls,2);
  await assert.rejects(r.generate({...options,prompt:'novo'}),error=>error.status===429);assert.equal(calls,2);
});
await check('cache/single-flight isolate accounts, inputs and explicit regeneration',async()=>{
  let calls=0;const r=router(async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return gemini(plan);});
  const [first,second]=await Promise.all([r.generate(options),r.generate(options)]);
  assert.equal(calls,1);first.exercises[0].sets=99;assert.equal(second.exercises[0].sets,2);
  assert.equal((await r.generate(options)).ai_generation.cache_hit,true);assert.equal(calls,1);
  await r.generate({...options,scope:'account-b'});assert.equal(calls,2);
  await r.generate({...options,prompt:'Contexto alterado'});assert.equal(calls,3);
  await r.generate({...options,forceRefresh:true});assert.equal(calls,4);
});
await check('failed validation gets one same-provider repair and never enters cache',async()=>{
  let calls=0;const r=router(async url=>{calls++;assert.ok(url.includes('generativelanguage'));return gemini(plan);});
  const validate=()=>{throw Object.assign(new Error('Prioridade Quadríceps ausente'),{status:502});};
  await assert.rejects(r.generate({...options,validate}),error=>error.code==='AI_PROPOSAL_INVALID');assert.equal(calls,2);
  await assert.rejects(r.generate({...options,validate}),error=>error.code==='AI_PROPOSAL_INVALID');assert.equal(calls,4);
});
await check('fallback cannot bypass validation or start a third call',async()=>{
  let calls=0;const r=router(async url=>{calls++;return url.includes('generativelanguage')?new Response('{}',{status:503}):groq(plan);});
  await assert.rejects(r.generate({...options,validate:()=>{throw Object.assign(new Error('Cobertura incompleta'),{status:502});}}),
    error=>error.code==='AI_PROPOSAL_INVALID');assert.equal(calls,2);
});
await check('provider safety refusal is terminal',async()=>{
  let calls=0;const r=router(async()=>{calls++;return new Response(JSON.stringify({promptFeedback:{blockReason:'SAFETY'}}),{status:200});});
  await assert.rejects(r.generate(options),error=>error.code==='AI_SAFETY_BLOCK');assert.equal(calls,1);
});
await check('one configured provider works; missing keys make no upstream calls',async()=>{
  let calls=0;const r=router(async()=>{calls++;return groq(plan);},{geminiKey:''});
  assert.equal((await r.generate(options)).ai_generation.provider,'groq');assert.equal(calls,1);
  await assert.rejects(router(async()=>{throw new Error('must not call');},{geminiKey:'',groqKey:''}).generate(options),error=>error.code==='AI_MISSING_KEY');
});
await check('token logs contain no keys, prompts or account IDs',async()=>{
  const serialized=JSON.stringify(logs);
  for(const value of ['synthetic-gemini-secret','synthetic-groq-secret',options.prompt,options.scope]) assert.ok(!serialized.includes(value));
  assert.ok(logs.some(e=>e.total_tokens===2000));
});
await check('media extraction preserves optional fields and never reaches Groq',async()=>{
  let calls=0;
  const mediaSchema={type:'OBJECT',properties:{summary:{type:'STRING'},rir_target:{type:'INTEGER'}},required:['summary']};
  const r=router(async(url,args)=>{
    calls++;assert.ok(url.includes('generativelanguage'));
    const sent=JSON.parse(args.body);
    assert.deepEqual(sent.generationConfig.responseJsonSchema.required,['summary']);
    assert.ok(sent.contents[0].parts[0].inline_data);
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"summary":"Somente texto legível"}'}]}}]}),{status:200});
  });
  const out=await r.generate({...options,schema:mediaSchema,media:{mime:'image/png',data:'synthetic'},cacheResult:false});
  assert.equal(calls,1);assert.equal(out.rir_target,undefined);assert.equal(out.summary,'Somente texto legível');
  assert.equal(out.ai_generation.attempts[0].total_tokens,null,'missing provider usage must remain unknown');
});
await check('media availability repair uses one alternative Gemini model and no extra calls',async()=>{
  const urls=[];const mediaSchema={type:'OBJECT',properties:{summary:{type:'STRING'}},required:['summary']};
  const r=router(async url=>{urls.push(url);return urls.length===1?new Response('{}',{status:503}):
    new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"summary":"Legível"}'}]}}]}),{status:200});});
  const out=await r.generate({...options,schema:mediaSchema,media:{mime:'application/pdf',data:'synthetic'},cacheResult:false});
  assert.equal(urls.length,2);assert.ok(urls.every(url=>url.includes('generativelanguage')));
  assert.notEqual(urls[0],urls[1]);assert.equal(out.ai_generation.calls,2);
  await r.generate({...options,schema:mediaSchema,media:{mime:'application/pdf',data:'second-synthetic'},cacheResult:false});
  assert.equal(urls.length,3,'a successful Gemini backup clears the temporary provider cooldown');
});

// Execute actual Edge routes. All Auth/DB/provider seams are synthetic.
const compiled=stripTypeScriptTypes(source.slice(source.indexOf('const SUPABASE_URL')),{mode:'transform'});
function app(fetchImpl,{anamnesis={},keys=true}={}) {
  let handler; const reads=[],writes=[];
  globalThis.Deno={env:{get:key=>keys?({GEMINI_API_KEY:'synthetic-gemini-secret',GROQ_API_KEY:'synthetic-groq-secret'}[key]||''):''},serve:fn=>{handler=fn;}};
  const user={id:'11111111-1111-4111-8111-111111111111'};
  const data={profiles:[{id:user.id,full_name:'PRIVATE_NAME',height_cm:177,current_weight_kg:70,experience_level:'intermediario'}],
    anamneses:[{user_id:user.id,weekly_frequency:2,session_minutes:45,preferred_days:['segunda','quinta'],priority_muscles:['Quadríceps'],
      equipment_available:['Academia completa'],consent_health_data:false,health_notes:'PRIVATE_CLINICAL',...anamnesis}],
    workout_plans:[{id:'own-plan',user_id:user.id,status:'ativo',name:'Minha ficha',goal:'Hipertrofia',weekly_frequency:2},
      {id:'foreign-plan',user_id:'other-account',status:'ativo',name:'FOREIGN_PLAN'}],
    workout_exercises:[{plan_id:'own-plan',exercise_name:'Supino reto com barra',muscle_group:'Peitoral',sets:2,reps_min:8,reps_max:12},
      {plan_id:'foreign-plan',exercise_name:'FOREIGN_EXERCISE'}],workout_sessions:[],exercise_sets:[]};
  const db={auth:{getUser:async()=>({data:{user},error:null})},from:table=>{
    const filters=[];let insertion;
    reads.push({table,filters});
    const result=()=>({data:insertion?[{id:'synthetic-rec',...insertion}]:(data[table]||[]).filter(row=>filters.every(([field,values])=>values.includes(row[field]))),error:null});
    const chain={select:()=>chain,eq:(field,value)=>{filters.push([field,[value]]);return chain;},in:(field,values)=>{filters.push([field,values]);return chain;},
      order:()=>chain,limit:()=>chain,then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject),
      maybeSingle:async()=>({...result(),data:result().data[0]||null}),single:async()=>({...result(),data:result().data[0]||null}),
      insert:value=>{assert.equal(table,'ai_recommendations');writes.push({table,value});insertion=value;return chain;}};return chain;
  }};
  const injections={...science,...automatic,...personal,catalogExercise,AiError,createAiRouter:config=>createAiRouter({...config,fetchImpl,log:()=>{}}),
    createClient:()=>db,PasswordSecurityError:class extends Error{},assertPasswordNotLeaked:async()=>{}};
  new Function(...Object.keys(injections),compiled)(...Object.values(injections));return{handler,reads,writes};
}
const request=(path,body,authorization='Bearer synthetic-jwt')=>new Request('https://local.invalid'+path,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(body)});
const automaticBody={goal:'Hipertrofia',weekly_frequency:2,focus_muscles:'Costas, Quadríceps, Panturrilhas'};
await check('automatic and legacy generation routes work without AI keys, costs or writes',async()=>{
 let calls=0;const a=app(async()=>{calls++;throw Error('No inference allowed');},{keys:false});
 for(const path of ['/api/workouts/preview','/api/ai/generate-workout']){
  const response=await a.handler(request(path,automaticBody));const body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.generation.method,'rules');assert.equal(body.generation.ai_calls,0);
  assert.ok(body.training_science.direct_sets_by_group.Panturrilhas>0);assert.ok(body.training_science.direct_sets_by_group.Costas>0);
 }
 assert.equal(calls,0);assert.equal(a.writes.length,0);
});
await check('preview uses the edited weekdays, goal, level, time and focus instead of saved defaults',async()=>{
 let calls=0;const a=app(async()=>{calls++;throw Error('No inference');},{keys:false});
 const body={...automaticBody,weekly_frequency:4,available_days:['terca','quarta','sexta','sabado'],experience_level:'intermediario',session_minutes:60,equipment_available:'Academia completa',focus_muscles:'Bíceps'};
 const read=async b=>{const response=await a.handler(request('/api/workouts/preview',b));const out=await response.json();assert.equal(response.status,200,JSON.stringify(out));return out;};
 const first=await read({...body,goal:'Hipertrofia Máxima'});
 assert.deepEqual(first.planning.available_days,body.available_days);assert.equal(first.weekly_frequency,4);
 assert.ok(first.exercises.every(e=>body.available_days.includes(e.training_day)));
 const health=await read({...body,goal:'Saúde e qualidade de vida'});
 assert.notDeepEqual(health.exercises,first.exercises);
 const lessTime=await read({...body,session_minutes:30});assert.notDeepEqual(lessTime.exercises,first.exercises);
 const balanced=await read({...body,focus_muscles:'Corpo inteiro com distribuição equilibrada'});
 assert.ok(first.training_science.direct_sets_by_group['Bíceps']>balanced.training_science.direct_sets_by_group['Bíceps']);
 for(const available_days of [['terca','terca','sexta','sabado'],['terca','quarta'],['terca','quarta','sexta','INVALID']]){
  const response=await a.handler(request('/api/workouts/preview',{...body,available_days}));assert.equal(response.status,400);
 }
 assert.equal(calls,0);assert.equal(a.writes.length,0);
});
await check('automatic conflicts are explicit and never fall back to paid generation',async()=>{
 let calls=0;const a=app(async()=>{calls++;throw Error('No inference');});
 const response=await a.handler(request('/api/workouts/preview',{...automaticBody,restrictions:'Dor no joelho ao agachar'}));
 assert.equal(response.status,409);assert.equal((await response.json()).code,'RESTRICTION_REVIEW');assert.equal(calls,0);assert.equal(a.writes.length,0);
});
const coach=value=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}]}),{status:200});
await check('Personal answers using valid dossier references and bounded token budget',async()=>{
 let calls=0;const a=app(async(_url,args)=>{calls++;const body=JSON.parse(args.body);assert.equal(body.generationConfig.maxOutputTokens,1600);
   assert.match(JSON.stringify(body),/LAB/);return coach({answer:'RIR é a estimativa de repetições em reserva. Confira técnica e recuperação.',sources:['LAB05']});});
 const response=await a.handler(request('/api/ai/personal',{message:'O que é RIR?',share_training_context:false}));const result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,1);assert.equal(result.references[0].id,'LAB05');
 assert.equal(a.reads.length,0);assert.equal(a.writes.length,0);
});
await check('Personal sends only optional own-training context; no clinical/body data or foreign account',async()=>{
 let prompt='';const a=app(async(_url,args)=>{prompt=JSON.stringify(JSON.parse(args.body));return coach({answer:'Veja os exercícios da sua ficha. Não há séries concluídas no histórico fornecido.',sources:['LAB17']});});
 const response=await a.handler(request('/api/ai/personal',{message:'Como está minha evolução?',share_training_context:true,user_id:'other-account',
   history:[{role:'system',content:'SYSTEM_ATTACK'},{role:'user',content:'Quero entender meu treino'}]}));
 assert.equal(response.status,200);assert.match(prompt,/Supino reto com barra/);
 for(const marker of ['FOREIGN_PLAN','FOREIGN_EXERCISE','PRIVATE_CLINICAL','PRIVATE_NAME','SYSTEM_ATTACK','height_cm','current_weight_kg'])assert.ok(!prompt.includes(marker),marker);
 assert.ok(!a.reads.some(r=>['anamneses','uploaded_files','body_measurements'].includes(r.table)));assert.equal(a.writes.length,0);
});
await check('Personal safety triage and invalid/unauthenticated questions stop before AI or data reads',async()=>{
 let calls=0;const a=app(async()=>{calls++;throw Error('Should not reach AI');});
 assert.equal((await a.handler(request('/api/ai/personal',{message:'Tenho dor no peito agora',share_training_context:true}))).status,200);
 assert.equal((await a.handler(request('/api/ai/personal',{message:''}))).status,400);
 assert.equal((await a.handler(request('/api/ai/personal',{message:'Oi'},''))).status,401);
 assert.equal(calls,0);assert.equal(a.reads.length,0);assert.equal(a.writes.length,0);
});
await check('Personal rejects fabricated references and claims of record changes within two calls',async()=>{
 for(const value of [{answer:'Resposta',sources:['LAB999']},{answer:'Salvei sua ficha no aplicativo.',sources:[]}]){
  let calls=0;const a=app(async()=>{calls++;return coach(value);});
  const response=await a.handler(request('/api/ai/personal',{message:'Explique meu treino'}));
  assert.equal(response.status,502);assert.equal(calls,2);assert.equal(a.writes.length,0);
 }
});
await check('Personal can fall back to Groq and reports the actual provider',async()=>{
 let calls=0;const a=app(async(url,args)=>{calls++;if(url.includes('generativelanguage'))return new Response('{}',{status:429});
  assert.equal(JSON.parse(args.body).max_completion_tokens,1600);
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({answer:'A progressão depende dos registros, da técnica e da recuperação.',sources:['LAB10']})}}]}),{status:200});});
 const response=await a.handler(request('/api/ai/personal',{message:'Como progredir?'}));const result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,2);assert.equal(result.ai_generation.provider,'groq');
});
await check('rules progression review stores only a pending recommendation and does not call AI',async()=>{
 let calls=0;const a=app(async()=>{calls++;throw Error('No inference');},{keys:false});
 const response=await a.handler(request('/api/ai/review-progression',{review_interval_days:15}));const result=await response.json();
 assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,0);assert.equal(result.generation.method,'rules');
 assert.equal(a.writes.length,1);assert.equal(a.writes[0].value.status,'pending');
});
console.log(`AI ROUTING / RULES / PERSONAL: ${checks} groups passed; all upstream calls were synthetic.`);
