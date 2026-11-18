import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../../docs/media/'+name,import.meta.url),'utf8'));
export const pilot=read('FOCO_HUMAN_PILOT_2026_11_17.json');
export const expansion=read('FOCO_HUMAN_EXPANSION_2026_11_17.json');
export const corrections=read('FOCO_HUMAN_CORRECTIONS_2026_11_17.json');
export const wrists=read('FOCO_HUMAN_WRISTS_2026_11_18.json');
const baseExamples=[...pilot.exercises.map(e=>({...e,...expansion.pilotCatalogFacts.find(f=>f.id===e.id)})),...expansion.exercises,...wrists.exercises];
export const humanExamples=baseExamples.map(e=>{const next=corrections.exercises.find(c=>c.id===e.id);return next?{...e,asset:next.asset,width:next.width,height:next.height,frames:next.frames}:e;});
export const humanAssets=new Map([...pilot.exercises.map(e=>[e.asset,{asset:e.asset,assetSha256:e.assetSha256,bytes:e.bytes}]),...Object.values(expansion.assets).map(e=>[e.asset,e]),...Object.values(corrections.assets).map(e=>[e.asset,e]),...Object.values(wrists.assets).map(e=>[e.asset,e])]);
