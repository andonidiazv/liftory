INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-thumbnails', 'exercise-thumbnails', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for exercise thumbnails" ON storage.objects FOR SELECT TO public USING (bucket_id = 'exercise-thumbnails');

CREATE POLICY "Admins can upload exercise thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exercise-thumbnails' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update exercise thumbnails" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'exercise-thumbnails' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete exercise thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exercise-thumbnails' AND public.is_admin(auth.uid()));