import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {auditCredentials,createAuditFixtures} from './fixtures/audit-browser.mjs';
const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const out='work/human-media-browser';mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync(new URL('../docs/media/FOCO_HUMAN_PILOT_2026_11_17.json',import.meta.url),'utf8'));
const examples=manifest.exercises;
const muscleGroups=['Peitoral','Quadríceps','Costas','Panturrilhas','Core','Posteriores','Ombros','Bíceps','Glúteos','Costas'];
const bodyParts=['chest','upper_legs','back','lower_legs','core','upper_legs','shoulders','upper_arms','upper_legs','back'];
const equipment=['dumbbell','kettlebell','dumbbell','dumbbell',undefined,'dumbbell','dumbbell','dumbbell',undefined,'cable'];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L5sAAAAASUVORK5CYII=','base64');
const results=[];let externalWrites=0;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
async function setup(width,{breakOwn=false}={}){
 const context=await browser.newContext({viewport:{width,height:width===320?720:900},serviceWorkers:'block',reducedMotion:'reduce'});
 const fixtures=createAuditFixtures(),plan=fixtures['/api/workouts/active'];
 plan.exercises=examples.map((e,i)=>({id:'human-synthetic-'+i,plan_id:plan.id,exercise_name:i===0?'Supino personalizado do piloto':e.name,
  repdb_id:e.id,muscle_group:muscleGroups[i],training_day:'segunda',sets:3,reps_min:8,reps_max:12,rest_seconds:90,suggested_load_kg:20,notes:''}));
 const catalog=[...examples.map((e,i)=>({id:e.id,name_en:e.name,body_part:bodyParts[i],equipment:equipment[i],is_bodyweight:!equipment[i],images:{flat:{start:'images/flat/'+e.id+'-start.webp',peak:'images/flat/'+e.id+'-peak.webp'}}})),
  ...Array.from({length:100},(_,i)=>({id:'future-pilot-'+i,name_en:'Future movement '+i,images:{flat:{main:'images/flat/future-pilot-'+i+'.webp'}}}))];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.pathname.startsWith('/functions/v1/foco-api')){
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,OPTIONS'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   assert.equal(req.method(),'GET','No real or mocked data mutation is needed for media QA');
   const path=u.pathname.replace('/functions/v1/foco-api','');
   return route.fulfill({status:Object.hasOwn(fixtures,path)?200:404,headers,contentType:'application/json',body:JSON.stringify(fixtures[path]||{})});
  }
  if(u.pathname.endsWith('/exercises.json'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:catalog.length,exercises:catalog})});
  if(u.pathname.includes('/images/flat/'))return route.fulfill({status:200,contentType:'image/png',body:png});
  if(breakOwn&&u.pathname.endsWith('/hammer-curl.webp'))return route.fulfill({status:404});
  if(u.origin===new URL(base).origin){assert.equal(req.method(),'GET');return route.continue();}
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))externalWrites++;
  return route.abort('blockedbyclient');
 });
 await context.addInitScript(c=>{localStorage.setItem('foco_auth_token',c.access);localStorage.setItem('foco_auth_refresh_token',c.refresh);sessionStorage.setItem('foco_next_training_day','segunda');},auditCredentials);
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {context,page,errors};
}
try{
 for(const width of [320,390,768,1440]){
  const {context,page,errors}=await setup(width);
  await page.goto(base+'?view=sessao');const stage=page.locator('.foco-v7-session-stage');
  for(let i=0;i<examples.length;i++){
   const e=examples[i];await page.getByRole('button',{name:new RegExp('^Ver exercício '+(i+1)+':')}).click();
   const art=stage.locator('[data-foco-media-source="foco-ai"]');await art.locator('svg.foco-human-pose').waitFor();
   await art.locator('svg image[href$="/'+e.asset+'"]').waitFor();
   const phase=e.id==='plank'?'reference':'start';await page.waitForFunction(p=>document.querySelector('.foco-21-exercise-media [data-foco-media-phase]')?.getAttribute('data-foco-media-phase')===p,phase);
   const href=await art.locator('svg image').getAttribute('href');assert.ok(href.endsWith('/'+e.asset));
   await page.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();},href);
   const controls=art.getByRole('group',{name:'Posições do exercício'});
   if(e.id==='plank'){assert.equal(await controls.count(),0);assert.match(await art.getByRole('img').getAttribute('aria-label'),/posição de referência/);}
   else{
    await controls.getByRole('button',{name:'02 FINAL',exact:true}).click();assert.equal(await art.getAttribute('data-foco-media-phase'),'peak');
    assert.equal(Number(await art.locator('svg image').getAttribute('x')),-e.frames[1].x,'Changing pose must show the correct panel of this exercise');
    await controls.getByRole('button',{name:'01 INÍCIO',exact:true}).click();
   }
   if(width===390)await stage.screenshot({path:out+'/'+e.id+'-390.png'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
  await page.getByRole('button',{name:/^Ver exercício 1:/}).click();
  const start=page.getByRole('button',{name:'Iniciar treino',exact:true});await start.scrollIntoViewIfNeeded();await start.click();
  await page.getByRole('spinbutton',{name:'Carga atual em quilogramas'}).fill('25');
  await page.getByRole('spinbutton',{name:'Repetições da série atual'}).fill('11');
  await page.reload();await stage.locator('[data-foco-media-source="foco-ai"] svg').waitFor();
  assert.equal(await page.getByRole('spinbutton',{name:'Carga atual em quilogramas'}).inputValue(),'25');
  assert.equal(await page.getByRole('spinbutton',{name:'Repetições da série atual'}).inputValue(),'11');
  if(width===390){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();writeFileSync(out+'/axe.json',JSON.stringify(a.violations,null,2));assert.deepEqual(a.violations,[]);}
  await page.screenshot({path:out+'/session-'+width+'.png',fullPage:true});
  await page.goto(base+'?view=biblioteca&media=foco');await page.getByText('10 movimentos',{exact:true}).waitFor();
  assert.equal(await page.locator('.foco-repdb-exercise-card').count(),10);
  for(const card of await page.locator('.foco-repdb-exercise-card').all()){
   await card.scrollIntoViewIfNeeded();await card.locator('[data-foco-media-source="foco-ai"] svg').waitFor();
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:out+'/library-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,status:'PASS',exercises:10,externalWrites:0});console.log('PASS '+width+': 10 exact human variants, 19 poses, personalized ID, gallery and preserved live draft');await context.close();
 }
 const {context,page}=await setup(390,{breakOwn:true});await page.goto(base+'?view=sessao');
 await page.getByRole('button',{name:/^Ver exercício 8:/}).click();
 const fallback=page.locator('.foco-21-exercise-media [data-foco-media-source="repdb"] img');await fallback.waitFor();
 assert.match(await fallback.getAttribute('src'),/hammer-curl-start\.webp$/,'Failed own media must use the same RepDB ID');
 assert.equal(await page.locator('.foco-21-exercise-media svg.foco-human-pose').count(),0);
 console.log('PASS: missing own image falls back to the same variant');await context.close();assert.equal(externalWrites,0);
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify({results,externalWrites},null,2));}
