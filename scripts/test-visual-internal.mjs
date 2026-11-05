import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

// UI-only fixtures. All requests to the production API are intercepted.
// No real user is authenticated and NO request reaches data mutation endpoints.
const base = process.env.FOCO_VISUAL_BASE || 'https://vineribeiro.github.io/FOCO/';
const out = 'visual-qa/internal';
mkdirSync(out, { recursive: true });
const date = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const user = { id: 'visual-qa-user', full_name: 'Atleta Teste', email: 'atleta@exemplo.invalid' };
const profile = { id: user.id, full_name: user.full_name, current_weight_kg: 76.1, experience_level: 'intermediario', height_cm: 171 };
const days = ['segunda','terca','quarta','quinta','sexta','sabado'];
const lifts = [
  ['Supino reto com barra','Peitoral'],['Puxada frontal na polia','Costas'],
  ['Leg press 45 graus','Quadríceps'],['Mesa flexora','Posteriores'],
  ['Prancha abdominal','Core'],
];
const exercises = days.flatMap(day => lifts.map(([exercise_name,muscle_group],i) => ({
  id: day + '-' + i, plan_id: 'qa-plan', exercise_name, muscle_group,
  training_day: day, sets: i === 4 ? 2 : 3, reps_min: 8,
  reps_max: 12, rest_seconds: 90, suggested_load_kg: 0, notes: '',
})));
const plan = { id: 'qa-plan', user_id: user.id, name: 'Plano ilustrativo de treino', version: 1,
  status: 'ativo', weekly_frequency: 6, goal: 'Força e composição corporal',
  created_at: date(30), exercises };
const sessions = [3,10,20].map((ago,i)=>({
  id: 'session-' + i, user_id:user.id,plan_id:plan.id,plan_name:plan.name,
  status:'completed',duration_seconds: 3300 + i*120,
  started_at:date(ago),finished_at:date(ago),
  sets:[{id:'set-'+i,exercise_name:lifts[0][0],set_number:1,repetitions:10,load_kg:40+i*2,completed:true}],
}));
const files = [0,32].map((ago,i)=>({
  id:'report-'+i,user_id:user.id,filename:'avaliacao-exemplo-'+i+'.pdf',
  processing_status:'processed',mime_type:'application/pdf',storage_path:'not-a-real-file',
  created_at:date(ago),extracted_data:{
    summary:'Dados ilustrativos para inspeção do layout. Não representam uma avaliação real.',
    metrics:[
      {name:'Peso corporal',value:(76.1+i*0.6).toFixed(1).replace('.',',')+' kg',interpretation:'Indicador estimado do relatório.'},
      {name:'Gordura corporal',value:(25.5+i).toFixed(1).replace('.',',')+'%',interpretation:'Tendência ilustrativa.'},
      {name:'Massa muscular esquelética',value:(28.3-i*0.2).toFixed(1).replace('.',',')+' kg',interpretation:'Estimativa do equipamento.'},
      {name:'Gordura visceral',value:String(12+i),interpretation:'Índice estimado do relatório.'},
      {name:'IMC',value:(26.0+i*0.2).toFixed(1).replace('.',','),interpretation:'Relação peso/altura.'},
      {name:'Água corporal',value:'52,3%',interpretation:'Estimativa.'},
      {name:'Metabolismo basal',value:'1650 kcal',interpretation:'Estimativa.'},
      {name:'Massa óssea',value:'3,0 kg',interpretation:'Estimativa.'},
    ],
    limitations:'Os dados são demonstrativos e não substituem avaliação profissional.',
  },
}));
const anamnesis={
  primary_goal:'hipertrofia',goal_details:'Ganhar força de forma progressiva',
  training_age:'intermediario',activity_level:'moderado',weekly_frequency:6,
  session_minutes:60,preferred_days:days,priority_muscles:['Costas','Quadríceps'],
  equipment_available:['Academia completa'],current_routine:'Treino de força',
  exercise_preferences:'',pain_or_injuries:'',health_notes:'',
  sleep_quality:'regular',cardio_habits:'Caminhadas',consent_health_data:true,
};
const responses = {
  '/api/auth/me': {user, profile},
  '/api/profile':profile,
  '/api/anamnesis':anamnesis,
  '/api/workouts/active':plan,
  '/api/workouts':[plan],
  '/api/sessions':sessions,
  '/api/files':files,
  '/api/measurements':[0,15,30].map((d,i)=>({id:'m-'+i,user_id:user.id,measurement_type:'peso',value:76.1+i*0.25,unit:'kg',measured_at:date(d)})),
  '/api/recommendations':[],
  '/api/goals':[],
  '/api/system/status':{app:'FOCO',version:'qa-fixture',ai_status:'configured',database:'fixture'},
};
const viewports=[{name:'mobile-320',width:320,height:720},{name:'mobile-390',width:390,height:844},
 {name:'tablet-768',width:768,height:1024},{name:'desktop-1440',width:1440,height:900}];
