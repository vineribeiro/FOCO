-- Executed in Supabase as add_repdb_media_id_to_workout_exercises.
-- No existing workouts are deleted or overwritten.
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS repdb_id text;
ALTER TABLE public.workout_exercises
  ADD CONSTRAINT workout_exercises_repdb_id_format
  CHECK (repdb_id IS NULL OR repdb_id ~ '^[a-z0-9-]{1,100}$');
COMMENT ON COLUMN public.workout_exercises.repdb_id
  IS 'Optional RepDB Free exercise slug for display media; original user-owned workout records preserved.';
