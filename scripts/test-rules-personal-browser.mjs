import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {auditCredentials,createAuditFixtures} from './fixtures/audit-browser.mjs';
import {buildAutomaticWorkout} from '../supabase/functions/foco-api/automaticPlanner.mjs';
const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const output='work/rules-personal-browser';mkdirSync(output,{recursive:true});const results=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 const fixtures=createAuditFixtures();let previews=0,questions=0,saves=0;const questionPayloads=[],previewPayloads=[],previewResults=[];let replyFails=false,holdPreview=false,releasePreview;const savedPlans=[];
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.startsWith('/functions/v1/foco-api')){
   const path=url.pathname.replace('/functions/v1/foco-api','');const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
   const json=(status,value)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(value)});
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(path==='/api/workouts/preview'&&request.method()==='POST'){
    previews++;const b=request.postDataJSON();previewPayloads.push(b);
    const plan=buildAutomaticWorkout({days:b.available_days,experience:b.experience_level,
      goal:b.goal,sessionMinutes:b.session_minutes,equipmentAvailable:b.equipment_available,priorityMuscles:b.focus_muscles.split(',')});
    previewResults.push(plan);if(holdPreview){holdPreview=false;await new Promise(resolve=>{releasePreview=resolve;});}return json(200,plan);
   }
   if(path==='/api/ai/personal'&&request.method()==='POST'){
    questions++;questionPayloads.push(request.postDataJSON());
    if(replyFails)return json(429,{error:'Cota sintética indisponível. Aguarde antes de enviar novamente.'});
    return json(200,{answer:'RIR é a estimativa de repetições em reserva. Use os registros e confira técnica e recuperação antes de progredir.',
      references:[{id:'LAB05',page:5,rule:'Esforço deve considerar técnica e recuperação.'}],ai_generation:{provider:'gemini',calls:1}});
   }
   if(path==='/api/workouts'&&request.method()==='POST'){saves++;savedPlans.push(request.postDataJSON());return json(201,{id:'new-synthetic-plan'});}
   assert.equal(request.method(),'GET','Unexpected write '+path);
   return json(Object.hasOwn(fixtures,path)?200:404,fixtures[path]||{error:'Missing fixture'});
  }
  if(url.hostname==='127.0.0.1')return route.continue();return route.abort('blockedbyclient');
 });
 await context.addInitScript(c=>{localStorage.setItem('foco_auth_token',c.access);localStorage.setItem('foco_auth_refresh_token',c.refresh);},auditCredentials);
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?view=novo-treino');await page.locator('button[type=submit]:not([disabled])').waitFor();
 await page.locator('#foco-ai-goal').selectOption('Recomposição corporal');
 await page.getByRole('button',{name:'Montar ficha automática',exact:true}).click();await page.getByText('Montada por regras · sem IA',{exact:true}).waitFor();
 assert.equal(previews,1);assert.equal(questions,0);
 await page.reload();await page.getByText('Proposta recuperada sem recalcular a ficha.',{exact:false}).waitFor();assert.equal(previews,1);
 assert.equal(await page.locator('#foco-ai-goal').inputValue(),'Recomposição corporal');
 await page.screenshot({path:`${output}/automatic-${width}.png`,fullPage:true});
 await page.locator('#foco-ai-goal').selectOption('Saúde e qualidade de vida');
 await page.getByRole('button',{name:'Montar ficha automática',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Aprovar e Ativar Ficha',exact:true}).count(),0,'Changing preferences invalidates the old preview');
 await page.locator('#foco-ai-frequency').selectOption('7');await page.locator('#foco-automatic-minutes').fill('40');
 await page.locator('#foco-ai-experience').selectOption('iniciante');
 if(width===390){
  for(const muscle of ['Glúteos','Quadríceps','Posterior de coxa','Panturrilhas','Costas','Peitoral','Ombros','Bíceps','Tríceps','Abdômen e core']){
   const button=page.getByRole('button',{name:new RegExp('^'+muscle+'(?: |$)')});
   if(await button.getAttribute('aria-pressed')!=='true')await button.click();
  }
  await page.getByText('Todos selecionados: distribuição equilibrada.',{exact:false}).waitFor();
 }
 await page.getByRole('button',{name:'Montar ficha automática',exact:true}).click();
 await page.getByText('7 treinos por semana · frequência respeitada',{exact:true}).waitFor();
 assert.equal(previews,2);assert.equal(questions,0);assert.equal(previewPayloads[1].available_days.length,7);
 assert.deepEqual(previewResults[1].planning.strength_days,['segunda','terca','quarta','quinta','sexta','sabado','domingo']);
 assert.notDeepEqual(previewResults[0].exercises,previewResults[1].exercises);
 if(width===390){
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  writeFileSync(`${output}/automatic-axe.json`,JSON.stringify(audit.violations,null,2));assert.deepEqual(audit.violations,[]);
 }
 await page.screenshot({path:`${output}/recovery-${width}.png`,fullPage:true});
 if(width===390){
  holdPreview=true;await page.getByRole('button',{name:'Recalcular ficha',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('button[type=submit]')?.disabled);
  await page.locator('#foco-ai-goal').selectOption('Força Pura & Cargas');
  assert.equal(await page.getByRole('button',{name:'Aprovar e Ativar Ficha',exact:true}).count(),0);
  assert.equal(typeof releasePreview,'function');releasePreview();
  await page.getByRole('button',{name:'Montar ficha automática',exact:true}).waitFor({state:'visible'});
  await page.locator('button[type=submit]:not([disabled])').waitFor();
  assert.equal(await page.getByRole('button',{name:'Aprovar e Ativar Ficha',exact:true}).count(),0,'A late response must not restore a stale proposal');
  await page.getByRole('button',{name:'Montar ficha automática',exact:true}).click();
  await page.getByRole('button',{name:'Aprovar e Ativar Ficha',exact:true}).waitFor();
  assert.equal(previews,4);assert.equal(previewResults[3].goal,'Força Pura & Cargas');
 }
 await page.getByRole('button',{name:'Aprovar e Ativar Ficha',exact:true}).click();await page.waitForURL(/view=treinos/);assert.equal(saves,1);assert.equal(savedPlans[0].goal,previewResults.at(-1).goal);assert.deepEqual(savedPlans[0].exercises,previewResults.at(-1).exercises);
 await page.goto(base+'?view=personal');await page.getByRole('heading',{name:'Personal FOCO',exact:true}).waitFor();assert.equal(questions,0);
 await page.getByRole('button',{name:'O que significa RIR no meu treino?',exact:true}).click();assert.equal(questions,0);
 const sharing=page.getByRole('checkbox',{name:'Usar minha ficha ativa e os últimos treinos nesta pergunta'});
 try{await sharing.check();assert.equal(await sharing.isChecked(),true);await sharing.uncheck();}catch(error){await page.screenshot({path:`${output}/checkbox-failed-${width}.png`,fullPage:true});throw error;}
 await page.getByRole('button',{name:'Perguntar ao Personal',exact:true}).click();await page.locator('.foco-personal-message.is-assistant').waitFor();
 assert.equal(questions,1);assert.equal(questionPayloads[0].share_training_context,false);
 await page.reload();await page.locator('.foco-personal-message.is-assistant').waitFor();assert.equal(questions,1);
 await page.locator('.foco-personal-message summary').click();await page.getByText('LAB05 · página 5',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 if(width===390){const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();writeFileSync(`${output}/personal-axe.json`,JSON.stringify(audit.violations,null,2));assert.deepEqual(audit.violations,[]);}
 await page.screenshot({path:`${output}/personal-${width}.png`,fullPage:true});
 await page.getByRole('checkbox',{name:'Usar minha ficha ativa e os últimos treinos nesta pergunta'}).check();
 await page.getByRole('textbox',{name:'Sua pergunta',exact:true}).fill('Como aplico isso ao meu treino?');await page.getByRole('button',{name:'Perguntar ao Personal',exact:true}).click();
 await page.locator('.foco-personal-message.is-assistant').nth(1).waitFor();assert.equal(questionPayloads[1].history.length,2);assert.equal(questionPayloads[1].share_training_context,true);
 replyFails=true;await page.getByRole('textbox',{name:'Sua pergunta',exact:true}).fill('Como ajustar o descanso?');
 await page.getByRole('button',{name:'Perguntar ao Personal',exact:true}).click();await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Sua pergunta',exact:true}).inputValue(),'Como ajustar o descanso?');assert.equal(questions,3);assert.equal(saves,1);
 await page.goto(base+'?view=configuracoes');await page.getByRole('button',{name:'Sair da conta',exact:true}).click();
 await page.getByRole('heading',{name:'Entre na sua conta.',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>key.startsWith('foco:personal:'))),false,'Logout must clear conversation data');
 assert.deepEqual(errors,[]);results.push({width,status:'PASS',previews,questions,saves,external_writes:0});console.log(`PASS ${width}px: changed preferences, recoverable calendar, retained proposal, approval, Personal, citations, reload and quota recovery`);
 await context.close();
}}finally{await browser.close();writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));}
