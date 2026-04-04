-- ═══════════════════════════════════════════════════
-- Badge Video Storage Policies
-- Run this in your Supabase Dashboard SQL Editor
-- ═══════════════════════════════════════════════════

-- Allow authenticated users to upload videos to their own folder
CREATE POLICY "Users can upload badge videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'badge-videos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view/download badge videos (public bucket)
CREATE POLICY "Anyone can view badge videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'badge-videos');

-- Allow users to update/overwrite their own videos
CREATE POLICY "Users can update own badge videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'badge-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
