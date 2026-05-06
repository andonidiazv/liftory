-- v2 of the legacy PR trigger drop. The previous migration filtered the
-- trigger DEFINITION (CREATE TRIGGER ...) for "is_pr", but that string lives
-- in the trigger's FUNCTION body, not its definition. This pass inspects the
-- function source via pg_get_functiondef and drops the triggers whose
-- backing function references is_pr.

DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT t.tgname, p.proname, pg_get_functiondef(p.oid) AS fn_def
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.workout_sets'::regclass
      AND NOT t.tgisinternal
  LOOP
    IF trig.fn_def ILIKE '%is_pr%' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.workout_sets', trig.tgname);
      RAISE NOTICE 'Dropped legacy PR trigger: % (function: %)', trig.tgname, trig.proname;
    END IF;
  END LOOP;
END $$;
