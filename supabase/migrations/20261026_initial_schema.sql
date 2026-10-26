-- ==============================================================================
-- FOCO - Database Migration Version 20261026_01
-- PostgreSQL Schema with Row Level Security (RLS) for Supabase
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  experience_level TEXT CHECK (experience_level IN ('iniciante', 'intermediario', 'avancado')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 1,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Workout Plans Table
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  goal TEXT,
  weekly_frequency INTEGER DEFAULT 4,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. Workout Exercises Table
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps_min INTEGER NOT NULL DEFAULT 8,
  reps_max INTEGER NOT NULL DEFAULT 12,
  rest_seconds INTEGER DEFAULT 60,
  suggested_load_kg NUMERIC DEFAULT 0,
  notes TEXT
);

-- 5. Workout Sessions Table
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  notes TEXT
);

-- 6. Exercise Sets Table
CREATE TABLE IF NOT EXISTS public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  repetitions INTEGER NOT NULL,
  load_kg NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Body Measurements Table
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT 'kg' NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Uploaded Files Table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  processing_status TEXT DEFAULT 'processed' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. AI Recommendations Table (15/30 Days Cycles)
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  proposed_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  review_interval_days INTEGER DEFAULT 15 CHECK (review_interval_days IN (15, 30)),
  explanation TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Indexes for High Performance Querying
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_plan_id ON public.workout_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_id ON public.exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON public.body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON public.uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON public.ai_recommendations(user_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Strict isolation ensuring each user accesses ONLY their own records
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Goals Policies
CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout Plans Policies
CREATE POLICY "Users can manage own workout plans" ON public.workout_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout Exercises Policies
CREATE POLICY "Users can manage exercises in their plans" ON public.workout_exercises FOR ALL 
USING (EXISTS (SELECT 1 FROM public.workout_plans WHERE workout_plans.id = workout_exercises.plan_id AND workout_plans.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workout_plans WHERE workout_plans.id = workout_exercises.plan_id AND workout_plans.user_id = auth.uid()));

-- Workout Sessions Policies
CREATE POLICY "Users can manage own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Exercise Sets Policies
CREATE POLICY "Users can manage sets in their sessions" ON public.exercise_sets FOR ALL 
USING (EXISTS (SELECT 1 FROM public.workout_sessions WHERE workout_sessions.id = exercise_sets.session_id AND workout_sessions.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions WHERE workout_sessions.id = exercise_sets.session_id AND workout_sessions.user_id = auth.uid()));

-- Measurements Policies
CREATE POLICY "Users can manage own measurements" ON public.body_measurements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Uploaded Files Policies
CREATE POLICY "Users can manage own uploaded files" ON public.uploaded_files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Recommendations Policies
CREATE POLICY "Users can manage own ai recommendations" ON public.ai_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
