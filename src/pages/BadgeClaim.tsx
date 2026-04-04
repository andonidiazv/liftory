import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, Send, Link as LinkIcon, FileText, Award,
  CheckCircle, Loader2, Info, Lock, Check, Zap, Crown, ChevronsUp,
  ArrowUpCircle, Flame, Anchor, Rocket, Target, Shield, TrendingUp, Star,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TabBar from "@/components/TabBar";

// ── Types ──
interface TierData {
  id: string;
  tier: string;
  tier_label: string;
  weight_male: number | null;
  weight_female: number | null;
  reps_male: number;
  reps_female: number;
  color: string;
  sort_order: number;
}

interface BadgeData {
  id: string;
  slug: string;
  name: string;
  exercise_name: string;
  description: string | null;
  fun_fact: string | null;
  icon_name: string | null;
  category: string | null;
  badge_tiers: TierData[];
}

interface UserBadgeStatus {
  badge_tier_id: string;
  status: string;
}

const TIER_ORDER = ["longevity", "excelente", "elite"] as const;
const TIER_COLORS: Record<string, string> = { longevity: "#7A8B5C", excelente: "#C75B39", elite: "#C9A96E" };
const TIER_DESCS: Record<string, string> = {
  longevity: "Top 50% de entrenados. Fuerza funcional sólida.",
  excelente: "Top 30-35% de entrenados. Fuerza que impresiona.",
  elite: "Top 15-20% de entrenados. El badge que presumes.",
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  zap: Zap, crown: Crown, "chevrons-up": ChevronsUp, "arrow-up-circle": ArrowUpCircle,
  flame: Flame, anchor: Anchor, rocket: Rocket, bolt: Zap, target: Target,
  shield: Shield, "trending-up": TrendingUp, star: Star, award: Award,
};

