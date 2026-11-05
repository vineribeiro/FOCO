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
assert.ok(read('src/pages/ExerciseLibraryPage.tsx').includes('foco-atlas-curated-grid'));
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes('Ver versão revisada no FOCO'));
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes('onClick={()=>setShowGif(false)}'));
assert.ok(read('src/components/ExerciseDBCatalogBrowser.tsx').includes('result.nextCursor'));
assert.ok(read('src/main.tsx').includes("import './foco-exercise-atlas.css'"));
assert.ok(read('AGENTS.md').includes('NÃO COMERCIAL'));
console.log('FOCO Exercise Atlas: cursor pagination, sanitization, source tabs and noncommercial rules verified.');
