-- Make creation of a workout plan and its exercises atomic.
create or replace function public.create_workout_plan_with_exercises(p_user_id uuid, p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan public.workout_plans%rowtype;
  v_exercise jsonb;
  v_position integer := 0;
  v_result jsonb;
  v_status text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized to create a plan for this user' using errcode = '42501';
  end if;
  if jsonb_typeof(p_input->'exercises') <> 'array' or jsonb_array_length(p_input->'exercises') = 0 then
    raise exception 'A plan must contain at least one exercise' using errcode = '22023';
  end if;
  v_status := case when p_input->>'status' in ('ativo', 'inativo', 'rascunho') then p_input->>'status' else 'ativo' end;
  insert into public.workout_plans (user_id, name, version, goal, weekly_frequency, status, approved_at)
  values (
    p_user_id,
    left(coalesce(nullif(trim(p_input->>'name'), ''), 'Minha ficha'), 160),
    greatest(1, coalesce(nullif(p_input->>'version', '')::integer, 1)),
    left(coalesce(nullif(trim(p_input->>'goal'), ''), 'Hipertrofia'), 160),
    least(7, greatest(2, coalesce(nullif(p_input->>'weekly_frequency', '')::integer, 4))),
    'rascunho', now()
  ) returning * into v_plan;
  for v_exercise in select value from jsonb_array_elements(p_input->'exercises') loop
    insert into public.workout_exercises (
      plan_id, exercise_name, muscle_group, sets, reps_min, reps_max, rest_seconds,
      suggested_load_kg, notes, position
    ) values (
      v_plan.id,
      left(coalesce(nullif(trim(v_exercise->>'exercise_name'), ''), 'Exercício'), 160),
      left(coalesce(nullif(trim(v_exercise->>'muscle_group'), ''), 'Geral'), 80),
      least(20, greatest(1, coalesce(nullif(v_exercise->>'sets', '')::integer, 3))),
      least(100, greatest(1, coalesce(nullif(v_exercise->>'reps_min', '')::integer, 8))),
      least(100, greatest(1, coalesce(nullif(v_exercise->>'reps_max', '')::integer, 12))),
      least(600, greatest(0, coalesce(nullif(v_exercise->>'rest_seconds', '')::integer, 60))),
      greatest(0, coalesce(nullif(v_exercise->>'suggested_load_kg', '')::numeric, 0)),
      left(coalesce(v_exercise->>'notes', ''), 500),
      v_position
    );
    v_position := v_position + 1;
  end loop;
  if v_status = 'ativo' then
    update public.workout_plans set status = 'inativo'
      where user_id = p_user_id and id <> v_plan.id and status = 'ativo';
  end if;
  update public.workout_plans set status = v_status,
    approved_at = case when v_status = 'ativo' then now() else approved_at end
    where id = v_plan.id returning * into v_plan;
  select to_jsonb(v_plan) || jsonb_build_object('exercises', coalesce((
    select jsonb_agg(to_jsonb(e) order by e.position)
    from public.workout_exercises e where e.plan_id = v_plan.id
  ), '[]'::jsonb)) into v_result;
  return v_result;
end;
$$;
revoke all on function public.create_workout_plan_with_exercises(uuid, jsonb) from public, anon;
grant execute on function public.create_workout_plan_with_exercises(uuid, jsonb) to authenticated;
