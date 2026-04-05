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
 */
export function useBadgeDetection() {
  const { user, profile } = useAuth();
  // Prevent duplicate notifications for the same badge in one session
  const notifiedRef = useRef<Set<string>>(new Set());

  const checkForBadge = useCallback(
    async (
      exerciseName: string,
      weight: number,
      reps: number
    ): Promise<BadgeMatch | null> => {
      if (!user || !profile) return null;

      const gender = profile.gender; // "male" | "female" | null
      if (!gender) return null;

      // 1. Find badge definitions that match this exercise
      const { data: badges } = await supabase
        .from("badge_definitions")
        .select("id, name, slug, exercise_name")
        .eq("exercise_name", exerciseName)
        .eq("is_active", true);

      if (!badges || badges.length === 0) return null;

      const badgeIds = badges.map((b) => b.id);

      // 2. Get all tiers for matching badges
      const { data: tiers } = await supabase
        .from("badge_tiers")
        .select("id, badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order")
        .in("badge_id", badgeIds)
        .order("sort_order", { ascending: false }); // elite first

      if (!tiers || tiers.length === 0) return null;

      // 3. Get user's existing claims for these tiers
      const tierIds = tiers.map((t) => t.id);
      const { data: existingClaims } = await supabase
        .from("user_badges")
        .select("badge_tier_id, status")
        .eq("user_id", user.id)
        .in("badge_tier_id", tierIds);

      const claimedTierIds = new Set(
        (existingClaims ?? []).map((c) => c.badge_tier_id)
      );

      // 4. Check from highest tier down — find the best qualifying unclaimed tier
      for (const tier of tiers) {
        const reqWeight = gender === "male" ? tier.weight_male : tier.weight_female;
        const reqReps = gender === "male" ? tier.reps_male : tier.reps_female;

        // Skip if already claimed
        if (claimedTierIds.has(tier.id)) continue;

        // Skip if already notified this session
        const notifKey = `${tier.badge_id}_${tier.tier}`;
        if (notifiedRef.current.has(notifKey)) continue;

        // Check qualification
        const weightOk = reqWeight == null || weight >= reqWeight;
        const repsOk = reqReps == null || reps >= reqReps;

        if (weightOk && repsOk) {
          const badge = badges.find((b) => b.id === tier.badge_id)!;
          notifiedRef.current.add(notifKey);

          return {
            badgeName: badge.name,
            badgeSlug: badge.slug,
            tier: tier.tier,
            tierLabel: tier.tier_label,
            tierColor: tier.color,
            requiredWeight: reqWeight,
            requiredReps: reqReps,
            exerciseName: badge.exercise_name,
          };
        }
      }

      return null;
    },
    [user, profile]
  );

  return { checkForBadge };
}
