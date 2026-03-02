
-- Storage bucket for exercise videos and thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', true);

-- Anyone can view exercise media (public bucket)
CREATE POLICY "Public can view exercise media"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-videos');

-- Only admins can upload exercise media
CREATE POLICY "Admins can upload exercise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-videos' AND public.is_admin(auth.uid()));

-- Only admins can update exercise media
CREATE POLICY "Admins can update exercise media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-videos' AND public.is_admin(auth.uid()));

-- Only admins can delete exercise media
CREATE POLICY "Admins can delete exercise media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-videos' AND public.is_admin(auth.uid()));

-- Admins can insert exercises
CREATE POLICY "Admins can insert exercises"
ON public.exercises FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update exercises
CREATE POLICY "Admins can update exercises"
ON public.exercises FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete exercises
CREATE POLICY "Admins can delete exercises"
ON public.exercises FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
