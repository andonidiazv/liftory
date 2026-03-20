CREATE OR REPLACE FUNCTION public.ex(p_name text) RETURNS uuid AS $$
  SELECT id FROM public.exercises WHERE name = p_name LIMIT 1;
$$ LANGUAGE sql STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.wk(p_prog_id uuid, p_week int, p_day_offset int) RETURNS uuid AS $$
  SELECT id FROM public.workouts
  WHERE program_id = p_prog_id AND week_number = p_week
    AND scheduled_date = '2026-01-05'::date + ((p_week-1)*7) + p_day_offset
  LIMIT 1;
$$ LANGUAGE sql STABLE SET search_path = public;