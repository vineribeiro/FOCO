-- FOCO free-tier durable store (single-instance MVP).
-- Run this once in Supabase Dashboard -> SQL Editor.
-- The application stores its complete JSON snapshot in one server-only row.
-- NEVER expose SUPABASE_SERVICE_ROLE_KEY in browser code or commit it to GitHub.

create table if not exists public.foco_app_state (
  key text primary key check (key = 'global'),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.foco_app_state enable row level security;

revoke all on table public.foco_app_state from public, anon, authenticated;
grant all on table public.foco_app_state to service_role;

comment on table public.foco_app_state is
  'FOCO server-side JSON snapshot. Access is restricted to the server service role.';
