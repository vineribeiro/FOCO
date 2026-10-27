ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS training_day text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workout_exercises_training_day_check'
      AND conrelid = 'public.workout_exercises'::regclass
  ) THEN
    ALTER TABLE public.workout_exercises
      ADD CONSTRAINT workout_exercises_training_day_check
      CHECK (
        training_day IS NULL OR training_day IN (
          'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_workout_exercises_plan_day
  ON public.workout_exercises (plan_id, training_day);
