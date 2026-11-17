import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

// UI-only fixtures. All requests to the production API are intercepted.
// No real user is authenticated and NO request reaches data mutation endpoints.
const base = process.env.FOCO_VISUAL_BASE || 'https://vineribeiro.github.io/FOCO/';
const proxyBridge = process.env.FOCO_BROWSER_PROXY_BRIDGE === '1';
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
const views=['dashboard','detalhes','sessao','treinos','progresso','perfil','anamnese','arquivos','novo-treino','biblioteca','personal','revisao'];
const browser=await chromium.launch({headless:true,
 ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
let failed=false; const results=[];
try{
 for(const size of viewports){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1,
   colorScheme:'dark',reducedMotion:'reduce',isMobile:size.width<768,hasTouch:size.width<768,serviceWorkers:'block'});
  // Registered before the specific fixtures below: Playwright dispatches their
  // handlers first. Unmatched writes are blocked; optional Cloud reads use the
  // Node runtime's inherited proxy and CA trust, never ignoreHTTPSErrors.
  await context.route('**/*',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(!['http:','https:'].includes(url.protocol))return route.continue();
    if(!['GET','HEAD','OPTIONS'].includes(request.method()))return route.abort('blockedbyclient');
    if(!proxyBridge||url.protocol!=='https:')return route.continue();
    try{
      const response=await fetch(request.url(),{method:request.method(),
        headers:await request.allHeaders(),signal:AbortSignal.timeout(25000)});
      const headers=Object.fromEntries(response.headers);
      for(const key of ['content-encoding','content-length','transfer-encoding'])delete headers[key];
      return route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())});
    }catch{return route.abort('failed');}
  });
  await context.addInitScript(()=>localStorage.setItem('foco_auth_token','qa-mocked-token'));
  await context.route('**/functions/v1/foco-api/**',async route=>{
    const req=route.request();
    const path=new URL(req.url()).pathname.replace('/functions/v1/foco-api','');
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, OPTIONS'},body:''});
    if(req.method()!=='GET') return route.fulfill({status:403,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({error:'Blocked by visual QA'})});
    const body=Object.prototype.hasOwnProperty.call(responses,path)?responses[path]:null;
    return route.fulfill({status:body===null?404:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body??{error:'No visual fixture for '+path})});
  });
  // RepDB Free fixture: complete catalog, no network access to the provider.
  let repdbCatalogRequests=0;
  const samples=[
    ['bench-press','Bench Press','chest','barbell'],
    ['leg-press','Leg Press','legs','machine'],
    ['db-bench-press','Dumbbell Bench Press','chest','dumbbell'],
  ];
  const fixture=[
    ...samples.map(([id,name_en,body_part,equipment])=>({
      id,name_en,body_part,equipment,
      images:{flat:{start:'images/flat/'+id+'-start.webp',peak:'images/flat/'+id+'-peak.webp'}}
    })),
    ...Array.from({length:698},(_,i)=>{
      const id='zz-movement-'+String(i+1).padStart(3,'0');
      return {id,name_en:'ZZ movement '+String(i+1).padStart(3,'0'),
        body_part:'general',equipment:'bodyweight',
        images:{flat:{start:'images/flat/'+id+'-start.webp'}}};
    })
  ];
  for(const url of [/^https:\/\/raw\.githubusercontent\.com\/RepDB\/exercise-dataset\/(?:main|[a-f0-9]{40})\/exercises\.json$/,
                     'https://exercise-dataset.com/exercises.json']){
    await context.route(url,route=>{
      repdbCatalogRequests++;
      return route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify({count:701,exercises:fixture})});
    });
  }
  const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L5sAAAAASUVORK5CYII=','base64');
  await context.route('https://raw.githubusercontent.com/RepDB/exercise-dataset/**/images/flat/**',route=>
    route.fulfill({status:200,contentType:'image/png',body:tinyPng}));
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
      await page.evaluate(()=>document.fonts.ready);
      const homeStyle=await page.locator('.foco-v6-hero').evaluate(el=>({
        radius:getComputedStyle(el).borderRadius,
        background:getComputedStyle(el).backgroundColor,
        headingFont:getComputedStyle(el.querySelector('h2')).fontFamily,
        bodyFont:getComputedStyle(document.body).fontFamily,
        actionHeight:el.querySelector('button').getBoundingClientRect().height,
      }));
      assert.equal(homeStyle.background,'rgb(229, 248, 138)','Home hero must use the approved pastel lime');
      assert.equal(homeStyle.radius,'26px');
      assert.match(homeStyle.headingFont,/Michroma/);
      assert.match(homeStyle.bodyFont,/Space Grotesk/);
      assert.ok(homeStyle.actionHeight>=44,'Home primary action must have a usable target');
      assert.equal(await page.locator('.foco-home-calendar [data-training-day]').count(),7,
        'All seven weekdays must remain accessible');
      assert.ok(await page.locator('.foco-plan-card').count()>0,'Stored workouts must appear as real plan cards');
      await page.getByRole('button',{name:'Inferiores',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Inferiores',exact:true}).getAttribute('aria-pressed'),'true');
      await page.getByRole('button',{name:'Todos',exact:true}).click();
      if(size.width<768){
        const nav=page.getByRole('navigation',{name:'Navegação principal',exact:true});
        assert.equal(await nav.getByRole('button').count(),5);
        const bounds=await nav.boundingBox();
        assert.ok(bounds.x>=0&&bounds.x+bounds.width<=size.width,'All five navigation destinations must fit on screen');
        assert.equal(await nav.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(250, 250, 247)');
      }
    }
    if(view==='sessao'){
      await page.locator('.foco-21-exercise-media [data-foco-media-source="repdb"]').waitFor({timeout:7000});
      await page.locator('.foco-21-exercise-media .foco-repdb-pose').waitFor({timeout:10000});
      assert.equal(await page.locator('.foco-21-exercise-media img').count(),1,
        'Active workout must show exactly one RepDB WebP instead of an icon');
      assert.equal(await page.locator('.foco-session-console').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(250, 250, 247)','The recording console must use the light reference panel');
      await page.locator('.foco-21-exercise-media').waitFor({timeout:4000});
      const sessionLayout=await page.evaluate(()=>{
        const stage=document.querySelector('.foco-v7-session-stage');
        const screen=document.querySelector('.foco-21-session');
        const header=document.querySelector('.foco-v7-session-heading-text h1');
        const title=document.querySelector('.foco-v7-stage-footer h2');
        const input=document.querySelector('.foco-v7-adjuster input');
        const viewport=window.visualViewport;
        const style=el=>getComputedStyle(el);
        return {
          stageHeight:stage.getBoundingClientRect().height,
          stageWidth:stage.getBoundingClientRect().width,
          screenWidth:screen.getBoundingClientRect().width,
          stageRadius:style(stage).borderRadius,
          headerFont:parseFloat(style(header).fontSize),
          titleFont:parseFloat(style(title).fontSize),
          inputFont:input?parseFloat(style(input).fontSize):null,
          visualScale:viewport?.scale??1,
        };
      });
      assert.equal(sessionLayout.stageRadius,'26px 26px 0px 0px','Stage must join the light recording console');
      assert.ok(sessionLayout.screenWidth<=Math.min(size.width,760),'Workout cannot expand past its intended width');
      assert.ok(sessionLayout.stageWidth<=sessionLayout.screenWidth+1,'Exercise hero cannot overrun session container');
      assert.ok(sessionLayout.headerFont<=28&&sessionLayout.titleFont<=30,'Training headings must not be zoomed');
      assert.ok(sessionLayout.inputFont===null||(sessionLayout.inputFont>=16&&sessionLayout.inputFont<=30),'Workout input font must be ergonomic without triggering browser auto-zoom');
      assert.ok(sessionLayout.visualScale<=1.01,'No accidental browser viewport magnification');
      assert.ok(size.width<768
        ? sessionLayout.stageHeight>=210&&sessionLayout.stageHeight<=305
        : sessionLayout.stageHeight>=275&&sessionLayout.stageHeight<=390,
        'Workout hero must stay proportional at '+size.name+': '+JSON.stringify(sessionLayout));
      if(size.width<768){
        const placement=await page.evaluate(()=>{
          const rest=document.querySelector('.foco-21-rest');
          const cta=document.querySelector('.foco-v7-session-start');
          const hero=document.querySelector('.foco-v7-session-stage');
          const nav=document.querySelector('nav[aria-label="Navegação principal"]');
          return rest&&cta&&hero&&nav?{
            restTop:rest.getBoundingClientRect().top,
            ctaTop:cta.getBoundingClientRect().top,
            ctaBottom:cta.getBoundingClientRect().bottom,
            heroBottom:hero.getBoundingClientRect().bottom,
            navTop:nav.getBoundingClientRect().top,
            position:getComputedStyle(cta).position,
          }:null;
        });
        assert.ok(placement&&placement.position==='static'
          &&placement.heroBottom<=placement.ctaTop+1
          &&placement.ctaBottom<=placement.restTop+1
          &&placement.ctaBottom<=placement.navTop+1,
          'Start CTA must remain in flow, visible after the exercise and before secondary rest controls');
      }
      // Switching exercises should display the matching RepDB pose, never an old SVG.
      await page.waitForTimeout(1600); // Respect rate limit between distinct exercise requests.
      await page.getByRole('button',{name:/Ver exercício 3:/}).click();
      assert.match(await page.locator('.foco-v7-stage-footer h2').innerText(),/Leg press 45 graus/i);
      await page.locator('.foco-21-exercise-media .foco-repdb-pose').waitFor({timeout:10000});
      assert.equal(await page.locator('.foco-21-exercise-media img').count(),1,'Leg press must display a RepDB pose');
      assert.equal(await page.locator('.foco-21-exercise-media [data-foco-media-source="repdb"]').count(),1);
      await page.screenshot({path:out+'/legpress-'+size.name+'.png',fullPage:false,animations:'disabled'});
      if(size.name==='mobile-390'){
        await page.getByRole('button',{name:'Execução',exact:true}).click();
        const guide=page.locator('.foco-repdb-guide-visual');
        await guide.locator('.foco-repdb-pose').waitFor({timeout:10000});
        await guide.getByRole('button',{name:'02 FINAL'}).click();
        await page.waitForFunction(()=>
          document.querySelector('.foco-repdb-guide-visual .foco-repdb-pose')?.getAttribute('src')?.includes('-peak.webp'),
          {timeout:9000});
        assert.equal(await guide.getByRole('button',{name:'02 FINAL'}).getAttribute('aria-pressed'),'true');
        await guide.getByRole('button',{name:'01 INÍCIO'}).click();
        await page.getByRole('button',{name:'Registro',exact:true}).click();
      }
            assert.equal(await page.locator('.foco-21-exercise-media button').count(),0,'Exercise hero must not contain nested media controls');
      assert.equal(await page.locator('.foco-21-exercise-media [class*="bg-white"]').count(),0,'No white gallery overlays in stage');
      await page.getByRole('button',{name:/Ver exercício 1:/}).click();
    }
    const screenshot=out+'/'+view+'-'+size.name+'.png';
    await page.screenshot({path:screenshot,fullPage:false,animations:'disabled'});
    const issue=overflow>2?'horizontal overflow '+overflow+' px':!check.title?'page heading missing':jsErrors.length?'JS errors '+jsErrors.join('; '):'';
    // Synthetic, local-only interaction smoke: exercises are editable and route transitions are real.
    if(!issue && size.name==='mobile-390'){
      if(view==='dashboard'){
        await page.locator('.foco-plan-card').first().click();
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
      }else if(view==='biblioteca'){
        const search=page.getByRole('textbox',{name:'Pesquisar exercícios',exact:true});
        await search.fill('Supino reto com barra');
        const card=page.getByRole('button',{name:'Ver Supino reto com barra'});
        await card.waitFor({timeout:9000});
        assert.ok(repdbCatalogRequests>=1,'RepDB must load one shared catalog');
        assert.equal(await page.locator('.foco-atlas-source-tabs').count(),0,'No old media tabs');
        assert.equal(await page.locator('.foco-atlas-curated-grid').count(),0,'No old parallel gallery');
        await card.click();
        const dialog=page.getByRole('dialog');
        await dialog.locator('.foco-repdb-dialog-art .foco-repdb-pose').waitFor({timeout:9000});
        await dialog.getByRole('button',{name:'02 FINAL'}).click();
        assert.equal(await dialog.getByRole('button',{name:'02 FINAL'}).getAttribute('aria-pressed'),'true');
        await dialog.getByRole('button',{name:'Adicionar à minha ficha'}).click();
        const personal=page.getByRole('textbox',{name:'Nome personalizado do exercício'});
        await personal.waitFor({timeout:5000});
        assert.equal(await personal.inputValue(),'Supino reto com barra','RepDB must prefill a Portuguese name');
        await personal.fill('Meu supino de hoje');
        assert.equal(await personal.inputValue(),'Meu supino de hoje');
        await page.getByRole('button',{name:'Fechar',exact:true}).last().click();
        await search.fill('');
        await page.getByRole('button',{name:/Próxima/}).click();
        await page.locator('.foco-atlas-pagination').getByText('2 / 30',{exact:true}).waitFor({timeout:9000});
        assert.equal(await page.locator('.foco-repdb-card-index').first().innerText(),'025');
        assert.equal(await page.getByRole('button',{name:'Ver Movimento com tradução em revisão',exact:true}).count(),24);
        await page.getByRole('button',{name:/Anterior/}).click();
        await search.fill('Supino reto com barra');
        await page.getByRole('button',{name:'Ver Supino reto com barra'}).waitFor({timeout:9000});

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
