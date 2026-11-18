import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {auditCredentials,createAuditFixtures} from './fixtures/audit-browser.mjs';
import {buildAutomaticWorkout} from '../supabase/functions/foco-api/automaticPlanner.mjs';

const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const out='work/brand-copy-browser';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const counters={preview:0,save:0,review:0,extraction:0,external_writes:0};
const fixtures=createAuditFixtures();
const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
await context.addInitScript(token=>localStorage.setItem('foco_auth_token',token),auditCredentials.access);
await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/functions/v1/foco-api')){
    const path=url.pathname.replace('/functions/v1/foco-api','');
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
    const json=(status,body)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(path==='/api/workouts/preview'&&req.method()==='POST'){
      counters.preview++;const b=req.postDataJSON();return json(200,buildAutomaticWorkout({days:b.available_days,experience:b.experience_level,goal:b.goal,sessionMinutes:b.session_minutes,equipmentAvailable:b.equipment_available,priorityMuscles:b.focus_muscles.split(',')}));
    }
    if(path==='/api/workouts'&&req.method()==='POST'){counters.save++;return json(500,{});}
    if(path==='/api/ai/review-progression'&&req.method()==='POST'){counters.review++;return json(500,{});}
    if(path==='/api/ai/extract-sheet'&&req.method()==='POST'){
      counters.extraction++;return json(200,{plan_name:'Ficha importada sintética',goal:'Saúde',weekly_frequency:2,confidence_notes:'Revisão sintética',extracted_exercises:[{exercise_name:'Supino reto com barra',muscle_group:'Peitoral',training_day:'segunda',sets:2,reps_min:8,reps_max:12,rest_seconds:120,suggested_load_kg:0,notes:'Conferir execução.'}]});
    }
    assert.equal(req.method(),'GET','Unexpected synthetic mutation '+path);
    assert.ok(Object.hasOwn(fixtures,path),'Missing fixture '+path);return json(200,fixtures[path]);
  }
  if(url.origin===new URL(base).origin&&['GET','HEAD'].includes(req.method()))return route.continue();
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))counters.external_writes++;
  return route.abort('blockedbyclient');
});
const page=await context.newPage();page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'?view=novo-treino');await page.locator('button[type=submit]:not([disabled])').waitFor();
  assert.equal(await page.getByText(/Modelos e regras do seu estudo/).count(),0);
  await page.getByText('Como funciona a montagem',{exact:true}).click();
  await page.getByText(/A montagem usa regras, sem chamadas à IA ou consumo de créditos/).waitFor();
  await page.getByRole('button',{name:'Montar ficha automática',exact:true}).click();
  await page.getByText('Montada por regras · sem IA',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Aprovar e ativar ficha',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Não foi possível confirmar o salvamento da ficha. Confira Meus treinos antes de tentar novamente.'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Aprovar e ativar ficha',exact:true}).isEnabled(),true);
  await page.getByText('Montada por regras · sem IA',{exact:true}).waitFor();
  assert.doesNotMatch(await page.getByRole('alert').innerText(),/HTTP|banco|500/);
  await page.screenshot({path:out+'/save-recovery-390.png',fullPage:true});

  await page.goto(base+'?view=revisao');await page.getByRole('button',{name:'Revisar treino',exact:true}).waitFor();
  await page.getByText('Como funciona a revisão',{exact:true}).click();await page.getByText(/sem chamadas à IA ou consumo de créditos/).waitFor();
  await page.getByRole('button',{name:'Revisar treino',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Não foi possível confirmar a revisão. Atualize suas revisões antes de tentar novamente.'}).waitFor();
  assert.doesNotMatch(await page.getByRole('alert').innerText(),/HTTP|banco|500/);

  await page.goto(base+'?view=arquivos');await page.locator('#foco-body-file').setInputFiles({name:'ficha-sintetica.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nsynthetic fixture only\n%%EOF')});
  await page.getByRole('button',{name:'Extrair exercícios com IA',exact:true}).click();
  await page.getByRole('button',{name:'Aprovar e ativar ficha',exact:true}).waitFor();
  await page.getByRole('button',{name:'Aprovar e ativar ficha',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Não foi possível confirmar o salvamento da ficha. Confira Meus treinos antes de tentar novamente.'}).waitFor();
  await page.getByText('Ficha importada sintética',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Aprovar e ativar ficha',exact:true}).isEnabled(),true);
  assert.equal(counters.preview,1);assert.equal(counters.save,2);assert.equal(counters.review,1);assert.equal(counters.extraction,1);assert.equal(counters.external_writes,0);assert.deepEqual(errors,[]);
  writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',...counters},null,2));
  console.log('BRAND COPY: method/AI disclosure, blank HTTP 500 recovery, retained automatic/import previews and review guidance passed with synthetic services.');
}finally{await browser.close();}
