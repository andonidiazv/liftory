
-- Allow programs to be templates (no user_id)
ALTER TABLE public.programs ALTER COLUMN user_id DROP NOT NULL;

-- Add coach notes to workouts
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS coach_note text;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS short_on_time_note text;

-- Add coaching cue override to workout_sets
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS coaching_cue_override text;

-- RLS: allow authenticated users to read template programs (user_id IS NULL)
CREATE POLICY "Anyone can view template programs"
ON public.programs FOR SELECT
TO authenticated
USING (user_id IS NULL);

-- RLS: allow authenticated users to read template workouts (via template programs)
CREATE POLICY "Anyone can view template workouts"
ON public.workouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_id AND p.user_id IS NULL
  )
);

-- RLS: allow authenticated users to read template workout_sets
CREATE POLICY "Anyone can view template workout_sets"
ON public.workout_sets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workouts w
    JOIN public.programs p ON p.id = w.program_id
    WHERE w.id = workout_id AND p.user_id IS NULL
  )
);
