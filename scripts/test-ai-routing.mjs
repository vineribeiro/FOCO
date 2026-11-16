import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createAiRouter, AiError } from '../supabase/functions/foco-api/aiRouter.mjs';
import { catalogExercise } from '../supabase/functions/foco-api/trainingCatalog.mjs';
import * as science from '../supabase/functions/foco-api/trainingScience.mjs';

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

// Execute actual authenticated Edge routes with synthetic Auth/DB/providers.
const compiled=stripTypeScriptTypes(source.slice(source.indexOf('const SUPABASE_URL')),{mode:'transform'});
function app(fetchImpl, anamnesis = {}) {
  let handler;
  globalThis.Deno={env:{get:key=>({GEMINI_API_KEY:'synthetic-gemini-secret',GROQ_API_KEY:'synthetic-groq-secret'}[key]||'')},serve:fn=>{handler=fn;}};
  const user={id:'11111111-1111-4111-8111-111111111111'};
  const data={profiles:{id:user.id,experience_level:'intermediario'},anamneses:{weekly_frequency:2,session_minutes:45,
    preferred_days:['segunda','quinta'],priority_muscles:['Quadríceps'],equipment_available:['Academia completa'],consent_health_data:false,...anamnesis},workout_sessions:[]};
  const db={auth:{getUser:async()=>({data:{user},error:null})},from:table=>{
    const result={data:data[table]??[],error:null};
    const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>Promise.resolve(result),maybeSingle:()=>Promise.resolve(result)};return chain;
  }};
  const injections={...science,catalogExercise,AiError,createAiRouter:config=>createAiRouter({...config,fetchImpl,log:()=>{}}),
    createClient:()=>db,PasswordSecurityError:class extends Error{},assertPasswordNotLeaked:async()=>{}};
  new Function(...Object.keys(injections),compiled)(...Object.values(injections));return handler;
}
const request=(body,authorization='Bearer synthetic-jwt')=>new Request('https://local.invalid/api/ai/generate-workout',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify({goal:'Hipertrofia',weekly_frequency:2,...body})});
await check('HTTP generation audits priorities and returns actual routing metadata',async()=>{
  let calls=0;const handler=app(async()=>{calls++;return gemini(plan);});
  const response=await handler(request({}));const body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));assert.equal(calls,1);
  assert.equal(body.ai_generation.provider,'gemini');assert.equal(body.training_science.source,science.SCIENCE_ENGINE_VERSION);
  assert.match(body.training_science.split_rationale,/Distribuição verificada/);
});
await check('HTTP route keeps leg coverage even when the selected priority is back',async()=>{
  const upper={...plan,exercises:plan.exercises.map(e=>['Quadríceps','Posteriores'].includes(e.muscle_group)
    ? exercise(e.muscle_group==='Quadríceps'?'Rosca direta com barra reta':'Tríceps pulley com corda',e.training_day):e)};
  let calls=0;const handler=app(async()=>{calls++;return gemini(upper);});
  const response=await handler(request({focus_muscles:'Costas'}));assert.equal(response.status,502);assert.equal(calls,2);assert.match((await response.json()).error,/Quadríceps/);
});
await check('HTTP quota fallback completes an omitted calf priority within two calls and caches only the audited plan',async()=>{
  const withoutCalves={...plan,exercises:plan.exercises.map(e=>e.exercise_name==='Mesa flexora'?exercise('Stiff com barra',e.training_day):e)};
  let calls=0;const handler=app(async url=>{calls++;return url.includes('generativelanguage')
    ? new Response('{}',{status:429,headers:{'retry-after':'60'}}):groq(withoutCalves);});
  const body={focus_muscles:'Costas, Quadríceps, Panturrilhas'};
  const response=await handler(request(body));const result=await response.json();
  assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,2);
  assert.equal(result.ai_generation.provider,'groq');assert.equal(result.ai_generation.calls,2);
  assert.equal(result.training_science.direct_sets_by_group.Panturrilhas,2);
  assert.match(result.explanation,/Ajuste automático do FOCO para cobrir Panturrilhas/);
  assert.ok(science.auditScientificWorkout(result.exercises,{days:['segunda','quinta'],experience:'intermediario',sessionMinutes:45,
    priorityMuscles:['Panturrilhas','Costas','Quadríceps'],requireBalancedCoverage:true,requireRecoveryDay:true}).ok);
  const cached=await (await handler(request(body))).json();
  assert.equal(calls,2);assert.equal(cached.ai_generation.cache_hit,true);assert.equal(cached.ai_generation.calls,0);
  assert.equal(cached.training_science.direct_sets_by_group.Panturrilhas,2);
});
await check('HTTP calf completion respects constraints and a full session without hiding missing coverage',async()=>{
  const withoutCalves={...plan,exercises:plan.exercises.map(e=>e.exercise_name==='Mesa flexora'?exercise('Stiff com barra',e.training_day):e)};
  const full={...plan,exercises:plan.exercises.flatMap(e=>e.exercise_name==='Mesa flexora'
    ? [exercise('Stiff com barra',e.training_day),exercise('Abdominal crunch',e.training_day)]:[e])};
  for (const scenario of [
    { proposal:full },
    { proposal:withoutCalves, body:{restrictions:'Evitar flexão plantar.'} },
    { proposal:withoutCalves, anamnesis:{exercise_preferences:'Evitar treino de panturrilha em pé.'} },
    { proposal:withoutCalves, body:{equipment_available:'Elásticos'} },
  ]) {
    let calls=0;const handler=app(async()=>{calls++;return gemini(scenario.proposal);},scenario.anamnesis);
    const response=await handler(request({focus_muscles:'Panturrilhas',...scenario.body}));assert.equal(response.status,502);assert.equal(calls,2);
    assert.match((await response.json()).error,/Panturrilhas/);
  }
});
await check('HTTP primary completes calf coverage in one call instead of spending a second generation',async()=>{
  const withoutCalves={...plan,exercises:plan.exercises.map(e=>e.exercise_name==='Mesa flexora'?exercise('Stiff com barra',e.training_day):e)};
  let calls=0;const handler=app(async()=>{calls++;return gemini(withoutCalves);});
  const response=await handler(request({focus_muscles:'Panturrilhas',equipment_available:'Peso corporal'}));
  const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(calls,1);
  assert.equal(result.ai_generation.calls,1);assert.equal(result.ai_generation.provider,'gemini');
  assert.ok(result.exercises.some(e=>e.exercise_name==='Panturrilha em pé unilateral'));
});
await check('Auth and affirmative clinical symptoms block before any upstream request',async()=>{
  let calls=0;const handler=app(async()=>{calls++;return gemini(plan);});
  assert.equal((await handler(request({},''))).status,401);
  assert.equal((await handler(request({restrictions:'Nega dor no peito, mas apresenta desmaio.'}))).status,400);assert.equal(calls,0);
});
console.log(`AI ROUTING: ${checks} groups passed; all upstream calls were synthetic.`);
