import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {auditCredentials,createAuditFixtures} from './fixtures/audit-browser.mjs';
import {humanExamples} from './fixtures/human-media.mjs';

const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const out='work/workout-replacement-browser';mkdirSync(out,{recursive:true});const results=[];
const catalog={exercises:humanExamples.map(e=>({id:e.id,name_en:e.sourceName,body_part:e.bodyPart,equipment:e.equipment,primary_muscles:e.primaryMuscles||[],images:{flat:{start:'images/flat/'+e.id+'-start.webp',peak:'images/flat/'+e.id+'-peak.webp'}}}))};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const width of [320,390,768,1440]){
  const fixtures=createAuditFixtures();const oldPlan=fixtures['/api/workouts/active'];
  oldPlan.weekly_frequency=2;oldPlan.version=3;oldPlan.exercises=['segunda','quinta'].flatMap(day=>['Supino reto com barra','Puxada frontal na polia','Agachamento goblet','Panturrilha em pé unilateral'].map((exercise_name,i)=>({
   id:day+'-'+i,plan_id:oldPlan.id,exercise_name,muscle_group:i===0?'Peitoral':'Geral',repdb_id:i===0?'bench-press':null,training_day:day,position:i,sets:3,reps_min:8,reps_max:12,rest_seconds:120,suggested_load_kg:40,notes:'Orientação original a preservar nos outros exercícios.'})));
  fixtures['/api/workouts']=[oldPlan];let activePlan=structuredClone(oldPlan),saves=0,failSave=width===390,stale=false,holdRead=false,releaseRead;
  const original=structuredClone(oldPlan),payloads=[],pageErrors=[];
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(credentials=>{localStorage.setItem('foco_auth_token',credentials.access);localStorage.setItem('foco_selected_training_day','segunda');},auditCredentials);
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   const json=(status,data)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname.startsWith('/functions/v1/foco-api')){
    const path=url.pathname.replace('/functions/v1/foco-api','');if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(path==='/api/workouts'&&request.method()==='POST'){
     saves++;const body=request.postDataJSON();payloads.push(body);if(failSave===true)return json(503,{error:'Synthetic save failure'});
     activePlan={...body,id:'new-synthetic-plan',user_id:oldPlan.user_id,exercises:body.exercises.map((e,i)=>({...e,id:'new-'+i,plan_id:'new-synthetic-plan'}))};
     if(failSave==='after-commit')return json(503,{error:'Synthetic lost acknowledgment'});return json(201,activePlan);
    }
    assert.equal(request.method(),'GET','No unrelated mutation is permitted: '+path);
    if(path==='/api/workouts/active'){
     if(holdRead){holdRead=false;await new Promise(resolve=>{releaseRead=resolve;});}
     return json(200,stale?{...activePlan,name:'Changed elsewhere'}:activePlan);
    }
    assert.ok(Object.hasOwn(fixtures,path),'Missing fixture '+path);return json(200,fixtures[path]);
   }
   if(url.pathname.endsWith('/exercises.json'))return json(200,catalog);
   if(url.origin===new URL(base).origin)return route.continue();return route.abort('blockedbyclient');
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>pageErrors.push(e.message));
  const chooseTarget=async()=>{
   await page.goto(base+'?view=detalhes');await page.getByRole('button',{name:'Substituições',exact:true}).click();
   await page.getByRole('button',{name:'Substituir Supino reto com barra',exact:true}).click();
   await page.getByRole('heading',{name:'Escolha o novo exercício',exact:true}).waitFor();
   await page.getByRole('textbox',{name:'Pesquisar exercícios'}).fill('Abdominal bicicleta');
   await page.getByRole('button',{name:'Ver Abdominal bicicleta',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'Adicionar à minha ficha',exact:true}).count(),0);
   await page.getByRole('button',{name:'Usar na substituição',exact:true}).click();
   await page.getByRole('dialog',{name:'Confirmar substituição do exercício'}).waitFor();
  };
  await chooseTarget();assert.equal(saves,0,'Selecting and reviewing do not save anything');
  const dialog=page.getByRole('dialog',{name:'Confirmar substituição do exercício'});
  await dialog.getByText('Grupo muscular:',{exact:false}).waitFor();await dialog.getByText('Supino reto com barra',{exact:false}).waitFor();
  await dialog.getByText('A carga inicial do novo movimento será zero',{exact:false}).waitFor();
  if(width===390){
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   writeFileSync(out+'/replacement-axe.json',JSON.stringify(axe.violations,null,2));assert.deepEqual(axe.violations,[]);
  }
  await page.screenshot({path:out+`/confirm-${width}.png`,fullPage:true});
  const confirm=dialog.getByRole('button',{name:'Substituir e ativar nova versão',exact:true});
  if(width===390){
   await confirm.click();await dialog.getByRole('alert').waitFor();assert.equal(saves,1);assert.equal(await dialog.getByRole('textbox',{name:'Nome personalizado do exercício'}).inputValue(),'Abdominal bicicleta');
   failSave=false;stale=true;await confirm.click();await dialog.getByRole('alert').filter({hasText:'ficha mudou'}).waitFor();assert.equal(saves,1,'A stale plan must be rejected before saving');stale=false;
  }
  holdRead=true;await confirm.evaluate(button=>{button.click();button.click();});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Salvando nova versão')&&b.disabled));
  for(let attempt=0;attempt<40&&typeof releaseRead!=='function';attempt++)await page.waitForTimeout(25);
  assert.equal(typeof releaseRead,'function');releaseRead();await page.waitForURL(/view=detalhes/);
  assert.equal(saves,width===390?2:1,'Double activation cannot create a second version');
  const saved=payloads.at(-1);assert.equal(saved.version,4);assert.equal(saved.status,'ativo');assert.equal(saved.exercises.length,original.exercises.length);
  assert.equal(saved.exercises.filter(ex=>ex.training_day==='segunda').length,4);
  const first=saved.exercises[0];assert.equal(first.exercise_name,'Abdominal bicicleta');assert.equal(first.repdb_id,'bicycle-crunch');assert.equal(first.muscle_group,'Abdômen');assert.equal(first.suggested_load_kg,0);assert.equal(first.notes,'');
  for(const field of ['sets','reps_min','reps_max','rest_seconds','training_day','position'])assert.equal(first[field],original.exercises[0][field]);
  for(let i=1;i<saved.exercises.length;i++){const {id,plan_id,...prescription}=original.exercises[i];assert.deepEqual(saved.exercises[i],prescription);}
  assert.deepEqual(oldPlan,original,'Saving a new version cannot alter historic plan data');
  await page.goto(base+'?view=biblioteca');await page.getByRole('textbox',{name:'Pesquisar exercícios'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Escolha o novo exercício',exact:true}).count(),0,'Intent clears after success');
  if(width===390){
   activePlan=structuredClone(original);await chooseTarget();failSave='after-commit';
   const beforeLost=saves;await confirm.click();await dialog.getByRole('alert').waitFor();assert.equal(saves,beforeLost+1);
   failSave=false;await confirm.click();await dialog.getByRole('alert').filter({hasText:'ficha mudou'}).waitFor();
   assert.equal(saves,beforeLost+1,'A lost acknowledgment cannot lead to a second saved version on retry');
   await dialog.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Cancelar substituição',exact:true}).click();
   await page.waitForURL(/view=detalhes/);
   // Cancellation and leaving the library both discard the temporary intent.
   activePlan=structuredClone(original);await chooseTarget();await dialog.getByRole('button',{name:'Fechar',exact:true}).click();
   await page.getByRole('button',{name:'Cancelar substituição',exact:true}).click();await page.waitForURL(/view=detalhes/);
   await page.goto(base+'?view=biblioteca');await page.getByRole('textbox',{name:'Pesquisar exercícios'}).waitFor();
   assert.equal(await page.getByRole('heading',{name:'Escolha o novo exercício',exact:true}).count(),0);
   await chooseTarget();await dialog.getByRole('button',{name:'Fechar',exact:true}).click();
   await page.getByRole('button',{name:'Perfil',exact:true}).click();await page.getByRole('heading',{name:'Perfil',exact:true}).waitFor();
   await page.goto(base+'?view=biblioteca');await page.getByRole('textbox',{name:'Pesquisar exercícios'}).waitFor();
   assert.equal(await page.getByRole('heading',{name:'Escolha o novo exercício',exact:true}).count(),0,'Leaving the route discards the intent');
  }
  assert.deepEqual(pageErrors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  results.push({width,passed:true,saves,external_writes:0});console.log('PASS '+width+'px: explicit replacement, accurate media/group, preserved day/dose/history, fresh-plan guard and one atomic save');
  await context.close();
 }
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}
