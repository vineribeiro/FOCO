import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeExerciseDBBrowseUrl,sanitizeExternalExercise,EXERCISEDB_PAGE_SIZE} from '../src/data/exerciseDbCatalog';
const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
assert.equal(EXERCISEDB_PAGE_SIZE,12);
const first=new URL(makeExerciseDBBrowseUrl());
assert.equal(first.origin,'https://oss.exercisedb.dev');
assert.equal(first.pathname,'/api/v1/exercises');
assert.equal(first.searchParams.get('limit'),'12');
assert.ok(!first.searchParams.has('page')&&!first.searchParams.has('offset')&&!first.searchParams.has('after'));
const next=new URL(makeExerciseDBBrowseUrl('barbell bench press','edb_T5uXtLj'));
assert.equal(next.pathname,'/api/v1/exercises/search');
assert.equal(next.searchParams.get('search'),'barbell bench press');
assert.equal(next.searchParams.get('after'),'edb_T5uXtLj');
assert.ok(!new URL(makeExerciseDBBrowseUrl('', 'https://evil.example')).searchParams.has('after'));
const result=sanitizeExternalExercise({
 exerciseId:'EIeI8Vf',name:'barbell bench press',
 gifUrl:'https://static.exercisedb.dev/media/EIeI8Vf.gif',
 bodyParts:['chest'],targetMuscles:['pectorals'],secondaryMuscles:['triceps'],equipments:['barbell'],
 instructions:['Step:1 Settle onto a bench'],
});
assert.equal(result?.name,'barbell bench press');
assert.equal(result?.gifUrl,'https://static.exercisedb.dev/media/EIeI8Vf.gif');
assert.equal(sanitizeExternalExercise({exerciseId:'?',name:'bad'}),null);
assert.equal(sanitizeExternalExercise({exerciseId:'EIeI8Vf',name:'Safe',gifUrl:'https://evil.example/file.gif'})?.gifUrl,null);
const source=read('src/data/exerciseDbCatalog.ts');
assert.ok(source.includes("cache: 'no-store'"));
assert.ok(source.includes("meta.hasNextPage === true"));
assert.ok(source.includes('meta.nextCursor'));
assert.ok(!source.includes('localStorage.setItem')&&!source.includes('indexedDB'));
assert.ok(read('src/pages/ExerciseLibraryPage.tsx').includes('ExerciseDBCatalogBrowser'));
assert.ok(!read('src/pages/ExerciseLibraryPage.tsx').includes('foco-atlas-curated-grid'),'Remove duplicate curated gallery');
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes('Usar como referência para minha ficha'));
assert.ok(!read('src/components/ExerciseDBCatalogBrowser.tsx').includes('matchingFOCO'));
assert.ok(read('src/pages/ExerciseLibraryPage.tsx').includes('exercise_name:typed'),'Only a name supplied by user may be persisted');
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes('onClick={()=>setShowGif(false)}'));
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes('result.nextCursor'));
assert.ok(read('src/main.tsx').includes("import './foco-exercise-atlas.css'"));
assert.ok(read('src/components/ExerciseIllustration.tsx').includes('data-foco-media-source="exercisedb"'));
assert.ok(!read('src/components/ExerciseIllustration.tsx').includes('getRepDBIllustrations'));
assert.ok(!read('src/components/ExerciseExecutionGuide.tsx').includes('ExercisePhaseGallery'));
assert.ok(!read('src/pages/ActiveSessionPage.tsx').includes('legpress-45-foco.svg'));
assert.ok(!read('src/pages/ActiveSessionPage.tsx').includes('loadExerciseCatalog()'));
assert.ok(!read('src/foco-exercise-atlas.css').includes('.foco-atlas-source-tabs'));
assert.ok(!read('src/foco-exercise-atlas.css').includes('.foco-atlas-curated-grid'));
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes("useEffect(()=>{void fetchPage('',null,1);},[])"),'Load first page on entry, not behind old tabs');
assert.ok(read('AGENTS.md').includes('NÃO COMERCIAL'));
console.log('FOCO Exercise Atlas: cursor pagination, sanitization, source tabs and noncommercial rules verified.');
