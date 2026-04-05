import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, X, ChevronRight } from "lucide-react";
import type { BadgeMatch } from "@/hooks/useBadgeDetection";
import { dismissBadgeNotification } from "@/hooks/useBadgeDetection";

interface Props {
  match: BadgeMatch | null;
  onDismiss: () => void;
}

export default function BadgeQualificationToast({ match, onDismiss }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      dismissRef.current();
    }, 300);
  }, []);

  // Show animation when match arrives
  useEffect(() => {
    if (match) {
      setExiting(false);
      setVisible(false);
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
  }, [match, dismiss]);

  if (!match) return null;

  const handleClaim = () => {
    dismiss();
    navigate(`/badges/claim/${match.badgeSlug}/${match.tier}`);
  };

  const handleDismissPermanently = () => {
    dismissBadgeNotification(match.badgeId, match.tier);
    dismiss();
  };

  // Build description text
  const weightText =
    match.requiredWeight != null ? `${match.requiredWeight} kg` : "";
  const repsText = match.requiredReps ? `${match.requiredReps} reps` : "";
  const separator = weightText && repsText ? " x " : "";
  const description = `${weightText}${separator}${repsText} en ${match.exerciseName}`;

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
        className="relative w-full max-w-md rounded-2xl border p-4 shadow-xl"
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

        <div className="flex items-start gap-3 pr-6">
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
              {description} — nivel{" "}
              <span style={{ color: match.tierColor }} className="font-medium">
                {match.tierLabel}
              </span>
            </p>

            {/* Actions row */}
            <div className="mt-2.5 flex items-center gap-3">
              {/* CTA */}
              <button
                onClick={handleClaim}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-body text-[12px] font-medium transition-all active:scale-[0.97]"
                style={{
                  background: match.tierColor + "20",
                  color: match.tierColor,
                }}
              >
                Sube tu video
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {/* Permanent dismiss */}
              <button
                onClick={handleDismissPermanently}
                className="font-body text-[11px] transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                No me interesa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
