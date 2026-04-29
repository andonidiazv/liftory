-- Fix: trigger_welcome_email referenced NEW.display_name, but the column is full_name.
-- This was breaking every new user_profiles INSERT since 2026-04-05.
-- Smallest possible change: rename the field reference. Trigger and webhook target unchanged.

CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://yjgasprksvplswemprsu.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZ2FzcHJrc3ZwbHN3ZW1wcnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3ODA2NCwiZXhwIjoyMDg4MDU0MDY0fQ.6OvpONGEykUFlBCNyV6GLbi9pI-kVGGDWgg-KWJf8bQ"}'::jsonb,
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'user_id', NEW.user_id,
        'display_name', NEW.full_name
      )
    )
  );
  RETURN NEW;
END;
$$;
