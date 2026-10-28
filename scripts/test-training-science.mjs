import assert from "node:assert/strict";
import {
  SCIENCE_ENGINE_VERSION,
  buildScientificWorkoutGuidance, assessTrainingSafety, normalizeScienceExercises,
  minimumRestSeconds, classifyMovement, auditScientificWorkout, sciencePlanSummary,
} from "../supabase/functions/foco-api/trainingScience.mjs";

const exercise = (name, group, day, sets = 3, rest = 120) => ({
  exercise_name: name, muscle_group: group, training_day: day,
  sets, reps_min: 8, reps_max: 12, rest_seconds: rest, suggested_load_kg: 110,
  notes: "Controle a amplitude.", rir_target: 2,
});
assert.match(SCIENCE_ENGINE_VERSION, /2026/);
for (const [freq, fragment] of [[2, "Full Body"],[3,"Full Body"],[4,"Upper/Lower"],[5,"Híbrida"],[6,"Push/Pull/Legs"],[7,"Sete dias"]]) {
  const context = buildScientificWorkoutGuidance({ frequency: freq,experience:"intermediario" });
  assert.ok(context.includes(fragment), "Divisão esperada para " + freq);
  assert.match(context, /progressão|Progressão/i);
  assert.match(context, /RIR/);
  assert.match(context, /48 h/);
}
assert.match(buildScientificWorkoutGuidance({experience:"iniciante"}), /4-8 séries/);
assert.match(buildScientificWorkoutGuidance({experience:"avancado"}), /10-20 séries/);
assert.match(buildScientificWorkoutGuidance({goal:"Emagrecimento"}), /repetições altas/);
assert.match(buildScientificWorkoutGuidance({goal:"Força Pura",experience:"intermediario"}), /3-6 repetições/);
assert.equal(classifyMovement("Supino reto com barra","Peitoral"),"heavy_compound");
assert.equal(classifyMovement("Rosca direta com barra reta","Bíceps"),"accessory");
assert.equal(classifyMovement("Remada curvada com barra","Costas"),"pull_push_compound");
assert.equal(classifyMovement("Bicicleta ergométrica","Cardio"),"cardio");
assert.equal(minimumRestSeconds("Agachamento livre com barra"),120);
assert.equal(minimumRestSeconds("Rosca direta com halteres"),60);
const normalized = normalizeScienceExercises([
  exercise("Agachamento livre com barra","Quadríceps","segunda",3,45),
  exercise("Rosca direta com barra reta","Bíceps","segunda",2,30),
],{experience:"iniciante"});
assert.equal(normalized[0].rest_seconds,120);
assert.equal(normalized[1].rest_seconds,60);
assert.equal(normalized[0].suggested_load_kg,0);
assert.equal(normalized[0].rir_target,3);
assert.match(normalized[1].notes,/RIR alvo: 3/);
assert.ok(normalized[1].notes.length <=500);
const valid = auditScientificWorkout(normalized, {experience:"iniciante",days:["segunda"],sessionMinutes:60});
assert.equal(valid.ok,true,valid.issue);
assert.equal(valid.directSetsByGroup["Quadríceps"],3);
const summary = sciencePlanSummary({frequency:2,experience:"iniciante"},valid);
assert.match(summary.progression,/Progressão dupla/);
assert.deepEqual(summary.total_sets_by_day,{segunda:5});
const tooMany = auditScientificWorkout([
  exercise("Supino reto com barra","Peitoral","segunda",8,150),
  exercise("Supino inclinado com halteres","Peitoral","quinta",8,150),
],{experience:"iniciante",days:["segunda","quinta"],sessionMinutes:150});
assert.equal(tooMany.ok,false);
assert.match(tooMany.issue,/volume|teto/i);
const consecutiveEasy = auditScientificWorkout([
  exercise("Cadeira extensora","Quadríceps","segunda",2,65),
  exercise("Cadeira extensora","Quadríceps","terca",2,65),
],{experience:"intermediario",days:["segunda","terca"],sessionMinutes:45});
assert.equal(consecutiveEasy.ok,true,consecutiveEasy.issue);
const consecutiveHeavy = auditScientificWorkout([
  exercise("Supino reto com barra","Peitoral","segunda",6,150),
  exercise("Supino inclinado com halteres","Peitoral","terca",6,150),
],{experience:"avancado",days:["segunda","terca"],sessionMinutes:110});
assert.equal(consecutiveHeavy.ok,false);
assert.match(consecutiveHeavy.issue,/consecutivos/);
const longDay = auditScientificWorkout(
  Array.from({length:8},(_,i)=>exercise("Agachamento livre com barra","Quadríceps","segunda",3,180)),
  {experience:"avancado",days:["segunda"],sessionMinutes:30},
);
assert.equal(longDay.ok,false);
const highRisk = assessTrainingSafety({notes:"Histórico de rabdomiólise recorrente, recuperado",consent:true});
assert.equal(highRisk.highRisk,true);
assert.equal(highRisk.acuteRedFlag,false);
assert.equal(assessTrainingSafety({notes:"Urina escura e dor torácica",consent:true}).acuteRedFlag,true);
assert.equal(assessTrainingSafety({notes:"Sem dor no peito",consent:true}).acuteRedFlag,false);
assert.equal(assessTrainingSafety({notes:"rabdomiólise",consent:false}).highRisk,false);
const conservative = normalizeScienceExercises([exercise("Supino reto com barra","Peitoral","segunda",5,60)],{
  experience:"intermediario",highRisk:true,
});
assert.equal(conservative[0].sets,2);
assert.equal(conservative[0].rir_target,3);
assert.equal(auditScientificWorkout(conservative,{experience:"intermediario",days:["segunda"],highRisk:true}).ok,true);
console.log("FOCO study 2026: 24 scientific rules / boundary assertions OK.");
