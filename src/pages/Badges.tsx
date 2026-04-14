import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award, Crown, Lock, Check, Share2, Filter, ChevronLeft, Info, Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TabBar from "@/components/TabBar";
import { BADGE_ICON_MAP, getBadgeIcon } from "@/lib/badgeIcons";
import { useShareBadgeCard } from "@/hooks/useShareBadgeCard";
import BadgeShareCard from "@/components/share/BadgeShareCard";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

// Re-export for backward compat within this file
const ICON_MAP = BADGE_ICON_MAP;

// ── Constants ──
const TIER_COLORS: Record<string, string> = { longevity: "#7A8B5C", excelente: "#C4A24E", elite: "#C4A24E" };
const TIER_LABELS: Record<string, string> = { longevity: "LONGEVITY", excelente: "EXCELENTE", elite: "ELITE" };
const TIER_DESCS: Record<string, string> = {
  longevity: "Top 50% entrenados",
  excelente: "Top 30-35% entrenados",
  elite: "Top 15-20% entrenados",
};
const TIER_ORDER = ["longevity", "excelente", "elite"] as const;
const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "compound", label: "Compound" },
  { key: "olympic", label: "Olympic" },
  { key: "bodyweight", label: "Bodyweight" },
];
const CAT_COLORS: Record<string, string> = { compound: "#C4A24E", olympic: "#C4A24E", bodyweight: "#7A8B5C" };

// ── Types ──
interface BadgeTier {
  id: string; badge_id: string; tier: string; tier_label: string;
  weight_male: number | null; weight_female: number | null;
  reps_male: number; reps_female: number; color: string; sort_order: number;
}
interface UserBadge { tier_id: string; tier: string; status: string; earned_at: string; }
interface BadgeDefinition {
  id: string; slug: string; name: string; exercise_name: string;
  description: string | null; fun_fact: string | null;
  icon_name: string | null; category: string | null;
  badge_tiers: BadgeTier[]; user_badges: UserBadge[];
}

