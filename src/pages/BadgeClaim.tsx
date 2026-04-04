import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, Send, FileText, Award, Upload,
  CheckCircle, Loader2, Info, Check, Zap, Crown, ChevronsUp,
  ArrowUpCircle, Flame, Anchor, Rocket, Target, Shield, TrendingUp, Star, X,
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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserBadgeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>(urlTier || "longevity");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [proofNotes, setProofNotes] = useState("");

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Cleanup video preview URL
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  // ── Helpers ──
  function getIcon(n: string | null) { return n ? (ICON_MAP[n.toLowerCase()] ?? Award) : Award; }

  function tierStatusFor(tierId: string): "locked" | "pending" | "approved" {
    const s = userStatuses.find(u => u.badge_tier_id === tierId);
    if (!s) return "locked";
    return s.status as "pending" | "approved";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const selectedTierData = badge?.badge_tiers.find(t => t.tier === selectedTier);
  const selectedColor = TIER_COLORS[selectedTier] || "#C75B39";
  const selectedStatus = selectedTierData ? tierStatusFor(selectedTierData.id) : "locked";
  const canClaim = selectedStatus === "locked";

  // ── Handle video selection ──
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Video demasiado grande", description: "El video no puede pesar más de 50MB." });
      return;
    }

    if (!file.type.startsWith("video/")) {
      toast({ title: "Formato no soportado", description: "Solo se aceptan archivos de video." });
      return;
    }

    // Clean up previous preview
    if (videoPreview) URL.revokeObjectURL(videoPreview);

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !badge || !selectedTierData || !videoFile) return;
    setSubmitting(true);
    setUploadProgress(0);

    try {
      // 1. Upload video to Supabase Storage
      const ext = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
      const storagePath = `${user.id}/${selectedTierData.id}.${ext}`;

      // Simulate progress since supabase-js doesn't expose upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 8, 85));
      }, 300);

      const { error: uploadError } = await supabase.storage
        .from("badge-videos")
        .upload(storagePath, videoFile, {
          upsert: true,
          contentType: videoFile.type,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        toast({ title: "Error al subir video", description: uploadError.message });
        setSubmitting(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(90);

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("badge-videos")
        .getPublicUrl(storagePath);

      // 3. Insert badge claim with video URL
      const { error } = await (supabase as any).from("user_badges").insert({
        user_id: user.id,
        badge_tier_id: selectedTierData.id,
        proof_url: publicUrl,
        proof_notes: proofNotes.trim() || null,
        status: "pending",
      });

      setUploadProgress(100);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Ya enviaste este tier", description: "Revisa tu perfil para ver el estado." });
        } else {
          toast({ title: "Error", description: "No se pudo enviar. Intenta de nuevo." });
        }
        setSubmitting(false);
        setUploadProgress(0);
        return;
      }

      setSubmitted(true);
    } catch {
      toast({ title: "Error", description: "Algo salió mal. Intenta de nuevo." });
      setSubmitting(false);
      setUploadProgress(0);
    }
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
          Tu video fue subido correctamente. Lo revisaremos y te notificaremos cuando sea aprobado.
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

      {/* ── Tier cards (horizontal scroll) ── */}
      <div className="px-5 mb-6">
        <p className="font-mono text-[9px] uppercase tracking-[2px] mb-4" style={{ color: "#8A8A8E" }}>Selecciona el nivel</p>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
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
                className="shrink-0 flex flex-col rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
                style={{
                  width: "calc(33.333% - 8px)",
                  minWidth: 140,
                  background: "#161614",
                  border: isSelected ? `2px solid ${color}60` : "2px solid rgba(255,255,255,0.06)",
                  boxShadow: isSelected ? `0 4px 30px ${color}20` : "none",
                  opacity: status === "approved" ? 0.5 : 1,
                }}
              >
                {/* Top accent */}
                <div className="h-[3px]" style={{ background: isSelected ? color : `${color}30` }} />

                {/* Card body */}
                <div className="flex flex-col items-center text-center px-3 pt-4 pb-4 flex-1">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full mb-3"
                    style={{ background: isSelected ? `${color}20` : "rgba(255,255,255,0.06)" }}
                  >
                    {status === "approved" ? (
                      <Check className="h-5 w-5" style={{ color }} strokeWidth={3} />
                    ) : status === "pending" ? (
                      <div className="h-3.5 w-3.5 rounded-full animate-pulse" style={{ background: "#EAB308" }} />
                    ) : (
                      <Award className="h-5 w-5" style={{ color: isSelected ? color : "#8A8A8E" }} />
                    )}
                  </div>

                  <span className="font-display text-[13px] font-[800]" style={{ color: isSelected ? color : "#8A8A8E", letterSpacing: "-0.02em" }}>
                    {tierData.tier_label}
                  </span>

                  {status === "approved" && (
                    <span className="font-mono text-[8px] px-2 py-0.5 rounded-full mt-1.5" style={{ background: `${color}20`, color }}>GANADO</span>
                  )}
                  {status === "pending" && (
                    <span className="font-mono text-[8px] px-2 py-0.5 rounded-full mt-1.5" style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308" }}>EN REVISIÓN</span>
                  )}
                  {status === "locked" && (
                    <span className="font-body text-[9px] mt-1.5 leading-tight" style={{ color: "#666" }}>
                      {TIER_DESCS[t]?.split(".")[0]}
                    </span>
                  )}

                  <div className="w-full h-px my-3" style={{ background: "rgba(255,255,255,0.06)" }} />

                  {isBodyweight ? (
                    <div className="w-full space-y-1.5">
                      <div className="flex justify-between items-baseline px-1">
                        <span className="font-mono text-[8px] uppercase" style={{ color: "#8A8A8E" }}>H</span>
                        <span className="font-mono text-[15px] font-bold" style={{ color: isSelected ? "#FAF8F5" : "#8A8A8E" }}>
                          {tierData.reps_male} <span className="text-[10px] font-normal">rep{tierData.reps_male > 1 ? "s" : ""}</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline px-1">
                        <span className="font-mono text-[8px] uppercase" style={{ color: "#8A8A8E" }}>M</span>
                        <span className="font-mono text-[15px] font-bold" style={{ color: isSelected ? "#B0ACA7" : "#666" }}>
                          {tierData.reps_female} <span className="text-[10px] font-normal">rep{tierData.reps_female > 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-1.5">
                      <div className="flex justify-between items-baseline px-1">
                        <span className="font-mono text-[8px] uppercase" style={{ color: "#8A8A8E" }}>H</span>
                        <span className="font-mono text-[15px] font-bold" style={{ color: isSelected ? "#FAF8F5" : "#8A8A8E" }}>
                          {tierData.weight_male} <span className="text-[10px] font-normal">kg x{tierData.reps_male}</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline px-1">
                        <span className="font-mono text-[8px] uppercase" style={{ color: "#8A8A8E" }}>M</span>
                        <span className="font-mono text-[15px] font-bold" style={{ color: isSelected ? "#B0ACA7" : "#666" }}>
                          {tierData.weight_female} <span className="text-[10px] font-normal">kg x{tierData.reps_female}</span>
                        </span>
                      </div>
                    </div>
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

          <p className="font-mono text-[9px] uppercase tracking-[2px]" style={{ color: "#8A8A8E" }}>Sube tu video</p>

          {/* Video upload area */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/mov,.mp4,.mov,.webm"
              className="hidden"
              onChange={handleVideoSelect}
            />

            {!videoFile ? (
              /* Upload dropzone */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl py-10 transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "2px dashed rgba(255,255,255,0.12)",
                }}
              >
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: `${selectedColor}15` }}
                >
                  <Upload className="h-6 w-6" style={{ color: selectedColor }} />
                </div>
                <div className="text-center">
                  <p className="font-body text-[14px] font-medium" style={{ color: "#FAF8F5" }}>
                    Toca para grabar o elegir video
                  </p>
                  <p className="font-body text-[11px] mt-1" style={{ color: "#666" }}>
                    MP4, MOV o WebM — máx. 50MB
                  </p>
                </div>
              </button>
            ) : (
              /* Video preview */
              <div className="relative rounded-2xl overflow-hidden" style={{ background: "#161614" }}>
                <video
                  src={videoPreview || undefined}
                  className="w-full rounded-2xl"
                  style={{ maxHeight: 280 }}
                  controls
                  playsInline
                  muted
                />
                {/* File info bar */}
                <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] truncate" style={{ color: "#B0ACA7" }}>
                      {videoFile.name}
                    </p>
                    <p className="font-mono text-[9px]" style={{ color: "#666" }}>
                      {formatFileSize(videoFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="ml-2 h-7 w-7 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <X className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
                  </button>
                </div>
              </div>
            )}

            <p className="font-body text-[11px] leading-relaxed" style={{ color: "#666" }}>
              Graba tu lift completo mostrando el peso en la barra. El video será revisado antes de publicarse.
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
              rows={2}
              placeholder="Peso usado, contexto del lift..."
              className="w-full font-body text-[13px] rounded-xl px-4 py-3 focus:outline-none resize-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#FAF8F5",
              }}
            />
          </div>

          {/* Upload progress */}
          {submitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>Subiendo video...</span>
                <span className="font-mono text-[10px]" style={{ color: selectedColor }}>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, background: selectedColor }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !videoFile}
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
