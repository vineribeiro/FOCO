import assert from "node:assert/strict";
import {
  SCIENCE_ENGINE_VERSION,
  buildScientificWorkoutGuidance, assessTrainingSafety, normalizeScienceExercises,
  minimumRestSeconds, classifyMovement, auditScientificWorkout as auditStrictWorkout, sciencePlanSummary,
  sessionExerciseRange,
} from "../supabase/functions/foco-api/trainingScience.mjs";

// Legacy scientific audit scenarios focus on volume and taxonomy, independently
// of the product's preferred exercise-count bands.
const auditScientificWorkout = (exercises, options) =>
  auditStrictWorkout(exercises, { ...options, enforceExerciseRange: false });

for (const [minutes, min, max] of [
  [20, 2, 3], [29, 2, 3], [30, 4, 5], [45, 4, 5],
  [46, 5, 6], [60, 5, 6], [61, 6, 7], [75, 6, 7],
  [76, 7, 8], [90, 7, 8],
]) assert.deepEqual(sessionExerciseRange(minutes), { min, max }, 'Duração: ' + minutes);

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
assert.equal(valid.estimatedEffectiveSetsByGroup["Quadríceps"],3);
const compound = auditScientificWorkout([
  exercise("Supino reto com barra","Peitoral","segunda",3,130),
],{experience:"iniciante",days:["segunda"],sessionMinutes:60});
assert.equal(compound.ok,true,compound.issue);
assert.equal(compound.directSetsByGroup["Peitoral"],3);
assert.equal(compound.estimatedEffectiveSetsByGroup["Tríceps"],1.5);
assert.equal(compound.estimatedEffectiveSetsByGroup["Ombros"],1.5);
const wrongMuscle = auditScientificWorkout([
  exercise("Supino reto com barra","Quadríceps","segunda",3,140),
],{experience:"iniciante",days:["segunda"],sessionMinutes:60});
assert.equal(wrongMuscle.ok,false);
assert.match(wrongMuscle.issue,/classificado/);
const unknownExercise = auditScientificWorkout([
  exercise("Exercício Inventado 123","Peitoral","segunda",3,140),
],{experience:"iniciante",days:["segunda"],sessionMinutes:60});
assert.equal(unknownExercise.ok,false);
assert.match(unknownExercise.issue,/catálogo/);
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
const fourExercises = [
  exercise("Supino reto com barra", "Peitoral", "segunda", 2, 120),
  exercise("Puxada frontal na polia", "Costas", "segunda", 2, 120),
  exercise("Agachamento livre com barra", "Quadríceps", "segunda", 2, 120),
  exercise("Mesa flexora", "Posteriores", "segunda", 2, 90),
];
const countOptions = { experience: "intermediario", days: ["segunda"], sessionMinutes: 45 };
assert.equal(auditStrictWorkout(fourExercises, countOptions).ok, true, "4 exercícios em 45 minutos são aceitos");
const underfilled = auditStrictWorkout(fourExercises.slice(0, 3), countOptions);
assert.equal(underfilled.ok, false, "3 exercícios em 45 minutos devem ser rejeitados");
assert.match(underfilled.issue, /4-5/);
const fiveExercises = [...fourExercises, exercise("Prancha abdominal", "Core", "segunda", 2, 45)];
assert.equal(auditStrictWorkout(fiveExercises, countOptions).ok, true, "5 exercícios em 45 minutos são aceitos");
assert.equal(auditStrictWorkout(fiveExercises, { ...countOptions, sessionMinutes: 60 }).ok, true, "5 exercícios em 60 minutos são aceitos");
const underfilled60 = auditStrictWorkout(fourExercises, { ...countOptions, sessionMinutes: 60 });
assert.equal(underfilled60.ok, false, "4 exercícios em 60 minutos devem ser rejeitados");
assert.match(underfilled60.issue, /5-6/);
assert.equal(auditStrictWorkout(normalizeScienceExercises(fourExercises.slice(0, 2), { experience: "intermediario", highRisk: true }), { ...countOptions, highRisk: true }).ok, true,
  "Condições de alto risco não forçam adição de exercícios");
const onlyCardio = [exercise("Bicicleta ergométrica", "Cardio", "segunda", 1, 45)];
assert.equal(auditStrictWorkout(onlyCardio, countOptions).ok, true,
  "Dia exclusivamente aeróbico não precisa atingir contagem de musculação");
assert.match(buildScientificWorkoutGuidance({ sessionMinutes: 45 }), /4-5 exercícios/);
assert.match(buildScientificWorkoutGuidance({ sessionMinutes: 60 }), /5-6 exercícios/);
console.log("FOCO study 2026: divisions, progression, time bands, safety, official catalog and indirect-volume assertions OK.");