// ── Skeleton ──
function BadgesSkeleton() {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  return (
    <div className="min-h-screen px-5 pt-14 space-y-6" style={{ background: t.bg }}>
      {[1,2,3].map(i => (
        <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: t.accentBg }} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
export default function Badges() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { cardRef, sharing, share, cardData, athleteName, avatarUrl } = useShareBadgeCard();
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;

  // ── Fetch ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: defs, error } = await (supabase as any)
        .from("badge_definitions")
        .select(`
          id, slug, name, exercise_name, description, fun_fact, icon_name, category,
          badge_tiers ( id, badge_id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order )
        `)
        .eq("is_active", true)
        .order("sort_order");

      if (error || !defs) { setLoading(false); return; }

      const { data: earned } = await (supabase as any)
        .from("user_badges")
        .select("id, badge_tier_id, status, earned_at")
        .eq("user_id", user!.id);

      const earnedMap = new Map<string, { status: string; earned_at: string }>();
      if (earned) for (const e of earned) earnedMap.set(e.badge_tier_id, { status: e.status, earned_at: e.earned_at });

      setBadges(defs.map((d: any) => ({
        ...d,
        badge_tiers: (d.badge_tiers || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        user_badges: (d.badge_tiers || [])
          .filter((t: any) => earnedMap.has(t.id))
          .map((t: any) => ({ tier_id: t.id, tier: t.tier, ...earnedMap.get(t.id) })),
      })));
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return badges;
    return badges.filter(b => b.category?.toLowerCase() === activeFilter.toLowerCase());
  }, [badges, activeFilter]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = badges.reduce((a, b) => a + (b.badge_tiers?.length || 0), 0);
    const earned = badges.reduce((a, b) => a + (b.user_badges?.filter(u => u.status === "approved").length || 0), 0);
    return { total, earned };
  }, [badges]);

  // ── Helpers ──
  function getIcon(n: string | null) { return getBadgeIcon(n); }
  function tierStatus(b: BadgeDefinition, t: string) {
    const ub = b.user_badges?.find(u => u.tier === t);
    if (!ub) return "locked";
    return ub.status === "approved" ? "earned" : ub.status === "pending" ? "pending" : "locked";
  }
  function nextClaim(b: BadgeDefinition) {
    for (const t of TIER_ORDER) { if (b.badge_tiers?.find(bt => bt.tier === t) && tierStatus(b, t) === "locked") return t; }
    return null;
  }

  if (loading) return <><BadgesSkeleton /><TabBar /></>;

  return (
    <div className="min-h-screen pb-28" style={{ background: t.bg }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-5 pt-14 pb-8">
        {/* Glow */}
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${t.accentBg} 0%, transparent 70%)` }} />

        <button onClick={() => navigate(-1)} className="flex items-center gap-1 mb-6" style={{ color: t.muted }}>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-body text-[13px]">Atrás</span>
        </button>

        <h1 className="font-display text-[32px] font-[800] relative" style={{ color: t.text, letterSpacing: "-0.03em" }}>
          BADGES
        </h1>
        <p className="mt-2 font-body text-[15px] leading-relaxed" style={{ color: t.muted, maxWidth: 320 }}>
          Insignias verificadas de fuerza. No se regalan — se ganan con video y revisión manual.
        </p>

        {/* Stats row */}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 rounded-xl py-3 px-4" style={{ background: t.accentBg, border: `1px solid ${t.border}` }}>
            <p className="font-display text-[22px] font-[800]" style={{ color: t.accent }}>{badges.length}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: t.muted }}>Badges</p>
          </div>
          <div className="flex-1 rounded-xl py-3 px-4" style={{ background: t.accentBg, border: `1px solid ${t.border}` }}>
            <p className="font-display text-[22px] font-[800]" style={{ color: t.accent }}>{stats.total}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: t.muted }}>Tiers totales</p>
          </div>
          <div className="flex-1 rounded-xl py-3 px-4" style={{ background: t.accentBg, border: `1px solid ${t.border}` }}>
            <p className="font-display text-[22px] font-[800]" style={{ color: t.success }}>{stats.earned}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: t.muted }}>Ganados</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 px-5 pb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map(cat => {
          const isActive = activeFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className="shrink-0 rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[1.5px] transition-all"
              style={{
                background: isActive ? t.accentBgStrong : t.accentBg,
                color: isActive ? t.accent : t.muted,
                border: isActive ? `1px solid ${t.accent}4D` : `1px solid ${t.border}`,
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="mx-5 rounded-2xl p-10 text-center" style={{ background: t.accentBg, border: `1px solid ${t.border}` }}>
          <Filter className="mx-auto h-8 w-8 mb-3" style={{ color: t.muted }} />
          <p className="font-display text-[15px] font-bold" style={{ color: t.text }}>Sin badges en esta categoría</p>
          <p className="mt-1 font-body text-[13px]" style={{ color: t.muted }}>Prueba otro filtro.</p>
        </div>
      )}

      {/* ── Badge cards ── */}
      <div className="px-5 space-y-5">
        {filtered.map(badge => {
          const Icon = getIcon(badge.icon_name);
          const sortedTiers = TIER_ORDER.map(t => badge.badge_tiers?.find(bt => bt.tier === t)).filter(Boolean) as BadgeTier[];
          const claimable = nextClaim(badge);
          const anyEarned = badge.user_badges?.some(u => u.status === "approved");
          const isExpanded = expandedId === badge.id;
          const catColor = CAT_COLORS[badge.category || "compound"] || "#C4A24E";
          // Get elite tier max weights for bar chart scaling
          const eliteTier = badge.badge_tiers?.find(t => t.tier === "elite");
          const eliteM = eliteTier?.weight_male ?? 0;
          const eliteF = eliteTier?.weight_female ?? 0;

          return (
            <div
              key={badge.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: t.card,
                border: anyEarned ? `1px solid ${catColor}30` : `1px solid ${t.border}`,
                boxShadow: anyEarned ? `0 0 30px ${catColor}10` : "none",
              }}
            >
              {/* Top accent bar */}
              <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${catColor}80, ${catColor}20)` }} />

              {/* Header */}
              <div
                className="px-5 pt-5 pb-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : badge.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${catColor}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: catColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-[17px] font-[800]" style={{ color: t.text, letterSpacing: "-0.02em" }}>
                        {badge.name}
                      </h3>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider"
                        style={{ background: `${catColor}15`, color: catColor }}
                      >
                        {badge.category}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mt-0.5" style={{ color: t.muted }}>
                      {badge.exercise_name}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {badge.description && (
                  <p className="mt-3 font-body text-[13px] leading-relaxed" style={{ color: t.muted }}>
                    {badge.description}
                  </p>
                )}
              </div>

              {/* ── Tiers ── */}
              <div className="px-5 pb-4 space-y-2">
                {sortedTiers.map(tier => {
                  const status = tierStatus(badge, tier.tier);
                  const color = TIER_COLORS[tier.tier] || "#888";
                  const label = TIER_LABELS[tier.tier] || tier.tier;
                  const desc = TIER_DESCS[tier.tier] || "";
                  const isBodyweight = tier.weight_male == null && tier.weight_female == null;

                  return (
                    <div
                      key={tier.id}
                      className="rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: status === "earned" ? `${color}12` : t.accentBg,
                        border: status === "earned" ? `1px solid ${color}30` : `1px solid ${t.border}`,
                        boxShadow: status === "earned" ? `0 0 20px ${color}15` : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: status === "earned" ? `${color}25` : status === "pending" ? "rgba(234,179,8,0.15)" : t.accentBg }}
                        >
                          {status === "earned" ? (
                            <Check className="h-4 w-4" style={{ color }} strokeWidth={3} />
                          ) : status === "pending" ? (
                            <div className="h-3 w-3 rounded-full animate-pulse" style={{ background: "#EAB308" }} />
                          ) : (
                            <Lock className="h-3.5 w-3.5" style={{ color: t.muted }} />
                          )}
                        </div>

                        {/* Label + reps */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-[13px] font-[700]" style={{ color: status === "earned" ? color : status === "locked" ? t.muted : "#EAB308" }}>
                              {label}
                            </span>
                            <span className="font-mono text-[9px]" style={{ color: t.subtle }}>{desc}</span>
                          </div>

                          {(() => {
                            const gender = profile?.gender as "male" | "female" | null;
                            const isMale = gender === "male";
                            const isFemale = gender === "female";
                            const lockedOpacity = status === "locked" ? 0.4 : 1;
                            return isBodyweight ? (
                              <div className="flex gap-3 mt-0.5">
                                <span className="font-mono text-[11px]" style={{
                                  color: isMale ? t.text : t.subtle,
                                  fontWeight: isMale ? 700 : 400,
                                  opacity: lockedOpacity,
                                }}>
                                  H: {tier.reps_male} rep{tier.reps_male > 1 ? "s" : ""}
                                </span>
                                <span className="font-mono text-[11px]" style={{
                                  color: isFemale ? t.text : t.subtle,
                                  fontWeight: isFemale ? 700 : 400,
                                  opacity: lockedOpacity,
                                }}>
                                  M: {tier.reps_female} rep{tier.reps_female > 1 ? "s" : ""}
                                </span>
                              </div>
                            ) : (
                              <div className="flex gap-3 mt-0.5">
                                <span className="font-mono text-[11px]" style={{
                                  color: isMale ? t.text : t.subtle,
                                  fontWeight: isMale ? 700 : 400,
                                  opacity: lockedOpacity,
                                }}>
                                  H: {tier.weight_male} kg x{tier.reps_male}
                                </span>
                                <span className="font-mono text-[11px]" style={{
                                  color: isFemale ? t.text : t.subtle,
                                  fontWeight: isFemale ? 700 : 400,
                                  opacity: lockedOpacity,
                                }}>
                                  M: {tier.weight_female} kg x{tier.reps_female}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Earned share — image card */}
                        {status === "earned" && (
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ background: `${color}18` }}
                            disabled={sharing}
                            onClick={e => {
                              e.stopPropagation();
                              share({
                                badgeName: badge.name,
                                tierLabel: label,
                                tierColor: color,
                                exerciseName: badge.exercise_name,
                                iconName: badge.icon_name,
                              });
                            }}
                          >
                            {sharing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color }} />
                            ) : (
                              <Share2 className="h-3.5 w-3.5" style={{ color }} />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Weight bars — compound/olympic only, both genders with highlight */}
                      {!isBodyweight && (() => {
                        const gender = profile?.gender as "male" | "female" | null;
                        const maleW = tier.weight_male ?? 0;
                        const femaleW = tier.weight_female ?? 0;
                        const maxW = Math.max(eliteM, eliteF, 1);
                        const malePct = (maleW / maxW) * 100;
                        const femalePct = (femaleW / maxW) * 100;
                        const tierColor = TIER_COLORS[tier.tier] || "#888";
                        const isMale = gender === "male";
                        const isFemale = gender === "female";
                        return (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] uppercase tracking-wider w-4 shrink-0" style={{
                                color: isMale ? t.text : t.subtle,
                                fontWeight: isMale ? 700 : 400,
                              }}>H</span>
                              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: t.accentBg }}>
                                <div
                                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                                  style={{
                                    width: `${Math.max(malePct, 12)}%`,
                                    background: isMale ? `${tierColor}` : `${tierColor}30`,
                                  }}
                                >
                                  <span className="font-mono text-[10px]" style={{
                                    color: isMale ? t.text : t.subtle,
                                    fontWeight: isMale ? 700 : 400,
                                  }}>{maleW} kg</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] uppercase tracking-wider w-4 shrink-0" style={{
                                color: isFemale ? t.text : t.subtle,
                                fontWeight: isFemale ? 700 : 400,
                              }}>M</span>
                              <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: t.accentBg }}>
                                <div
                                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                                  style={{
                                    width: `${Math.max(femalePct, 12)}%`,
                                    background: isFemale ? `${tierColor}` : `${tierColor}30`,
                                  }}
                                >
                                  <span className="font-mono text-[10px]" style={{
                                    color: isFemale ? t.text : t.subtle,
                                    fontWeight: isFemale ? 700 : 400,
                                  }}>{femaleW} kg</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* ── Fun fact (expandable) ── */}
              {badge.fun_fact && (
                <div
                  className="mx-5 mb-4 rounded-xl px-4 py-3 cursor-pointer"
                  style={{ background: t.accentBg, borderLeft: `3px solid ${catColor}40` }}
                  onClick={() => setExpandedId(isExpanded ? null : badge.id)}
                >
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: catColor }} />
                    <p
                      className="font-body text-[12px] leading-relaxed"
                      style={{
                        color: t.muted,
                        display: isExpanded ? "block" : "-webkit-box",
                        WebkitLineClamp: isExpanded ? undefined : 2,
                        WebkitBoxOrient: "vertical",
                        overflow: isExpanded ? "visible" : "hidden",
                      }}
                    >
                      {badge.fun_fact}
                    </p>
                  </div>
                </div>
              )}

              {/* ── CTA ── */}
              <div className="px-5 pb-5">
                {claimable ? (
                  <button
                    onClick={() => navigate(`/badges/claim/${badge.slug}/${claimable}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-[700] transition-all active:scale-[0.98]"
                    style={{ background: catColor, color: t.btnText }}
                  >
                    <Award className="h-4 w-4" />
                    Reclamar badge
                  </button>
                ) : (
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-[700]"
                    style={{ background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBgStrong}` }}
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

      {/* ── Tier legend ── */}
      <div className="mx-5 mt-8 mb-4 rounded-2xl px-5 py-5" style={{ background: t.accentBg, border: `1px solid ${t.border}` }}>
        <p className="font-mono text-[9px] uppercase tracking-[2px] mb-4" style={{ color: t.muted }}>Niveles de badge</p>
        <div className="space-y-3">
          {TIER_ORDER.map(tierKey => (
            <div key={tierKey} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ background: TIER_COLORS[tierKey] }} />
              <div className="flex-1">
                <span className="font-display text-[12px] font-[700]" style={{ color: TIER_COLORS[tierKey] }}>{TIER_LABELS[tierKey]}</span>
                <span className="font-body text-[11px] ml-2" style={{ color: t.muted }}>
                  {tierKey === "longevity" && "Fuerza funcional sólida. 6-12 meses de entrenamiento consistente."}
                  {tierKey === "excelente" && "Fuerza que impresiona. 1-2 mesociclos dedicados."}
                  {tierKey === "elite" && "El badge que presumes. 3+ mesociclos de trabajo serio."}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <p className="font-body text-[11px] leading-relaxed" style={{ color: t.subtle }}>
            Datos basados en StrengthLevel.com (millones de lifts), ExRx.net, y estudios del NSCA. Tu metrica esta resaltada. H = hombres, M = mujeres.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center py-6">
        <p className="font-display text-[11px] font-[800]" style={{ color: t.muted, letterSpacing: "-0.03em" }}>LIFTORY</p>
      </div>

      <TabBar />

      {/* ═══ HIDDEN SHARE CARD (captured by html2canvas) ═══ */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <BadgeShareCard
          ref={cardRef}
          badgeName={cardData?.badgeName || ""}
          tierLabel={cardData?.tierLabel || ""}
          tierColor={cardData?.tierColor || "#C4A24E"}
          exerciseName={cardData?.exerciseName || ""}
          iconName={cardData?.iconName ?? null}
          athleteName={athleteName}
          avatarUrl={avatarUrl}
        />
      </div>
    </div>
  );
}
