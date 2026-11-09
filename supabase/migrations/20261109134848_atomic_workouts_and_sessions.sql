-- All application writes below run as the caller. RLS remains the final boundary.
-- Additive only: existing workouts, sessions and historical IDs are preserved.
begin;

alter table public.workout_exercises add column if not exists position integer not null default 0;
alter table public.exercise_sets add column if not exists position integer not null default 0;
alter table public.workout_sessions add column if not exists plan_name text;
alter table public.workout_sessions add column if not exists client_request_id uuid;
alter table public.workout_sessions add column if not exists client_request_fingerprint text;
create unique index if not exists workout_sessions_user_client_request_key
  on public.workout_sessions (user_id, client_request_id);

create or replace function public.foco_create_workout(p_plan jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_plan public.workout_plans%rowtype;
  v_status text := coalesce(p_plan->>'status', 'ativo');
  v_exercises jsonb := '[]'::jsonb;
  v_ex jsonb;
  v_row jsonb;
  v_day text;
begin
  if v_uid is null then raise sqlstate 'PT401' using message = 'Entre novamente no FOCO.'; end if;
  if jsonb_typeof(p_plan) is distinct from 'object'
    or nullif(btrim(p_plan->>'name'), '') is null
    or v_status not in ('ativo', 'inativo', 'rascunho')
    or jsonb_typeof(p_plan->'exercises') is distinct from 'array' then
    raise sqlstate 'PT400' using message = 'Nome da ficha e exercícios válidos são obrigatórios.';
  end if;
  if jsonb_array_length(p_plan->'exercises') not between 1 and 500
    or coalesce((p_plan->>'weekly_frequency')::integer, 4) not between 1 and 7
    or coalesce((p_plan->>'version')::integer, 1) < 1 then
    raise sqlstate 'PT400' using message = 'Confira a frequência e os exercícios da ficha.';
  end if;
  -- Validate every exercise before touching the currently active plan.
  for v_ex in select value from jsonb_array_elements(p_plan->'exercises') loop
    v_day := nullif(v_ex->>'training_day', '');
    if jsonb_typeof(v_ex) is distinct from 'object'
      or nullif(btrim(v_ex->>'exercise_name'), '') is null
      or (v_day is not null and v_day not in ('segunda','terca','quarta','quinta','sexta','sabado','domingo')) then
      raise sqlstate 'PT400' using message = 'Confira o nome e o dia de cada exercício.';
    end if;
    v_row := jsonb_build_object(
      'exercise_name', left(btrim(v_ex->>'exercise_name'),160),
      'repdb_id', case when v_ex->>'repdb_id' ~ '^[a-z0-9-]{1,100}$' then v_ex->>'repdb_id' end,
      'muscle_group', coalesce(nullif(left(btrim(v_ex->>'muscle_group'),80),''),'Geral'),
      'sets', coalesce((v_ex->>'sets')::integer,3),
      'reps_min', coalesce((v_ex->>'reps_min')::integer,8),
      'reps_max', coalesce((v_ex->>'reps_max')::integer,12),
      'rest_seconds', coalesce((v_ex->>'rest_seconds')::integer,60),
      'suggested_load_kg', coalesce((v_ex->>'suggested_load_kg')::numeric,0),
      'notes', left(coalesce(v_ex->>'notes',''),500), 'training_day', v_day);
    if (v_row->>'sets')::integer not between 1 and 100
      or (v_row->>'reps_min')::integer not between 1 and 1000
      or (v_row->>'reps_max')::integer not between (v_row->>'reps_min')::integer and 1000
      or (v_row->>'rest_seconds')::integer not between 0 and 3600
      or (v_row->>'suggested_load_kg')::numeric not between 0 and 10000 then
      raise sqlstate 'PT400' using message = 'Confira séries, repetições, descanso e carga.';
    end if;
    v_exercises := v_exercises || jsonb_build_array(v_row);
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('foco:plans:' || v_uid::text,0));
  if v_status = 'ativo' then
    update public.workout_plans set status = 'inativo' where user_id = v_uid and status = 'ativo';
  end if;
  insert into public.workout_plans (user_id,name,version,goal,weekly_frequency,status,approved_at)
    values (v_uid,left(btrim(p_plan->>'name'),160),coalesce((p_plan->>'version')::integer,1),
      left(coalesce(p_plan->>'goal','Hipertrofia'),160),coalesce((p_plan->>'weekly_frequency')::integer,4),v_status,now())
    returning * into v_plan;
  insert into public.workout_exercises
    (plan_id,exercise_name,repdb_id,muscle_group,sets,reps_min,reps_max,rest_seconds,suggested_load_kg,notes,training_day,position)
    select v_plan.id,e->>'exercise_name',e->>'repdb_id',e->>'muscle_group',(e->>'sets')::integer,
      (e->>'reps_min')::integer,(e->>'reps_max')::integer,(e->>'rest_seconds')::integer,
      (e->>'suggested_load_kg')::numeric,e->>'notes',e->>'training_day',(ord-1)::integer
    from jsonb_array_elements(v_exercises) with ordinality as ex(e,ord);
  return to_jsonb(v_plan) || jsonb_build_object('exercises',(
    select coalesce(jsonb_agg(to_jsonb(e) order by e.position),'[]'::jsonb)
    from public.workout_exercises e where e.plan_id = v_plan.id));
end;
$$;

