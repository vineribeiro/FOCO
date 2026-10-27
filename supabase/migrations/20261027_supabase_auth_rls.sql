-- FOCO now uses Supabase Auth directly instead of the custom JWT authentication on Render.
-- The live project was checked before migration: the application's public tables contained zero rows.

begin;

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

alter table public.goals drop constraint if exists goals_user_id_fkey;
alter table public.goals add constraint goals_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.workout_plans drop constraint if exists workout_plans_user_id_fkey;
alter table public.workout_plans add constraint workout_plans_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.workout_sessions drop constraint if exists workout_sessions_user_id_fkey;
alter table public.workout_sessions add constraint workout_sessions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.body_measurements drop constraint if exists body_measurements_user_id_fkey;
alter table public.body_measurements add constraint body_measurements_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.uploaded_files drop constraint if exists uploaded_files_user_id_fkey;
alter table public.uploaded_files add constraint uploaded_files_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.ai_recommendations drop constraint if exists ai_recommendations_user_id_fkey;
alter table public.ai_recommendations add constraint ai_recommendations_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.anamneses drop constraint if exists anamneses_user_id_fkey;
alter table public.anamneses add constraint anamneses_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.users enable row level security;
revoke all on table public.users from public, anon, authenticated;
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.profiles, public.goals, public.workout_plans, public.workout_exercises,
  public.workout_sessions, public.exercise_sets, public.body_measurements,
  public.uploaded_files, public.ai_recommendations, public.anamneses
to authenticated;

drop policy if exists foco_profiles_select_own on public.profiles;
drop policy if exists foco_profiles_insert_own on public.profiles;
drop policy if exists foco_profiles_update_own on public.profiles;
drop policy if exists foco_profiles_delete_own on public.profiles;
create policy foco_profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy foco_profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy foco_profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy foco_profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists foco_goals_own on public.goals;
create policy foco_goals_own on public.goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists foco_workout_plans_own on public.workout_plans;
create policy foco_workout_plans_own on public.workout_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists foco_workout_exercises_own on public.workout_exercises;
create policy foco_workout_exercises_own on public.workout_exercises for all to authenticated
using (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())))
with check (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));

drop policy if exists foco_workout_sessions_own on public.workout_sessions;
create policy foco_workout_sessions_own on public.workout_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists foco_exercise_sets_own on public.exercise_sets;
create policy foco_exercise_sets_own on public.exercise_sets for all to authenticated
using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())))
with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

drop policy if exists foco_measurements_own on public.body_measurements;
create policy foco_measurements_own on public.body_measurements for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists foco_uploaded_files_own on public.uploaded_files;
create policy foco_uploaded_files_own on public.uploaded_files for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists foco_recommendations_own on public.ai_recommendations;
create policy foco_recommendations_own on public.ai_recommendations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists foco_anamneses_own on public.anamneses;
create policy foco_anamneses_own on public.anamneses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

commit;
