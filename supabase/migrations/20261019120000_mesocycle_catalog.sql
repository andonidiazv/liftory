-- ═══════════════════════════════════════════════════════════════════════════
-- Mesocycle catalog: editorial copy + character stats, and a function to
-- re-run any mesocycle from a chosen start date.
--
-- Context: the three active athletes ran out of programming on 2026-10-11 and
-- have had nothing scheduled since. They also asked to be able to go back and
-- repeat an earlier block. Both needs are the same feature: pick a mesocycle,
-- and get it scheduled forward from next Monday.
--
-- On re-running: this never rewrites history. Activating M1 again clones the
-- template's M1 workouts to NEW rows with future dates, leaving the original
-- run (and its logged sets) untouched. Repeating a block is a new cycle, not
-- an edit of the old one.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. editorial + stats per mesocycle ─────────────────────────────────
ALTER TABLE mesocycles
  ADD COLUMN IF NOT EXISTS title          TEXT,
  ADD COLUMN IF NOT EXISTS tagline        TEXT,
  ADD COLUMN IF NOT EXISTS summary        TEXT,
  ADD COLUMN IF NOT EXISTS benefits       TEXT[],
  ADD COLUMN IF NOT EXISTS focus_stats    JSONB,
  ADD COLUMN IF NOT EXISTS accent         TEXT,
  ADD COLUMN IF NOT EXISTS is_selectable  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN mesocycles.focus_stats IS
  'Character of the block as {fuerza,hipertrofia,skill,motor,intensidad} each 1-5, derived from the real distribution of sets and RPE across its workouts. Drives the stat bars on the selection card.';
COMMENT ON COLUMN mesocycles.is_selectable IS
  'Whether this block appears in the athlete-facing mesocycle picker. Off by default so a half-built block never shows up.';

-- ─── 2. activar un mesociclo: clonar hacia adelante ─────────────────────
CREATE OR REPLACE FUNCTION start_mesocycle(
  p_user_id     UUID,
  p_mesocycle_id UUID,
  p_start_date  DATE DEFAULT NULL
)
RETURNS TABLE (workouts_created INT, sets_created INT, first_date DATE, last_date DATE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_template_program UUID;
  v_tpl_first DATE;
  v_start DATE;
  v_program UUID;
  v_workouts INT := 0;
  v_sets INT := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT template_program_id INTO v_template_program FROM mesocycles WHERE id = p_mesocycle_id;
  IF v_template_program IS NULL THEN
    RAISE EXCEPTION 'Mesociclo no encontrado o sin programa plantilla';
  END IF;

  -- Default: next Monday, so a block always opens on a clean week.
  v_start := COALESCE(p_start_date, (CURRENT_DATE + ((8 - EXTRACT(ISODOW FROM CURRENT_DATE)::INT) % 7 + 1))::DATE);

  SELECT MIN(scheduled_date) INTO v_tpl_first
  FROM workouts WHERE program_id = v_template_program AND user_id IS NULL AND mesocycle_id = p_mesocycle_id;

  IF v_tpl_first IS NULL THEN
    RAISE EXCEPTION 'La plantilla de este mesociclo no tiene entrenamientos';
  END IF;

  SELECT id INTO v_program FROM programs
   WHERE user_id = p_user_id AND is_active = true LIMIT 1;
  IF v_program IS NULL THEN
    RAISE EXCEPTION 'El atleta no tiene un programa activo';
  END IF;

  -- Clear anything already scheduled in the target window that carries no
  -- logged work. Completed sessions are never touched.
  WITH ventana AS (
    SELECT w.id FROM workouts w
     WHERE w.user_id = p_user_id
       AND w.scheduled_date >= v_start
       AND w.scheduled_date < v_start + (SELECT (MAX(scheduled_date) - MIN(scheduled_date) + 1)
                                           FROM workouts
                                          WHERE program_id = v_template_program AND user_id IS NULL
                                            AND mesocycle_id = p_mesocycle_id)
       AND NOT EXISTS (SELECT 1 FROM workout_sets s WHERE s.workout_id = w.id AND s.is_completed = true)
  )
  DELETE FROM workout_sets WHERE workout_id IN (SELECT id FROM ventana);
  WITH ventana AS (
    SELECT w.id FROM workouts w
     WHERE w.user_id = p_user_id
       AND w.scheduled_date >= v_start
       AND NOT EXISTS (SELECT 1 FROM workout_sets s WHERE s.workout_id = w.id AND s.is_completed = true)
  )
  DELETE FROM workouts WHERE id IN (SELECT id FROM ventana);

  -- Clone workouts, shifting dates so the template's first day lands on v_start
  WITH nuevos AS (
    INSERT INTO workouts (program_id, user_id, mesocycle_id, scheduled_date, week_number,
                          day_label, workout_type, estimated_duration, is_rest_day,
                          notes, coach_note, short_on_time_note, is_completed)
    SELECT v_program, p_user_id, p_mesocycle_id,
           v_start + (t.scheduled_date - v_tpl_first),
           t.week_number, t.day_label, t.workout_type, t.estimated_duration, t.is_rest_day,
           t.notes, t.coach_note, t.short_on_time_note, false
      FROM workouts t
     WHERE t.program_id = v_template_program AND t.user_id IS NULL AND t.mesocycle_id = p_mesocycle_id
    RETURNING id, scheduled_date
  )
  SELECT COUNT(*) INTO v_workouts FROM nuevos;

  -- Clone the sets, matching template → new workout by date offset
  WITH mapa AS (
    SELECT t.id AS tpl_id, n.id AS new_id
      FROM workouts t
      JOIN workouts n
        ON n.user_id = p_user_id
       AND n.mesocycle_id = p_mesocycle_id
       AND n.scheduled_date = v_start + (t.scheduled_date - v_tpl_first)
     WHERE t.program_id = v_template_program AND t.user_id IS NULL AND t.mesocycle_id = p_mesocycle_id
  ),
  ins AS (
    INSERT INTO workout_sets (workout_id, user_id, exercise_id, set_order, set_type,
                              planned_reps, planned_tempo, planned_rpe, planned_rir,
                              planned_rest_seconds, planned_duration_seconds,
                              coaching_cue_override, block_label, is_completed, is_pr)
    SELECT m.new_id, p_user_id, s.exercise_id, s.set_order, s.set_type,
           s.planned_reps, s.planned_tempo, s.planned_rpe, s.planned_rir,
           s.planned_rest_seconds, s.planned_duration_seconds,
           s.coaching_cue_override, s.block_label, false, false
      FROM workout_sets s JOIN mapa m ON m.tpl_id = s.workout_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_sets FROM ins;

  UPDATE programs SET mesocycle_id = p_mesocycle_id, current_week = 1 WHERE id = v_program;

  RETURN QUERY
  SELECT v_workouts, v_sets,
         MIN(w.scheduled_date), MAX(w.scheduled_date)
    FROM workouts w
   WHERE w.user_id = p_user_id AND w.mesocycle_id = p_mesocycle_id AND w.scheduled_date >= v_start;
END;
$$;

COMMENT ON FUNCTION start_mesocycle IS
  'Schedules a mesocycle forward for an athlete from p_start_date (default next Monday). Clones the template into new rows; never edits or deletes a session that has logged sets.';

REVOKE ALL ON FUNCTION start_mesocycle(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_mesocycle(UUID, UUID, DATE) TO authenticated;
