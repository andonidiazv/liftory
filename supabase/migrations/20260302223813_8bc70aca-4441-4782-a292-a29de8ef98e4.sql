
-- 1. Add missing columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'athlete',
  ADD COLUMN IF NOT EXISTS subscription_tier text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Onboarding answers (separate from profile)
CREATE TABLE public.onboarding_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_level text NOT NULL DEFAULT 'beginner',
  primary_goal text NOT NULL DEFAULT 'hypertrophy',
  training_days integer NOT NULL DEFAULT 4,
  equipment text NOT NULL DEFAULT 'full_gym',
  injuries text[] DEFAULT '{}',
  emotional_barriers text[] DEFAULT '{}',
  connected_wearable text,
  specific_event text,
  event_date date,
  inbody_data jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own onboarding" ON public.onboarding_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON public.onboarding_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON public.onboarding_answers FOR UPDATE USING (auth.uid() = user_id);

-- 3. Exercises (reference table, readable by all authenticated)
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_es text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'strength',
  movement_pattern text NOT NULL DEFAULT 'push',
  difficulty text NOT NULL DEFAULT 'intermediate',
  equipment_required text[] DEFAULT '{}',
  primary_muscles text[] DEFAULT '{}',
  contraindications text[] DEFAULT '{}',
  emotional_barrier_tag text,
  default_tempo text,
  video_url text,
  thumbnail_url text,
  video_duration_seconds integer,
  founder_notes text,
  coaching_cue text,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view exercises" ON public.exercises FOR SELECT TO authenticated USING (true);

-- 4. Programs
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_weeks integer NOT NULL DEFAULT 12,
  current_week integer NOT NULL DEFAULT 1,
  current_block text NOT NULL DEFAULT 'accumulation',
  is_active boolean NOT NULL DEFAULT true,
  ai_params jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own programs" ON public.programs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own programs" ON public.programs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own programs" ON public.programs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own programs" ON public.programs FOR DELETE USING (auth.uid() = user_id);

-- 5. Workouts
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  week_number integer NOT NULL DEFAULT 1,
  day_label text NOT NULL,
  workout_type text NOT NULL DEFAULT 'strength',
  estimated_duration integer,
  is_completed boolean NOT NULL DEFAULT false,
  is_rest_day boolean NOT NULL DEFAULT false,
  ai_adjustments jsonb,
  notes text,
  completed_at timestamptz
);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- 6. Workout sets
CREATE TABLE public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id),
  set_order integer NOT NULL DEFAULT 1,
  set_type text NOT NULL DEFAULT 'working',
  planned_reps integer,
  planned_weight numeric,
  planned_tempo text,
  planned_rpe numeric,
  planned_rir integer,
  planned_rest_seconds integer,
  actual_reps integer,
  actual_weight numeric,
  actual_rpe numeric,
  actual_rir integer,
  is_pr boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  logged_at timestamptz
);
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sets" ON public.workout_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sets" ON public.workout_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sets" ON public.workout_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sets" ON public.workout_sets FOR DELETE USING (auth.uid() = user_id);

-- 7. Insights
CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'analytical',
  description_template text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  min_data_days integer NOT NULL DEFAULT 7,
  requires_wearable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view insights" ON public.insights FOR SELECT TO authenticated USING (true);

-- 8. Wearable data
CREATE TABLE public.wearable_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  date date NOT NULL,
  hrv_ms numeric,
  recovery_score numeric,
  sleep_score numeric,
  sleep_duration_minutes integer,
  resting_hr integer,
  strain_score numeric,
  UNIQUE(user_id, source, date)
);
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wearable data" ON public.wearable_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wearable data" ON public.wearable_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wearable data" ON public.wearable_data FOR UPDATE USING (auth.uid() = user_id);

-- 9. Triggers for updated_at
CREATE TRIGGER update_onboarding_answers_updated_at BEFORE UPDATE ON public.onboarding_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Enable realtime for workouts
ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
