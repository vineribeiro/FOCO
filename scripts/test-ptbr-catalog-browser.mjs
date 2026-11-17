import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {auditCredentials,createAuditFixtures} from './fixtures/audit-browser.mjs';
const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const output='work/ptbr-catalog-browser';mkdirSync(output,{recursive:true});const results=[];
const source=[
 {id:'bench-press',name_en:'Barbell Bench Press',body_part:'chest',equipment:'barbell',primary_muscles:['pectoralis_major']},
 {id:'dumbbell-romanian-deadlift',name_en:'Dumbbell Romanian Deadlift',body_part:'upper_legs',equipment:'dumbbell',primary_muscles:['hamstrings']},
 {id:'plank',name_en:'Plank',body_part:'core',is_bodyweight:true,primary_muscles:['rectus_abdominis']},
 {id:'banded-fire-hydrant',name_en:'Banded Fire Hydrant',body_part:'upper_legs',equipment:'loop_band',primary_muscles:['gluteus_medius']},
 ...Array.from({length:100},(_,i)=>({id:'synthetic-unreviewed-'+i,name_en:'Future untranslated movement '+i,body_part:'full_body',equipment:'dumbbell',primary_muscles:[]})),
].map(e=>({...e,instructions_en:['SOURCE ENGLISH INSTRUCTION SHOULD NOT APPEAR'],images:{flat:e.id==='plank'?{main:'images/flat/plank-main.webp'}:{start:'images/flat/'+e.id+'-start.webp',peak:'images/flat/'+e.id+'-peak.webp'}}}));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L5sAAAAASUVORK5CYII=','base64');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 const fixtures=createAuditFixtures();const writes=[];let brokenBenchStart=false;
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const json=(status,body)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname.startsWith('/functions/v1/foco-api')){
   const path=u.pathname.replace('/functions/v1/foco-api','');
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(req.method()==='POST'&&/\/api\/workouts\/[^/]+\/exercises$/.test(path)){
    const body=req.postDataJSON();writes.push(body.exercise||body);return json(201,{id:'synthetic-new-exercise',...writes.at(-1)});
   }
   assert.equal(req.method(),'GET','No unexpected external write');return json(Object.hasOwn(fixtures,path)?200:404,fixtures[path]||{error:'Fixture absent'});
  }
  if(u.pathname.endsWith('/exercises.json'))return json(200,{count:source.length,exercises:source});
  if(u.pathname.includes('/images/flat/')){
   if(u.pathname.endsWith('/bench-press-start.webp')){brokenBenchStart=true;return route.fulfill({status:404});}
   return route.fulfill({status:200,contentType:'image/png',body:png});
  }
  if(u.origin===new URL(base).origin)return route.continue();return route.abort();
 });
 await context.addInitScript(c=>{localStorage.setItem('foco_auth_token',c.access);localStorage.setItem('foco_auth_refresh_token',c.refresh);},auditCredentials);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(base+'?view=biblioteca');const search=page.getByRole('textbox',{name:'Pesquisar exercícios',exact:true});await search.waitFor();
 await search.fill('supino');await page.getByRole('button',{name:'Ver Supino reto com barra',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('heading',{name:'Como executar',exact:true}).waitFor();
 assert.match(await dialog.innerText(),/Retire a barra dos suportes/);assert.doesNotMatch(await dialog.innerText(),/SOURCE ENGLISH|Instruções da fonte \(inglês\)/);
 await dialog.locator('img.foco-repdb-pose[alt$="posição final"]').waitFor();assert.equal(brokenBenchStart,true,'Broken initial pose must preserve the final pose label');
 if(width===390){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();writeFileSync(output+'/detail-axe.json',JSON.stringify(a.violations,null,2));assert.deepEqual(a.violations,[]);}
 await page.screenshot({path:output+'/detail-'+width+'.png',fullPage:true});
 await dialog.getByRole('button',{name:'Fechar',exact:true}).click();
 await search.fill('Bench Press');await page.getByRole('button',{name:'Ver Supino reto com barra',exact:true}).waitFor();
 await search.fill('posteriores da coxa');await page.getByRole('button',{name:'Ver Levantamento terra romeno com halteres',exact:true}).waitFor();
 await search.fill('prancha');await page.getByRole('button',{name:'Ver Prancha',exact:true}).getByRole('img',{name:'Prancha — posição de referência',exact:true}).waitFor();
 await page.getByRole('button',{name:'Ver Prancha',exact:true}).click();
 await page.getByRole('dialog').getByRole('img',{name:'Prancha — posição de referência',exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await search.fill('Abdução de quadril em quatro apoios com elástico');
 await page.getByRole('button',{name:'Ver Abdução de quadril em quatro apoios com elástico',exact:true}).click();
 await page.getByRole('dialog').getByText('A imagem final mostra o joelho estendido',{exact:false}).waitFor();
 assert.equal(await page.getByRole('dialog').locator('img.foco-repdb-pose').count(),0,'Reviewed hold cannot silently show the wrong variation');
 await page.getByRole('dialog').getByRole('button',{name:'Fechar',exact:true}).click();
 await search.fill('supino');await page.getByRole('button',{name:'Ver Supino reto com barra',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Adicionar à minha ficha',exact:true}).click();
 const own=page.getByRole('textbox',{name:'Nome personalizado do exercício',exact:true});await own.waitFor();assert.equal(await own.inputValue(),'Supino reto com barra');
 await own.fill('Supino personalizado da revisão');await page.locator('.foco-atlas-plan-list button').first().click();
 await page.getByText('Supino personalizado da revisão foi adicionado',{exact:false}).waitFor();
 assert.equal(writes.length,1);assert.equal(writes[0].repdb_id,'bench-press');assert.equal(writes[0].exercise_name,'Supino personalizado da revisão');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 results.push({width,status:'PASS',externalWrites:0});console.log('PASS '+width+'px: PT-BR, source search, localized muscles, reference/final poses, review hold and persistent media ID');await context.close();
}}finally{await browser.close();writeFileSync(output+'/results.json',JSON.stringify(results,null,2));}
