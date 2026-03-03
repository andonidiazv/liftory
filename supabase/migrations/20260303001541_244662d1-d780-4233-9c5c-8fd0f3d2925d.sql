
-- 1. CREATE TABLE subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL,
  tier text NOT NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. CREATE TABLE payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_payment_intent_id text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  payment_type text NOT NULL,
  status text NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  insight_id uuid REFERENCES public.insights(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. ADD COLUMNS to existing tables
ALTER TABLE public.audit_log
  ADD COLUMN ip_address inet,
  ADD COLUMN is_impersonation boolean NOT NULL DEFAULT false;

ALTER TABLE public.exercises
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.wearable_data
  ADD COLUMN raw_data jsonb,
  ADD COLUMN synced_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.insights_unlocked
  ADD COLUMN payment_id uuid REFERENCES public.payments(id);

ALTER TABLE public.onboarding_answers
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.insights
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.programs
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
