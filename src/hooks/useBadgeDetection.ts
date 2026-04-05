import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface BadgeMatch {
  badgeName: string;
  badgeSlug: string;
  tier: string;
  tierLabel: string;
  tierColor: string;
  requiredWeight: number | null;
  requiredReps: number;
  exerciseName: string;
}

/**
 * Detects if a just-completed set qualifies for an unclaimed badge tier.
 * Does NOT grant the badge — only returns match info for notification.
 *
 * Gender-aware: uses weight_male/reps_male for male athletes,
 * weight_female/reps_female for female athletes.
 * If profile has no gender set, detection is skipped entirely.
 */
export function useBadgeDetection() {
  const { user, profile } = useAuth();

  // Prevent duplicate notifications for the same badge in one session.
  // Uses a synchronous Set so concurrent calls still see each other's additions.
  const notifiedRef = useRef<Set<string>>(new Set());

  // Mutex to prevent concurrent checks from producing duplicate notifications
  const checkingRef = useRef(false);

  const checkForBadge = useCallback(
    async (
      exerciseName: string,
      weight: number,
      reps: number
    ): Promise<BadgeMatch | null> => {
      if (!user || !profile) return null;

      const gender = profile.gender; // "male" | "female" | null
      if (!gender) return null;

      // Validate inputs — weight can be 0 for bodyweight exercises
      if (!exerciseName || isNaN(weight) || isNaN(reps)) return null;
      if (reps <= 0) return null;

      // Mutex: wait if another check is in flight
      if (checkingRef.current) return null;
      checkingRef.current = true;

      try {
        // 1. Find badge definitions that match this exercise
        const { data: badges, error: badgeErr } = await (supabase as any)
          .from("badge_definitions")
          .select("id, name, slug, exercise_name")
          .eq("exercise_name", exerciseName)
          .eq("is_active", true);

        if (badgeErr || !badges || badges.length === 0) return null;

        const badgeIds = badges.map((b: any) => b.id);

        // 2. Get all tiers for matching badges (elite first = highest sort_order first)
        const { data: tiers, error: tierErr } = await (supabase as any)
          .from("badge_tiers")
          .select(
            "id, badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order"
          )
          .in("badge_id", badgeIds)
          .order("sort_order", { ascending: false });

        if (tierErr || !tiers || tiers.length === 0) return null;

        // 3. Get user's existing claims for these tiers (any status — pending, approved, rejected)
        const tierIds = tiers.map((t: any) => t.id);
        const { data: existingClaims } = await (supabase as any)
          .from("user_badges")
          .select("badge_tier_id, status")
          .eq("user_id", user.id)
          .in("badge_tier_id", tierIds);

        const claimedTierIds = new Set(
          (existingClaims ?? []).map((c: any) => c.badge_tier_id)
        );

        // 4. Check from highest tier down — find the best qualifying unclaimed tier
        for (const tier of tiers) {
          const reqWeight =
            gender === "male"
              ? Number(tier.weight_male)
              : Number(tier.weight_female);
          const reqReps =
            gender === "male"
              ? Number(tier.reps_male)
              : Number(tier.reps_female);

          // Skip if already claimed (any status)
          if (claimedTierIds.has(tier.id)) continue;

          // Skip if already notified this session
          const notifKey = `${tier.badge_id}_${tier.tier}`;
          if (notifiedRef.current.has(notifKey)) continue;

          // Check qualification
          // For bodyweight exercises weight_male/weight_female is NULL → weightOk = true
          const weightOk =
            tier.weight_male == null && tier.weight_female == null
              ? true
              : weight >= reqWeight;
          const repsOk = reps >= reqReps;

          if (weightOk && repsOk) {
            const badge = badges.find((b: any) => b.id === tier.badge_id);
            if (!badge) continue;

            // Mark as notified BEFORE returning to prevent race conditions
            notifiedRef.current.add(notifKey);

            return {
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
            };
          }
        }

        return null;
      } catch {
        // Silently fail — badge detection is non-critical
        return null;
      } finally {
        checkingRef.current = false;
      }
    },
    [user, profile]
  );

  return { checkForBadge };
}
