-- Helper function to get exercise ID by name
CREATE OR REPLACE FUNCTION public.ex(p_name text) RETURNS uuid AS $$
  SELECT id FROM exercises WHERE name = p_name LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Helper function to get workout ID
CREATE OR REPLACE FUNCTION public.wk(p_prog_id uuid, p_week int, p_day_offset int) RETURNS uuid AS $$
  SELECT id FROM workouts
  WHERE program_id = p_prog_id AND week_number = p_week
    AND scheduled_date = '2026-01-05'::date + ((p_week-1)*7) + p_day_offset
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Allow superset as set_type
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_set_type_check;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_set_type_check
  CHECK (set_type = ANY (ARRAY['working','warmup','amrap','emom','backoff','superset','cooldown']));