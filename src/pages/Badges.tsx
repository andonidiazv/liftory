import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Crown,
  ChevronsUp,
  ArrowUpCircle,
  Flame,
  Anchor,
  Rocket,
  Target,
  Shield,
  TrendingUp,
  Star,
  Award,
  Lock,
  Check,
  Share2,
  Loader2,
  Filter,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Icon map — maps icon_name stored in DB to lucide components
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  crown: Crown,
  "chevrons-up": ChevronsUp,
  "arrow-up-circle": ArrowUpCircle,
  flame: Flame,
  anchor: Anchor,
  rocket: Rocket,
  bolt: Zap,
  target: Target,
  shield: Shield,
  "trending-up": TrendingUp,
  star: Star,
  award: Award,
};

// ---------------------------------------------------------------------------
// Tier colour palette
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<string, string> = {
  longevity: "#7A8B5C",
  excelente: "#C75B39",
  elite: "#C9A96E",
};

const TIER_LABELS: Record<string, string> = {
  longevity: "Longevity",
  excelente: "Excelente",
  elite: "Elite",
};

const TIER_ORDER = ["longevity", "excelente", "elite"] as const;

// ---------------------------------------------------------------------------
// Filter categories
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "compound", label: "Compound" },
  { key: "olympic", label: "Olympic" },
  { key: "bodyweight", label: "Bodyweight" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BadgeTier {
  id: string;
  badge_id: string;
  tier: string;
  weight_male: number | null;
  weight_female: number | null;
  reps_required: number | null;
  description: string | null;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  tier: string;
  earned_at: string;
}

interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  exercise_name: string;
  description: string | null;
  fun_fact: string | null;
  icon_name: string | null;
  category: string | null;
  badge_tiers: BadgeTier[];
  user_badges: UserBadge[];
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function BadgesSkeleton() {
  return (
    <div className="px-5 pt-14 space-y-6">
      <Skeleton className="h-10 w-40 bg-muted" />
      <Skeleton className="h-4 w-64 bg-muted" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full bg-muted" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Badges() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isFemale, setIsFemale] = useState(false);

  // ---- Detect gender ----
  useEffect(() => {
    if (!user) return;

    async function detectGender() {
      // 1. Check profile.gender first
      if (profile?.gender) {
        setIsFemale(profile.gender.toLowerCase() === "female" || profile.gender.toLowerCase() === "f");
        return;
      }

      // 2. Check program name for HER / HIM
      const { data: program } = await supabase
        .from("programs")
        .select("name, target_gender")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();

      if (program) {
        if (program.target_gender) {
          setIsFemale(program.target_gender.toLowerCase() === "female");
          return;
        }
        if (program.name) {
          const upper = program.name.toUpperCase();
          if (upper.includes("HER")) {
            setIsFemale(true);
            return;
          }
          if (upper.includes("HIM")) {
            setIsFemale(false);
            return;
          }
        }
      }

      // 3. Default male
      setIsFemale(false);
    }

    detectGender();
  }, [user, profile]);

  // ---- Fetch badges ----
  useEffect(() => {
    if (!user) return;

    async function fetchBadges() {
      setLoading(true);

      const { data, error } = await supabase
        .from("badge_definitions")
        .select(`
          id,
          slug,
          name,
          exercise_name,
          description,
          fun_fact,
          icon_name,
          category,
          badge_tiers ( id, badge_id, tier, weight_male, weight_female, reps_required, description ),
          user_badges ( id, user_id, badge_id, tier, earned_at )
        `)
        .eq("user_badges.user_id", user!.id)
        .order("name");

      if (!error && data) {
        setBadges(data as unknown as BadgeDefinition[]);
      }

      setLoading(false);
    }

    fetchBadges();
  }, [user]);

  // ---- Filtered list ----
  const filtered = useMemo(() => {
    if (activeFilter === "all") return badges;
    return badges.filter(
      (b) => b.category?.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [badges, activeFilter]);

  // ---- Helpers ----
  function getIcon(iconName: string | null) {
    if (!iconName) return Award;
    return ICON_MAP[iconName.toLowerCase()] ?? Award;
  }

  function tierStatus(badge: BadgeDefinition, tierName: string): "locked" | "pending" | "earned" {
    const earned = badge.user_badges?.find(
      (ub) => ub.tier === tierName
    );
    if (earned) return "earned";
    // Could check pending claims in the future
    return "locked";
  }

  function earnedDate(badge: BadgeDefinition, tierName: string): string | null {
    const earned = badge.user_badges?.find((ub) => ub.tier === tierName);
    return earned?.earned_at ?? null;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ---- Has any earned tier on this badge ----
  function hasAnyEarned(badge: BadgeDefinition): boolean {
    return badge.user_badges?.length > 0;
  }

  // ---- Next claimable tier ----
  function nextClaimableTier(badge: BadgeDefinition): string | null {
    for (const t of TIER_ORDER) {
      const tier = badge.badge_tiers?.find((bt) => bt.tier === t);
      if (!tier) continue;
      const status = tierStatus(badge, t);
      if (status === "locked") return t;
    }
    return null;
  }

  // ---- Render ----
  if (loading) {
    return (
      <Layout>
        <BadgesSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-14 pb-20 space-y-8">
        {/* ── Header ── */}
        <div>
          <h1
            className="font-display text-[28px] font-[800] text-foreground"
            style={{ letterSpacing: "-0.03em" }}
          >
            BADGES
          </h1>
          <p className="mt-1 font-body text-[14px] text-muted-foreground">
            Demuestra tu fuerza. Gana tu insignia.
          </p>
        </div>

        {/* ── Category pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveFilter(cat.key)}
                className="shrink-0 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[1.5px] transition-all"
                style={{
                  background: isActive
                    ? "hsl(var(--primary))"
                    : "hsl(var(--card))",
                  color: isActive
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--muted-foreground))",
                  border: isActive
                    ? "1px solid hsl(var(--primary))"
                    : "1px solid hsl(var(--border))",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            <Filter className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="font-display text-[16px] font-semibold text-foreground">
              Sin badges en esta categoria
            </p>
            <p className="mt-1 font-body text-[13px] text-muted-foreground">
              Prueba otro filtro o revisa mas tarde.
            </p>
          </div>
        )}

        {/* ── Badge cards ── */}
        <div className="space-y-5">
          {filtered.map((badge) => {
            const Icon = getIcon(badge.icon_name);
            const sortedTiers = TIER_ORDER.map((t) =>
              badge.badge_tiers?.find((bt) => bt.tier === t)
            ).filter(Boolean) as BadgeTier[];

            const claimable = nextClaimableTier(badge);
            const anyEarned = hasAnyEarned(badge);

            return (
              <div
                key={badge.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: anyEarned
                    ? "0 0 24px rgba(199, 91, 57, 0.08)"
                    : "0 4px 12px rgba(0, 0, 0, 0.04)",
                }}
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: anyEarned
                          ? "rgba(199, 91, 57, 0.12)"
                          : "hsl(var(--secondary))",
                      }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{
                          color: anyEarned
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground))",
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-display text-[17px] font-bold text-foreground"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {badge.name}
                      </h3>
                      <p className="font-mono text-[10px] uppercase tracking-[2px] text-primary mt-0.5">
                        {badge.exercise_name}
                      </p>
                      {badge.description && (
                        <p className="mt-2 font-body text-[13px] text-muted-foreground leading-relaxed">
                          {badge.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tier indicators */}
                <div className="px-5 pb-4">
                  <div className="space-y-2">
                    {sortedTiers.map((tier) => {
                      const status = tierStatus(badge, tier.tier);
                      const color = TIER_COLORS[tier.tier] ?? "#888";
                      const label = TIER_LABELS[tier.tier] ?? tier.tier;
                      const weight = isFemale
                        ? tier.weight_female
                        : tier.weight_male;
                      const earned = earnedDate(badge, tier.tier);

                      return (
                        <div
                          key={tier.id}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                          style={{
                            background:
                              status === "earned"
                                ? `${color}12`
                                : "hsl(var(--secondary) / 0.5)",
                            border:
                              status === "earned"
                                ? `1px solid ${color}40`
                                : "1px solid transparent",
                            boxShadow:
                              status === "earned"
                                ? `0 0 16px ${color}20`
                                : "none",
                          }}
                        >
                          {/* Status icon */}
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background:
                                status === "earned"
                                  ? `${color}25`
                                  : status === "pending"
                                  ? "rgba(234, 179, 8, 0.15)"
                                  : "hsl(var(--secondary))",
                            }}
                          >
                            {status === "earned" ? (
                              <Check
                                className="h-4 w-4"
                                style={{ color }}
                                strokeWidth={3}
                              />
                            ) : status === "pending" ? (
                              <div
                                className="h-3 w-3 rounded-full animate-pulse"
                                style={{ background: "#EAB308" }}
                              />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>

                          {/* Tier info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-display text-[13px] font-bold"
                                style={{
                                  color:
                                    status === "earned"
                                      ? color
                                      : "hsl(var(--muted-foreground))",
                                }}
                              >
                                {label}
                              </span>
                              {earned && (
                                <span className="font-mono text-[9px] text-muted-foreground tracking-wider">
                                  {formatDate(earned)}
                                </span>
                              )}
                            </div>
                            <p
                              className="font-mono text-[11px] mt-0.5"
                              style={{
                                color:
                                  status === "earned"
                                    ? "hsl(var(--foreground))"
                                    : "hsl(var(--muted-foreground))",
                                opacity: status === "locked" ? 0.5 : 1,
                              }}
                            >
                              {weight != null && `${weight} kg`}
                              {weight != null && tier.reps_required != null && " x "}
                              {tier.reps_required != null &&
                                `${tier.reps_required} rep${tier.reps_required > 1 ? "s" : ""}`}
                            </p>
                          </div>

                          {/* Share button for earned */}
                          {status === "earned" && (
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ background: `${color}18` }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Share functionality placeholder
                                if (navigator.share) {
                                  navigator.share({
                                    title: `LIFTORY Badge: ${badge.name} - ${label}`,
                                    text: `Gane el badge ${badge.name} nivel ${label} en LIFTORY!`,
                                  });
                                }
                              }}
                            >
                              <Share2
                                className="h-3.5 w-3.5"
                                style={{ color }}
                              />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fun fact */}
                {badge.fun_fact && (
                  <div
                    className="mx-5 mb-4 rounded-xl px-4 py-3"
                    style={{
                      background: "hsl(var(--secondary) / 0.5)",
                      borderLeft: "3px solid hsl(var(--primary) / 0.3)",
                    }}
                  >
                    <p className="font-body text-[12px] text-muted-foreground italic leading-relaxed">
                      {badge.fun_fact}
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="px-5 pb-5">
                  {claimable ? (
                    <button
                      onClick={() =>
                        navigate(`/badges/claim/${badge.slug}/${claimable}`)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-semibold transition-all active:scale-[0.98]"
                      style={{
                        background: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                      }}
                    >
                      <Award className="h-4 w-4" />
                      Reclamar badge
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-semibold"
                      style={{
                        background: "rgba(201, 169, 110, 0.1)",
                        color: "#C9A96E",
                        border: "1px solid rgba(201, 169, 110, 0.2)",
                      }}
                    >
                      <Crown className="h-4 w-4" />
                      Todas las insignias ganadas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
