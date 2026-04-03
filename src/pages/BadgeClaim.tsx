import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Send,
  Link as LinkIcon,
  FileText,
  Award,
  CheckCircle,
  Loader2,
  Lightbulb,
  Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Tier = "longevity" | "excelente" | "elite";

interface BadgeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fun_fact: string | null;
  tiers: {
    longevity?: TierInfo;
    excelente?: TierInfo;
    elite?: TierInfo;
  };
}

interface TierInfo {
  label: string;
  male_kg: number;
  male_reps: number;
  female_kg: number;
  female_reps: number;
}

const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string; accent: string }> = {
  longevity: {
    bg: "bg-[#7A8B5C]/10",
    text: "text-[#7A8B5C]",
    border: "border-[#7A8B5C]/30",
    accent: "#7A8B5C",
  },
  excelente: {
    bg: "bg-[#C9A96E]/10",
    text: "text-[#C9A96E]",
    border: "border-[#C9A96E]/30",
    accent: "#C9A96E",
  },
  elite: {
    bg: "bg-[#C75B39]/10",
    text: "text-[#C75B39]",
    border: "border-[#C75B39]/30",
    accent: "#C75B39",
  },
};

const TIER_LABELS: Record<Tier, string> = {
  longevity: "Longevity",
  excelente: "Excelente",
  elite: "Elite",
};

export default function BadgeClaim() {
  const { slug, tier } = useParams<{ slug: string; tier: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [badge, setBadge] = useState<BadgeDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");

  const currentTier = (tier as Tier) || "longevity";
  const colors = TIER_COLORS[currentTier] || TIER_COLORS.longevity;

  useEffect(() => {
    if (!slug) return;

    const fetchBadge = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("badge_definitions")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "No se encontró el badge." });
        navigate("/badges");
        return;
      }

      setBadge(data as unknown as BadgeDefinition);
      setLoading(false);
    };

    fetchBadge();
  }, [slug, navigate]);

  const tierInfo = badge?.tiers?.[currentTier] ?? null;
  const isFemale = profile?.gender === "female" || profile?.gender === "F";
  const requiredKg = tierInfo ? (isFemale ? tierInfo.female_kg : tierInfo.male_kg) : null;
  const requiredReps = tierInfo ? (isFemale ? tierInfo.female_reps : tierInfo.male_reps) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !badge || !proofUrl.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from("user_badges").insert({
      user_id: user.id,
      badge_definition_id: badge.id,
      tier: currentTier,
      proof_url: proofUrl.trim(),
      proof_notes: proofNotes.trim() || null,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: "No se pudo enviar. Intenta de nuevo." });
      return;
    }

    setSubmitted(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#7A8B5C]" />
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout>
        <div className="px-5 pt-14 pb-8 max-w-lg mx-auto">
          <div className="flex flex-col items-center text-center mt-16 space-y-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${colors.accent}20` }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: colors.accent }} />
            </div>

            <div className="space-y-2">
              <h1 className="font-display font-[800] text-2xl tracking-[-0.03em] text-foreground">
                Badge en revision
              </h1>
              <p className="font-body text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                Tu badge esta en revision. Te notificaremos cuando sea aprobado.
              </p>
            </div>

            <button
              onClick={() => navigate("/badges")}
              className="mt-4 flex items-center gap-2 font-body font-medium text-sm px-6 py-3 rounded-xl transition-colors"
              style={{ backgroundColor: colors.accent, color: "#fff" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Badges
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/badges")}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display font-[800] text-xl tracking-[-0.03em] text-foreground">
              Reclamar Badge
            </h1>
            <p className="font-body text-xs text-muted-foreground">
              Envia tu prueba para verificacion
            </p>
          </div>
        </div>

        {/* Badge Preview Card */}
        <div
          className={`rounded-2xl border p-5 mb-6 ${colors.bg} ${colors.border}`}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${colors.accent}25` }}
            >
              <Shield className="w-7 h-7" style={{ color: colors.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${colors.accent}20`,
                    color: colors.accent,
                  }}
                >
                  {TIER_LABELS[currentTier]}
                </span>
              </div>
              <h2 className="font-display font-[800] text-lg tracking-[-0.03em] text-foreground leading-tight">
                {badge?.name}
              </h2>
              {badge?.description && (
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {badge.description}
                </p>
              )}
            </div>
          </div>

          {/* Requirements */}
          {tierInfo && (
            <div
              className="mt-4 p-3 rounded-xl bg-background/60 border border-border/50"
            >
              <p className="font-body text-xs font-medium text-muted-foreground mb-1">
                Requisitos ({isFemale ? "Mujer" : "Hombre"})
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4" style={{ color: colors.accent }} />
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {requiredKg} kg
                  </span>
                </div>
                <span className="text-muted-foreground/40 font-body">x</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {requiredReps} reps
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fun Fact Motivation */}
        {badge?.fun_fact && (
          <div className="rounded-xl border border-[#C9A96E]/20 bg-[#C9A96E]/5 p-4 mb-6 flex gap-3">
            <Lightbulb className="w-5 h-5 text-[#C9A96E] shrink-0 mt-0.5" />
            <p className="font-body text-xs text-muted-foreground leading-relaxed">
              {badge.fun_fact}
            </p>
          </div>
        )}

        {/* Claim Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Proof URL */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-body text-sm font-medium text-foreground">
              <LinkIcon className="w-4 h-4 text-muted-foreground" />
              Link del video
            </label>
            <input
              type="url"
              required
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full font-body text-sm bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-shadow"
              style={{ focusRingColor: colors.accent } as React.CSSProperties}
            />
            <p className="font-body text-[11px] text-muted-foreground leading-relaxed">
              Sube tu video a Instagram taggeando @liftory.app o pega un link de YouTube/Google Drive
            </p>
          </div>

          {/* Proof Notes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 font-body text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Notas adicionales (opcional)
            </label>
            <textarea
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              rows={3}
              placeholder="Cualquier detalle que quieras agregar..."
              className="w-full font-body text-sm bg-card border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none transition-shadow"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !proofUrl.trim()}
            className="w-full flex items-center justify-center gap-2 font-body font-semibold text-sm text-white py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ backgroundColor: colors.accent }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar para revision
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
