-- ══════════════════════════════════════════════════════════════
-- Admin RLS policies for badge management
-- Allows authenticated admins to INSERT/UPDATE/DELETE
-- badge_definitions and badge_tiers using the regular client.
-- Also fixes user_badges so admins can review (approve/reject).
-- ══════════════════════════════════════════════════════════════

-- badge_definitions: admin CRUD
CREATE POLICY "Admins can insert badge definitions"
  ON public.badge_definitions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update badge definitions"
  ON public.badge_definitions FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete badge definitions"
  ON public.badge_definitions FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- badge_tiers: admin CRUD
CREATE POLICY "Admins can insert badge tiers"
  ON public.badge_tiers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update badge tiers"
  ON public.badge_tiers FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete badge tiers"
  ON public.badge_tiers FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_badges: admin can update any badge (for approve/reject)
CREATE POLICY "Admins can update any user badge"
  ON public.user_badges FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_badges: admin can read all badges (not just approved)
CREATE POLICY "Admins can read all user badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
