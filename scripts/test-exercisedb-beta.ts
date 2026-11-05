import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  candidateExerciseDBNames, normalizeExerciseDBName, safeExerciseDBGif,
  acceptedExerciseDBName, isExerciseDBBetaAllowed,
} from '../src/data/exerciseDbBeta';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

// Contract: no implicit activation in CLI, unit tests or future commercial builds.
assert.equal(isExerciseDBBetaAllowed(),false);
const groups=['01_peito','02_costas','03_ombros','04_biceps','05_triceps','06_antebracos',
 '07_quadriceps','08_posteriores','09_gluteos','10_panturrilhas','11_abdomen','12_lombar',
 '13_trapezio','14_adutores_abdutores','15_funcionais_e_cardio'];
const names=groups.flatMap(group=>
 (JSON.parse(read('public/'+group+'.json')).exercicios as {nome:string}[]).map(ex=>ex.nome));
assert.equal(names.length,254,'Curated beta catalog should contain 254 movements');
for(const name of names){
 assert.ok(candidateExerciseDBNames(name).length>0,'Missing English lookup candidate for '+name);
}

assert.ok(candidateExerciseDBNames('Leg press 45 graus').some(x=>x.includes('45')));
assert.ok(candidateExerciseDBNames('Supino reto com barra').includes('barbell bench press'));
assert.ok(candidateExerciseDBNames('Cadeira extensora').includes('leg extension'));
assert.equal(normalizeExerciseDBName('Sled 45° Leg Press'),normalizeExerciseDBName('Sled 45 degree Leg Press'));
assert.ok(read('src/data/exerciseDbBeta.ts').includes("'?search='"),'Live ExerciseDB search must use the provider-confirmed search parameter');

const target=['sled 45 degree leg press','45 degree leg press'];
assert.equal(acceptedExerciseDBName({name:'Sled 45° Leg Press'},target),true);
assert.equal(acceptedExerciseDBName({name:'Horizontal Leg Press'},target),false);
assert.equal(acceptedExerciseDBName({name:'Squat'},target),false);
assert.equal(acceptedExerciseDBName({name:42},target),false);
assert.equal(safeExerciseDBGif('https://static.exercisedb.dev/media/EIeI8Vf.gif'),
  'https://static.exercisedb.dev/media/EIeI8Vf.gif');
for(const url of [
 'javascript:alert(1)',
 'https://static.exercisedb.dev.attacker.com/media/x.gif',
 'https://static.exercisedb.dev/media/x.png',
 'https://oss.exercisedb.dev/media/x.gif',
 'https://static.exercisedb.dev/media/x.gif?tracking=1',
])assert.equal(safeExerciseDBGif(url),null);

// One reusable opt-in component for all exercise detail/guide surfaces.
assert.match(read('src/components/ExerciseExecutionGuide.tsx'),/ExerciseDBPreview exerciseName/);
assert.match(read('src/pages/ExerciseLibraryPage.tsx'),/ExerciseDBPreview exerciseName/g);
assert.match(read('src/pages/ComplementaryPage.tsx'),/ExerciseDBPreview exerciseName/);
assert.match(read('src/components/ExerciseDBPreview.tsx'),/Créditos: AscendAPI \/ ExerciseDB/);
assert.match(read('src/components/ExerciseDBPreview.tsx'),/else void request\(\)/);
assert.match(read('src/components/ExerciseDBPreview.tsx'),/Ocultar GIF/);
assert.match(read('src/data/exerciseDbBeta.ts'),/VITE_FOCO_EXERCISEDB_NONCOMMERCIAL_BETA==='true'/);
assert.match(read('src/data/exerciseDbBeta.ts'),/cache:'no-store'/);
assert.ok(!read('src/data/exerciseDbBeta.ts').includes('cache.set('),'Provider responses must not be cached without licensed rights');
assert.ok(!read('src/data/exerciseDbBeta.ts').includes('cached.expires'),'No persistent/temporary response cache');
assert.ok(read('src/data/exerciseDbBeta.ts').includes('[...new Set(candidates)].slice(0,2)'), 'At most two explicitly approved names per user request');
assert.match(read('src/data/exerciseDbBeta.ts'),/credentials:'omit'/);
assert.match(read('.github/workflows/deploy.yml'),/VITE_FOCO_EXERCISEDB_NONCOMMERCIAL_BETA: 'true'/);
console.log('ExerciseDB beta: exact-name match, URL allowlist, attribution, opt-in and commercial guard verified.');
