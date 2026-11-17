import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FOCO_HUMAN_MEDIA,humanMediaForExercise} from '../src/data/focoHumanMedia';
import {REPDB_PTBR_NAMES} from '../src/data/repdbPtBR';
import {FOCO_LOCAL_EXERCISES,FOCO_LOCAL_NAMES} from '../src/data/focoLocalExercises';
import {loadRepDBCatalog,loadRepDBPortugueseCopy,repdbDisplayName,repdbBindingBlocked} from '../src/data/repdbAssets';
import {pilot,expansion,corrections,humanExamples,humanAssets} from './fixtures/human-media.mjs';
assert.equal(pilot.exercises.length,10);
assert.equal(expansion.newExercises,157);
assert.equal(Object.keys(FOCO_HUMAN_MEDIA).length,167);
assert.equal(humanExamples.length,new Set(humanExamples.map(e=>e.id)).size);
for(const manifest of [pilot,expansion,corrections]){
 assert.equal(manifest.repdbImagesUsedAsInput,false);
 assert.equal(manifest.professionalBiomechanicalReview,false);
 assert.equal(manifest.modelVersion,'not-exposed-by-tool');
}
let bytes=0,poses=0;
for(const [asset,entry] of humanAssets){
 assert.match(asset,/^media\/foco-human\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/);
 const data=readFileSync(new URL('../public/'+asset,import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.equal(createHash('sha256').update(data).digest('hex'),entry.assetSha256);
 assert.equal(data.length,entry.bytes);assert.ok(data.length<120000,'Media must stay light enough for the gym');bytes+=data.length;
}
for(const e of humanExamples){
 const media=FOCO_HUMAN_MEDIA[e.id];assert.ok(media);assert.equal(media.asset,e.asset);
 assert.deepEqual(media.poses,e.frames,'Use only the frames screened for this exact variant');
 assert.equal(humanMediaForExercise('Meu nome personalizado',e.id),media);
 assert.equal(humanMediaForExercise(e.name),media,'PT-BR aliases must retain the correct equipment');
 if(REPDB_PTBR_NAMES[e.id])assert.equal(humanMediaForExercise(REPDB_PTBR_NAMES[e.id].sourceName),media,'Exact legacy English names remain supported');
 for(const p of media.poses){
  assert.ok(p.x>=0&&p.y>=0&&p.width>0&&p.height>0&&p.x+p.width<=media.width&&p.y+p.height<=media.height);poses++;
 }
 assert.ok(media.poses.length===1||media.poses.length===2);
 if(media.poses.length===1)assert.equal(media.poses[0].phase,'reference');
 else{assert.equal(media.poses[0].phase,'start');assert.equal(media.poses[1].phase,'peak');assert.notDeepEqual(media.poses[0],media.poses[1]);}
}
assert.equal(poses,330);assert.ok(bytes<3500000);
assert.equal(corrections.framingChangedCount,98);assert.equal(Object.keys(corrections.assets).length,5);
assert.deepEqual(humanExamples.filter(e=>e.frames.length===1).map(e=>e.id).sort(),['dead-hang','plank','plate-pinch','side-plank']);
for(const e of corrections.exercises){
 assert.equal(e.review,'rendered-framing-screening-complete');
 for(let i=0;i<e.frames.length;i++){const p=e.frames[i],safe=e.protectedSourceFrames[i];assert.ok(p.x>=safe.x&&p.y>=safe.y&&p.x+p.width<=safe.x+safe.width&&p.y+p.height<=safe.y+safe.height,'A crop may never include an adjacent cell');}
}

assert.equal(humanMediaForExercise('Supino inclinado com halteres'),FOCO_HUMAN_MEDIA['incline-db-press']);
assert.equal(humanMediaForExercise('Supino reto com halteres','unknown-variant'),null);
assert.equal(humanMediaForExercise('Stiff com halteres','dumbbell-romanian-deadlift'),null,'Do not rewrite a mismatched historical binding');
assert.equal(humanMediaForExercise('Stiff com halteres'),FOCO_HUMAN_MEDIA['foco-dumbbell-stiff-leg-deadlift']);
assert.equal(humanMediaForExercise('Agachamento goblet'),FOCO_HUMAN_MEDIA['db-goblet-squat']);
assert.equal(humanMediaForExercise('Agachamento goblet','goblet-squat'),FOCO_HUMAN_MEDIA['goblet-squat']);
assert.notEqual(FOCO_HUMAN_MEDIA['goblet-squat'],FOCO_HUMAN_MEDIA['db-goblet-squat']);
for(const [sheet,s] of Object.entries(expansion.assets as Record<string,{prompt:string;references:{origin:string;sha256:string}[];generatedFileSha256:string}>)){
 assert.ok(s.prompt.length>100);assert.equal(s.references.length,1);
 for(const r of s.references){assert.equal(r.origin,'own-generated-image');assert.match(r.sha256,/^[a-f0-9]{64}$/);}
 assert.match(s.generatedFileSha256,/^[a-f0-9]{64}$/);
 assert.ok(expansion.exercises.some((e:{sheet:string})=>e.sheet===sheet));
}
// A source-supplied collision cannot impersonate an owned exercise. Keep all
// source records while adding the two explicit, namespaced FOCO variants.
const previousFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({exercises:[...Array.from({length:100},(_,i)=>({id:'synthetic-'+i,name_en:'Synthetic '+i,images:{flat:{}}})),{...FOCO_LOCAL_EXERCISES[0],name_en:'Impersonated variant',source:'repdb'}]}));
try{
 const catalog=await loadRepDBCatalog();assert.equal(catalog.length,102);
 for(const e of FOCO_LOCAL_EXERCISES){
  assert.equal(catalog.filter(item=>item.id===e.id).length,1);
  assert.equal(catalog.find(item=>item.id===e.id)?.source,'foco');
  assert.equal(repdbDisplayName(e),FOCO_LOCAL_NAMES[e.id]);
  assert.ok((await loadRepDBPortugueseCopy(e.id))!.instructions.length>=4);
  assert.deepEqual(e.images?.flat,{},'No stock image substitution for an authored variant');
  assert.equal(repdbBindingBlocked(FOCO_LOCAL_NAMES[e.id]),false);
 }
}finally{globalThis.fetch=previousFetch;}
console.log(`FOCO HUMAN MEDIA: ${humanExamples.length} exact variants, ${poses} static poses, ${humanAssets.size} WebPs, ${bytes} bytes; hashes, safe frames, provenance, exact legacy aliases and owned catalog variants passed.`);
