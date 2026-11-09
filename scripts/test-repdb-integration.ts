import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {
 repdbIdForExercise,repdbDisplayName,repdbImageUrl,repdbImageUrls,
 safeRepDBImagePath,normalizeRepDBName,REPDB_CREDIT_URL,
} from '../src/data/repdbAssets';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

assert.equal(REPDB_CREDIT_URL,'https://repdb.co');
assert.equal(repdbIdForExercise('Supino reto com barra'),'bench-press');
assert.equal(repdbIdForExercise('Leg press 45 graus'),'leg-press');
assert.equal(repdbIdForExercise('Prancha abdominal'),'plank');
assert.equal(repdbIdForExercise('Movimento que não existe'),null,'No imprecise fallback substitution');
assert.equal(normalizeRepDBName('Supino RÉTO'),normalizeRepDBName('supino reto'));
assert.equal(repdbDisplayName({id:'bench-press',name_en:'Bench Press'}),'Supino reto com barra');
assert.equal(safeRepDBImagePath('images/flat/bench-press-start.webp'),'images/flat/bench-press-start.webp');
for(const unsafe of [
 'https://attacker.example/file.webp','images/flat/../premium-samples/bench.gif',
 'premium-samples/bench-press.webp','images/flat/bench-press.gif',
 'images/flat/BENCH.webp','images/flat/bench.webp?tracking=1',null,42
]) assert.equal(safeRepDBImagePath(unsafe),null);
assert.equal(repdbImageUrl('images/flat/bench-press-peak.webp'),
 'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/images/flat/bench-press-peak.webp');
assert.deepEqual(repdbImageUrls({id:'bench-press',name_en:'Bench Press',
 images:{flat:{start:'images/flat/bench-press-start.webp',peak:'images/flat/bench-press-peak.webp'}}}).length,2);
assert.equal(repdbImageUrls({id:'plank',name_en:'Plank',
 images:{flat:{main:'images/flat/plank-main.webp'}}}).length,1);

const component=read('src/components/ExerciseIllustration.tsx');
const browser=read('src/components/RepDBCatalogBrowser.tsx');
const page=read('src/pages/ExerciseLibraryPage.tsx');
const server=read('supabase/functions/foco-api/index.ts');
const css=read('src/foco-exercise-atlas.css');
assert.match(component,/data-foco-media-source="repdb"/);
assert.match(component,/IntersectionObserver/,'Exercise images should load on entering viewport');
assert.match(component,/onError=\{\(\)=>markBroken\(activeUrl\)\}/,'Broken WebP needs fallback');
assert.match(component,/aria-pressed=\{pose===0\}/,'Pose controls must expose current state');
assert.match(browser,/loadRepDBCatalog/);
assert.match(browser,/PER_PAGE=24/,'Large catalogs need local pagination');
assert.match(browser,/repdbImageUrls/);
assert.match(page,/repdb_id:selected\?\.id/,'New workouts must preserve media ID after renaming');
assert.match(server,/repdb_id: typeof input\.repdb_id/,'Backend must persist media ID');
assert.match(read('src/types.ts'),/repdb_id\?: string \| null/);
assert.match(read('src/utils/workoutDraft.ts'),/repdb_id\?: string \| null/);
assert.match(css,/foco-repdb-pose-switch/);
assert.match(read('AGENTS.md'),/RepDB Free/);
for(const file of [
 'src/data/exerciseDbBeta.ts','src/data/exerciseDbCatalog.ts',
 'src/components/ExerciseDBPreview.tsx','src/components/ExerciseDBCatalogBrowser.tsx',
 'public/exercise-catalog.json','scripts/test-exercisedb-beta.ts','scripts/test-exercisedb-live.mjs'
]) assert.equal(existsSync(new URL('../'+file,import.meta.url)),false,'Obsolete source must be deleted: '+file);
const groups=readdirSync(new URL('../public/',import.meta.url)).filter(file=>/^\d\d_.*\.json$/.test(file));
const sourceCount=groups.reduce((n,file)=>n+JSON.parse(read('public/'+file)).exercicios.length,0);
assert.equal(sourceCount,254,'The FOCO internal educational catalog must remain intact');
console.log('FOCO RepDB: secure image paths, exact matching, live catalog, lazy media, persistent ID and legacy cleanup verified.');
