/**
 * Profile cache — keeps the user_profiles row in localStorage so the app
 * can boot to the home screen WITHOUT waiting for a Supabase round-trip.
 *
 * Why this exists:
 *   - On iOS PWA cold-start, the first `select * from user_profiles` after
 *     the session restores can take >6s on flaky cell networks. While that
 *     hangs, ProtectedRoute shows a splash and after 6s shows "No se pudo
 *     cargar tu perfil." Users blame the app and close it.
 *   - Profile data is small and changes rarely. Caching it locally lets us
 *     paint the home screen immediately and refresh in the background.
 *
 * Invariants:
 *   - Cache is per-user. Reading with a different user_id returns null
 *     so we never paint another athlete's data.
 *   - Cache is wiped on signOut.
 *   - Stale cache (>30 days old) is invalidated automatically.
 */
import type { UserProfile } from "./types";

const KEY = "liftory-profile-cache";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CacheEntry = {
  user_id: string;
  profile: UserProfile;
  cached_at: number;
};

/** Read cached profile for a given user. Returns null if missing or stale. */
export function readCachedProfile(userId: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.user_id !== userId) return null;
    if (Date.now() - entry.cached_at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return entry.profile;
  } catch {
    return null;
  }
}

/** Write the latest profile to cache. Best-effort — silently ignores quota errors. */
export function writeCachedProfile(userId: string, profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { user_id: userId, profile, cached_at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // localStorage quota, private-browsing mode, etc. — non-fatal.
  }
}

/** Wipe the cache. Call on signOut to prevent leaking one athlete's data to another. */
export function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch { /* noop */ }
}
