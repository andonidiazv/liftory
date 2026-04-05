-- ══════════════════════════════════════════════════════════════
-- Push notification subscriptions
--
-- Stores both Web Push (current PWA) and native push tokens
-- (future Capacitor/App Store). The "type" column determines
-- how the Edge Function delivers the notification.
--
-- type = 'web'    → Web Push API with VAPID
-- type = 'native' → FCM HTTP v1 API (future)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'web' CHECK (type IN ('web', 'native')),
  -- Web Push fields
  endpoint   TEXT,
  p256dh     TEXT,
  auth       TEXT,
  -- Native push fields (future)
  device_token TEXT,
  platform     TEXT CHECK (platform IS NULL OR platform IN ('ios', 'android')),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A user can have one subscription per endpoint (web) or device_token (native)
  UNIQUE(user_id, endpoint)
);

-- Index for fast lookup by user_id (Edge Function queries by user)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

-- ── RLS ──
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) bypasses RLS automatically
