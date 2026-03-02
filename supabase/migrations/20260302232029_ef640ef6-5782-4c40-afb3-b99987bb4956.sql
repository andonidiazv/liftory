
-- AI Rules table
CREATE TABLE public.ai_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_category text NOT NULL DEFAULT 'general',
  description text,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_rules ENABLE ROW LEVEL SECURITY;

-- Admins can read all AI rules
CREATE POLICY "Admins can view ai_rules"
ON public.ai_rules FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can insert AI rules
CREATE POLICY "Admins can insert ai_rules"
ON public.ai_rules FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update AI rules
CREATE POLICY "Admins can update ai_rules"
ON public.ai_rules FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete AI rules
CREATE POLICY "Admins can delete ai_rules"
ON public.ai_rules FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_ai_rules_updated_at
BEFORE UPDATE ON public.ai_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Admin CRUD policies for insights
CREATE POLICY "Admins can insert insights"
ON public.insights FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update insights"
ON public.insights FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete insights"
ON public.insights FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