export default function BadgeClaim() {
  const { slug, tier: urlTier } = useParams<{ slug: string; tier: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserBadgeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>(urlTier || "longevity");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");

  // ── Fetch badge + user statuses ──
  useEffect(() => {
    if (!slug || !user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("badge_definitions")
        .select(`
          id, slug, name, exercise_name, description, fun_fact, icon_name, category,
          badge_tiers ( id, tier, tier_label, weight_male, weight_female, reps_male, reps_female, color, sort_order )
        `)
        .eq("slug", slug)
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "No se encontró el badge." });
        navigate("/badges");
        return;
      }

      const sorted = { ...data, badge_tiers: (data.badge_tiers || []).sort((a: TierData, b: TierData) => a.sort_order - b.sort_order) };
      setBadge(sorted);

      // Get user's existing claims for this badge's tiers
      const tierIds = sorted.badge_tiers.map((t: TierData) => t.id);
      if (tierIds.length) {
        const { data: statuses } = await (supabase as any)
          .from("user_badges")
          .select("badge_tier_id, status")
          .eq("user_id", user.id)
          .in("badge_tier_id", tierIds);
        if (statuses) setUserStatuses(statuses);
      }

      setLoading(false);
    })();
  }, [slug, user, navigate]);

  // ── Helpers ──
  function getIcon(n: string | null) { return n ? (ICON_MAP[n.toLowerCase()] ?? Award) : Award; }

  function tierStatusFor(tierId: string): "locked" | "pending" | "approved" {
    const s = userStatuses.find(u => u.badge_tier_id === tierId);
    if (!s) return "locked";
    return s.status as "pending" | "approved";
  }

  const selectedTierData = badge?.badge_tiers.find(t => t.tier === selectedTier);
  const selectedColor = TIER_COLORS[selectedTier] || "#C75B39";
  const selectedStatus = selectedTierData ? tierStatusFor(selectedTierData.id) : "locked";
  const canClaim = selectedStatus === "locked";

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !badge || !selectedTierData || !proofUrl.trim()) return;
    setSubmitting(true);

    const { error } = await (supabase as any).from("user_badges").insert({
      user_id: user.id,
      badge_tier_id: selectedTierData.id,
      proof_url: proofUrl.trim(),
      proof_notes: proofNotes.trim() || null,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Ya enviaste este tier", description: "Revisa tu perfil para ver el estado." });
      } else {
        toast({ title: "Error", description: "No se pudo enviar. Intenta de nuevo." });
      }
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D0C0A" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C75B39" }} />
      </div>
    );
  }

  if (!badge) return null;
  const Icon = getIcon(badge.icon_name);
  const catColor = badge.category === "bodyweight" ? "#7A8B5C" : badge.category === "olympic" ? "#C9A96E" : "#C75B39";

  // ── Success state ──
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0D0C0A" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: `${selectedColor}20` }}>
          <CheckCircle className="w-10 h-10" style={{ color: selectedColor }} />
        </div>
        <h1 className="font-display text-[24px] font-[800] text-center" style={{ color: "#FAF8F5", letterSpacing: "-0.03em" }}>
          Badge en revisión
        </h1>
        <p className="font-body text-[14px] text-center mt-2 max-w-xs leading-relaxed" style={{ color: "#8A8A8E" }}>
          Vamos a revisar tu video. Te notificaremos cuando sea aprobado.
        </p>
        <button
          onClick={() => navigate("/badges")}
          className="mt-8 flex items-center gap-2 font-display text-[13px] font-[700] px-6 py-3 rounded-xl"
          style={{ background: selectedColor, color: "#FAF8F5" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a Badges
        </button>
        <TabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "#0D0C0A" }}>
      {/* ── Header ── */}
      <div className="px-5 pt-14 pb-6">
        <button onClick={() => navigate("/badges")} className="flex items-center gap-1 mb-6" style={{ color: "#8A8A8E" }}>
          <ChevronLeft className="h-4 w-4" />
          <span className="font-body text-[13px]">Badges</span>
        </button>

        {/* Badge identity */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: `${catColor}15` }}>
            <Icon className="h-6 w-6" style={{ color: catColor }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[22px] font-[800]" style={{ color: "#FAF8F5", letterSpacing: "-0.03em" }}>
                {badge.name}
              </h1>
              <span className="rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider" style={{ background: `${catColor}15`, color: catColor }}>
                {badge.category}
              </span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] mt-0.5" style={{ color: "#8A8A8E" }}>
              {badge.exercise_name}
            </p>
            {badge.description && (
              <p className="font-body text-[13px] leading-relaxed mt-2" style={{ color: "#B0ACA7" }}>
                {badge.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tier selector ── */}
      <div className="px-5 mb-6">
        <p className="font-mono text-[9px] uppercase tracking-[2px] mb-3" style={{ color: "#8A8A8E" }}>Selecciona el nivel</p>
        <div className="space-y-3">
          {TIER_ORDER.map(t => {
            const tierData = badge.badge_tiers.find(bt => bt.tier === t);
            if (!tierData) return null;
            const color = TIER_COLORS[t] || "#888";
            const status = tierStatusFor(tierData.id);
            const isSelected = selectedTier === t;
            const isBodyweight = tierData.weight_male == null && tierData.weight_female == null;

            return (
              <button
                key={t}
                onClick={() => { if (status !== "approved") setSelectedTier(t); }}
                className="w-full text-left rounded-xl px-4 py-4 transition-all"
                style={{
                  background: isSelected ? `${color}12` : "rgba(255,255,255,0.03)",
                  border: isSelected ? `2px solid ${color}50` : "2px solid rgba(255,255,255,0.06)",
                  boxShadow: isSelected ? `0 0 24px ${color}15` : "none",
                  opacity: status === "approved" ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{
                    background: status === "approved" ? `${color}25` : status === "pending" ? "rgba(234,179,8,0.15)" : isSelected ? `${color}20` : "rgba(255,255,255,0.06)",
                  }}>
                    {status === "approved" ? (
                      <Check className="h-4 w-4" style={{ color }} strokeWidth={3} />
                    ) : status === "pending" ? (
                      <div className="h-3 w-3 rounded-full animate-pulse" style={{ background: "#EAB308" }} />
                    ) : (
                      <Award className="h-4 w-4" style={{ color: isSelected ? color : "#8A8A8E" }} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[15px] font-[700]" style={{ color: isSelected ? color : "#8A8A8E" }}>
                        {tierData.tier_label}
                      </span>
                      {status === "approved" && (
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>GANADO</span>
                      )}
                      {status === "pending" && (
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308" }}>EN REVISIÓN</span>
                      )}
                    </div>
                    <p className="font-body text-[11px] mt-0.5" style={{ color: "#666" }}>{TIER_DESCS[t]}</p>
                  </div>
                </div>

                {/* Weight/reps detail */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {isBodyweight ? (
                    <>
                      <div className="rounded-lg py-2 px-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "#8A8A8E" }}>Hombres</p>
                        <p className="font-mono text-[14px] font-bold mt-0.5" style={{ color: isSelected ? "#FAF8F5" : "#8A8A8E" }}>
                          {tierData.reps_male} rep{tierData.reps_male > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="rounded-lg py-2 px-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "#8A8A8E" }}>Mujeres</p>
                        <p className="font-mono text-[14px] font-bold mt-0.5" style={{ color: isSelected ? "#B0ACA7" : "#666" }}>
                          {tierData.reps_female} rep{tierData.reps_female > 1 ? "s" : ""}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg py-2 px-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "#8A8A8E" }}>Hombres</p>
                        <p className="font-mono text-[14px] font-bold mt-0.5" style={{ color: isSelected ? "#FAF8F5" : "#8A8A8E" }}>
                          {tierData.weight_male} kg <span className="text-[10px] font-normal" style={{ color: "#666" }}>x{tierData.reps_male}</span>
                        </p>
                      </div>
                      <div className="rounded-lg py-2 px-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "#8A8A8E" }}>Mujeres</p>
                        <p className="font-mono text-[14px] font-bold mt-0.5" style={{ color: isSelected ? "#B0ACA7" : "#666" }}>
                          {tierData.weight_female} kg <span className="text-[10px] font-normal" style={{ color: "#666" }}>x{tierData.reps_female}</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fun fact ── */}
      {badge.fun_fact && (
        <div className="mx-5 mb-6 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${catColor}40` }}>
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: catColor }} />
            <p className="font-body text-[12px] leading-relaxed" style={{ color: "#B0ACA7" }}>
              {badge.fun_fact}
            </p>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      {canClaim ? (
        <form onSubmit={handleSubmit} className="px-5 space-y-5">
          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          <p className="font-mono text-[9px] uppercase tracking-[2px]" style={{ color: "#8A8A8E" }}>Envía tu prueba</p>

          {/* Video link */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-body text-[13px] font-medium" style={{ color: "#FAF8F5" }}>
              <LinkIcon className="w-4 h-4" style={{ color: "#8A8A8E" }} />
              Link del video
            </label>
            <input
              type="url"
              required
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full font-body text-[13px] rounded-xl px-4 py-3 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid rgba(255,255,255,0.1)`,
                color: "#FAF8F5",
              }}
            />
            <p className="font-body text-[11px] leading-relaxed" style={{ color: "#666" }}>
              Sube tu video a Instagram taggeando @liftory.app o pega un link de YouTube/Google Drive
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-body text-[13px] font-medium" style={{ color: "#FAF8F5" }}>
              <FileText className="w-4 h-4" style={{ color: "#8A8A8E" }} />
              Notas adicionales (opcional)
            </label>
            <textarea
              value={proofNotes}
              onChange={e => setProofNotes(e.target.value)}
              rows={3}
              placeholder="Cualquier detalle que quieras agregar..."
              className="w-full font-body text-[13px] rounded-xl px-4 py-3 focus:outline-none resize-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#FAF8F5",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !proofUrl.trim()}
            className="w-full flex items-center justify-center gap-2 font-display text-[13px] font-[700] py-4 rounded-xl transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ background: selectedColor, color: "#FAF8F5" }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar {selectedTierData?.tier_label} para revisión
              </>
            )}
          </button>
        </form>
      ) : selectedStatus === "pending" ? (
        <div className="mx-5 rounded-xl py-4 text-center" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
          <p className="font-display text-[13px] font-[700]" style={{ color: "#EAB308" }}>Este tier ya está en revisión</p>
          <p className="font-body text-[11px] mt-1" style={{ color: "#8A8A8E" }}>Te notificaremos cuando sea aprobado.</p>
        </div>
      ) : (
        <div className="mx-5 rounded-xl py-4 text-center" style={{ background: "rgba(122,139,92,0.08)", border: "1px solid rgba(122,139,92,0.2)" }}>
          <p className="font-display text-[13px] font-[700]" style={{ color: "#7A8B5C" }}>Este tier ya fue aprobado</p>
          <p className="font-body text-[11px] mt-1" style={{ color: "#8A8A8E" }}>Selecciona otro nivel para reclamar.</p>
        </div>
      )}

      <TabBar />
    </div>
  );
}
