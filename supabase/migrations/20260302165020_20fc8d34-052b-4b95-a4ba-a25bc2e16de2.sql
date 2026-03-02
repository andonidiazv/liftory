ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS goals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS training_days_per_week integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS training_location text,
  ADD COLUMN IF NOT EXISTS injuries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS injuries_detail text,
  ADD COLUMN IF NOT EXISTS emotional_barriers text,
  ADD COLUMN IF NOT EXISTS wearable text;