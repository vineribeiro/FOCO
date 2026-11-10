import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import * as science from '../supabase/functions/foco-api/trainingScience.mjs';
import { GroqError } from '../supabase/functions/foco-api/groq.mjs';
import { catalogExercise } from '../supabase/functions/foco-api/trainingCatalog.mjs';

// Actual Edge request routing and scientific audit, isolated from Auth, storage,
// and inference. Fixtures are synthetic; no request leaves this process.
const source = readFileSync(new URL('../supabase/functions/foco-api/index.ts', import.meta.url), 'utf8');
const compiled = stripTypeScriptTypes(source.slice(source.indexOf('const SUPABASE_URL')), { mode: 'transform' });
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'private-route-fixture@example.invalid' };
const athlete = {
  id: user.id, full_name: 'Private synthetic athlete identity', email: user.email,
  experience_level: 'iniciante', current_weight_kg: 70, height_cm: 170,
};
const metricMarker = 'Synthetic private metric marker';
const healthMarker = 'Synthetic authorized knee limitation';

function harness({ consent = false, modifyProposal = () => {}, healthNotes = healthMarker, sessionMinutes = 20 } = {}) {
  const calls = [], reads = [];
  let handler;
  const records = {
    profiles: athlete,
    anamneses: {
      session_minutes: sessionMinutes, weekly_frequency: 3,
      consent_health_data: consent, pain_or_injuries: healthNotes,
      health_notes: '', primary_goal: 'Condicionamento', equipment_available: ['Academia'],
    },
    workout_sessions: [],
    uploaded_files: [{ extracted_data: { summary: 'Synthetic report', metrics: [{ name: metricMarker, value: '42' }], limitations: 'Synthetic estimate' } }],
  };
  const db = {
    auth: { getUser: async jwt => {
      assert.equal(jwt, 'synthetic-jwt');
      return { data: { user }, error: null };
    } },
    from(table) {
      assert.ok(Object.hasOwn(records, table), 'Unexpected table: ' + table);
      reads.push(table);
      const filters = [];
      const result = () => {
        assert.ok(filters.some(([column, value]) => ['id', 'user_id'].includes(column) && value === user.id), 'Read must be scoped to owner: ' + table);
        return { data: structuredClone(records[table]), error: null };
      };
      const query = {
        select() { return query; },
        eq(column, value) { filters.push([column, value]); return query; },
        order() { return query; }, limit() { return query; },
        maybeSingle: async () => result(),
        then(resolve, reject) { return Promise.resolve().then(result).then(resolve, reject); },
      };
      return query;
    },
  };
  const deps = {
    ...science, GroqError, catalogExercise,
    createClient: (_url, _key, options) => {
      assert.equal(options.global.headers.Authorization, 'Bearer synthetic-jwt');
      return db;
    },
    PasswordSecurityError: class PasswordSecurityError extends Error {},
    assertPasswordNotLeaked: async () => {},
    generateGroqJson: async request => {
      calls.push(request);
      const frequency = Number(/Frequência obrigatória: (\d+)/.exec(request.prompt)?.[1]);
      const days = api.scheduleDays(undefined, frequency);
      const exercises = days.flatMap(training_day => [
        { exercise_name: 'Supino reto com barra', muscle_group: 'Peitoral' },
        { exercise_name: 'Remada curvada com barra', muscle_group: 'Costas' },
      ].map(exercise => ({
        ...exercise, training_day, sets: 1, reps_min: 8, reps_max: 12,
        rest_seconds: 120, notes: 'Amplitude controlada.', rir_target: 3,
        // The audit must discard unsupported starting-load recommendations.
        suggested_load_kg: 500,
      })));
      const proposal = { name: 'Synthetic proposal', goal: 'Condicionamento', weekly_frequency: frequency, explanation: 'Synthetic explanation.', exercises };
      modifyProposal(proposal);
      return proposal;
    },
    Deno: {
      env: { get: key => key === 'GROQ_API_KEY' ? 'synthetic-groq-key' : '' },
      serve: value => { handler = value; },
    },
  };
  const api = new Function(...Object.keys(deps), compiled + '\nreturn {OFFICIAL_EXERCISES, scheduleDays};')(...Object.values(deps));
  const run = body => handler(new Request('https://local.invalid/api/ai/generate-workout', {
    method: 'POST',
    headers: { Authorization: 'Bearer synthetic-jwt', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { run, calls, reads, api };
}

// Reuse the exact route prompt for a separate, explicitly invoked provider smoke
// test. This capture itself only calls the synthetic provider above.
export async function captureSyntheticWorkoutRequest(sessionMinutes = 60, {
  frequency = 3, experience = 'iniciante', goal = 'Condicionamento', equipment = 'Academia',
} = {}) {
  const h = harness({ sessionMinutes, healthNotes: '' });
  await h.run({ weekly_frequency: frequency, experience_level: experience, goal, equipment_available: equipment });
  return {
    prompt: h.calls[0].prompt,
    schema: h.calls[0].schema,
    days: h.api.scheduleDays(undefined, frequency),
    experience, sessionMinutes,
  };
}

let checks = 0;
async function check(label, fn) { await fn(); checks++; console.log('PASS ' + label); }

await check('six-day initial proposals constrain total count, days and starting sets before audit', async () => {
  const entries = [
    ['Supino reto com barra', 'Peitoral'], ['Remada curvada com barra', 'Costas'],
    ['Leg press 45 graus', 'Quadríceps'], ['Mesa flexora', 'Posteriores'],
    ['Panturrilha em pé na máquina', 'Panturrilhas'],
  ];
  const h = harness({ sessionMinutes: 60, modifyProposal: proposal => {
    const days = [...new Set(proposal.exercises.map(e => e.training_day))];
    proposal.exercises = days.flatMap(training_day => entries.map(([exercise_name, muscle_group]) => ({
      exercise_name, muscle_group, training_day, sets: 1, reps_min: 8, reps_max: 12,
      rest_seconds: 120, rir_target: 3, notes: 'Controle a amplitude.', suggested_load_kg: 0,
    })));
  } });
  const result = await h.run({ weekly_frequency: 6, experience_level: 'iniciante', goal: 'Definição & Emagrecimento' });
  const data = await result.json();
  assert.equal(result.status, 200, data.error);
  assert.equal(data.exercises.length, 30);
  const schema = h.calls[0].schema.properties.exercises;
  assert.equal(schema.minItems, 30); assert.equal(schema.maxItems, 36);
  assert.equal(schema.items.properties.sets.maximum, 2);
  assert.deepEqual(schema.items.properties.training_day.enum, h.api.scheduleDays(undefined, 6));
  assert.match(h.calls[0].prompt, /TOTAL 30-36/);
  const seven = harness();
  assert.equal((await seven.run({ weekly_frequency: 7 })).status, 200);
  assert.equal(seven.calls[0].schema.properties.exercises.minItems, undefined);
});

await check('2, 3, and 7 days retain the whole indexed catalog and pass the real scientific audit', async () => {
  for (const weekly_frequency of [2, 3, 7]) {
    const h = harness();
    const response = await h.run({ weekly_frequency });
    const data = await response.json();
    assert.equal(response.status, 200, data.error);
    assert.equal(h.calls.length, 1);
    const { prompt, catalog } = h.calls[0];
    assert.equal(catalog.length, 233);
    assert.deepEqual(catalog, h.api.OFFICIAL_EXERCISES);
    for (const [index, name] of catalog.entries()) assert.ok(prompt.includes(index + ':' + name), name);
    const days = h.api.scheduleDays(undefined, weekly_frequency);
    assert.ok(prompt.includes('Dias EXATOS de treino: ' + days.join(', ') + '.'));
    assert.equal(data.weekly_frequency, weekly_frequency);
    assert.deepEqual([...new Set(data.exercises.map(exercise => exercise.training_day))], days);
    assert.ok(data.exercises.every(exercise => exercise.suggested_load_kg === 0));
    assert.ok(data.exercises.every(exercise => exercise.rir_target >= 3));
    assert.ok(data.training_science);
    assert.doesNotMatch(prompt, /11111111-1111|private-route-fixture|Private synthetic athlete identity|synthetic-jwt|synthetic-groq-key/);
  }
});

await check('health notes and extracted metrics reach inference only with the corresponding authorization', async () => {
  for (const consent of [false, true]) {
    for (const include_body_metrics of [false, true]) {
      const h = harness({ consent });
      const response = await h.run({ weekly_frequency: 2, include_body_metrics });
      assert.equal(response.status, 200, await response.clone().text());
      const prompt = h.calls[0].prompt;
      assert.equal(prompt.includes(healthMarker), consent);
      assert.equal(prompt.includes(metricMarker), include_body_metrics);
      assert.equal(h.reads.includes('uploaded_files'), include_body_metrics);
    }
  }
});

await check('outside-catalog and excessive-dose proposals are rejected after the bounded correction attempt', async () => {
  for (const modifyProposal of [
    proposal => { proposal.exercises[0].exercise_name = 'Synthetic invented movement'; },
    proposal => { proposal.exercises.forEach(exercise => { exercise.sets = 4; }); },
  ]) {
    const h = harness({ modifyProposal });
    const response = await h.run({ weekly_frequency: 7 });
    assert.equal(response.status, 502);
    const data = await response.json();
    assert.match(data.error, /catálogo|volume|teto|tempo/i);
    assert.equal(h.calls.length, 2);
    assert.match(h.calls[1].prompt, /proposta anterior foi reprovada/);
  }
});

await check('acute red flags prevent any provider call', async () => {
  const h = harness({ consent: true, healthNotes: 'dor no peito e desmaio' });
  const response = await h.run({ weekly_frequency: 2 });
  assert.equal(response.status, 400);
  assert.equal(h.calls.length, 0);
});

await check('compact guidance preserves level-specific dose limits and clinical constraints', async () => {
  for (const [experience, weekly, daily, rir] of [
    ['iniciante', 12, 19, '3-4'], ['intermediario', 18, 26, '2-3'], ['avancado', 24, 32, '1-3'],
  ]) {
    const guidance = science.buildCompactWorkoutGuidance({ experience, sessionMinutes: 20 });
    assert.ok(guidance.includes('teto ' + weekly));
    assert.ok(guidance.includes('até ' + daily + ' séries'));
    assert.ok(guidance.includes('RIR ' + rir));
  }
  const highRisk = science.buildCompactWorkoutGuidance({ experience: 'avancado', highRisk: true });
  assert.match(highRisk, /até2 séries\/exercício/);
  assert.match(highRisk, /RIR ?3-4/);
  assert.match(highRisk, /revisão médica/);
  assert.match(science.buildCompactWorkoutGuidance({ frequency: 7 }), /recuperação ativa/);
});

console.log(`GROQ WORKOUT ROUTE: ${checks} groups passed; no network or production data used.`);