create or replace function public.foco_activate_workout(p_plan_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise sqlstate 'PT401' using message = 'Entre novamente no FOCO.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('foco:plans:' || v_uid::text,0));
  -- Lock/check target before deactivating anything; foreign IDs remain invisible.
  perform 1 from public.workout_plans where id = p_plan_id and user_id = v_uid for update;
  if not found then raise sqlstate 'PT404' using message = 'Ficha não encontrada.'; end if;
  update public.workout_plans set status = 'inativo' where user_id = v_uid and status = 'ativo' and id <> p_plan_id;
  update public.workout_plans set status = 'ativo',approved_at = now() where id = p_plan_id and user_id = v_uid;
  return jsonb_build_object('message','Ficha ativada.');
end;
$$;

create or replace function public.foco_record_session(p_session jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid := (p_session->>'client_request_id')::uuid;
  v_plan_id uuid := nullif(p_session->>'plan_id','')::uuid;
  v_session public.workout_sessions%rowtype;
  v_started timestamptz := (p_session->>'started_at')::timestamptz;
  v_finished timestamptz := (p_session->>'finished_at')::timestamptz;
  v_duration integer := coalesce((p_session->>'duration_seconds')::integer,0);
  v_status text := coalesce(p_session->>'status','completed');
  v_sets jsonb := '[]'::jsonb;
  v_set jsonb;
  v_row jsonb;
  v_fingerprint text;
begin
  if v_uid is null then raise sqlstate 'PT401' using message = 'Entre novamente no FOCO.'; end if;
  if jsonb_typeof(p_session) is distinct from 'object' or v_request_id is null or v_started is null
    or v_duration < 0 or v_status not in ('in_progress','completed','cancelled')
    or (v_finished is not null and v_finished < v_started)
    or jsonb_typeof(p_session->'sets') is distinct from 'array' then
    raise sqlstate 'PT400' using message = 'Confira o início, a duração e as séries da sessão.';
  end if;
  if jsonb_array_length(p_session->'sets') > 2000 then
    raise sqlstate 'PT400' using message = 'A sessão excede o limite de séries.';
  end if;
  for v_set in select value from jsonb_array_elements(p_session->'sets') loop
    if jsonb_typeof(v_set) is distinct from 'object' or nullif(btrim(v_set->>'exercise_name'),'') is null then
      raise sqlstate 'PT400' using message = 'Informe o exercício de cada série.';
    end if;
    v_row := jsonb_build_object('exercise_name',left(btrim(v_set->>'exercise_name'),160),
      'set_number',coalesce((v_set->>'set_number')::integer,jsonb_array_length(v_sets)+1),
      'repetitions',coalesce((v_set->>'repetitions')::integer,0),
      'load_kg',coalesce((v_set->>'load_kg')::numeric,0),
      'completed',coalesce((v_set->>'completed')::boolean,true));
    if (v_row->>'set_number')::integer < 1 or (v_row->>'repetitions')::integer not between 0 and 10000
      or (v_row->>'load_kg')::numeric not between 0 and 10000 then
      raise sqlstate 'PT400' using message = 'Confira número, repetições e carga de cada série.';
    end if;
    v_sets := v_sets || jsonb_build_array(v_row);
  end loop;
  -- JSONB normalizes key order/numbers. Legacy retries can advance finish/duration:
  -- exclude those two fields, while protecting actual exercise content from overwrite.
  v_fingerprint := encode(sha256(convert_to(jsonb_build_object('plan_id',v_plan_id,
    'plan_name',left(coalesce(p_session->>'plan_name',''),160),'started_at',extract(epoch from v_started),
    'notes',left(coalesce(p_session->>'notes',''),1200),'status',v_status,'sets',v_sets)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('foco:sessions:' || v_uid::text,0));
  select * into v_session from public.workout_sessions where user_id = v_uid and client_request_id = v_request_id;
  if found then
    if v_session.client_request_fingerprint is distinct from v_fingerprint then
      raise sqlstate 'PT409' using message = 'Esta sessão já foi salva com outros dados. Confira o histórico antes de reenviar.';
    end if;
  else
    if v_plan_id is not null and not exists(select 1 from public.workout_plans where id = v_plan_id and user_id = v_uid) then
      raise sqlstate 'PT404' using message = 'Ficha não encontrada para esta sessão.';
    end if;
    insert into public.workout_sessions
      (user_id,plan_id,plan_name,started_at,finished_at,duration_seconds,notes,status,client_request_id,client_request_fingerprint)
      values (v_uid,v_plan_id,left(coalesce(p_session->>'plan_name',''),160),v_started,v_finished,
        v_duration,left(coalesce(p_session->>'notes',''),1200),v_status,v_request_id,v_fingerprint)
      returning * into v_session;
    insert into public.exercise_sets (session_id,exercise_name,set_number,repetitions,load_kg,completed,position)
      select v_session.id,e->>'exercise_name',(e->>'set_number')::integer,(e->>'repetitions')::integer,
        (e->>'load_kg')::numeric,(e->>'completed')::boolean,(ord-1)::integer
      from jsonb_array_elements(v_sets) with ordinality as ex(e,ord);
  end if;
  return (to_jsonb(v_session) - 'client_request_fingerprint') || jsonb_build_object('sets',(
    select coalesce(jsonb_agg(to_jsonb(s) order by s.position),'[]'::jsonb)
    from public.exercise_sets s where s.session_id = v_session.id));
end;
$$;

revoke all on function public.foco_create_workout(jsonb) from public, anon;
revoke all on function public.foco_activate_workout(uuid) from public, anon;
revoke all on function public.foco_record_session(jsonb) from public, anon;
grant execute on function public.foco_create_workout(jsonb),public.foco_activate_workout(uuid),public.foco_record_session(jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
