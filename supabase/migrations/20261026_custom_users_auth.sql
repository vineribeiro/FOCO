-- FOCO: migrate the existing custom JWT users to a relational public.users table.
-- Run once in Supabase SQL Editor after the initial schema SQL.
begin;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- The current FOCO backend authenticates with its own bcrypt/JWT flow.
-- Repoint foreign keys from auth.users to public.users so the existing
-- authentication model and the application tables use the same user IDs.
do $$
declare r record;
begin
  for r in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table %s drop constraint %I', r.table_name, r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references public.users(id) on delete cascade;
alter table public.goals
  add constraint goals_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.workout_plans
  add constraint workout_plans_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.workout_sessions
  add constraint workout_sessions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.body_measurements
  add constraint body_measurements_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.uploaded_files
  add constraint uploaded_files_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;
alter table public.ai_recommendations
  add constraint ai_recommendations_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade;

commit;
