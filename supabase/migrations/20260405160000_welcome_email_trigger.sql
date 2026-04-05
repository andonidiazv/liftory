-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: calls send-welcome-email Edge Function on new user_profile
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
        'display_name', NEW.display_name
      )
    )
  );
  RETURN NEW;
END;
$$;

-- Create trigger on user_profiles INSERT
DROP TRIGGER IF EXISTS on_user_profile_created_welcome_email ON public.user_profiles;
CREATE TRIGGER on_user_profile_created_welcome_email
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();
