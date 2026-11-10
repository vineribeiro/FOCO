import assert from 'node:assert/strict';
import { GroqError, generateGroqJson, toGroqSchema, compactSchema, expandGroqResult, parseRetryAfter } from '../supabase/functions/foco-api/groq.mjs';

// No real requests, account data, API credentials, or billable generations.
const catalog = ['Supino reto com barra', 'Agachamento com peso corporal'];
const exercise = { type:'OBJECT', properties:{
  exercise_name:{type:'STRING'},muscle_group:{type:'STRING'},sets:{type:'INTEGER'},
  reps_min:{type:'INTEGER'},reps_max:{type:'INTEGER'},rest_seconds:{type:'INTEGER'},
  suggested_load_kg:{type:'NUMBER'},notes:{type:'STRING'},training_day:{type:'STRING'},rir_target:{type:'INTEGER'},
}, required:['exercise_name','sets'] };
const schema = { type:'OBJECT', properties:{ name:{type:'STRING'},goal:{type:'STRING'},weekly_frequency:{type:'INTEGER'},explanation:{type:'STRING'},exercises:{type:'ARRAY',items:exercise} },required:['name','exercises'] };
const wire = {n:'Ficha sintética',g:'Força',f:2,x:'Proposta para revisão',es:[{e:0,s:2,a:8,b:12,r:120,n:'Controle a descida',d:'segunda',i:3}]};
const secret = 'synthetic-secret-never-print';
const prompt = 'synthetic-private-prompt-never-print';
const response = (value = wire, finish = 'stop', extra = {}) => new Response(JSON.stringify({ choices:[{finish_reason:finish,message:{content:JSON.stringify(value),...extra}}] }));
const request = (fetchImpl, options={}) => generateGroqJson({ apiKey:secret,prompt,schema,catalog,fetchImpl,timeoutMs:100,...options });
let checks=0;
async function check(label,fn) { await fn(); checks++; console.log('PASS '+label); }
function safe(error) {
  assert.ok(error instanceof GroqError);
  assert.ok(!String(error).includes(secret)); assert.ok(!String(error).includes(prompt));
  return true;
}

