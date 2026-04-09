import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Represents a badge review the athlete hasn't seen yet.
 * Works for both approvals and rejections.
 */
export interface BadgeReviewNotification {
  userBadgeId: string;
  badgeName: string;
  badgeSlug: string;
  tier: string;
  tierLabel: string;
  tierColor: string;
  status: "approved" | "rejected";
  reviewNotes: string | null;
  reviewedAt: string;
  exerciseName: string;
  iconName: string | null;
}

/* ------------------------------------------------------------------ */
/*  localStorage: tracks when the user last dismissed a review notif  */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "liftory_badge_review_last_seen";

function getLastSeen(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "1970-01-01T00:00:00Z";
  } catch {
    return "1970-01-01T00:00:00Z";
  }
}

function setLastSeen(iso: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // localStorage unavailable — silent fail, will re-show next time
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Checks for badge reviews (approved/rejected) that the athlete
 * hasn't seen yet. Returns the oldest unseen review first so they
 * are shown in chronological order.
 *
 * Design choices for long-term reliability:
 * - Uses `reviewed_at` from the DB — set by admin on approve/reject
 * - Compares against a localStorage timestamp (last dismissed)
 * - Shows ONE notification at a time; athlete dismisses to see next
 * - If localStorage is cleared, worst case = re-shows past reviews
 *   (harmless — just a re-celebration or re-notice)
 * - Non-blocking: if the query fails, nothing breaks
 * - Only runs once per mount (Home page load)
 */
export function useBadgeReviewNotification() {
  const { user } = useAuth();
  const [notification, setNotification] = useState<BadgeReviewNotification | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for unseen reviews on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const lastSeen = getLastSeen();

        // Query user_badges that were reviewed after lastSeen
        // Join with badge_tiers → badge_definitions for display data
        const { data, error } = await (supabase as any)
          .from("user_badges")
          .select(`
            id, status, review_notes, reviewed_at,
            badge_tiers (
              tier, tier_label, color,
              badge_definitions ( name, slug, exercise_name, icon_name )
            )
          `)
          .eq("user_id", user.id)
          .in("status", ["approved", "rejected"])
          .gt("reviewed_at", lastSeen)
          .order("reviewed_at", { ascending: true })
          .limit(1);

        if (cancelled) return;

        if (error || !data || data.length === 0) {
          setNotification(null);
          setLoading(false);
          return;
        }

        const row = data[0];
        const tierData = row.badge_tiers;
        const badgeData = tierData?.badge_definitions;

        if (!tierData || !badgeData) {
          setNotification(null);
          setLoading(false);
          return;
        }

        setNotification({
          userBadgeId: row.id,
          badgeName: badgeData.name || "Badge",
          badgeSlug: badgeData.slug || "",
          tier: tierData.tier || "",
          tierLabel: tierData.tier_label || "",
          tierColor: tierData.color || "#652F23",
          status: row.status as "approved" | "rejected",
          reviewNotes: row.review_notes || null,
          reviewedAt: row.reviewed_at || "",
          exerciseName: badgeData.exercise_name || "",
          iconName: badgeData.icon_name || null,
        });
      } catch {
        // Non-critical — silently fail
        setNotification(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Dismiss the current notification. Updates localStorage to the
   * reviewed_at of the dismissed notification so it won't show again.
   * If there are more unseen reviews, the next mount will pick them up.
   */
  const dismiss = useCallback(() => {
    if (notification?.reviewedAt) {
      setLastSeen(notification.reviewedAt);
    }
    setNotification(null);
  }, [notification]);

  /**
   * After dismissing, re-check if there's another unseen review.
   * Called after the dismiss animation completes.
   */
  const checkNext = useCallback(async () => {
    if (!user) return;

    try {
      const lastSeen = getLastSeen();

      const { data } = await (supabase as any)
        .from("user_badges")
        .select(`
          id, status, review_notes, reviewed_at,
          badge_tiers (
            tier, tier_label, color,
            badge_definitions ( name, slug, exercise_name, icon_name )
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["approved", "rejected"])
        .gt("reviewed_at", lastSeen)
        .order("reviewed_at", { ascending: true })
        .limit(1);

      if (!data || data.length === 0) {
        setNotification(null);
        return;
      }

      const row = data[0];
      const tierData = row.badge_tiers;
      const badgeData = tierData?.badge_definitions;

      if (!tierData || !badgeData) {
        setNotification(null);
        return;
      }

      setNotification({
        userBadgeId: row.id,
        badgeName: badgeData.name || "Badge",
        badgeSlug: badgeData.slug || "",
        tier: tierData.tier || "",
        tierLabel: tierData.tier_label || "",
        tierColor: tierData.color || "#652F23",
        status: row.status as "approved" | "rejected",
        reviewNotes: row.review_notes || null,
        reviewedAt: row.reviewed_at || "",
        exerciseName: badgeData.exercise_name || "",
        iconName: badgeData.icon_name || null,
      });
    } catch {
      setNotification(null);
    }
  }, [user]);

  return { notification, loading, dismiss, checkNext };
}
