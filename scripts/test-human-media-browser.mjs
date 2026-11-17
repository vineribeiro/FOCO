import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {auditCredentials,createAuditFixtures} from './fixtures/audit-browser.mjs';
const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const out='work/human-media-corrections-browser';mkdirSync(out,{recursive:true});
import {humanExamples} from './fixtures/human-media.mjs';
const sessionIds=['db-bench-press','bench-press','barbell-row','leg-press','plank','hammer-curl','db-goblet-squat','bicycle-crunch','barbell-wrist-curl','cable-wrist-curl','db-reverse-wrist-curl','cable-external-rotation'];
const examples=sessionIds.map(id=>humanExamples.find(e=>e.id===id));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L5sAAAAASUVORK5CYII=','base64');
const results=[];let externalWrites=0;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
async function setup(width,{breakOwn=false,cards=false}={}){
 const context=await browser.newContext({viewport:{width,height:width===320?720:900},serviceWorkers:'block',reducedMotion:'reduce'});
 const fixtures=createAuditFixtures(),plan=fixtures['/api/workouts/active'];
 plan.exercises=examples.map((e,i)=>({id:'human-synthetic-'+i,plan_id:plan.id,exercise_name:i===0?'Supino personalizado do piloto':e.name,
  repdb_id:e.id,muscle_group:({chest:'Peitoral',upper_legs:'Pernas',back:'Costas',lower_legs:'Panturrilhas',core:'Abdômen e core',shoulders:'Ombros',upper_arms:'Braços'})[e.bodyPart]||'Corpo',training_day:'segunda',sets:3,reps_min:8,reps_max:12,rest_seconds:90,suggested_load_kg:20,notes:''}));
 if(cards){
  const pairs=[['bench-press','segunda','Peitoral'],['tricep-pushdown','segunda','Tríceps'],['barbell-row','terca','Costas'],['barbell-curl','terca','Bíceps']];
  plan.exercises=pairs.map(([id,day,muscle],i)=>({...plan.exercises[0],id:'card-fixture-'+i,exercise_name:humanExamples.find(e=>e.id===id).name,repdb_id:id,muscle_group:muscle,training_day:day}));
 }
 const catalog=[...humanExamples.map(e=>({id:e.id,name_en:e.sourceName,body_part:e.bodyPart,equipment:e.equipment,is_bodyweight:e.isBodyweight,primary_muscles:e.primaryMuscles||[],images:{flat:{start:'images/flat/'+e.id+'-start.webp',peak:'images/flat/'+e.id+'-peak.webp'}}})),
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
   const phase=e.frames[0].phase;await page.waitForFunction(p=>document.querySelector('.foco-21-exercise-media [data-foco-media-phase]')?.getAttribute('data-foco-media-phase')===p,phase);
   const href=await art.locator('svg image').getAttribute('href');assert.ok(href.endsWith('/'+e.asset));
   const illustrationBounds=await art.locator('.foco-exercise-visual').boundingBox();
   const counterBounds=await stage.locator('.foco-v7-stage-tag').boundingBox();
   assert.ok(counterBounds.y+counterBounds.height<=illustrationBounds.y+1,'Exercise counter must stay in the header above the picture');
   await page.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();},href);
   const controls=art.getByRole('group',{name:'Posições do exercício'});
   if(e.frames.length===1){assert.equal(await controls.count(),0);assert.match(await art.getByRole('img').getAttribute('aria-label'),/posição de referência/);}
   else{
    await controls.getByRole('button',{name:'02 FINAL',exact:true}).click();assert.equal(await art.getAttribute('data-foco-media-phase'),'peak');
    assert.equal(Number(await art.locator('svg image').getAttribute('x')),0-e.frames[1].x,'Changing pose must show the correct panel of this exercise');
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
  await page.goto(base+'?view=biblioteca&media=foco');await page.getByText(humanExamples.length+' movimentos',{exact:true}).waitFor();
  let checked=0;
  do{
   const cards=page.locator('.foco-repdb-exercise-card');assert.ok(await cards.count()<=24);
   for(const card of await cards.all()){
    await card.scrollIntoViewIfNeeded();await card.locator('[data-foco-media-source="foco-ai"] svg').waitFor();
    if(width===390){
     const name=await card.locator('strong').innerText(),e=humanExamples.find(x=>x.name===name);assert.ok(e,name);
     await card.getByRole('button').click();const dialog=page.getByRole('dialog'),art=dialog.locator('[data-foco-media-source="foco-ai"]');
     await art.locator('svg image[href$="/'+e.asset+'"]').waitFor();
     assert.equal(await art.getAttribute('data-foco-media-phase'),e.frames[0].phase);
     assert.equal(Number(await art.locator('svg image').getAttribute('x')),0-e.frames[0].x);
     assert.equal(Number(await art.locator('svg image').getAttribute('y')),0-e.frames[0].y);
     const href=await art.locator('svg image').getAttribute('href');await page.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();},href);
     await dialog.getByRole('heading',{name:'Como executar',exact:true}).waitFor();
     if(e.id==='bicycle-crunch'){
      assert.equal(await art.getAttribute('data-foco-media-layout'),'landscape');
      const dimensions=await art.boundingBox();assert.ok(dimensions.height<420,'Landscape bicycle must not keep an oversized square container');
      assert.equal(await dialog.locator('.foco-repdb-detail').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(34, 34, 34)');
      await art.screenshot({path:out+'/bicycle-detail-390.png'});
     }

     if(e.frames.length===2){
      await art.getByRole('button',{name:'02 FINAL',exact:true}).click();assert.equal(await art.getAttribute('data-foco-media-phase'),'peak');
      assert.equal(Number(await art.locator('svg image').getAttribute('x')),0-e.frames[1].x);
      assert.equal(Number(await art.locator('svg image').getAttribute('y')),0-e.frames[1].y);
     }else assert.equal(await art.getByRole('group',{name:'Posições do exercício'}).count(),0);
     await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});checked++;
    }
   }
   if(width!==390)break;
   const next=page.getByRole('navigation',{name:'Páginas da biblioteca'}).getByRole('button',{name:'Próxima',exact:true});
   if(await next.isDisabled())break;await next.click();
  }while(true);
  if(width===390)assert.equal(checked,humanExamples.length,'Every published variant must open the correct static frames and PT-BR copy');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:out+'/library-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,status:'PASS',exercises:examples.length,libraryVariants:humanExamples.length,externalWrites:0});console.log('PASS '+width+': '+examples.length+' session variants, '+humanExamples.length+' library variants, exact static frames and preserved live draft');await context.close();
 }
 for(const width of [320,390,768,1440]){
  const {context,page,errors}=await setup(width,{cards:true});await page.goto(base+'?view=dashboard');
  const cards=page.locator('.foco-plan-card');await cards.first().waitFor();assert.equal(await cards.count(),2);
  for(const card of await cards.all()){
   await card.scrollIntoViewIfNeeded();await card.locator('svg.foco-human-pose').waitFor();
   const geometry=await card.evaluate(el=>{
    const art=el.querySelector('.foco-plan-card-art'),meta=el.querySelector('.foco-plan-card-meta'),media=art.querySelector('.foco-repdb-media');
    const a=art.getBoundingClientRect(),m=meta.getBoundingClientRect();
    return {artRight:a.right,metaLeft:m.left,artHeight:a.height,border:getComputedStyle(media).borderWidth,background:getComputedStyle(el.querySelector('.foco-plan-card-body')).backgroundColor,mainColor:getComputedStyle(meta.querySelector('strong')).color,secondaryColor:getComputedStyle(meta.querySelector('small')).color};
   });
   assert.ok(geometry.artRight+8<=geometry.metaLeft,'Card text and illustration need a real gap');
   assert.ok(geometry.artHeight>=140);assert.equal(geometry.border,'0px');assert.equal(geometry.background,'rgb(34, 34, 34)');
   assert.equal(geometry.mainColor,'rgb(247, 247, 243)','The pastel card theme cannot make the graphite panel text dark');
   assert.equal(geometry.secondaryColor,'rgb(188, 188, 184)');
   assert.equal(await card.locator('.foco-media-heading').count(),0,'Compact card pictures must not contain source badges or pose controls');
  }
  await page.locator('.foco-home-plans').screenshot({path:out+'/plan-cards-'+width+'.png'});
  if(width===390){const a=await new AxeBuilder({page}).include('.foco-home-plans').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();writeFileSync(out+'/cards-axe.json',JSON.stringify(a.violations,null,2));assert.deepEqual(a.violations,[]);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await cards.first().focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Peito + Tríceps',exact:true}).waitFor();
  assert.deepEqual(errors,[]);await context.close();console.log('PASS '+width+': integrated graphite card media, full figures, no text overlap and keyboard navigation');
 }
 const {context,page}=await setup(390,{breakOwn:true});await page.goto(base+'?view=sessao');
 await page.getByRole('button',{name:new RegExp('^Ver exercício '+(sessionIds.indexOf('hammer-curl')+1)+':')}).click();
 const fallback=page.locator('.foco-21-exercise-media [data-foco-media-source="repdb"] img');await fallback.waitFor();
 assert.match(await fallback.getAttribute('src'),/hammer-curl-start\.webp$/,'Failed own media must use the same RepDB ID');
 assert.equal(await page.locator('.foco-21-exercise-media svg.foco-human-pose').count(),0);
 console.log('PASS: missing own image falls back to the same variant');await context.close();assert.equal(externalWrites,0);
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify({results,externalWrites},null,2));}
