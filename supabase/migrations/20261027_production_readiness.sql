-- FOCO production-readiness migration.
begin;
create table if not exists public.anamneses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_goal text not null,
  goal_details text,
  training_age text,
  activity_level text,
  weekly_frequency integer not null default 4 check (weekly_frequency between 2 and 7),
  session_minutes integer not null default 60 check (session_minutes between 20 and 180),
  preferred_days text[] not null default '{}',
  priority_muscles text[] not null default '{}',
  equipment_available text[] not null default '{}',
  current_routine text,
  exercise_preferences text,
  pain_or_injuries text,
  health_notes text,
  sleep_quality text,
  cardio_habits text,
  consent_health_data boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.workout_exercises add column if not exists position integer not null default 0;
alter table public.exercise_sets add column if not exists position integer not null default 0;
alter table public.ai_recommendations add column if not exists proposed_plan jsonb;
alter table public.anamneses enable row level security;
drop policy if exists foco_anamneses_own on public.anamneses;
create policy foco_anamneses_own on public.anamneses for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.anamneses to authenticated;
commit;
