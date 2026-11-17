import {readFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL('../../docs/media/'+name,import.meta.url),'utf8'));
export const pilot=read('FOCO_HUMAN_PILOT_2026_11_17.json');
export const expansion=read('FOCO_HUMAN_EXPANSION_2026_11_17.json');
export const humanExamples=[...pilot.exercises.map(e=>({...e,...expansion.pilotCatalogFacts.find(f=>f.id===e.id)})),...expansion.exercises];
export const humanAssets=new Map([...pilot.exercises.map(e=>[e.asset,{asset:e.asset,assetSha256:e.assetSha256,bytes:e.bytes}]),...Object.values(expansion.assets).map(e=>[e.asset,e])]);
