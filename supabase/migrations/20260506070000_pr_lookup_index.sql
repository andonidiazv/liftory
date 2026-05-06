-- Index to accelerate the prior-best lookup used by client-side PR detection.
-- The query is:
--   SELECT actual_weight FROM workout_sets
--   WHERE user_id = $1 AND exercise_id = $2 AND actual_reps = $3
--     AND is_completed = true AND actual_weight > 0
--     AND id != $4
--   ORDER BY actual_weight DESC LIMIT 1;
--
-- A partial index restricted to completed sets with weight > 0 keeps the
-- index small (only logged working sets, not the full ~thousands of pending
-- sets). actual_weight is included DESC so the engine can stop at the first
-- match without an extra sort.
CREATE INDEX IF NOT EXISTS idx_workout_sets_pr_lookup
  ON public.workout_sets (user_id, exercise_id, actual_reps, actual_weight DESC)
  WHERE is_completed = true AND actual_weight > 0;
