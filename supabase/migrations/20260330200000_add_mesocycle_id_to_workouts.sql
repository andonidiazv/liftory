-- Add mesocycle_id column to workouts table for cycle-based filtering
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS mesocycle_id UUID;

-- Backfill template workouts with their mesocycle_id based on date ranges
-- BHE Ciclo 1
UPDATE workouts SET mesocycle_id = '4154def5-95b0-492b-89fe-335aee1f4f9f'
WHERE program_id = '32302803-ead8-4e08-809a-606031a7b7e0'
  AND user_id IS NULL AND scheduled_date >= '2026-03-16' AND scheduled_date <= '2026-04-26';

-- BHE Ciclo 2
UPDATE workouts SET mesocycle_id = '422affe6-4b2c-4e8d-bad7-4c96968e5e40'
WHERE program_id = '32302803-ead8-4e08-809a-606031a7b7e0'
  AND user_id IS NULL AND scheduled_date >= '2026-04-27' AND scheduled_date <= '2026-06-07';

-- BHF Ciclo 1
UPDATE workouts SET mesocycle_id = '0bfcf27b-f5c3-418f-88de-39830cc618ab'
WHERE program_id = '5c91470a-361e-4824-a513-832493a395f0' AND user_id IS NULL;

-- SHE Ciclo 1
UPDATE workouts SET mesocycle_id = 'b1f0b1a7-8c86-46bf-a09a-78b5480d3edf'
WHERE program_id = '22bbb97c-8362-4e44-8a04-62aeee66249c' AND user_id IS NULL;

-- SHF Ciclo 1
UPDATE workouts SET mesocycle_id = '8b8992d6-9310-4fcb-9d36-de77d4cf1e65'
WHERE program_id = 'e7f93b9c-165a-4354-b2f7-2921b34fe434' AND user_id IS NULL;

-- Update propagate_template_sets to filter by live mesocycle
CREATE OR REPLACE FUNCTION public.propagate_template_sets(
  p_template_program_id UUID,
  p_from_week INT DEFAULT 1,
  p_to_week INT DEFAULT 6
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_template_name TEXT;
  v_live_mesocycle_id UUID;
  v_user_program RECORD;
  v_template_workout RECORD;
  v_user_workout_id UUID;
  v_deleted INT := 0;
  v_inserted INT := 0;
  v_users INT := 0;
  v_rc INT;
BEGIN
  SELECT name INTO v_template_name
  FROM programs
  WHERE id = p_template_program_id AND user_id IS NULL;

  IF v_template_name IS NULL THEN
    RETURN json_build_object('error', 'Template program not found');
  END IF;

  -- Find the live mesocycle for this template
  SELECT id INTO v_live_mesocycle_id
  FROM mesocycles
  WHERE template_program_id = p_template_program_id
    AND status = 'live'
  ORDER BY cycle_number DESC
  LIMIT 1;

  FOR v_user_program IN
    SELECT id AS program_id, user_id
    FROM programs
    WHERE name = v_template_name AND user_id IS NOT NULL
  LOOP
    v_users := v_users + 1;

    FOR v_template_workout IN
      SELECT id, week_number, day_label
      FROM workouts
      WHERE program_id = p_template_program_id
        AND week_number >= p_from_week
        AND week_number <= p_to_week
        AND (v_live_mesocycle_id IS NULL OR mesocycle_id = v_live_mesocycle_id)
    LOOP
      SELECT id INTO v_user_workout_id
      FROM workouts
      WHERE program_id = v_user_program.program_id
        AND week_number = v_template_workout.week_number
        AND day_label = v_template_workout.day_label
      LIMIT 1;

      IF v_user_workout_id IS NULL THEN
        CONTINUE;
      END IF;

      DELETE FROM workout_sets WHERE workout_id = v_user_workout_id;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      v_deleted := v_deleted + v_rc;

      INSERT INTO workout_sets (
        id, workout_id, user_id, exercise_id, set_order, set_type,
        block_label, planned_reps, planned_weight, planned_rpe, planned_rir,
        planned_tempo, planned_rest_seconds, coaching_cue_override
      )
      SELECT
        gen_random_uuid(), v_user_workout_id, v_user_program.user_id,
        exercise_id, set_order, set_type, block_label,
        planned_reps, planned_weight, planned_rpe, planned_rir,
        planned_tempo, planned_rest_seconds, coaching_cue_override
      FROM workout_sets
      WHERE workout_id = v_template_workout.id
      ORDER BY set_order;

      GET DIAGNOSTICS v_rc = ROW_COUNT;
      v_inserted := v_inserted + v_rc;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'users_updated', v_users,
    'sets_deleted', v_deleted,
    'sets_inserted', v_inserted,
    'template', v_template_name,
    'weeks', p_from_week || '-' || p_to_week,
    'mesocycle_id', v_live_mesocycle_id
  );
END;
$fn$;
