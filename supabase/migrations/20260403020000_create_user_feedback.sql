-- Create user_feedback table for post-workout feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  question_ids text[] NOT NULL DEFAULT '{}',
  responses jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback" ON public.user_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Service role (admin) can read all feedback
CREATE POLICY "Service role reads all feedback" ON public.user_feedback
  FOR SELECT USING (auth.role() = 'service_role');

CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at DESC);
