-- ══════════════════════════════════════════════════════════════
-- Allow users to resubmit rejected badge claims
-- The existing policy only allows UPDATE when status = 'pending'.
-- This adds permission to UPDATE when status = 'rejected' so
-- athletes can resubmit their video after a rejection.
-- ══════════════════════════════════════════════════════════════

-- Drop the old narrow policy
DROP POLICY IF EXISTS "Users can update own pending" ON public.user_badges;

-- Replace with a policy that allows updating own pending OR rejected claims
CREATE POLICY "Users can update own pending or rejected"
  ON public.user_badges FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'rejected'));
