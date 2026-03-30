-- Function to propagate template workout sets to all user copies
-- Usage: SELECT propagate_template_sets('template-program-uuid', from_week, to_week);
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
    'weeks', p_from_week || '-' || p_to_week
  );
END;
$fn$;
