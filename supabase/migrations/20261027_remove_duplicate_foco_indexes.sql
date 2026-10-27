-- Keep the canonical *_user_id / *_session_id / *_plan_id indexes and remove
-- only identical alias indexes that duplicated the same column definitions.
DROP INDEX IF EXISTS public.idx_recommendations_user;
DROP INDEX IF EXISTS public.idx_measurements_user;
DROP INDEX IF EXISTS public.idx_sets_session;
DROP INDEX IF EXISTS public.idx_goals_user;
DROP INDEX IF EXISTS public.idx_files_user;
DROP INDEX IF EXISTS public.idx_exercises_plan;
DROP INDEX IF EXISTS public.idx_plans_user;
DROP INDEX IF EXISTS public.idx_sessions_user;
