import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeTrainingHistory } from '../src/utils/trainingInsights';
import type { WorkoutSession } from '../src/types';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const now=Date.UTC(2026,10,5,12);
const make=(daysAgo:number,plan_name:string,notes:string,sets:any[],duration:number):WorkoutSession => ({
 id:'test-'+daysAgo+'-'+plan_name,plan_name,notes,status:'completed',
 started_at:new Date(now-daysAgo*86400000).toISOString(),duration_seconds:duration,sets
} as unknown as WorkoutSession);
const validSet={exercise_name:'Leg press 45 graus',completed:true,set_number:1,repetitions:10,load_kg:80};
const synthetic=[
 make(1,'Inferiores','',[validSet,{...validSet,set_number:2,completed:false}],3600),
 make(2,'Cardio · Esteira','[FOCO_CARDIO_V1]',[],1800),
 make(45,'Inferiores','',[validSet],2400),
 {...make(1,'Inferiores','',[validSet],3600),id:'failed',status:'in_progress'},
] as WorkoutSession[];
const summary=summarizeTrainingHistory(synthetic,now);
assert.deepEqual(summary,{workouts:2,strengthSessions:1,cardioSessions:1,completedSets:1,totalMinutes:90,hasHistory:true});
assert.equal(summarizeTrainingHistory([],now).workouts,0);
assert.match(read('src/pages/ActiveSessionPage.tsx'),/presentation="editorial" className="foco-v7-stage-illustration/);
assert.match(read('src/pages/ActiveSessionPage.tsx'),/Usar carga anterior/);
assert.match(read('src/components/ExerciseIllustration.tsx'),/data-foco-media-source=/);
assert.match(read('src/foco-v2-experience.css'),/min-height:44px/);
assert.match(read('src/main.tsx'),/applyUiPreferences\(readUiPreferences\(\)\)/);
assert.match(read('src/pages/SettingsPage.tsx'),/Aparência do FOCO/);
assert.match(read('src/pages/HistoryPage.tsx'),/role="alert"/);
assert.match(read('src/pages/HistoryPage.tsx'),/aria-expanded=\{isExpanded\}/);
assert.match(read('src/pages/ProgressPage.tsx'),/summarizeTrainingHistory/);
for(const skill of ['impeccable','hue','taste-skill','hallmark','foco-pro','motion-design','better-accessibility','better-interface']){
  assert.match(read('.agents/skills/'+skill+'/SKILL.md'),/name:/);
}
assert.match(read('AGENTS.md'),/FOCO 2.0: protagonistas/);
console.log('FOCO V2: last-load anchors, presentation state, owned skill stack, privacy and real data insights validated');
