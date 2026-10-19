-- ═══════════════════════════════════════════════════════════════════════════
-- start_mesocycle: arrancar HOY, no "el próximo lunes".
--
-- Dos bugs en la versión anterior:
--
-- 1. La fecha por defecto nunca caía en lunes. La fórmula
--      CURRENT_DATE + ((8 - ISODOW) % 7 + 1)
--    da +1 día cuando hoy es lunes (ISODOW=1 → (7%7)+1 = 1) y "mismo día de
--    la semana que viene" el resto de los días. Andoni activó M1 un lunes y
--    el bloque arrancó el martes, dejándolo sin sesión para hoy.
--    Ahora el default es CURRENT_DATE: le das Comenzar y entrenas hoy.
--
-- 2. El borrado de la ventana era asimétrico: los workout_sets se borraban
--    sólo dentro de la ventana del clon, pero los workouts se borraban para
--    TODA fecha futura sin sets completados. Los sets de workouts posteriores
--    a la ventana quedaban huérfanos. Ahora ambos borrados usan el mismo
--    criterio.
--
-- Lo que no cambia: jamás se toca una sesión con sets completados.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION start_mesocycle(
  p_user_id      UUID,
  p_mesocycle_id UUID,
  p_start_date   DATE DEFAULT NULL
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

  -- Por defecto: hoy. Comenzar significa comenzar.
  v_start := COALESCE(p_start_date, CURRENT_DATE);

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

  -- Limpia lo que ya estaba agendado de v_start en adelante y no tiene trabajo
  -- registrado. Mismo criterio para sets y para workouts, para no dejar sets
  -- huérfanos.
  CREATE TEMP TABLE _ventana ON COMMIT DROP AS
    SELECT w.id FROM workouts w
     WHERE w.user_id = p_user_id
       AND w.scheduled_date >= v_start
       AND NOT EXISTS (SELECT 1 FROM workout_sets s WHERE s.workout_id = w.id AND s.is_completed = true);

  DELETE FROM workout_sets WHERE workout_id IN (SELECT id FROM _ventana);
  DELETE FROM workouts     WHERE id         IN (SELECT id FROM _ventana);

  -- Clona los workouts corriendo las fechas para que el día 1 de la plantilla
  -- caiga en v_start.
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
  SELECT v_workouts, v_sets, MIN(w.scheduled_date), MAX(w.scheduled_date)
    FROM workouts w
   WHERE w.user_id = p_user_id AND w.mesocycle_id = p_mesocycle_id AND w.scheduled_date >= v_start;
END;
$$;

COMMENT ON FUNCTION start_mesocycle IS
  'Agenda un mesociclo para un atleta a partir de p_start_date (por defecto HOY). Clona la plantilla en filas nuevas; nunca edita ni borra una sesión con sets completados.';

REVOKE ALL ON FUNCTION start_mesocycle(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_mesocycle(UUID, UUID, DATE) TO authenticated;
