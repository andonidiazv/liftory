-- ═══════════════════════════════════════════════════════════════════════════
-- Let admins write exercise_substitutions from the app.
--
-- The table has had RLS on with read access for everyone, but no write policy
-- at all: every substitution to date was inserted with the service role from a
-- script. The swap review screen needs an admin to promote an approved
-- candidate from the browser, and that INSERT was failing with a 403.
--
-- Read access is unchanged. Writes are admin-only, matching how every other
-- curated table in the app is gated.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "admins write exercise substitutions" ON exercise_substitutions;
CREATE POLICY "admins write exercise substitutions"
  ON exercise_substitutions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );
