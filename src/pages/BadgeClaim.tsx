import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, Send, Award, Camera,
  CheckCircle, Loader2, X, Video, Eye, Dumbbell,
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

export default function BadgeClaim() {
  const { slug, tier: urlTier } = useParams<{ slug: string; tier: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [userStatuses, setUserStatuses] = useState<UserBadgeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        toast({ title: "Error", description: "No se encontro el badge." });
        navigate("/badges");
        return;
      }

      const sorted = {
        ...data,
        badge_tiers: (data.badge_tiers || []).sort(
          (a: TierData, b: TierData) => a.sort_order - b.sort_order
        ),
      };
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

  // ── Derived data ──
  const selectedTier = urlTier || "longevity";
  const selectedTierData = badge?.badge_tiers.find(
    (t) => t.tier === selectedTier
  );
  const selectedColor = selectedTierData?.color || "#C75B39";
  const selectedStatus = selectedTierData
    ? (userStatuses.find((u) => u.badge_tier_id === selectedTierData.id)
        ?.status as "pending" | "approved" | "rejected" | undefined) ?? "locked"
    : "locked";
  const canClaim = selectedStatus === "locked" || selectedStatus === "rejected";

  // Gender-aware metric text
  const gender = profile?.gender as "male" | "female" | null;
  const metricText = (() => {
    if (!selectedTierData || !gender) return "";
    const isBodyweight =
      selectedTierData.weight_male == null &&
      selectedTierData.weight_female == null;
    const w =
      gender === "male"
        ? selectedTierData.weight_male
        : selectedTierData.weight_female;
    const r =
      gender === "male"
        ? selectedTierData.reps_male
        : selectedTierData.reps_female;
    if (isBodyweight) return `${r} reps`;
    return `${w} kg x ${r} reps`;
  })();

  // ── Handle video selection ──
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Video demasiado grande",
        description: "El video no puede pesar mas de 50MB.",
      });
      return;
    }

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Formato no soportado",
        description: "Solo se aceptan archivos de video.",
      });
      return;
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!user || !badge || !selectedTierData || !videoFile) return;
    setSubmitting(true);
    setUploadProgress(0);

    try {
      const ext = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
      const storagePath = `${user.id}/${selectedTierData.id}.${ext}`;

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 8, 85));
      }, 300);

      const { error: uploadError } = await supabase.storage
        .from("badge-videos")
        .upload(storagePath, videoFile, {
          upsert: true,
          contentType: videoFile.type,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        toast({
          title: "Error al subir video",
          description: uploadError.message,
        });
        setSubmitting(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(90);

      const {
        data: { publicUrl },
      } = supabase.storage.from("badge-videos").getPublicUrl(storagePath);

      // Check if there's an existing rejected claim to update (resubmission)
      const { data: existing } = await (supabase as any)
        .from("user_badges")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("badge_tier_id", selectedTierData.id)
        .maybeSingle();

      let error: any = null;

      if (existing && existing.status === "rejected") {
        // Resubmission — update the rejected claim back to pending
        const result = await (supabase as any)
          .from("user_badges")
          .update({
            proof_url: publicUrl,
            proof_notes: null,
            status: "pending",
            reviewed_at: null,
            reviewed_by: null,
            review_notes: null,
            earned_at: null,
          })
          .eq("id", existing.id);
        error = result.error;
      } else if (existing) {
        // Already pending or approved — don't allow duplicate
        toast({
          title: "Ya enviaste este tier",
          description: "Revisa tu perfil para ver el estado.",
        });
        setSubmitting(false);
        setUploadProgress(0);
        return;
      } else {
        // First submission — insert new claim
        const result = await (supabase as any).from("user_badges").insert({
          user_id: user.id,
          badge_tier_id: selectedTierData.id,
          proof_url: publicUrl,
          proof_notes: null,
          status: "pending",
        });
        error = result.error;
      }

      setUploadProgress(100);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo enviar. Intenta de nuevo.",
        });
        setSubmitting(false);
        setUploadProgress(0);
        return;
      }

      // Notify admin (non-blocking — don't await)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        fetch(`${supabaseUrl}/functions/v1/notify-badge-submission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athleteName: profile?.display_name || user.email,
            athleteEmail: user.email,
            badgeName: badge.name,
            tierLabel: selectedTierData.tier_label,
            videoUrl: publicUrl,
          }),
        }).catch(() => {}); // fire and forget
      }

      setSubmitted(true);
    } catch {
      toast({
        title: "Error",
        description: "Algo salio mal. Intenta de nuevo.",
      });
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0D0C0A" }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: selectedColor }}
        />
      </div>
    );
  }

  if (!badge) return null;

  // ── Success state ──
  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "#0D0C0A" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: `${selectedColor}20` }}
        >
          <CheckCircle
            className="w-10 h-10"
            style={{ color: selectedColor }}
          />
        </div>
        <h1
          className="font-display text-[24px] font-[800] text-center"
          style={{ color: "#FAF8F5", letterSpacing: "-0.03em" }}
        >
          Badge en revision
        </h1>
        <p
          className="font-body text-[14px] text-center mt-2 max-w-xs leading-relaxed"
          style={{ color: "#8A8A8E" }}
        >
          Tu video fue enviado. Te notificaremos cuando sea aprobado.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-8 flex items-center gap-2 font-display text-[13px] font-[700] px-6 py-3 rounded-xl"
          style={{ background: selectedColor, color: "#FAF8F5" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <TabBar />
      </div>
    );
  }

  // ── Already claimed states ──
  if (!canClaim) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "#0D0C0A" }}
      >
        {selectedStatus === "pending" ? (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(234,179,8,0.1)" }}
            >
              <Loader2
                className="w-7 h-7 animate-spin"
                style={{ color: "#EAB308" }}
              />
            </div>
            <h1
              className="font-display text-[20px] font-[800] text-center"
              style={{ color: "#FAF8F5", letterSpacing: "-0.03em" }}
            >
              En revision
            </h1>
            <p
              className="font-body text-[13px] text-center mt-2"
              style={{ color: "#8A8A8E" }}
            >
              Ya enviaste tu video para{" "}
              <span style={{ color: selectedColor }}>
                {selectedTierData?.tier_label}
              </span>
              . Te notificaremos pronto.
            </p>
          </>
        ) : (
          <>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: `${selectedColor}15` }}
            >
              <Award
                className="w-7 h-7"
                style={{ color: selectedColor }}
              />
            </div>
            <h1
              className="font-display text-[20px] font-[800] text-center"
              style={{ color: selectedColor, letterSpacing: "-0.03em" }}
            >
              Badge ganado
            </h1>
            <p
              className="font-body text-[13px] text-center mt-2"
              style={{ color: "#8A8A8E" }}
            >
              Ya tienes {selectedTierData?.tier_label} aprobado.
            </p>
          </>
        )}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 flex items-center gap-2 font-body text-[13px] px-5 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#8A8A8E",
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <TabBar />
      </div>
    );
  }

  // ── Main claim flow — IG-story style ──
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0D0C0A" }}
    >
      {/* Compact header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="h-4 w-4" style={{ color: "#FAF8F5" }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="font-display text-[16px] font-[800] truncate"
            style={{ color: "#FAF8F5", letterSpacing: "-0.03em" }}
          >
            {badge.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="font-mono text-[10px] uppercase tracking-wider font-bold"
              style={{ color: selectedColor }}
            >
              {selectedTierData?.tier_label}
            </span>
            {metricText && (
              <>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: "#444" }}
                >
                  /
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: "#8A8A8E" }}
                >
                  {metricText}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Video area (full-width, camera-first) ── */}
      <div className="flex-1 flex flex-col px-4 pb-4">
        {/* Hidden file input for CAMERA (with capture) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/mov,.mp4,.mov,.webm"
          capture="environment"
          className="hidden"
          onChange={handleVideoSelect}
        />
        {/* Hidden file input for LIBRARY (without capture) */}
        <input
          ref={libraryInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/mov,.mp4,.mov,.webm"
          className="hidden"
          onChange={handleVideoSelect}
        />

        {!videoFile ? (
          /* ── No video yet — two options ── */
          <div className="flex-1 flex flex-col">
            {/* Record / Upload area */}
            <div
              className="flex-1 flex flex-col items-center justify-center gap-5 rounded-2xl"
              style={{
                background: `${selectedColor}08`,
                border: `2px dashed ${selectedColor}30`,
                minHeight: 280,
              }}
            >
              <div className="text-center px-6">
                <p
                  className="font-display text-[16px] font-[800]"
                  style={{
                    color: "#FAF8F5",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Envia tu video
                </p>
                <p
                  className="font-body text-[12px] mt-1"
                  style={{ color: "#666" }}
                >
                  MP4, MOV o WebM — max 50MB
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Record button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl px-5 py-4 transition-all active:scale-[0.97]"
                  style={{
                    background: `${selectedColor}12`,
                    border: `1.5px solid ${selectedColor}25`,
                    minWidth: 120,
                  }}
                >
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ background: `${selectedColor}20` }}
                  >
                    <Camera
                      className="h-6 w-6"
                      style={{ color: selectedColor }}
                    />
                  </div>
                  <span
                    className="font-mono text-[11px] uppercase tracking-wider font-medium"
                    style={{ color: selectedColor }}
                  >
                    Grabar
                  </span>
                </button>

                <span
                  className="font-mono text-[10px] uppercase"
                  style={{ color: "#555" }}
                >
                  o
                </span>

                {/* Upload from library button */}
                <button
                  type="button"
                  onClick={() => libraryInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl px-5 py-4 transition-all active:scale-[0.97]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1.5px solid rgba(255,255,255,0.08)",
                    minWidth: 120,
                  }}
                >
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Video
                      className="h-6 w-6"
                      style={{ color: "#8A8A8E" }}
                    />
                  </div>
                  <span
                    className="font-mono text-[11px] uppercase tracking-wider font-medium"
                    style={{ color: "#8A8A8E" }}
                  >
                    Subir
                  </span>
                </button>
              </div>
            </div>

            {/* Tips — compact, non-intrusive */}
            <div
              className="mt-3 rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <p
                className="font-mono text-[9px] uppercase tracking-[1.5px]"
                style={{ color: "#555" }}
              >
                Tips para aprobacion rapida
              </p>
              <div className="flex items-start gap-2.5">
                <Video
                  className="h-3.5 w-3.5 shrink-0 mt-px"
                  style={{ color: "#555" }}
                />
                <p
                  className="font-body text-[11px] leading-snug"
                  style={{ color: "#777" }}
                >
                  Muestra el movimiento completo de inicio a fin
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Eye
                  className="h-3.5 w-3.5 shrink-0 mt-px"
                  style={{ color: "#555" }}
                />
                <p
                  className="font-body text-[11px] leading-snug"
                  style={{ color: "#777" }}
                >
                  Grabate desde un angulo lateral, no de frente
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Dumbbell
                  className="h-3.5 w-3.5 shrink-0 mt-px"
                  style={{ color: "#555" }}
                />
                <p
                  className="font-body text-[11px] leading-snug"
                  style={{ color: "#777" }}
                >
                  Que se vea el peso usado (kg o lbs) en la barra
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Video selected — preview + send ── */
          <div className="flex-1 flex flex-col">
            {/* Video preview */}
            <div
              className="relative flex-1 rounded-2xl overflow-hidden"
              style={{ background: "#111", minHeight: 280 }}
            >
              <video
                src={videoPreview || undefined}
                className="w-full h-full object-contain rounded-2xl"
                style={{ maxHeight: 400 }}
                controls
                playsInline
                muted
                autoPlay
              />
              {/* Remove video button */}
              <button
                type="button"
                onClick={clearVideo}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                <X className="h-4 w-4" style={{ color: "#FAF8F5" }} />
              </button>
            </div>

            {/* Upload progress bar */}
            {submitting && (
              <div className="mt-3">
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                      background: selectedColor,
                    }}
                  />
                </div>
                <p
                  className="font-mono text-[10px] text-right mt-1"
                  style={{ color: selectedColor }}
                >
                  {uploadProgress}%
                </p>
              </div>
            )}

            {/* Send button — prominent, one tap */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-3 w-full flex items-center justify-center gap-2.5 font-display text-[14px] font-[800] py-4 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: selectedColor,
                color: "#FAF8F5",
                letterSpacing: "-0.02em",
              }}
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

            {/* Change video link */}
            {!submitting && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full py-2 font-body text-[12px]"
                style={{ color: "#666" }}
              >
                Elegir otro video
              </button>
            )}
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