const views=['dashboard','detalhes','sessao','treinos','progresso','perfil','anamnese','arquivos','novo-treino','biblioteca'];
const browser=await chromium.launch({headless:true});
let failed=false; const results=[];
try{
 for(const size of viewports){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,
   colorScheme:'dark',reducedMotion:'reduce',isMobile:size.width<768,hasTouch:size.width<768});
  await context.addInitScript(()=>localStorage.setItem('foco_auth_token','qa-mocked-token'));
  await context.route('**/functions/v1/foco-api/**',async route=>{
    const req=route.request();
    const path=new URL(req.url()).pathname.replace('/functions/v1/foco-api','');
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, OPTIONS'},body:''});
    if(req.method()!=='GET') return route.fulfill({status:403,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({error:'Blocked by visual QA'})});
    const body=Object.prototype.hasOwnProperty.call(responses,path)?responses[path]:null;
    return route.fulfill({status:body===null?404:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body??{error:'No visual fixture for '+path})});
  });
  const page=await context.newPage();
  for(const view of views){
   try{
    const jsErrors=[];
    const onPageError=(err)=>jsErrors.push(String(err));
    page.on('pageerror',onPageError);
    const response=await page.goto(base+'?view='+view,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(response?.status(),200,'Site HTTP status');
    await page.locator('.foco-v4-page').first().waitFor({timeout:16000});
    await page.waitForTimeout(1000);
    const check=await page.evaluate(()=>({
      body:document.body.scrollWidth,doc:document.documentElement.scrollWidth,viewport:window.innerWidth,
      title:document.querySelector('.foco-v4-page h1')?.textContent?.trim()||'',
      text:document.querySelector('.foco-v4-page')?.textContent?.slice(0,200)||'',
    }));
    const overflow=Math.max(check.body,check.doc)-check.viewport;
    // Critical visual gate: a CSS shell with a broken photo is not an acceptable
    // implementation of the reference's cinematic hero.
    if(view==='dashboard'){
      await page.locator('.foco-v6-hero img').first().waitFor({timeout:6000});
      await page.waitForFunction(()=>{
        const img=document.querySelector('.foco-v6-hero img');
        return img && (img.complete || img.naturalWidth>0);
      },{timeout:7000});
      const hero=await page.locator('.foco-v6-hero img').first().evaluate(img=>({
        loaded:img.complete&&img.naturalWidth>100&&img.naturalHeight>100,
        width:img.naturalWidth,height:img.naturalHeight,
      }));
      assert.ok(hero.loaded,'FOCO hero athlete media must decode, not show a broken-image icon');
      // A visible release badge and new composition are required; a CSS-only deploy
      // that leaves the previous Home unchanged is not sufficient for this beta.
      const visualRelease=page.locator('.foco-21-version-pill');
      assert.ok((await visualRelease.innerText()).includes('V2.1'),'FOCO 2.1 release badge must be visible');
      await page.locator('.foco-21-week-pulse').waitFor({timeout:4000});
      const homeStyle=await page.locator('.foco-v6-hero').evaluate(el=>({
        radius:getComputedStyle(el).borderRadius,height:el.getBoundingClientRect().height,
      }));
      assert.ok(homeStyle.radius.includes('30px'),'FOCO V2.1 hero should have the new 30px corner radius');
      assert.ok(homeStyle.height>=380,'FOCO V2.1 hero must be visually larger than V2.0');
    }
    if(view==='sessao'){
      const photo=page.locator('.foco-v7-stage-photo');
      await photo.first().waitFor({timeout:7000});
      const photoLoaded=await photo.first().evaluate(img=>img.complete&&img.naturalWidth>100);
      assert.ok(photoLoaded,'Supino active session must render an exercise-specific photographic asset');
      assert.ok((await page.locator('.foco-21-session-mark').innerText()).includes('FOCO 2.1'),'FOCO 2.1 session marker must be visible');
      await page.locator('.foco-21-exercise-media').waitFor({timeout:4000});
      const stage=await page.locator('.foco-v7-session-stage').evaluate(el=>({
        radius:getComputedStyle(el).borderRadius,height:el.getBoundingClientRect().height,
      }));
      assert.ok(stage.radius.includes('30px'),'FOCO V2.1 stage must have new 30px geometry');
      assert.ok(stage.height>=325,'FOCO V2.1 exercise card must be visibly larger than prior layout');
      if(size.width<768){
        const overlap=await page.evaluate(()=>{
          const rest=document.querySelector('.foco-21-rest');
          const cta=document.querySelector('.foco-v7-session-start');
          return rest&&cta?{rest:rest.getBoundingClientRect().bottom,cta:cta.getBoundingClientRect().top,position:getComputedStyle(cta).position}:null;
        });
        assert.ok(overlap&&overlap.position==='static'&&overlap.rest<=overlap.cta+1,'Start CTA must not obscure rest controls');
      }
      // Regression from beta device report: non-bench hero must never render the
      // full image gallery's white caption strip, zoom button or phase switches.
      await page.getByRole('button',{name:/Ver exercício 3:/}).click();
      await page.locator('.foco-v7-stage-illustration.foco-v7-exercise-visual').waitFor({timeout:6000});
      // The 2026-11-05 beta screenshot was specifically of Leg press 45 graus.
      assert.match(await page.locator('.foco-v7-stage-footer h2').innerText(),/Leg press 45 graus/i);
      await page.screenshot({path:out+'/legpress-'+size.name+'.png',fullPage:false,animations:'disabled'});
      assert.equal(await page.locator('.foco-v7-stage-illustration button').count(),0,'Stage preview must not inject nested image controls');
      assert.equal(await page.locator('.foco-v7-stage-illustration [class*="bg-white"]').count(),0,'No white gallery overlays in stage');
      await page.getByRole('button',{name:/Ver exercício 1:/}).click();
    }
    const screenshot=out+'/'+view+'-'+size.name+'.png';
    await page.screenshot({path:screenshot,fullPage:false,animations:'disabled'});
    const issue=overflow>2?'horizontal overflow '+overflow+' px':!check.title?'page heading missing':jsErrors.length?'JS errors '+jsErrors.join('; '):'';
    // Synthetic, local-only interaction smoke: exercises are editable and route transitions are real.
    if(!issue && size.name==='mobile-390'){
      if(view==='dashboard'){
        await page.getByRole('button',{name:/Visualizar os exercícios do dia/}).click();
        await page.locator('.foco-v6-detail h1').first().waitFor({timeout:4000});
        // Route navigation is synchronous; workout data arrives asynchronously.
        // Wait for the fixture exercise rather than asserting against the loading skeleton.
        await page.locator('.foco-v6-detail').getByText(/Supino reto/i).first().waitFor({timeout:12000});
        assert.match(await page.locator('.foco-v6-detail').innerText(),/Supino reto/i);
        await page.getByRole('button',{name:/Iniciar treino/}).click();
        await page.locator('.foco-v6-session-screen').waitFor({timeout:4000});
      }else if(view==='sessao'){
        const reps=page.getByRole('spinbutton',{name:'Repetições da série atual'});
        await reps.fill('12');
        assert.equal(await reps.inputValue(),'12');
        const load=page.getByRole('spinbutton',{name:'Carga atual em quilogramas'});
        await load.fill('40');
        assert.equal(await load.inputValue(),'40');
        await page.getByRole('button',{name:'Iniciar treino',exact:true}).click();
        await page.getByRole('button',{name:/Concluir série/}).first().click();
        await page.getByText(/Série 2 de 3/).first().waitFor({timeout:4000});
        await page.getByRole('button',{name:'Execução',exact:true}).click();
        await page.getByRole('button',{name:'Registro',exact:true}).click();
      }else if(view==='progresso'){
        await page.getByRole('button',{name:'90 dias'}).click();
        assert.equal(await page.getByRole('button',{name:'90 dias'}).getAttribute('aria-pressed'),'true');
      }else if(view==='perfil'){
        await page.getByRole('button',{name:'Metas e objetivos'}).click();
        await page.getByRole('heading',{name:/Metas.*Foco Esportivo/i}).waitFor({timeout:5000});
      }else if(view==='treinos'){
        await page.getByRole('button',{name:'Programa',exact:true}).click();
        assert.equal(await page.getByRole('button',{name:'Programa',exact:true}).getAttribute('aria-pressed'),'true');
        await page.getByRole('button',{name:'Semana',exact:true}).click();
      }
    }
    const result={viewport:size.name,view,layout_view:'synthetic fixtures',heading:check.title,overflow_px:overflow,status:issue?'FAIL':'PASS',error:issue||undefined,screenshot};
    results.push(result);
    if(issue)failed=true;
    page.off('pageerror',onPageError);
   }catch(error){
    failed=true;
    results.push({viewport:size.name,view,status:'FAIL',error:String(error)});
   }
  }
  await context.close();
 }
}finally{
 await browser.close();
 writeFileSync(out+'/report.json',JSON.stringify({synthetic: true,real_user_authenticated:false,production_api_invocations:0,results},null,2));
}
for(const r of results)console.log(r.viewport+' '+r.view+' '+r.status+(r.error?' '+r.error:''));
console.log(results.filter(r=>r.status==='PASS').length+'/'+results.length+' visual layout checks PASS (fixture data only).');
if(failed)process.exitCode=1;
