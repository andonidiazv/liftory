-- Drop the legacy PR-detection trigger on workout_sets.
--
-- Background: the trigger was applied via the Supabase dashboard (not in
-- migrations). It marks is_pr based on a >= comparison that doesn't exclude
-- same-session sets, so logging the same weight × reps in 3 sets flags all 3
-- as PRs. The new logic lives in the client (useWorkoutData.completeSet)
-- and computes per-rep-range, strict >, excluding the current set.
--
-- We drop by inspecting trigger definitions at apply time so we don't depend
-- on a name we don't know. Only triggers whose definition mentions `is_pr`
-- are removed — referential-integrity and other unrelated triggers are left
-- alone. Any function the trigger called is left in place too (harmless
-- once nothing fires it; safer than guessing dependencies).

DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT tgname, pg_get_triggerdef(oid) AS def
    FROM pg_trigger
    WHERE tgrelid = 'public.workout_sets'::regclass
      AND NOT tgisinternal
  LOOP
    IF trig.def ILIKE '%is_pr%' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.workout_sets', trig.tgname);
      RAISE NOTICE 'Dropped legacy PR trigger: %', trig.tgname;
    END IF;
  END LOOP;
END $$;
