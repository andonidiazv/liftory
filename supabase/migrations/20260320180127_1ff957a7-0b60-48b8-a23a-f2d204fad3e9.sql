
CREATE POLICY "Admins can insert programs"
ON public.programs FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update programs"
ON public.programs FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete programs"
ON public.programs FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert workouts"
ON public.workouts FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update workouts"
ON public.workouts FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete workouts"
ON public.workouts FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert workout_sets"
ON public.workout_sets FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update workout_sets"
ON public.workout_sets FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete workout_sets"
ON public.workout_sets FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
