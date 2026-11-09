import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A disposable PostgreSQL instance, with no published ports or remote credentials.
// Run: node scripts/test-backend-transactions.mjs (requires the local Docker daemon).
// The auth schema below is a minimal JWT-claims fixture; RLS and all business RPCs
// are the real repository SQL, executed as the non-owner authenticated role.
const root = fileURLToPath(new URL('../', import.meta.url));
const container = 'foco-transactions-' + process.pid + '-' + Date.now();
const image = process.env.FOCO_TEST_POSTGRES_IMAGE || 'postgres:17-alpine';
const dockerEnv = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete dockerEnv[key];
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const oldPlanA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const oldPlanB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const oldSession = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
let checks = 0;

function docker(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['--host=unix:///var/run/docker.sock', ...args], { env: dockerEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error('Docker/psql exited ' + code + ': ' + stderr.trim()));
    });
    child.stdin.end(input);
  });
}
const sql = query => docker(['exec', '-i', container, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'foco_test'], '\\set VERBOSITY verbose\n' + query);
const jsonSQL = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const asUser = (uid, query, appName = '') => `${appName ? `set application_name = '${appName}';` : ''}\nbegin; set local role authenticated; set local request.jwt.claim.sub = '${uid}';\n${query}\ncommit;`;
const parseJSON = value => JSON.parse(value.split('\n').find(line => line.trim().startsWith('{')) || value);
const rpc = async (name, value, uid = A) => parseJSON(await sql(asUser(uid, `select public.${name}(${jsonSQL(value)});`)));
const count = async (table, where = 'true') => Number(await sql(`select count(*) from public.${table} where ${where};`));
const check = async (name, task) => { await task(); checks++; console.log('PASS ' + name); };
async function failure(task, expected) {
  await assert.rejects(task, error => expected.test(error.message), 'expected PostgreSQL error ' + expected);
}
async function waitUntil(query, message) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (Number(await sql(query)) > 0) return;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error(message);
}
const plan = (name, exerciseName = 'Synthetic exercise') => ({
  name, goal: 'Synthetic test only', weekly_frequency: 3, status: 'ativo',
  exercises: [{ exercise_name: exerciseName, muscle_group: 'Synthetic', sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 60, suggested_load_kg: 10, training_day: 'segunda' }],
});
const session = (requestId, startedAt = '2026-11-09T12:00:00.000Z') => ({
  client_request_id: requestId, plan_id: oldPlanA, plan_name: 'Synthetic training',
  started_at: startedAt, finished_at: '2026-11-09T12:30:00.000Z', duration_seconds: 1800,
  status: 'completed', notes: 'Synthetic test only',
  sets: [{ exercise_name: 'Synthetic exercise', set_number: 1, repetitions: 10, load_kg: 20, completed: true }],
});

