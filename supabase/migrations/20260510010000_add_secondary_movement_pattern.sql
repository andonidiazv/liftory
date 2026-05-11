-- ═══════════════════════════════════════════════════════════════════════════
-- Add secondary_movement_pattern to exercises
--
-- Rationale: many compound lifts encode TWO movement patterns in one rep
-- (e.g. Devil Press = hinge + push, Thruster = squat + push, Power Clean =
-- pull + squat catch). The existing single-column model loses that info.
--
-- Design: add a nullable secondary column with the same enum as the primary.
-- Default null for non-hybrid movements. The primary column keeps its role
-- and existing filters/sorts in admin & exercise browser keep working as-is.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS secondary_movement_pattern TEXT NULL
    CHECK (secondary_movement_pattern IS NULL
           OR secondary_movement_pattern IN
              ('squat','hinge','push','pull','carry','rotation','core','locomotion'));

COMMENT ON COLUMN exercises.secondary_movement_pattern IS
  'Optional second movement pattern for compound lifts (e.g. Devil Press = hinge primary + push secondary). NULL when the movement is single-pattern.';
