import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id=read('src/utils/release.ts').match(/FOCO_BUILD_ID = '([^']+)'/)?.[1];
assert.equal(id,'2026-11-05-v23','Runtime release must be explicit');
assert.ok(read('index.html').includes('name="foco-release" content="'+id+'"'),'HTML release must match bundle');
assert.ok(read('public/sw.js').includes('foco-shell-20261105-v23'),'Service Worker must advance with UI release');
assert.ok(read('public/atualizar.html').includes('20261105-v22'),'Manual refresh must use current release');
assert.ok(read('src/main.tsx').includes('verifyPublishedRelease'),'Open tabs must check new published version');
assert.ok(read('src/main.tsx').includes("fetch(remoteUrl, { cache: 'no-store'"),'Release check must bypass stale HTML cache');
const v7=read('src/foco-v7-polish.css'),v2=read('src/foco-v2-experience.css'),v21=read('src/foco-21-redesign.css');
assert.ok(!v7.includes('position:sticky;bottom:calc(87px'),'Legacy sticky CTA must not cover workout');
assert.ok(!v7.includes('max-width:740px !important'),'Legacy tablet width must not overrule current player');
assert.ok(!v7.includes('.foco-v7-session-stage{height:'),'V7 must not own the exercise stage height');
assert.ok(!v2.includes('html[data-foco-density="compact"] .foco-v6-shell .foco-v7-session-stage'),'Old compact declaration must be removed');
for(const rule of ['height:clamp(218px,30dvh,290px)','height:clamp(285px,38vh,380px)','height:clamp(195px,26dvh,248px)','font-size:clamp(22px,6vw,29px)','font-size:clamp(20px,5.5vw,27px)']){
  assert.ok(v21.includes(rule),'Missing proportional session rule: '+rule);
}
assert.ok(!v21.includes('height:clamp(330px,44dvh,470px)'));
assert.ok(!v21.includes('font-size:clamp(30px,8.4vw,47px)'));
console.log('FOCO 2.2: release metadata, proportional workout and CSS ownership verified.');
