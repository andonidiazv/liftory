-- ══════════════════════════════════════════════════════════════
-- Dunning system: track payment failures and automate reminder emails
-- ══════════════════════════════════════════════════════════════

-- Add dunning tracking columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dunning_step INT NOT NULL DEFAULT 0;

-- Index for efficient querying of past_due users
CREATE INDEX IF NOT EXISTS idx_user_profiles_past_due
  ON public.user_profiles(subscription_status)
  WHERE subscription_status = 'past_due';

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily dunning job at 10:00 AM UTC
-- Calls the send-dunning-email Edge Function via pg_net
SELECT cron.schedule(
  'daily-dunning-emails',
  '0 10 * * *',  -- every day at 10:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://yjgasprksvplswemprsu.supabase.co/functions/v1/send-dunning-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZ2FzcHJrc3ZwbHN3ZW1wcnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3ODA2NCwiZXhwIjoyMDg4MDU0MDY0fQ.6OvpONGEykUFlBCNyV6GLbi9pI-kVGGDWgg-KWJf8bQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
