import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, X, ChevronRight } from "lucide-react";
import type { BadgeMatch } from "@/hooks/useBadgeDetection";

interface Props {
  match: BadgeMatch | null;
  onDismiss: () => void;
}

export default function BadgeQualificationToast({ match, onDismiss }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (match) {
      // Slight delay so animation triggers after mount
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      setExiting(false);
    }
  }, [match]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!match) return;
    const t = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(t);
  }, [match]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss();
    }, 300);
  };

  if (!match) return null;

  const handleClaim = () => {
    dismiss();
    navigate(`/badges/claim/${match.badgeSlug}/${match.tier}`);
  };

  return (
    <div
      className="fixed left-0 right-0 z-[75] flex justify-center px-4"
      style={{
        bottom: "100px",
        transition: "transform 0.3s ease, opacity 0.3s ease",
        transform: visible && !exiting ? "translateY(0)" : "translateY(20px)",
        opacity: visible && !exiting ? 1 : 0,
        pointerEvents: visible && !exiting ? "auto" : "none",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-4 shadow-xl"
        style={{
          background: "#1a1a1a",
          borderColor: match.tierColor + "40",
        }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="h-3 w-3 text-white/60" />
        </button>

        <div className="flex items-start gap-3">
          {/* Trophy icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: match.tierColor + "20" }}
          >
            <Trophy className="h-5 w-5" style={{ color: match.tierColor }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-display text-[13px] font-[700] tracking-[-0.03em] text-white/90">
              Calificaste para un badge
            </p>
            <p className="mt-0.5 font-body text-[12px] text-white/50 leading-tight">
              {match.requiredWeight != null ? `${match.requiredWeight} kg` : ""}{match.requiredWeight != null && match.requiredReps ? " x " : ""}{match.requiredReps ? `${match.requiredReps} reps` : ""} en {match.exerciseName} — nivel{" "}
              <span style={{ color: match.tierColor }} className="font-medium">
                {match.tierLabel}
              </span>
            </p>

            {/* CTA */}
            <button
              onClick={handleClaim}
              className="mt-2.5 flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-body text-[12px] font-medium transition-all active:scale-[0.97]"
              style={{
                background: match.tierColor + "20",
                color: match.tierColor,
              }}
            >
              Sube tu video para reclamar
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
