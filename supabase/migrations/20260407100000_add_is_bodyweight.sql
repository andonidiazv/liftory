-- Add bodyweight flag to workout_sets
-- When true, the set counts as "weight logged" in score even though actual_weight is 0/null
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS is_bodyweight boolean DEFAULT false;