try {
  await docker(['info', '--format', '{{.ServerVersion}}']);
  await docker(['run', '-d', '--rm', '--name', container, '-e', 'POSTGRES_PASSWORD=synthetic-local-test', '-e', 'POSTGRES_DB=foco_test', image]);
  const deadline = Date.now() + 30000;
  while (true) {
    try { await sql('select 1;'); break; }
    catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const read = path => readFileSync(root + path, 'utf8');
  await sql(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await sql(read('supabase/migrations/20261026_initial_schema.sql'));
  await sql(read('supabase/migrations/20261026_custom_users_auth.sql'));
  // These pre-existing live columns were historically created outside the checked-in
  // migrations. Keep the fixture explicit so new migration coverage is reproducible.
  await sql(`
    create table public.anamneses (user_id uuid primary key references public.users(id) on delete cascade);
    alter table public.anamneses enable row level security;
    alter table public.workout_exercises add column position integer not null default 0;
    alter table public.workout_sessions add column plan_name text;
    alter table public.exercise_sets add column position integer not null default 0;
    alter table public.ai_recommendations add column proposed_plan jsonb;
  `);
  await sql(read('supabase/migrations/20261027_supabase_auth_rls.sql'));
  await sql(read('supabase/migrations/20261027_exercise_training_day.sql'));
  await sql(read('supabase/migrations/20261109121214_add_repdb_media_id_to_workout_exercises.sql'));
  await sql(`
    insert into auth.users(id) values ('${A}'), ('${B}');
    insert into public.workout_plans(id,user_id,name,status) values
      ('${oldPlanA}','${A}','Existing synthetic A','ativo'),
      ('${oldPlanB}','${B}','Existing synthetic B','ativo');
    insert into public.workout_sessions(id,user_id,plan_id,plan_name,started_at,duration_seconds)
      values ('${oldSession}','${A}','${oldPlanA}','Existing synthetic session','2026-11-01T12:00:00Z',120);
  `);
  const migrationName = readdirSync(root + 'supabase/migrations').find(name => name.endsWith('_atomic_workouts_and_sessions.sql'));
  assert.ok(migrationName, 'atomic_workouts_and_sessions migration must exist');
  const migration = read('supabase/migrations/' + migrationName);
  await sql(migration);
  // Reapplying the checked-in migration must also be safe during a deployment retry.
  await sql(migration);

  await check('migration preserves existing workout and session rows', async () => {
    assert.equal(await count('workout_plans'), 2);
    assert.equal(await count('workout_sessions'), 1);
    assert.equal(await count('workout_sessions', `id='${oldSession}' and client_request_id is null`), 1);
  });
  await check('RPCs execute as invoker, require auth, and deny anon execute', async () => {
    const functions = JSON.parse(await sql(`select json_agg(json_build_object('name',proname,'definer',prosecdef)) from pg_proc where pronamespace='public'::regnamespace and proname in ('foco_create_workout','foco_activate_workout','foco_record_session');`));
    assert.equal(functions.length, 3);
    assert.ok(functions.every(fn => fn.definer === false));
    await failure(() => sql(`set role authenticated; select public.foco_create_workout(${jsonSQL(plan('No auth'))});`), /PT401|42501/);
    await failure(() => sql(`set role anon; select public.foco_create_workout(${jsonSQL(plan('Anon'))});`), /42501/);
  });
  await check('invalid plan and nonexistent activation preserve active workout', async () => {
    const invalid = plan('Invalid synthetic day'); invalid.exercises[0].training_day = 'not-a-day';
    await failure(() => rpc('foco_create_workout', invalid), /PT400|22023|23514/);
    await failure(() => sql(asUser(A, `select public.foco_activate_workout('ffffffff-ffff-4fff-8fff-ffffffffffff');`)), /PT404|P0002/);
    assert.equal(await count('workout_plans', `id='${oldPlanA}' and status='ativo'`), 1);
    assert.equal(await count('workout_plans'), 2);
  });
  await check('exercise insert failure rolls back new plan and previous deactivation', async () => {
    await sql(`alter table public.workout_exercises add constraint synthetic_insert_failure check (exercise_name <> 'SYNTHETIC_FORCE_DB_FAILURE');`);
    await failure(() => rpc('foco_create_workout', plan('Must roll back', 'SYNTHETIC_FORCE_DB_FAILURE')), /23514/);
    assert.equal(await count('workout_plans', `id='${oldPlanA}' and status='ativo'`), 1);
    assert.equal(await count('workout_plans', "name='Must roll back'"), 0);
    await sql('alter table public.workout_exercises drop constraint synthetic_insert_failure;');
  });
  await check('creating and activating a workout is atomic and preserves other accounts', async () => {
    const created = await rpc('foco_create_workout', plan('New synthetic A'));
    assert.ok(created.id); assert.equal(created.exercises.length, 1);
    assert.equal(created.user_id, A);
    assert.equal(await count('workout_plans', `user_id='${A}' and status='ativo'`), 1);
    assert.equal(await count('workout_plans', `id='${oldPlanB}' and status='ativo'`), 1);
    await sql(asUser(A, `select public.foco_activate_workout('${oldPlanA}');`));
    assert.equal(await count('workout_plans', `id='${oldPlanA}' and status='ativo'`), 1);
  });
  await check('cross-account plan activation and session plan references are rejected', async () => {
    await failure(() => sql(asUser(A, `select public.foco_activate_workout('${oldPlanB}');`)), /PT404|P0002/);
    const value = session('33333333-3333-4333-8333-333333333333'); value.plan_id = oldPlanB;
    await failure(() => rpc('foco_record_session', value), /PT404|PT403|42501/);
    assert.equal(await count('workout_plans', `id='${oldPlanB}' and status='ativo'`), 1);
  });
  await check('session+sets commit together and exact replay returns the original record', async () => {
    const value = session('44444444-4444-4444-8444-444444444444');
    const first = await rpc('foco_record_session', value);
    const replay = await rpc('foco_record_session', value);
    assert.equal(first.id, replay.id); assert.deepEqual(first.sets, replay.sets);
    assert.equal(first.sets.length, 1);
    assert.equal(await count('workout_sessions', `client_request_id='${value.client_request_id}'`), 1);
    assert.equal(await count('exercise_sets', `session_id='${first.id}'`), 1);
    value.finished_at = '2026-11-09T12:31:00.000Z'; value.duration_seconds = 1860;
    const lateReplay = await rpc('foco_record_session', value);
    assert.equal(lateReplay.id, first.id);
    assert.equal(lateReplay.duration_seconds, first.duration_seconds, 'replay must return the saved result, not advance its timer');
    value.sets[0].load_kg = 999;
    await failure(() => rpc('foco_record_session', value), /PT409|23505/);
    assert.equal(await count('exercise_sets', `session_id='${first.id}' and load_kg=20`), 1);
  });
  await check('set insert failure rolls back session header and key can then be retried', async () => {
    await sql(`alter table public.exercise_sets add constraint synthetic_set_failure check (exercise_name <> 'SYNTHETIC_FORCE_DB_FAILURE');`);
    const value = session('55555555-5555-4555-8555-555555555555'); value.sets[0].exercise_name = 'SYNTHETIC_FORCE_DB_FAILURE';
    await failure(() => rpc('foco_record_session', value), /23514/);
    assert.equal(await count('workout_sessions', `client_request_id='${value.client_request_id}'`), 0);
    await sql('alter table public.exercise_sets drop constraint synthetic_set_failure;');
    const retried = await rpc('foco_record_session', value);
    assert.equal(retried.sets.length, 1);
  });
  await check('RLS hides foreign plans, sessions and series; spoofed user_id is ignored', async () => {
    const value = session('66666666-6666-4666-8666-666666666666'); value.plan_id = oldPlanB; value.user_id = A;
    const own = await rpc('foco_record_session', value, B); assert.equal(own.user_id, B);
    assert.equal(Number(await sql(asUser(A, `select count(*) from public.workout_plans where user_id='${B}';`))), 0);
    assert.equal(Number(await sql(asUser(A, `select count(*) from public.workout_sessions where user_id='${B}';`))), 0);
    assert.equal(Number(await sql(asUser(A, `select count(*) from public.exercise_sets where session_id='${own.id}';`))), 0);
    const ownA = session(value.client_request_id); const other = await rpc('foco_record_session', ownA, A);
    assert.notEqual(other.id, own.id, 'request keys are scoped to each user');
  });
  await check('concurrent workout requests wait for per-user transaction lock', async () => {
    const first = sql(asUser(A, `select public.foco_create_workout(${jsonSQL(plan('Concurrent A1'))}); select pg_sleep(2);`, 'foco-concurrent-plan-1'));
    await waitUntil("select count(*) from pg_stat_activity where application_name='foco-concurrent-plan-1' and wait_event='PgSleep';", 'first workout did not hold its transaction open');
    const second = sql(asUser(A, `select public.foco_create_workout(${jsonSQL(plan('Concurrent A2'))});`, 'foco-concurrent-plan-2'));
    await waitUntil("select count(*) from pg_stat_activity where application_name='foco-concurrent-plan-2' and wait_event='advisory';", 'second workout did not wait on advisory lock');
    await Promise.all([first, second]);
    assert.equal(await count('workout_plans', `user_id='${A}' and status='ativo'`), 1);
    assert.equal(await count('workout_plans', `user_id='${A}' and status='ativo' and name='Concurrent A2'`), 1);
  });
  await check('concurrent replay creates one session and one set', async () => {
    const value = session('77777777-7777-4777-8777-777777777777');
    const first = sql(asUser(A, `select public.foco_record_session(${jsonSQL(value)}); select pg_sleep(2);`, 'foco-concurrent-session-1'));
    await waitUntil("select count(*) from pg_stat_activity where application_name='foco-concurrent-session-1' and wait_event='PgSleep';", 'first session did not hold its transaction open');
    const second = sql(asUser(A, `select public.foco_record_session(${jsonSQL(value)});`, 'foco-concurrent-session-2'));
    await waitUntil("select count(*) from pg_stat_activity where application_name='foco-concurrent-session-2' and wait_event_type='Lock';", 'concurrent replay did not wait for the in-flight transaction');
    const [a,b] = (await Promise.all([first, second])).map(parseJSON);
    assert.equal(a.id,b.id); assert.deepEqual(a.sets,b.sets);
    assert.equal(await count('workout_sessions', `client_request_id='${value.client_request_id}'`), 1);
    assert.equal(await count('exercise_sets', `session_id='${a.id}'`), 1);
  });
  await check('different operation IDs preserve legitimate sessions sharing a start timestamp', async () => {
    const first = await rpc('foco_record_session', session('88888888-8888-4888-8888-888888888888'));
    const second = await rpc('foco_record_session', session('99999999-9999-4999-8999-999999999999'));
    assert.notEqual(first.id,second.id);
  });
  await check('workout transaction locks are scoped to each user', async () => {
    const holding = sql(asUser(A, `select public.foco_create_workout(${jsonSQL(plan('Account A lock'))}); select pg_sleep(2);`, 'foco-user-isolation-lock'));
    await waitUntil("select count(*) from pg_stat_activity where application_name='foco-user-isolation-lock' and wait_event='PgSleep';", 'first account did not hold its transaction open');
    const ownB = await rpc('foco_create_workout', plan('Account B independent'), B);
    assert.equal(ownB.user_id,B);
    assert.equal(Number(await sql("select count(*) from pg_stat_activity where application_name='foco-user-isolation-lock' and wait_event='PgSleep';")), 1, 'second account should complete while the first account still holds its lock');
    await holding;
  });
  console.log(`FOCO BACKEND TRANSACTIONS: ${checks} checks passed against disposable PostgreSQL; no production requests.`);
} finally {
  await docker(['rm', '-f', container]).catch(() => {});
}
