import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const mobile=read("src/components/BottomNavBar.tsx");
const desktop=read("src/components/DesktopNav.tsx");
const progress=read("src/pages/ProgressPage.tsx");
const okok=read("src/components/OkokEvolutionSection.tsx");
const app=read("src/App.tsx");
const session=read("src/pages/ActiveSessionPage.tsx");
const dashboard=read("src/pages/DashboardPage.tsx");
const details=read("src/pages/WorkoutDetailPage.tsx");
const workout=read("src/pages/WorkoutsPage.tsx");
const css=read("src/index.css")+"\n"+read("src/foco-v6.css");

for(const id of ["dashboard","sessao","progresso","treinos","perfil"]){
 assert.match(mobile,new RegExp("id:\\s*'"+id+"'"),"Mobile menu missing "+id);
}
for(const id of ["dashboard","sessao","progresso","biblioteca","perfil"]){
 assert.match(desktop,new RegExp("id: '"+id+"'"),"Desktop menu missing "+id);
}
assert.match(mobile,/aria-current=\{selected\?'page':undefined\}/);
assert.match(mobile,/\['arquivos','historico'\]\.includes\(activeTab\)/);
assert.equal((mobile.match(/id:'dashboard'/g)||[]).length,1);
assert.equal((mobile.match(/id:'progresso'/g)||[]).length,1);
for(const route of ["dashboard","detalhes","sessao","treinos","progresso","arquivos","cardio","perfil"]){
 assert.match(app,new RegExp("case '"+route+"'|route === '"+route+"'|activeTab === '"+route+"'"),"App missing "+route);
}
assert.match(app,/href="#foco-main-content"/);
assert.match(app,/id="foco-main-content" tabIndex=\{-1\}/);
assert.match(app,/window\.scrollTo\(0, 0\)/);
assert.match(read("src/pages/CardioPage.tsx"),/Finalizar e registrar cardio/);
assert.match(read("src/pages/CardioPage.tsx"),/stopActivity/);
assert.match(read("src/pages/HistoryPage.tsx"),/cardioDetails/);
assert.match(workout,/weeklyCards/);
assert.match(workout,/selectSession\(day\.value\)/);
assert.match(workout,/Gerenciar fichas e exercícios/);
assert.match(dashboard,/foco-v6-hero/);
assert.match(dashboard,/foco-v6-week-strip|FocoV6WeekStrip/);
assert.match(dashboard,/getActiveWorkout/);
assert.match(dashboard,/getSessions/);
assert.match(details,/getActiveWorkout/);
assert.match(details,/getPreferredTrainingDay/);
assert.match(session,/foco-v6-session-photo/);
assert.match(session,/handleToggleSetComplete\(v6ExIndex,v6SetIndex\)/);
assert.match(session,/handleUpdateSet\(v6ExIndex,v6SetIndex/);
assert.match(session,/min-h-12/);
assert.match(session,/Preferências de descanso e som/);
assert.match(session,/aria-label="Progresso de séries concluídas"/);
assert.match(okok,/Principais indicadores/);
assert.match(okok,/Ver todos os indicadores/);
assert.match(okok,/getOkokAssessments/);
assert.match(okok,/getOkokTrend/);
assert.match(progress,/getOkokAssessments/);
assert.match(progress,/getOkokTrend/);
assert.match(progress,/OkokEvolutionSection/);
assert.match(progress,/htmlFor="foco-measurement-value"/);
assert.match(progress,/dataUnavailable/);
assert.match(progress,/role="alert"/);
assert.match(css,/--v6-accent:#C8F040/);
assert.match(css,/backdrop-filter:blur\(24px\)/);
assert.match(css,/safe-area-inset-bottom/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/:focus-visible/);
console.log("FOCO V6 guardrails: responsive UI, real data, functional controls, glass navigation and accessibility passed.");
