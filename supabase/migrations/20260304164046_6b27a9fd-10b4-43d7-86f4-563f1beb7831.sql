
-- Drop the restrictive SELECT policy and create a permissive one
DROP POLICY IF EXISTS "Authenticated can view exercises" ON public.exercises;

CREATE POLICY "Authenticated can view exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (true);
