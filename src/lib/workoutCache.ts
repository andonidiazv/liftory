/**
 * Workout cache: Sprint 2 (read cache).
 *
 * Stores the FULL response of a workout fetch (workout + workout_sets + nested
 * exercise rows) so the app can reload offline. Server is always the source of
 * truth — when it responds, its data overrides the cache. The cache is only
 * read as a fallback when the network call fails.
 *
 * Keyed by workoutId (so multiple workouts can be cached, e.g. today's strength
 * workout and tomorrow's mobility one). The user_id is denormalized into the
 * payload + a "cache owner" metadata key, so we can clear the cache cleanly
 * when an athlete logs out or switches accounts.
 */

import { offlineStorage } from "@/lib/offlineStorage";

const CACHE_KEY_PREFIX = "workout:";
const META_OWNER_KEY = "workoutCache:owner";
const META_LAST_SYNC = "workoutCache:lastSync";

/** Anything we want to cache; intentionally typed as `unknown` so this lib
 *  doesn't depend on the shape — the calling hook owns the shape and casts. */
export type CachedWorkoutPayload<T = unknown> = {
  workoutId: string;
  userId: string;
  data: T;
};

export async function cacheWorkout<T>(
  workoutId: string,
  userId: string,
  data: T
): Promise<void> {
  const payload: CachedWorkoutPayload<T> = { workoutId, userId, data };
  await offlineStorage.cacheSet(CACHE_KEY_PREFIX + workoutId, payload);
  await offlineStorage.metaSet(META_OWNER_KEY, userId);
  await offlineStorage.metaSet(META_LAST_SYNC, Date.now());
}

export async function getCachedWorkout<T>(
  workoutId: string,
  userId: string
): Promise<{ data: T; cachedAt: number } | null> {
  const entry = await offlineStorage.cacheGet<CachedWorkoutPayload<T>>(
    CACHE_KEY_PREFIX + workoutId
  );
  if (!entry) return null;
  // Cache from a different account — ignore. Caller will clear cache on auth change.
  if (entry.data.userId !== userId) return null;
  return { data: entry.data.data, cachedAt: entry.cachedAt };
}

export async function getCachedWorkoutOwner(): Promise<string | null> {
  return offlineStorage.metaGet<string>(META_OWNER_KEY);
}

export async function getLastWorkoutSync(): Promise<number | null> {
  return offlineStorage.metaGet<number>(META_LAST_SYNC);
}

export async function clearWorkoutCache(): Promise<void> {
  // We don't have a "delete by prefix" — just nuke the whole cache store.
  // Other things in the cache (exercises catalog, etc.) belong to the same
  // user anyway, so this is the right behavior on logout.
  await offlineStorage.cacheClear();
  await offlineStorage.metaDelete(META_OWNER_KEY);
  await offlineStorage.metaDelete(META_LAST_SYNC);
}
