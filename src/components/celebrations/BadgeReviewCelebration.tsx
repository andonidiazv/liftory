import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, RefreshCw, Share2, Loader2 } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { getBadgeIcon } from "@/lib/badgeIcons";
import { useShareBadgeCard } from "@/hooks/useShareBadgeCard";
import BadgeShareCard from "@/components/share/BadgeShareCard";
import type { BadgeReviewNotification } from "@/hooks/useBadgeReviewNotification";

interface Props {
  notification: BadgeReviewNotification | null;
  onDismiss: () => void;
  onCheckNext: () => void;
}

export default function BadgeReviewCelebration({ notification, onDismiss, onCheckNext }: Props) {
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const { cardRef, sharing, share, cardData, athleteName, avatarUrl } = useShareBadgeCard();

  // Animate in when notification arrives
  useEffect(() => {
    if (notification) {
      setExiting(false);
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      setExiting(false);
    }
  }, [notification]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss();
      // After dismiss animation, check for next review
      setTimeout(() => onCheckNext(), 200);
    }, 400);
  }, [onDismiss, onCheckNext]);

  const handleViewBadges = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss();
      navigate("/badges");
    }, 300);
  }, [onDismiss, navigate]);

  const handleResubmit = useCallback(() => {
    if (!notification) return;
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss();
      navigate(`/badges/claim/${notification.badgeSlug}/${notification.tier}`);
    }, 300);
  }, [notification, onDismiss, navigate]);

  const handleShare = useCallback(() => {
    if (!notification) return;
    share({
      badgeName: notification.badgeName,
      tierLabel: notification.tierLabel,
      tierColor: notification.tierColor,
      exerciseName: notification.exerciseName,
      iconName: notification.iconName,
    });
  }, [notification, share]);

  if (!notification) return null;

  const Icon = getBadgeIcon(notification.iconName);
  const isApproved = notification.status === "approved";

  return (
    <>
      <div
        className="fixed inset-0 z-[72] flex items-center justify-center px-6"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          transition: "opacity 0.4s ease",
          opacity: visible && !exiting ? 1 : 0,
          pointerEvents: visible && !exiting ? "auto" : "none",
        }}
        onClick={handleDismiss}
      >
        <div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background: t.card,
            border: `1px solid ${isApproved ? notification.tierColor + "40" : "rgba(239,68,68,0.3)"}`,
            boxShadow: isApproved
              ? `0 0 60px ${notification.tierColor}20, 0 20px 60px rgba(0,0,0,0.5)`
              : "0 20px 60px rgba(0,0,0,0.5)",
            transition: "transform 0.4s ease, opacity 0.4s ease",
            transform: visible && !exiting ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
            opacity: visible && !exiting ? 1 : 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div
            className="h-1"
            style={{
              background: isApproved
                ? `linear-gradient(90deg, ${notification.tierColor}, ${notification.tierColor}60)`
                : "linear-gradient(90deg, #EF4444, #EF444460)",
            }}
          />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(61,43,36,0.08)" }}
          >
            <X className="h-3.5 w-3.5" style={{ color: t.muted }} />
          </button>

          <div className="px-6 pt-8 pb-6 text-center">
            {/* Icon */}
            {isApproved ? (
              <>
                {/* Glow rings */}
                <div className="relative mx-auto mb-5" style={{ width: 88, height: 88 }}>
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background: `${notification.tierColor}10`,
                      animationDuration: "2s",
                    }}
                  />
                  <div
                    className="absolute inset-2 rounded-full"
                    style={{ border: `1.5px solid ${notification.tierColor}20`, background: `${notification.tierColor}08` }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center"
                      style={{ background: `${notification.tierColor}20`, border: `2px solid ${notification.tierColor}40` }}
                    >
                      <Icon className="h-7 w-7" style={{ color: notification.tierColor }} />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2
                  className="font-display text-[22px] font-[800]"
                  style={{ color: notification.tierColor, letterSpacing: "-0.03em" }}
                >
                  Badge aprobado
                </h2>
                <p
                  className="font-display text-[16px] font-[700] mt-1"
                  style={{ color: t.text, letterSpacing: "-0.02em" }}
                >
                  {notification.badgeName}
                </p>
                <p
                  className="font-mono text-[10px] uppercase tracking-[1.5px] mt-1"
                  style={{ color: notification.tierColor }}
                >
                  {notification.tierLabel}
                </p>
                <p className="font-body text-[13px] mt-3 leading-relaxed" style={{ color: t.muted }}>
                  Tu video fue revisado y aprobado. Este badge ya es parte de tu perfil.
                </p>

                {notification.reviewNotes && (
                  <div
                    className="mt-4 rounded-xl px-4 py-3 text-left"
                    style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(61,43,36,0.03)", border: `1px solid ${notification.tierColor}20` }}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: t.muted }}>
                      Nota del coach
                    </p>
                    <p className="font-body text-[12px] leading-relaxed" style={{ color: t.muted }}>
                      {notification.reviewNotes}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Rejected icon */}
                <div className="relative mx-auto mb-5" style={{ width: 72, height: 72 }}>
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.2)" }}
                  >
                    <RefreshCw className="h-7 w-7" style={{ color: "#EF4444" }} />
                  </div>
                </div>

                <h2
                  className="font-display text-[20px] font-[800]"
                  style={{ color: "#EF4444", letterSpacing: "-0.03em" }}
                >
                  Video no aprobado
                </h2>
                <p
                  className="font-display text-[15px] font-[700] mt-1"
                  style={{ color: t.text, letterSpacing: "-0.02em" }}
                >
                  {notification.badgeName} — {notification.tierLabel}
                </p>
                <p className="font-body text-[13px] mt-3 leading-relaxed" style={{ color: t.muted }}>
                  Tu video fue revisado pero no cumplio con los requisitos. Puedes volver a enviarlo.
                </p>

                {notification.reviewNotes && (
                  <div
                    className="mt-4 rounded-xl px-4 py-3 text-left"
                    style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: t.muted }}>
                      Motivo
                    </p>
                    <p className="font-body text-[12px] leading-relaxed" style={{ color: t.muted }}>
                      {notification.reviewNotes}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-2">
              {isApproved ? (
                <>
                  <button
                    onClick={handleViewBadges}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-[700] transition-all active:scale-[0.98]"
                    style={{ background: notification.tierColor, color: t.btnText }}
                  >
                    Ver mis badges
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-display text-[13px] font-[700] transition-all active:scale-[0.98]"
                    style={{
                      background: "transparent",
                      border: `1px solid ${notification.tierColor}40`,
                      color: notification.tierColor,
                    }}
                  >
                    {sharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Compartir
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleResubmit}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[13px] font-[700] transition-all active:scale-[0.98]"
                  style={{ background: "#EF4444", color: t.text }}
                >
                  Volver a enviar video
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="w-full py-2 font-body text-[12px]"
                style={{ color: t.muted }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HIDDEN SHARE CARD (captured by html2canvas) ═══ */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <BadgeShareCard
          ref={cardRef}
          badgeName={cardData?.badgeName || notification.badgeName}
          tierLabel={cardData?.tierLabel || notification.tierLabel}
          tierColor={cardData?.tierColor || notification.tierColor}
          exerciseName={cardData?.exerciseName || notification.exerciseName}
          iconName={cardData?.iconName ?? notification.iconName}
          athleteName={athleteName}
          avatarUrl={avatarUrl}
        />
      </div>
    </>
  );
}
