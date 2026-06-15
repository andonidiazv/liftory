// Supabase client.
//
// Import like this:
//   import { supabase } from "@/integrations/supabase/client";
//
// ── Why we override `auth.lock` ─────────────────────────────────────────────
// By default, supabase-js v2 uses `navigatorLock` (the Web Locks API) to
// serialize auth operations (session refresh, getUser, etc.). Web Locks are
// scoped to the entire **origin**, so they coordinate across tabs, iframes,
// and service workers — which is great when it works.
//
// In practice it deadlocks the home screen for us:
//
//   - Vite HMR keeps a stale module/context alive that still holds the lock
//     on `lock:sb-<ref>-auth-token`.
//   - The PWA's service worker scope and the page can each grab the lock and
//     fail to release it on abrupt unmount.
//
// When that happens, every `auth.getUser()` / `auth.getSession()` blocks on
// the orphaned lock; the home query never resolves and the UI sticks on the
// skeleton state. The auth-js "steal after timeout" recovery exists but does
// not kick in reliably when calls keep queueing inside the 5s window.
//
// `processLock` is the supported alternative: an in-memory Promise chain
// scoped to this single JS context. No cross-tab coordination — which we
// don't need, since auth tokens roundtrip through localStorage anyway — and
// no orphaned locks when a tab/SW dies. This is the recommended config for
// React Native (same single-process assumption).
//
// Trade-off: if the user has the PWA installed *and* the site open in a
// browser tab simultaneously, both contexts can refresh the token at the
// same time. Last write to localStorage wins, which is harmless: both
// tokens are valid for the same user, and the next read picks up whichever
// landed last.
//
// Reference: https://github.com/supabase/supabase/issues/42505
import { createClient } from '@supabase/supabase-js';
import { processLock } from '@supabase/auth-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    lock: processLock,
  }
});
