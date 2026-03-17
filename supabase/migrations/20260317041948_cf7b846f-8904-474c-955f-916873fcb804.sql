
-- Create user_feedback table for post-workout feedback
CREATE TABLE public.user_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  question_ids text[] NOT NULL DEFAULT '{}',
  responses jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own feedback"
ON public.user_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
ON public.user_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
ON public.user_feedback FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