await check('schema translates every nested object to strict JSON without changing input',()=>{
  const original=JSON.stringify(schema);
  const strict=toGroqSchema(schema);
  assert.equal(JSON.stringify(schema),original);
  assert.equal(strict.type,'object');assert.equal(strict.additionalProperties,false);
  assert.deepEqual(strict.required,Object.keys(schema.properties));
  assert.equal(strict.properties.exercises.items.additionalProperties,false);
  assert.deepEqual(strict.properties.exercises.items.required,Object.keys(exercise.properties));
  assert.deepEqual(toGroqSchema({type:'OBJECT'}),{type:'object',properties:{},required:[],additionalProperties:false});
  assert.deepEqual(toGroqSchema({type:'STRING',nullable:true}),{type:['string','null']});
  const compact=compactSchema(schema,catalog);
  assert.deepEqual(Object.keys(compact.properties),['n','g','f','x','es']);
  assert.equal(compact.properties.es.items.properties.e.type,'integer');
  assert.equal(compact.properties.es.items.properties.e.maximum,1);
  assert.equal(compact.properties.es.items.properties.s.type,'integer');
  assert.ok(!('suggested_load_kg' in compact.properties.es.items.properties));
  assert.ok(!('m' in compact.properties.es.items.properties));
});
await check('request uses strict output, low reasoning and expands aliases without exposing key',async()=>{
  let calls=0;
  const output=await request(async(url,options)=>{
    calls++; assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer '+secret);
    assert.equal(options.method,'POST'); assert.ok(options.signal instanceof AbortSignal);
    const body=JSON.parse(options.body);
    assert.equal(body.model,'openai/gpt-oss-20b');assert.equal(body.reasoning_effort,'low');
    assert.equal(body.max_completion_tokens,3500);assert.equal(body.response_format.json_schema.strict,true);
    assert.deepEqual(body.response_format.json_schema.schema,compactSchema(schema,catalog));
    assert.equal(body.messages[1].content,prompt);
    assert.match(body.messages[0].content,/índice inteiro/);assert.match(body.messages[0].content,/50 caracteres/);
    assert.ok(!options.body.includes(secret));
    return response();
  });
  assert.equal(calls,1);
  assert.equal(output.name,wire.n);assert.equal(output.exercises[0].notes,wire.es[0].n);
  assert.equal(output.exercises[0].exercise_name,catalog[0]);assert.equal(output.exercises[0].suggested_load_kg,0);
  assert.equal(output.exercises[0].muscle_group,'Peitoral');
  assert.equal(output.exercises[0].training_day,'segunda');assert.equal(output.exercises[0].rir_target,3);
});
await check('nested progression review expands workout and summary aliases',()=>{
  const reviewSchema={type:'OBJECT',properties:{review_interval_days:{type:'INTEGER'},explanation:{type:'STRING'},progression_summary:{type:'OBJECT',properties:{strength_delta:{type:'STRING'},volume_analysis:{type:'STRING'},focus_adjustments:{type:'STRING'}}},proposed_plan:schema}};
  const result=expandGroqResult({v:15,x:'Revisão',u:{sd:'Sem dados',va:'Manter',fa:'Técnica'},p:wire},reviewSchema,catalog);
  assert.equal(result.review_interval_days,15);assert.equal(result.progression_summary.strength_delta,'Sem dados');
  assert.equal(result.proposed_plan.name,wire.n);assert.equal(result.proposed_plan.exercises[0].exercise_name,catalog[0]);
});
await check('out-of-range indices and malformed structural types are rejected',async()=>{
  const invalid = [null,[],{}, {...wire,es:{}}, {...wire,f:'2'}, {...wire,extra:'value'},
    ...[-1,2,0.5,'0'].map(e=>({...wire,es:[{...wire.es[0],e}]})),
    {...wire,es:[{...wire.es[0],s:'2'}]}, {...wire,es:[{...wire.es[0],n:null}]},
    {...wire,es:[{...wire.es[0],suggested_load_kg:100}]},
    {...wire,es:[{...wire.es[0],m:'quadril'}]},
  ];
  for(const data of invalid) await assert.rejects(request(async()=>response(data)),e=>safe(e)&&e.status===502&&e.code==='GROQ_INVALID_RESPONSE');
});
await check('muscle group is restored from canonical catalog instead of model guesses',async()=>{
  const data={...wire,es:[{...wire.es[0],e:1}]};
  const result=await request(async()=>response(data));
  assert.equal(result.exercises[0].exercise_name,'Agachamento com peso corporal');
  assert.equal(result.exercises[0].muscle_group,'Quadríceps');
  assert.throws(()=>expandGroqResult(data,schema,['Supino reto com barra','Unknown exercise']),e=>safe(e)&&e.code==='GROQ_CATALOG_ERROR');
});
await check('missing key never calls provider and catalog configuration is checked',async()=>{
  let calls=0; const fn=async()=>{calls++;return response();};
  await assert.rejects(request(fn,{apiKey:''}),e=>safe(e)&&e.status===503&&e.code==='GROQ_MISSING_KEY');
  await assert.rejects(request(fn,{catalog:[]}),e=>safe(e)&&e.code==='GROQ_CATALOG_ERROR');
  assert.equal(calls,0);
});
await check('Retry-After parsing preserves full delays and rejects unsafe or unknown values',()=>{
  const retry=value=>new Response('',{status:429,headers:{'retry-after':value}});
  assert.equal(parseRetryAfter(retry('12')),12_000);
  assert.equal(parseRetryAfter(retry('12.4')),12_400);
  assert.equal(parseRetryAfter(retry('0')),0);
  assert.equal(parseRetryAfter(retry('Mon, 01 Jan 2024 00:00:12 GMT'),Date.UTC(2024,0,1)),12_000);
  for(const value of ['',secret,'-1','NaN','Infinity','9999999','tomorrow']) assert.equal(parseRetryAfter(retry(value)),null);
  assert.equal(parseRetryAfter(new Response('',{status:429})),null);
});
await check('429 waits at least the requested 12 seconds before its single retry',async()=>{
  const actualNow=Date.now;let clock=0,calls=0;
  const waits=[],calledAt=[];
  Date.now=()=>clock;
  try {
    const result=await request(async()=>{
      calls++;calledAt.push(clock);
      return calls===1?new Response(secret+prompt,{status:429,headers:{'retry-after':'12'}}):response();
    },{timeoutMs:45_000,sleepImpl:async delay=>{waits.push(delay);clock+=delay;}});
    assert.equal(result.name,wire.n);assert.equal(calls,2);
    assert.deepEqual(waits,[12_250]);assert.deepEqual(calledAt,[0,12_250]);
    assert.ok(calledAt[1]-calledAt[0]>=12_000);
  } finally {Date.now=actualNow;}
});
await check('429 with long, missing, invalid or unaffordable delay is returned without sleeping',async()=>{
  const actualNow=Date.now;let clock=0;
  Date.now=()=>clock;
  try {
    for(const scenario of [
      {retry:'26',spent:0},{retry:'86400',spent:0},{retry:undefined,spent:0},
      {retry:secret,spent:0},{retry:'12',spent:29_000},
    ]) {
      clock=0;let calls=0,waits=0;
      await assert.rejects(request(async()=>{
        calls++;clock+=scenario.spent;
        return new Response(secret+prompt,{status:429,...(scenario.retry===undefined?{}:{headers:{'retry-after':scenario.retry}})});
      },{timeoutMs:45_000,sleepImpl:async()=>{waits++;}}),error=>safe(error)&&error.status===429&&error.code==='GROQ_RATE_LIMIT');
      assert.equal(calls,1);assert.equal(waits,0);
    }
  } finally {Date.now=actualNow;}
});
await check('second 429 never creates another wait or provider attempt',async()=>{
  const actualNow=Date.now;let clock=0,calls=0;
  const waits=[];
  Date.now=()=>clock;
  try {
    await assert.rejects(request(async()=>{
      calls++;
      return new Response(secret+prompt,{status:429,headers:{'retry-after':'12'}});
    },{timeoutMs:45_000,sleepImpl:async delay=>{waits.push(delay);clock+=delay;}}),error=>safe(error)&&error.status===429);
    assert.equal(calls,2);assert.deepEqual(waits,[12_250]);
  } finally {Date.now=actualNow;}
});
await check('waiting for quota consumes the original timeout budget',async()=>{
  const actualNow=Date.now;let clock=0,calls=0;
  Date.now=()=>clock;
  try {
    await assert.rejects(request(async()=>{
      calls++;
      return new Response('',{status:429,headers:{'retry-after':'12'}});
    },{timeoutMs:45_000,sleepImpl:async delay=>{assert.equal(delay,12_250);clock=45_001;}}),error=>safe(error)&&error.status===504&&error.code==='GROQ_TIMEOUT');
    assert.equal(calls,1);
  } finally {Date.now=actualNow;}
});
await check('429 preserves safe Retry-After guidance when the remaining deadline prevents retry',async()=>{
  let calls=0;
  await assert.rejects(request(async()=>{calls++;return new Response(secret+prompt,{status:429,headers:{'retry-after':'12.4'}});}),e=>safe(e)&&e.status===429&&e.code==='GROQ_RATE_LIMIT'&&/13 segundo/.test(e.message));
  assert.equal(calls,1);
  await assert.rejects(request(async()=>new Response(secret,{status:429,headers:{'retry-after':secret}})),e=>safe(e)&&e.code==='GROQ_RATE_LIMIT');
});
await check('413 has a specific redacted error and never retries',async()=>{
  let calls=0,waits=0;
  await assert.rejects(request(async()=>{
    calls++;return new Response(secret+prompt,{status:413});
  },{sleepImpl:async()=>{waits++;}}),error=>safe(error)&&error.status===413&&error.code==='GROQ_REQUEST_TOO_LARGE');
  assert.equal(calls,1);assert.equal(waits,0);
});
await check('upstream auth errors do not become FOCO session expiry or trigger retries',async()=>{
  for(const status of [401,403]) {
    let calls=0;
    await assert.rejects(request(async()=>{calls++;return new Response(secret+prompt,{status});}),e=>safe(e)&&e.status===502&&e.code==='GROQ_AUTH_ERROR');
    assert.equal(calls,1);
  }
});
await check('5xx errors retry once; other errors stop with redacted messages',async()=>{
  for(const status of [500,502,503,504]) {
    let calls=0;
    const output=await request(async()=>++calls===1?new Response(secret+prompt,{status}):response());
    assert.equal(calls,2);assert.equal(output.name,wire.n);
    calls=0;
    await assert.rejects(request(async()=>{calls++;return new Response(secret+prompt,{status});}),e=>safe(e)&&e.status===503&&e.code==='GROQ_UNAVAILABLE');
    assert.equal(calls,2);
  }
  for(const status of [400,404,422]) {
    let calls=0;
    await assert.rejects(request(async()=>{calls++;return new Response(secret+prompt,{status});}),e=>safe(e)&&e.code==='GROQ_REQUEST_FAILED');
    assert.equal(calls,1);
  }
});
await check('invalid JSON, refusal, truncation and incomplete response are explicit',async()=>{
  const fixtures=[
    [new Response(secret+prompt),'GROQ_INVALID_JSON'],
    [new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:secret+prompt}}]})),'GROQ_INVALID_JSON'],
    [response(wire,'length'),'GROQ_OUTPUT_TRUNCATED'],
    [response(wire,'content_filter'),'GROQ_REFUSAL'],
    [response(wire,'stop',{refusal:secret+prompt}),'GROQ_REFUSAL'],
    [response(wire,'tool_calls'),'GROQ_INCOMPLETE_RESPONSE'],
    [new Response('{}'),'GROQ_INCOMPLETE_RESPONSE'],
  ];
  for(const [result,code] of fixtures) await assert.rejects(request(async()=>result),e=>safe(e)&&e.status===502&&e.code===code);
});
await check('real timeout bounds stalled fetch and body even when they ignore abort',async()=>{
  for(const stall of ['fetch','body']) {
    let signal;
    const start=Date.now();
    await assert.rejects(request(async(_url,options)=>{
      signal=options.signal;
      if(stall==='fetch') return new Promise(()=>{});
      return {status:200,ok:true,text:()=>new Promise(()=>{})};
    },{timeoutMs:15}),e=>safe(e)&&e.status===504&&e.code==='GROQ_TIMEOUT');
    assert.ok(signal.aborted);assert.ok(Date.now()-start<250);
  }
});
await check('retry shares original deadline instead of restarting timeout',async()=>{
  const actualNow=Date.now;let clock=0,calls=0;
  Date.now=()=>clock;
  try {
    await assert.rejects(request(async()=>{
      calls++;clock+=30;
      return new Response(secret,{status:503});
    },{timeoutMs:20}),e=>safe(e)&&e.status===504&&e.code==='GROQ_TIMEOUT');
    assert.equal(calls,1);
  } finally {Date.now=actualNow;}
});
await check('network exception cannot leak prompt or key and is not retried',async()=>{
  let calls=0;
  await assert.rejects(request(async()=>{calls++;throw new Error(secret+prompt);}),e=>safe(e)&&e.status===502&&e.code==='GROQ_NETWORK_ERROR');
  assert.equal(calls,1);
});
console.log(`GROQ RELIABILITY: ${checks} groups passed; synthetic responses only.`);
