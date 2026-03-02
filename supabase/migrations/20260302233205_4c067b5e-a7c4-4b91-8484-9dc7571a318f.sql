
-- Table for unlocked insights per user
CREATE TABLE public.insights_unlocked (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  generated_content TEXT NOT NULL DEFAULT '',
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, insight_id)
);

ALTER TABLE public.insights_unlocked ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocked insights"
ON public.insights_unlocked FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocked insights"
ON public.insights_unlocked FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all unlocked insights"
ON public.insights_unlocked FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
