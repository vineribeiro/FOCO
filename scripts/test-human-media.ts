import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FOCO_HUMAN_MEDIA,humanMediaForExercise} from '../src/data/focoHumanMedia';
const manifest=JSON.parse(readFileSync(new URL('../docs/media/FOCO_HUMAN_PILOT_2026_11_17.json',import.meta.url),'utf8'));
assert.equal(Object.keys(FOCO_HUMAN_MEDIA).length,10);
assert.equal(manifest.repdbImagesUsedAsInput,false);
assert.equal(manifest.professionalBiomechanicalReview,false);
let bytes=0,poses=0;
for(const e of manifest.exercises){
 const media=FOCO_HUMAN_MEDIA[e.id];assert.ok(media);
 assert.match(media.asset,/^media\/foco-human\/2026-11-17\/[a-z0-9-]+\.webp$/);
 const data=readFileSync(new URL('../public/'+media.asset,import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.equal(createHash('sha256').update(data).digest('hex'),e.assetSha256);
 assert.ok(data.length<120000,'Individual pictures must stay light enough for the gym');bytes+=data.length;
 assert.equal(humanMediaForExercise('Meu nome personalizado',e.id),media,'Stable IDs survive custom names');
 for(const p of media.poses){
  assert.ok(p.x>=0&&p.y>=0&&p.width>0&&p.height>0&&p.x+p.width<=media.width&&p.y+p.height<=media.height);
  poses++;
 }
 assert.equal(media.poses.length,e.id==='plank'?1:2);
 if(media.poses.length===2){assert.equal(media.poses[0].phase,'start');assert.equal(media.poses[1].phase,'peak');assert.notDeepEqual(media.poses[0],media.poses[1]);}
}
assert.equal(poses,19);assert.ok(bytes<500000);
assert.equal(humanMediaForExercise('Supino inclinado com halteres'),null,'No illustration of a nearby variant');
assert.equal(humanMediaForExercise('Supino reto com halteres','unknown-variant'),null,'An unknown explicit ID cannot fall back by name');
assert.equal(humanMediaForExercise('Stiff com halteres','dumbbell-romanian-deadlift'),null);
assert.equal(humanMediaForExercise('Agachamento goblet'),null,'The old dumbbell template cannot acquire a kettlebell picture');
assert.equal(humanMediaForExercise('Agachamento goblet','goblet-squat'),FOCO_HUMAN_MEDIA['goblet-squat']);
assert.equal(humanMediaForExercise('Supino reto com halteres'),FOCO_HUMAN_MEDIA['db-bench-press']);
assert.equal(humanMediaForExercise('Dumbbell Bench Press'),FOCO_HUMAN_MEDIA['db-bench-press'],'Exact source names work for older records without rewriting them');
console.log(`FOCO HUMAN MEDIA: 10 exact variants, ${poses} static poses, ${bytes} bytes, provenance, safe frames and stable IDs verified.`);
