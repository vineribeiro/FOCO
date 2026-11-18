import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const id=read('src/utils/release.ts').match(/FOCO_BUILD_ID = '([^']+)'/)?.[1];
assert.equal(id,'2026-11-18-v38-minimum-four','Runtime release must be explicit');
assert.ok(read('index.html').includes('name="foco-release" content="'+id+'"'),'HTML release must match bundle');
assert.ok(read('public/sw.js').includes('foco-shell-20261118-v38-minimum-four'),'Service Worker must advance with UI release');
assert.ok(read('public/atualizar.html').includes('2026-11-18-v38-minimum-four'),'Manual refresh must use current release');
assert.ok(read('src/main.tsx').includes('verifyPublishedRelease'),'Open tabs must check new published version');
assert.ok(read('src/main.tsx').includes("fetch(remoteUrl, { cache: 'no-store'"),'Release check must bypass stale HTML cache');
const main=read('src/main.tsx'),ui=read('src/foco-ui.css');
assert.ok(main.includes("import './foco-ui.css'"),'Canonical UI stylesheet must be loaded');
for(const legacy of ['foco-v6.css','foco-v7-polish.css','foco-v8-reference.css','foco-21-redesign.css']) {
  assert.ok(!main.includes("import './"+legacy+"'"),'Legacy visual owners must not be loaded: '+legacy);
}
assert.ok(read('src/pages/ActiveSessionPage.tsx').includes('foco-session-console'),'The player must have a recording console');
assert.ok(ui.includes('.foco-v7-session-stage{'),'The canonical UI must own exercise stage proportions');
console.log('FOCO 3.0: release metadata, workout console and single CSS ownership verified.');
