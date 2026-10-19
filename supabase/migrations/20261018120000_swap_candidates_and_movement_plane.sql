-- ═══════════════════════════════════════════════════════════════════════════
-- Exercise swap: movement plane + candidate review queue
--
-- Context: swap options were curated by hand, one chain at a time. To widen
-- coverage we need to generate candidates in bulk — but a naive "same pattern
-- + shared muscles" match produced 3,140 pairs of which 53% crossed category
-- and 31% crossed set_type. Those are the swaps that silently destroy a
-- block's purpose: a PRIME activation drill offering a loaded barbell squat.
--
-- On the guardrail: the obvious fix was a trigger rejecting swaps that cross
-- category families. Measured against the 106 live substitutions, it would
-- have rejected 13 that are correct — because `category` does not reliably
-- describe how an exercise is used. Counting real usage: `mobility` is 96%
-- prep, but `strength` has 11 exercises used only as warmups and
-- `conditioning` has 3. Same movement, inconsistent label.
--
-- So the purpose check belongs where it can read actual usage (set_type in
-- workout_sets), not in a trigger over a field that disagrees with reality.
-- `usage_profile` below exposes that signal; the generator enforces it, and
-- the review screen shows it so a human sees what they are approving.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. movement_plane ───────────────────────────────────────────────────
-- 'pull' and 'push' are too coarse: a chin-up and a bent-over row are both
-- "pull" but sit in different planes and do not substitute for each other.
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS movement_plane TEXT NULL
    CHECK (movement_plane IS NULL OR movement_plane IN ('vertical','horizontal'));

COMMENT ON COLUMN exercises.movement_plane IS
  'Plane of the push/pull vector. Vertical = overhead press, pull-up, dip. Horizontal = bench press, row, push-up. NULL where the distinction carries no meaning (squat, hinge, core, mobility).';

-- ─── 2. candidate review queue ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS substitution_candidates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id           UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  candidate_exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  -- 'level'     → easier variant of the same movement (regression)
  -- 'equipment' → same difficulty, different implement (lateral swap)
  axis                  TEXT NOT NULL CHECK (axis IN ('level','equipment')),
  score                 NUMERIC NOT NULL DEFAULT 0,
  reason                TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected')),
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT substitution_candidates_distinct CHECK (exercise_id <> candidate_exercise_id),
  CONSTRAINT substitution_candidates_unique UNIQUE (exercise_id, candidate_exercise_id)
);

CREATE INDEX IF NOT EXISTS substitution_candidates_status_idx
  ON substitution_candidates (status, score DESC);
CREATE INDEX IF NOT EXISTS substitution_candidates_exercise_idx
  ON substitution_candidates (exercise_id);

COMMENT ON TABLE substitution_candidates IS
  'Review queue for machine-generated swap suggestions. Nothing here is live: a row only reaches an athlete once approved and promoted into exercise_substitutions.';

ALTER TABLE substitution_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage substitution candidates" ON substitution_candidates;
CREATE POLICY "admins manage substitution candidates"
  ON substitution_candidates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- ─── 3. usage profile: how an exercise is ACTUALLY programmed ────────────
-- Returns 'prep' when every set of this exercise across all programmed
-- workouts is a warmup or cooldown, 'trabajo' when none is, 'mixto' when both,
-- and 'sin_uso' when it has never been programmed. This is the signal the
-- generator filters on — it reflects reality, unlike `category`.
CREATE OR REPLACE FUNCTION exercise_usage_profile(ex UUID)
RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'sin_uso'
    WHEN COUNT(*) FILTER (WHERE set_type NOT IN ('warmup','cooldown')) = 0 THEN 'prep'
    WHEN COUNT(*) FILTER (WHERE set_type IN ('warmup','cooldown')) = 0 THEN 'trabajo'
    ELSE 'mixto'
  END
  FROM workout_sets WHERE exercise_id = ex;
$$;

COMMENT ON FUNCTION exercise_usage_profile IS
  'How an exercise is actually programmed (prep / trabajo / mixto / sin_uso), read from workout_sets. Use this over exercises.category when deciding whether two exercises serve the same purpose: category disagrees with real usage for ~20 exercises.';
