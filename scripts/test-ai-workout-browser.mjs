import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { auditCredentials, createAuditFixtures } from './fixtures/audit-browser.mjs';

const output='work/ai-routing-browser';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const evidence=[];
try {
  for(const width of [320,390,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
    const fixtures=createAuditFixtures();let aiCalls=0,saves=0;const payloads=[];
    const proposal={name:'Proposta sintética de alternância',goal:'Hipertrofia',weekly_frequency:4,explanation:'Dados sintéticos para testar a recuperação da proposta.',
      exercises:['segunda','terca','quinta','sexta'].flatMap(day=>[
        ['Supino reto com barra','Peitoral'],['Remada curvada com barra','Costas'],['Agachamento livre com barra','Quadríceps'],
        ['Mesa flexora','Posteriores'],['Abdominal crunch','Core'],
      ].map(([exercise_name,muscle_group])=>({exercise_name,muscle_group,training_day:day,sets:2,reps_min:8,reps_max:12,rest_seconds:120,suggested_load_kg:0,notes:'Amplitude controlada.'}))),
      ai_generation:{provider:'groq',model:'synthetic',calls:2,cache_hit:false}};
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.pathname.startsWith('/functions/v1/foco-api')) {
        const path=url.pathname.replace('/functions/v1/foco-api','');
        const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
        const json=(status,body)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
        if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
        if(path==='/api/ai/generate-workout'&&req.method()==='POST'){
          aiCalls++;payloads.push(req.postDataJSON());
          return json(200,{...proposal,ai_generation:{...proposal.ai_generation,provider:aiCalls===1?'groq':'gemini'}});
        }
        if(path==='/api/workouts'&&req.method()==='POST'){saves++;return json(201,{...proposal,id:'synthetic-new-plan'});}
        assert.equal(req.method(),'GET','Unexpected write '+path);
        return json(Object.hasOwn(fixtures,path)?200:404,fixtures[path]||{error:'Missing synthetic fixture'});
      }
      if(url.hostname==='127.0.0.1')return route.continue();
      return route.abort('blockedbyclient');
    });
    await context.addInitScript(({access,refresh})=>{
      localStorage.setItem('foco_auth_token',access);localStorage.setItem('foco_auth_refresh_token',refresh);
    },auditCredentials);
    const page=await context.newPage();page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto((process.env.FOCO_E2E_BASE_URL||'http://127.0.0.1:4173/FOCO/')+'?view=novo-treino');
    await page.locator('button[type="submit"]:not([disabled])').waitFor();
    await page.locator('#foco-ai-goal').selectOption('Recomposição corporal');
    await page.getByRole('button',{name:'Gerar ficha personalizada',exact:true}).click();
    await page.getByText('Proposta gerada com Groq',{exact:true}).waitFor();assert.equal(aiCalls,1);
    await page.reload();
    await page.getByText('Proposta recuperada sem uma nova chamada à IA.',{exact:false}).waitFor();assert.equal(aiCalls,1);
    assert.equal(await page.locator('#foco-ai-goal').inputValue(),'Recomposição corporal');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`${output}/restored-${width}.png`,fullPage:true});
    if(width===390){const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      writeFileSync(`${output}/axe.json`,JSON.stringify(axe.violations,null,2));
      assert.deepEqual(axe.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>v.id),[]);
    }
    await page.getByRole('button',{name:'Gerar outra proposta',exact:true}).click();
    await page.getByText('Proposta gerada com Gemini',{exact:true}).waitFor();
    assert.equal(aiCalls,2);assert.equal(payloads[0].force_refresh,false);assert.equal(payloads[1].force_refresh,true);
    await page.getByRole('button',{name:'Aprovar e Ativar Ficha',exact:true}).click();
    await page.waitForURL(/view=treinos/);assert.equal(aiCalls,2);assert.equal(saves,1);
    assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(k=>k.startsWith('foco:ai-workout-draft:'))),false);
    assert.deepEqual(errors,[]);evidence.push({width,status:'PASS',mocked_ai_calls:aiCalls,saves,external_writes:0});
    console.log(`PASS ${width}px: actual provider, reload without generation, explicit regeneration and save without AI`);
    await context.close();
  }
} finally {await browser.close();writeFileSync(`${output}/results.json`,JSON.stringify(evidence,null,2));}
