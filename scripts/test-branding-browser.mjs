import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {createAuditFixtures, auditCredentials} from './fixtures/audit-browser.mjs';
import {humanExamples} from './fixtures/human-media.mjs';

const base=process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/';
const out=process.env.FOCO_BRAND_OUTPUT||'work/brand-regression';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const results=[];const safety={api:0,realWrites:0,blockedWrites:[]};
const catalog={exercises:humanExamples.map(e=>({id:e.id,name_en:e.sourceName,body_part:e.bodyPart,equipment:e.equipment,primary_muscles:e.primaryMuscles||[],images:{flat:{start:'images/flat/'+e.id+'-start.webp',peak:'images/flat/'+e.id+'-peak.webp'}}}))};
const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/L5sAAAAASUVORK5CYII=','base64');
async function setup({width=390,auth=true,notice=false,boot=false,failReview=false,empty=false}={}){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
 const fixtures=createAuditFixtures();
 const state={failReview};
 for(const ex of fixtures['/api/workouts/active'].exercises)ex.repdb_id='bench-press';
 if(empty){fixtures['/api/workouts']=[];fixtures['/api/workouts/active']=null;}
 await context.addInitScript(({auth,notice,credentials})=>{
  if(window!==window.top)return;
  if(auth)localStorage.setItem('foco_auth_token',credentials.access);
  sessionStorage.setItem('foco_next_training_day','segunda');
  if(notice)Object.defineProperty(navigator.serviceWorker,'register',{value:async()=>({waiting:null,installing:null,addEventListener(){},async update(){}})});
  Object.defineProperty(navigator,'canShare',{value:()=>false});
 },{auth,notice,credentials:auditCredentials});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const json=(status,data)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname.startsWith('/functions/v1/foco-api')||u.pathname.startsWith('/api/')||/\.supabase\.(co|com)$/.test(u.hostname)){
   safety.api++;const path=u.pathname.replace('/functions/v1/foco-api','');
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(req.method()!=='GET'){safety.blockedWrites.push(req.method()+' '+path);return json(503,{error:'Falha sintética. Tente novamente.'});}
   if(state.failReview&&path==='/api/recommendations')return json(503,{error:'Falha sintética.'});
   assert.ok(Object.hasOwn(fixtures,path),'Missing API fixture: '+path);
   return json(200,fixtures[path]);
  }
  if(!['http:','https:'].includes(u.protocol))return route.continue();
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){safety.blockedWrites.push(req.method()+' '+u.origin+u.pathname);return route.abort('blockedbyclient');}
  if(u.pathname.endsWith('/exercises.json'))return json(200,catalog);
  if(u.pathname.includes('/images/flat/'))return route.fulfill({status:200,contentType:'image/png',body:tiny});
  if(u.origin===new URL(base).origin){
   if((notice||boot)&&u.pathname==='/FOCO/'){
    const r=await route.fetch();let html=await r.text();
    if(notice)html=html.replace(/(name="foco-release" content=")[^"]+/, '$1synthetic-next-release');
    if(boot)html=html.replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'');
    return route.fulfill({response:r,body:html});
   }
   return route.continue();
  }
  return route.abort('blockedbyclient');
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);
 return {context,page,state};
}
async function open(page,view){await page.goto(base+'?view='+view,{waitUntil:'domcontentloaded'});await page.locator('#foco-main-content').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);}
async function axe(page,label){
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 writeFileSync(out+'/'+label+'-axe.json',JSON.stringify(result.violations,null,2));
 assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);
}
async function screenshot(page,label){await page.screenshot({path:out+'/'+label+'.png',fullPage:true});}
function contrast(a,b){
 const light=value=>{const channels=value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
 const x=light(a),y=light(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
async function run(label,options,task){const env=await setup(options);try{await task(env);results.push({label,passed:true});console.log('PASS '+label);}catch(e){results.push({label,passed:false,error:String(e)});console.log('FAIL '+label+': '+e.message);await screenshot(env.page,'failed-'+label).catch(()=>{});}finally{await env.context.close();}}
try{
 for(const width of [320,390,768,1440])await run('brand-and-controls-'+width,{width},async({page})=>{
  for(const view of ['dashboard','perfil','progresso','cardio','biblioteca','novo-treino']){
   await open(page,view);
   const check=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,bodyFont:getComputedStyle(document.body).fontFamily,invalidHeadings:[...document.querySelectorAll('h1,h2')].filter(e=>e.getBoundingClientRect().height&&getComputedStyle(e).fontFamily.includes('Michroma')&&getComputedStyle(e).fontWeight!=='400').map(e=>e.textContent)}));
   assert.ok(check.overflow<=2,view+' overflow');assert.match(check.bodyFont,/Space Grotesk/);assert.deepEqual(check.invalidHeadings,[],view+' uses shipped display weight');
   if(view==='dashboard')assert.equal(await page.locator('.foco-plan-card-body').first().evaluate(e=>getComputedStyle(e).color),'rgb(247, 247, 243)');
   if(view==='cardio')assert.match(await page.getByRole('timer').evaluate(e=>getComputedStyle(e).fontFamily),/Michroma/);
   if(width===390)await axe(page,view);
  }
  await open(page,'biblioteca');
  await page.keyboard.press('Tab');const search=page.getByRole('textbox',{name:'Pesquisar exercícios',exact:true});await search.focus();
  const focus=await search.evaluate(e=>{const s=getComputedStyle(e);return {visible:e.matches(':focus-visible'),style:s.outlineStyle,width:parseFloat(s.outlineWidth),color:s.outlineColor,background:getComputedStyle(e.parentElement).backgroundColor};});
  assert.ok(focus.visible&&focus.style!=='none'&&focus.width>=2,'Search must expose keyboard focus');assert.ok(contrast(focus.color,focus.background)>=3);
  await open(page,'novo-treino');
  const field=await page.locator('#foco-automatic-minutes').evaluate(e=>{const s=getComputedStyle(e);let p=e.parentElement;while(p&&getComputedStyle(p).backgroundColor==='rgba(0, 0, 0, 0)')p=p.parentElement;return {border:s.borderColor,inside:s.backgroundColor,outside:getComputedStyle(p).backgroundColor};});
  assert.ok(contrast(field.border,field.inside)>=3&&contrast(field.border,field.outside)>=3,'Field boundaries must remain visible on both adjacent surfaces');
  await open(page,'detalhes');await page.getByRole('heading',{name:/^Treino de /}).waitFor();
  const thumb=await page.locator('.foco-v8-exercise-thumb').first().boundingBox();assert.ok(thumb.height>=150&&thumb.width>=100,'Movement must have useful visual space');
  await screenshot(page,'detail-refined-'+width);
  await open(page,'dashboard');
  await page.locator('.foco-home-hero-art [data-foco-media-status="image"]').waitFor();
  assert.equal(await page.locator('.foco-home-hero-art>img').count(),0,'An existing workout uses its own movement in the hero');
  assert.ok(await page.locator('.foco-goal-ring small').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=12));
  await screenshot(page,'home-refined-'+width);
  await open(page,'sessao');await page.getByRole('button',{name:'Execução',exact:true}).click();await axe(page,'session-guide-'+width);await screenshot(page,'session-guide-'+width);
 });
 await run('profile-destinations',{},async({page})=>{
  await open(page,'perfil');assert.equal(await page.getByRole('button',{name:'Integrações',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Notificações',exact:true}).count(),0);
  await page.getByRole('button',{name:'Meus dados corporais',exact:true}).click();await page.getByRole('heading',{name:'Avaliação corporal',exact:true}).waitFor();
 });
 await run('density-has-visible-effect-and-persists',{},async({page})=>{
  await open(page,'configuracoes');const panel=page.locator('section[aria-labelledby="foco-ui-preferences-title"]');
  const before=await panel.evaluate(e=>getComputedStyle(e).paddingTop);
  await page.getByRole('button',{name:'Compacto',exact:true}).click();const compact=await panel.evaluate(e=>getComputedStyle(e).paddingTop);assert.ok(parseFloat(compact)<parseFloat(before));
  assert.equal(await page.getByRole('group',{name:'Transparência das superfícies'}).count(),0);
  await page.reload();await panel.waitFor();assert.equal(await panel.evaluate(e=>getComputedStyle(e).paddingTop),compact);
  await page.getByRole('button',{name:'Confortável',exact:true}).click();assert.equal(await panel.evaluate(e=>getComputedStyle(e).paddingTop),before);await axe(page,'settings');
  assert.match(await page.locator('#foco-image-credit-title').locator('..').innerText(),/próprias.*IA.*RepDB/s);
 });
 await run('review-failure-retry',{failReview:true},async({page,state})=>{
  await open(page,'revisao');await page.getByRole('alert').filter({hasText:'Não foi possível consultar suas revisões'}).waitFor();assert.equal(await page.getByText('Nenhuma revisão gerada ainda.',{exact:false}).count(),0);
  state.failReview=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.getByText('Nenhuma revisão gerada ainda.',{exact:false}).waitFor();await axe(page,'review-recovered');
 });
 await run('empty-workouts-explain-rules',{empty:true},async({page})=>{
  await open(page,'treinos');await page.getByText('Gerenciar fichas e exercícios',{exact:false}).click();const copy=await page.locator('#foco-main-content').innerText();assert.match(copy,/sem créditos de IA/);assert.doesNotMatch(copy,/Gemini|Montar com IA|Criar IA/);await page.getByRole('button',{name:'Montar ficha automática',exact:false}).click();await page.getByRole('heading',{name:'Nova ficha',exact:false}).waitFor();
 });
 await run('auth-modes-and-icon-targets',{auth:false},async({page})=>{
  await page.goto(base);await page.getByRole('heading',{name:/Entre na sua conta/}).waitFor();
  for(const mode of ['login','signup']){
   if(mode==='signup')await page.getByRole('tab',{name:'Criar conta',exact:true}).click();
   await page.evaluate(()=>document.fonts.ready);await page.getByRole('textbox',{name:'E-mail',exact:true}).fill('atleta@example.invalid');
   const icon=page.getByRole('button',{name:'Mostrar senha',exact:true});const r=await icon.boundingBox();assert.ok(r.width>=44&&r.height>=44);
   await icon.click();assert.equal(await page.locator('#foco-password').getAttribute('type'),'text');await page.getByRole('button',{name:'Ocultar senha',exact:true}).click();
   assert.equal(await page.title(),(mode==='login'?'Entrar':'Criar conta')+' | FOCO');await axe(page,mode);
  }
  await page.getByRole('tab',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'Esqueci minha senha',exact:true}).click();assert.equal(await page.title(),'Recuperar acesso | FOCO');
  await page.goto(base+'#type=recovery&access_token=synthetic-recovery');await page.reload();await page.getByRole('heading',{name:'Defina sua nova senha.'}).waitFor();assert.equal(await page.title(),'Redefinir senha | FOCO');await axe(page,'password-reset');
 });
 await run('destruction-is-distinct',{},async({page})=>{
  await open(page,'perfil');await page.getByText('Editar meus dados',{exact:false}).click();const save=await page.getByRole('button',{name:'Salvar alterações',exact:false}).evaluate(e=>getComputedStyle(e).backgroundColor);
  await page.getByRole('button',{name:'Excluir minha conta',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Digite EXCLUIR para prosseguir:').fill('EXCLUIR');const remove=dialog.getByRole('button',{name:'Excluir minha conta',exact:true});assert.notEqual(await remove.evaluate(e=>getComputedStyle(e).backgroundColor),save);await axe(page,'delete-dialog');await screenshot(page,'delete-dialog');await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
 });
 await run('library-modal-and-provenance',{},async({page})=>{
  await open(page,'biblioteca');await page.getByRole('textbox',{name:'Pesquisar exercícios'}).fill('Abdominal bicicleta');await page.getByRole('button',{name:'Ver Abdominal bicicleta',exact:true}).click();await page.getByRole('heading',{name:'Como executar',exact:true}).waitFor();await axe(page,'exercise-detail');
  await page.getByRole('button',{name:'Adicionar à minha ficha',exact:true}).click();const dialog=page.getByRole('dialog');assert.equal(await dialog.locator('.foco-atlas-add-modal').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(45, 45, 45)');await axe(page,'exercise-add');await screenshot(page,'exercise-add');
 });
 await run('update-notice',{notice:true},async({page})=>{await page.goto(base);const notice=page.locator('[data-foco-update-notice]');await notice.waitFor();assert.equal(await notice.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(45, 45, 45)');assert.match(await notice.evaluate(e=>getComputedStyle(e).fontFamily),/Space Grotesk/);await axe(page,'update-notice');});
 await run('boot-and-metadata',{auth:false,boot:true},async({page})=>{await page.goto(base);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.title(),'FOCO — Treino e evolução');assert.equal(await page.locator('.boot-logo').getAttribute('alt'),'FOCO');assert.doesNotMatch(await page.locator('meta[name=description]').getAttribute('content'),/por inteligência artificial/);await screenshot(page,'boot');});
 await run('updater-current-brand',{auth:false},async({page})=>{await page.goto(new URL('atualizar.html',base).href);await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('[data-foco-release]').innerText(),'3.9');assert.match(await page.locator('main').evaluate(e=>getComputedStyle(e).fontFamily),/Space Grotesk/);await axe(page,'updater');await screenshot(page,'updater');});
 await run('ptbr-complementary-and-share',{},async({page})=>{
  await open(page,'complementares');assert.equal(await page.getByRole('heading',{name:'Dead Bug',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Bird Dog',exact:true}).count(),0);
  await open(page,'em-casa');await page.getByRole('button',{name:'Iniciar',exact:true}).click();await page.waitForTimeout(1100);await page.getByRole('button',{name:'Pausar',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Compartilhar resultado do treino',exact:true}).click();const download=await pending;const target=out+'/home-result.png';await download.saveAs(target);const png=readFileSync(target);assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);assert.ok(png.length>10000,'Export is real artwork, not an empty placeholder');
 });
}finally{await browser.close();writeFileSync(out+'/results.json',JSON.stringify({results,safety},null,2));}
assert.equal(safety.realWrites,0);assert.equal(results.filter(r=>!r.passed).length,0,'Brand regression failures: '+results.filter(r=>!r.passed).map(r=>r.label).join(', '));
console.log('FOCO brand regression: '+results.length+' scenarios passed; no external data mutation.');
