-- ═══════════════════════════════════════════════════════════════════════════
-- Bulk usage profiles for the swap review screen.
--
-- `exercise_usage_profile(uuid)` answers for one exercise. The review screen
-- needs it for every exercise on screen — roughly 700 at once — and calling
-- the scalar version per row meant ~1,400 round trips. This aggregates in one.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION exercise_usage_profiles(ex_ids UUID[])
RETURNS TABLE (exercise_id UUID, profile TEXT)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id AS exercise_id,
    CASE
      WHEN COUNT(ws.id) = 0 THEN 'sin_uso'
      WHEN COUNT(ws.id) FILTER (WHERE ws.set_type NOT IN ('warmup','cooldown')) = 0 THEN 'prep'
      WHEN COUNT(ws.id) FILTER (WHERE ws.set_type IN ('warmup','cooldown')) = 0 THEN 'trabajo'
      ELSE 'mixto'
    END AS profile
  FROM unnest(ex_ids) AS e(id)
  LEFT JOIN workout_sets ws ON ws.exercise_id = e.id
  GROUP BY e.id;
$$;

COMMENT ON FUNCTION exercise_usage_profiles IS
  'Batch version of exercise_usage_profile. Returns how each exercise is actually programmed (prep / trabajo / mixto / sin_uso) for a set of ids in one round trip.';
