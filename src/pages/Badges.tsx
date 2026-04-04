import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Crown, ChevronsUp, ArrowUpCircle, Flame, Anchor, Rocket,
  Target, Shield, TrendingUp, Star, Award, Lock, Check, Share2,
  Filter, ChevronLeft, Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TabBar from "@/components/TabBar";

// ── Icon map ──
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  zap: Zap, crown: Crown, "chevrons-up": ChevronsUp, "arrow-up-circle": ArrowUpCircle,
  flame: Flame, anchor: Anchor, rocket: Rocket, bolt: Zap, target: Target,
  shield: Shield, "trending-up": TrendingUp, star: Star, award: Award,
};

// ── Constants ──
const TIER_COLORS: Record<string, string> = { longevity: "#7A8B5C", excelente: "#C75B39", elite: "#C9A96E" };
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
const CAT_COLORS: Record<string, string> = { compound: "#C75B39", olympic: "#C9A96E", bodyweight: "#7A8B5C" };

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
  return (
    <div className="min-h-screen px-5 pt-14 space-y-6" style={{ background: "#0D0C0A" }}>
      {[1,2,3].map(i => (
        <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );
}

// ── Weight bar chart component ──
function WeightBars({ tier, eliteM, eliteF }: { tier: BadgeTier; eliteM: number; eliteF: number }) {
  const maleW = tier.weight_male ?? 0;
  const femaleW = tier.weight_female ?? 0;
  const maxW = Math.max(eliteM, eliteF, 1);
  const malePct = (maleW / maxW) * 100;
  const femalePct = (femaleW / maxW) * 100;
  const color = TIER_COLORS[tier.tier] || "#888";

  if (maleW === 0 && femaleW === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Male */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-wider w-5 shrink-0" style={{ color: "#FAF8F5" }}>H</span>
        <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
            style={{ width: `${Math.max(malePct, 12)}%`, background: `${color}90` }}
          >
            <span className="font-mono text-[10px] font-bold" style={{ color: "#FAF8F5" }}>{maleW} kg</span>
          </div>
        </div>
      </div>
      {/* Female */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-wider w-5 shrink-0" style={{ color: "#8A8A8E" }}>M</span>
        <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
            style={{ width: `${Math.max(femalePct, 12)}%`, background: `${color}50` }}
          >
            <span className="font-mono text-[10px]" style={{ color: "#B0ACA7" }}>{femaleW} kg</span>
          </div>
        </div>
      </div>
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
  function getIcon(n: string | null) { return n ? (ICON_MAP[n.toLowerCase()] ?? Award) : Award; }
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
    <div className="min-h-screen pb-28" style={{ background: "#0D0C0A" }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-5 pt-14 pb-8">
        {/* Glow */}
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(199,91,57,0.08) 0%, transparent 70%)" }} />

        <button onClick={() => navigate(-1)} className="flex items-center gap-1 mb-6" style={{ color: "#8A8A8E" }}>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-body text-[13px]">Atrás</span>
        </button>

        <h1 className="font-display text-[32px] font-[800] relative" style={{ color: "#FAF8F5", letterSpacing: "-0.03em" }}>
          BADGES
        </h1>
        <p className="mt-2 font-body text-[15px] leading-relaxed" style={{ color: "#8A8A8E", maxWidth: 320 }}>
          Insignias verificadas de fuerza. No se regalan — se ganan con video y revisión manual.
        </p>

        {/* Stats row */}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 rounded-xl py-3 px-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-display text-[22px] font-[800]" style={{ color: "#C75B39" }}>{badges.length}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#8A8A8E" }}>Badges</p>
          </div>
          <div className="flex-1 rounded-xl py-3 px-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-display text-[22px] font-[800]" style={{ color: "#C9A96E" }}>{stats.total}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#8A8A8E" }}>Tiers totales</p>
          </div>
          <div className="flex-1 rounded-xl py-3 px-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-display text-[22px] font-[800]" style={{ color: "#7A8B5C" }}>{stats.earned}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#8A8A8E" }}>Ganados</p>
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
                background: isActive ? "rgba(199,91,57,0.15)" : "rgba(255,255,255,0.04)",
                color: isActive ? "#C75B39" : "#8A8A8E",
                border: isActive ? "1px solid rgba(199,91,57,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="mx-5 rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Filter className="mx-auto h-8 w-8 mb-3" style={{ color: "#8A8A8E" }} />
          <p className="font-display text-[15px] font-bold" style={{ color: "#FAF8F5" }}>Sin badges en esta categoría</p>
          <p className="mt-1 font-body text-[13px]" style={{ color: "#8A8A8E" }}>Prueba otro filtro.</p>
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
          const catColor = CAT_COLORS[badge.category || "compound"] || "#C75B39";
          // Get elite tier max weights for bar chart scaling
          const eliteTier = badge.badge_tiers?.find(t => t.tier === "elite");
          const eliteM = eliteTier?.weight_male ?? 0;
          const eliteF = eliteTier?.weight_female ?? 0;

          return (
            <div
              key={badge.id}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: "#161614",
                border: anyEarned ? `1px solid ${catColor}30` : "1px solid rgba(255,255,255,0.06)",
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
                      <h3 className="font-display text-[17px] font-[800]" style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}>
                        {badge.name}
                      </h3>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider"
                        style={{ background: `${catColor}15`, color: catColor }}
                      >
                        {badge.category}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mt-0.5" style={{ color: "#8A8A8E" }}>
                      {badge.exercise_name}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {badge.description && (
                  <p className="mt-3 font-body text-[13px] leading-relaxed" style={{ color: "#B0ACA7" }}>
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
                        background: status === "earned" ? `${color}12` : "rgba(255,255,255,0.03)",
                        border: status === "earned" ? `1px solid ${color}30` : "1px solid rgba(255,255,255,0.04)",
                        boxShadow: status === "earned" ? `0 0 20px ${color}15` : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: status === "earned" ? `${color}25` : status === "pending" ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.06)" }}
                        >
                          {status === "earned" ? (
                            <Check className="h-4 w-4" style={{ color }} strokeWidth={3} />
                          ) : status === "pending" ? (
                            <div className="h-3 w-3 rounded-full animate-pulse" style={{ background: "#EAB308" }} />
                          ) : (
                            <Lock className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
                          )}
                        </div>

                        {/* Label + reps */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-[13px] font-[700]" style={{ color: status === "earned" ? color : status === "locked" ? "#8A8A8E" : "#EAB308" }}>
                              {label}
                            </span>
                            <span className="font-mono text-[9px]" style={{ color: "#666" }}>{desc}</span>
                          </div>

                          {isBodyweight ? (
                            <div className="flex gap-4 mt-1">
                              <span className="font-mono text-[11px]" style={{ color: "#FAF8F5", opacity: status === "locked" ? 0.4 : 1 }}>
                                H: {tier.reps_male} rep{tier.reps_male > 1 ? "s" : ""}
                              </span>
                              <span className="font-mono text-[11px]" style={{ color: "#8A8A8E", opacity: status === "locked" ? 0.4 : 1 }}>
                                M: {tier.reps_female} rep{tier.reps_female > 1 ? "s" : ""}
                              </span>
                            </div>
                          ) : (
                            <p className="font-mono text-[10px] mt-0.5" style={{ color: "#8A8A8E", opacity: status === "locked" ? 0.4 : 1 }}>
                              x{tier.reps_male} reps
                            </p>
                          )}
                        </div>

                        {/* Earned share */}
                        {status === "earned" && (
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-full"
                            style={{ background: `${color}18` }}
                            onClick={e => {
                              e.stopPropagation();
                              navigator.share?.({ title: `LIFTORY Badge: ${badge.name} - ${label}`, text: `Gane el badge ${badge.name} nivel ${label} en LIFTORY!` });
                            }}
                          >
                            <Share2 className="h-3.5 w-3.5" style={{ color }} />
                          </button>
                        )}
                      </div>

                      {/* Weight bars — compound/olympic only */}
                      {!isBodyweight && <WeightBars tier={tier} eliteM={eliteM} eliteF={eliteF} />}
                    </div>
                  );
                })}
              </div>

              {/* ── Fun fact (expandable) ── */}
              {badge.fun_fact && (
                <div
                  className="mx-5 mb-4 rounded-xl px-4 py-3 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${catColor}40` }}
                  onClick={() => setExpandedId(isExpanded ? null : badge.id)}
                >
                  <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: catColor }} />
                    <p
                      className="font-body text-[12px] leading-relaxed"
                      style={{
                        color: "#B0ACA7",
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
                    style={{ background: catColor, color: "#FAF8F5" }}
                  >
                    <Award className="h-4 w-4" />
                    Reclamar badge
                  </button>
                ) : (
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-[700]"
                    style={{ background: "rgba(201,169,110,0.1)", color: "#C9A96E", border: "1px solid rgba(201,169,110,0.2)" }}
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
      <div className="mx-5 mt-8 mb-4 rounded-2xl px-5 py-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="font-mono text-[9px] uppercase tracking-[2px] mb-4" style={{ color: "#8A8A8E" }}>Niveles de badge</p>
        <div className="space-y-3">
          {TIER_ORDER.map(t => (
            <div key={t} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ background: TIER_COLORS[t] }} />
              <div className="flex-1">
                <span className="font-display text-[12px] font-[700]" style={{ color: TIER_COLORS[t] }}>{TIER_LABELS[t]}</span>
                <span className="font-body text-[11px] ml-2" style={{ color: "#8A8A8E" }}>
                  {t === "longevity" && "Fuerza funcional sólida. 6-12 meses de entrenamiento consistente."}
                  {t === "excelente" && "Fuerza que impresiona. 1-2 mesociclos dedicados."}
                  {t === "elite" && "El badge que presumes. 3+ mesociclos de trabajo serio."}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-body text-[11px] leading-relaxed" style={{ color: "#666" }}>
            Datos basados en StrengthLevel.com (millones de lifts), ExRx.net, y estudios del NSCA. Barras muestran peso para hombres (H) y mujeres (M).
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center py-6">
        <p className="font-display text-[11px] font-[800]" style={{ color: "#8A8A8E", letterSpacing: "-0.03em" }}>LIFTORY</p>
      </div>

      <TabBar />
    </div>
  );
}
