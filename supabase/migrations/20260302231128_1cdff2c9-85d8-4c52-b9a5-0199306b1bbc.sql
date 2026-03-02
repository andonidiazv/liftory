
-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Allow admins to read all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read all workouts (for active users KPI)
CREATE POLICY "Admins can view all workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
