-- Admin can view all programs
CREATE POLICY "Admins can view all programs"
  ON public.programs
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin can view all workout_sets
CREATE POLICY "Admins can view all workout_sets"
  ON public.workout_sets
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin can view all wearable_data
CREATE POLICY "Admins can view all wearable_data"
  ON public.wearable_data
  FOR SELECT
  USING (public.is_admin(auth.uid()));