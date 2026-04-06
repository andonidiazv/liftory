import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { ExerciseGroup } from "@/hooks/useWorkoutData";

export interface BadgeMatch {
  badgeId: string;
  badgeName: string;
  badgeSlug: string;
  tier: string;
  tierLabel: string;
  tierColor: string;
  requiredWeight: number | null;
  requiredReps: number;
  exerciseName: string;
  /** true = shown when entering block (opportunity), false = shown after completing set (qualified) */
  proactive: boolean;
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers for notification cooldown & permanent dismiss */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = "liftory_badge_notif_";
const COOLDOWN_DAYS = 30;

/** Key format: liftory_badge_notif_{badgeId}_{tier} */
function storageKey(badgeId: string, tier: string): string {
  return `${STORAGE_PREFIX}${badgeId}_${tier}`;
}

interface NotifState {
  /** ISO date of last notification shown */
  lastShown: string | null;
  /** If true, user clicked "No me interesa" — never show again */
  dismissed: boolean;
}

function getNotifState(badgeId: string, tier: string): NotifState {
  try {
    const raw = localStorage.getItem(storageKey(badgeId, tier));
    if (!raw) return { lastShown: null, dismissed: false };
    return JSON.parse(raw) as NotifState;
  } catch {
    return { lastShown: null, dismissed: false };
  }
}

function setNotifShown(badgeId: string, tier: string): void {
  const state = getNotifState(badgeId, tier);
  state.lastShown = new Date().toISOString();
  localStorage.setItem(storageKey(badgeId, tier), JSON.stringify(state));
}

/** Permanently dismiss notifications for this badge tier */
export function dismissBadgeNotification(badgeId: string, tier: string): void {
  const state = getNotifState(badgeId, tier);
  state.dismissed = true;
  localStorage.setItem(storageKey(badgeId, tier), JSON.stringify(state));
}

function shouldShowNotification(badgeId: string, tier: string): boolean {
  const state = getNotifState(badgeId, tier);

  // Permanently dismissed
  if (state.dismissed) return false;

  // Never shown before → show
  if (!state.lastShown) return true;

  // Check cooldown
  const lastShown = new Date(state.lastShown);
  const now = new Date();
  const daysSince = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= COOLDOWN_DAYS;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Badge detection with two modes:
 *
 * 1. PROACTIVE (checkBlockForBadges): Called when athlete enters a block.
 *    Checks if any exercise in the block has a badge opportunity based on
 *    planned_reps and e1RM projections.
 *
 * 2. REACTIVE (checkForBadge): Called after completing a set.
 *    Checks if the actual weight × reps qualifies for a badge.
 *    Used for AMRAP/EMOM exercises where proactive detection doesn't apply.
 *
 * Both modes respect cooldown, permanent dismiss, and session deduplication.
 */
export function useBadgeDetection() {
  const { user, profile } = useAuth();

  // Prevent duplicate notifications for the same badge in one session
  const notifiedRef = useRef<Set<string>>(new Set());

  // Separate mutexes for proactive and reactive checks
  const proactiveCheckingRef = useRef(false);
  const reactiveCheckingRef = useRef(false);

  /**
   * Shared helper: fetch badges, tiers, and claims for a list of exercise names.
   * Returns null if nothing to check, otherwise returns the resolved data.
   */
  const fetchBadgeData = useCallback(
    async (exerciseNames: string[]) => {
      if (!user || !profile) return null;
      const gender = profile.gender;
      if (!gender) return null;
      if (exerciseNames.length === 0) return null;

      // 1. Find badge definitions that match these exercises
      const { data: badges, error: badgeErr } = await (supabase as any)
        .from("badge_definitions")
        .select("id, name, slug, exercise_name")
        .in("exercise_name", exerciseNames)
        .eq("is_active", true);

      if (badgeErr || !badges || badges.length === 0) return null;

      const badgeIds = badges.map((b: any) => b.id);

      // 2. Get all tiers (highest first)
      const { data: tiers, error: tierErr } = await (supabase as any)
        .from("badge_tiers")
        .select(
          "id, badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order"
        )
        .in("badge_id", badgeIds)
        .order("sort_order", { ascending: false });

      if (tierErr || !tiers || tiers.length === 0) return null;

      // 3. Get user's existing claims
      const tierIds = tiers.map((t: any) => t.id);
      const { data: existingClaims } = await (supabase as any)
        .from("user_badges")
        .select("badge_tier_id, status")
        .eq("user_id", user.id)
        .in("badge_tier_id", tierIds);

      const claimedTierIds = new Set(
        (existingClaims ?? []).map((c: any) => c.badge_tier_id)
      );

      return { badges, tiers, claimedTierIds, gender };
    },
    [user, profile]
  );

  /**
   * PROACTIVE: Check if a block has badge opportunities based on e1RM.
   * Called when the athlete enters a block.
   */
  const checkBlockForBadges = useCallback(
    async (
      groups: ExerciseGroup[],
      exerciseE1RM: Record<string, number>
    ): Promise<BadgeMatch | null> => {
      if (!user || !profile) return null;
      if (proactiveCheckingRef.current) return null;
      proactiveCheckingRef.current = true;

      try {
        const exerciseNames = groups.map((g) => g.exercise.name);
        const data = await fetchBadgeData(exerciseNames);
        if (!data) return null;

        const { badges, tiers, claimedTierIds, gender } = data;

        // Build a map of exercise name → max planned_reps in this block
        const exerciseMaxReps: Record<string, number> = {};
        const exerciseIdByName: Record<string, string> = {};
        for (const g of groups) {
          const maxReps = Math.max(...g.sets.map((s) => s.planned_reps ?? 0));
          exerciseMaxReps[g.exercise.name] = maxReps;
          exerciseIdByName[g.exercise.name] = g.exercise.id;
        }

        // Check from highest tier down
        for (const tier of tiers) {
          const badge = badges.find((b: any) => b.id === tier.badge_id);
          if (!badge) continue;

          const reqWeight =
            gender === "male"
              ? Number(tier.weight_male)
              : Number(tier.weight_female);
          const reqReps =
            gender === "male"
              ? Number(tier.reps_male)
              : Number(tier.reps_female);

          // Skip if already claimed
          if (claimedTierIds.has(tier.id)) continue;

          // Skip if already notified this session
          const notifKey = `${tier.badge_id}_${tier.tier}`;
          if (notifiedRef.current.has(notifKey)) continue;

          // Skip if in cooldown or permanently dismissed
          if (!shouldShowNotification(tier.badge_id, tier.tier)) continue;

          // Check if this exercise is in the current block
          const maxPlannedReps = exerciseMaxReps[badge.exercise_name];
          if (maxPlannedReps == null) continue;

          // Rule: planned_reps must be >= badge required reps
          if (maxPlannedReps < reqReps) continue;

          // For bodyweight exercises (weight is null), only check reps
          const isBodyweight = tier.weight_male == null && tier.weight_female == null;

          if (!isBodyweight) {
            // Check e1RM: athlete must be capable of the badge weight
            const exerciseId = exerciseIdByName[badge.exercise_name];
            const e1rm = exerciseE1RM[exerciseId];
            if (!e1rm) continue;

            // Project what athlete can lift at badge rep count
            const projectedAtBadgeReps = e1rm / (1 + reqReps / 30);
            if (projectedAtBadgeReps < reqWeight) continue;
          }

          // Match found — mark as notified for this session only
          // Don't write to localStorage for proactive — athlete should see this
          // every session until they claim or permanently dismiss
          notifiedRef.current.add(notifKey);

          return {
            badgeId: tier.badge_id,
            badgeName: badge.name,
            badgeSlug: badge.slug,
            tier: tier.tier,
            tierLabel: tier.tier_label,
            tierColor: tier.color,
            requiredWeight: isBodyweight ? null : reqWeight,
            requiredReps: reqReps,
            exerciseName: badge.exercise_name,
            proactive: true,
          };
        }

        return null;
      } catch {
        return null;
      } finally {
        proactiveCheckingRef.current = false;
      }
    },
    [user, profile, fetchBadgeData]
  );

  /**
   * REACTIVE: Check after completing a set (for AMRAP/EMOM or post-completion).
   */
  const checkForBadge = useCallback(
    async (
      exerciseName: string,
      weight: number,
      reps: number
    ): Promise<BadgeMatch | null> => {
      if (!user || !profile) return null;

      const gender = profile.gender;
      if (!gender) return null;

      if (!exerciseName || isNaN(weight) || isNaN(reps)) return null;
      if (reps <= 0) return null;

      if (reactiveCheckingRef.current) return null;
      reactiveCheckingRef.current = true;

      try {
        const data = await fetchBadgeData([exerciseName]);
        if (!data) return null;

        const { badges, tiers, claimedTierIds } = data;

        for (const tier of tiers) {
          const reqWeight =
            gender === "male"
              ? Number(tier.weight_male)
              : Number(tier.weight_female);
          const reqReps =
            gender === "male"
              ? Number(tier.reps_male)
              : Number(tier.reps_female);

          if (claimedTierIds.has(tier.id)) continue;

          const notifKey = `${tier.badge_id}_${tier.tier}`;
          if (notifiedRef.current.has(notifKey)) continue;

          if (!shouldShowNotification(tier.badge_id, tier.tier)) continue;

          const weightOk =
            tier.weight_male == null && tier.weight_female == null
              ? true
              : weight >= reqWeight;
          const repsOk = reps >= reqReps;

          if (weightOk && repsOk) {
            const badge = badges.find((b: any) => b.id === tier.badge_id);
            if (!badge) continue;

            notifiedRef.current.add(notifKey);
            setNotifShown(tier.badge_id, tier.tier);

            return {
              badgeId: tier.badge_id,
              badgeName: badge.name,
              badgeSlug: badge.slug,
              tier: tier.tier,
              tierLabel: tier.tier_label,
              tierColor: tier.color,
              requiredWeight:
                tier.weight_male == null && tier.weight_female == null
                  ? null
                  : reqWeight,
              requiredReps: reqReps,
              exerciseName: badge.exercise_name,
              proactive: false,
            };
          }
        }

        return null;
      } catch {
        return null;
      } finally {
        reactiveCheckingRef.current = false;
      }
    },
    [user, profile, fetchBadgeData]
  );

  return { checkForBadge, checkBlockForBadges };
}
