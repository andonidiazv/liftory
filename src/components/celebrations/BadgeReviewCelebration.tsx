import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, RefreshCw, Share2, Loader2 } from "lucide-react";
import { getBadgeIcon } from "@/lib/badgeIcons";
import { useShareBadgeCard } from "@/hooks/useShareBadgeCard";
import BadgeShareCard from "@/components/share/BadgeShareCard";
import type { BadgeReviewNotification } from "@/hooks/useBadgeReviewNotification";

interface Props {
  notification: BadgeReviewNotification | null;
  onDismiss: () => void;
  onCheckNext: () => void;
}

const GOLD = "#C4A24E";
const RED = "#D45555";
const SHEET_BG = "#15151A";

export default function BadgeReviewCelebration({ notification, onDismiss, onCheckNext }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const { cardRef, sharing, share, cardData, athleteName, avatarUrl } = useShareBadgeCard();

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
  const accent = isApproved ? notification.tierColor : RED;

  return (
    <>
      <div
        className="fixed inset-0 z-[72] flex items-center justify-center px-6"
        style={{
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(10px)",
          transition: "opacity 0.4s ease",
          opacity: visible && !exiting ? 1 : 0,
          pointerEvents: visible && !exiting ? "auto" : "none",
        }}
        onClick={handleDismiss}
      >
        <div
          className="relative w-full max-w-sm overflow-hidden text-center"
          style={{
            background: SHEET_BG,
            borderRadius: 24,
            border: "1px solid hsl(var(--border))",
            transition: "transform 0.4s ease, opacity 0.4s ease",
            transform: visible && !exiting ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
            opacity: visible && !exiting ? 1 : 0,
            padding: "40px 32px 32px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Eyebrow */}
          <p
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "3px", color: accent }}
          >
            {isApproved ? "Badge aprobado" : "Video no aprobado"}
          </p>

          {/* Icon — gold ring or red ring */}
          <div className="relative mx-auto mt-5" style={{ width: 88, height: 88 }}>
            {isApproved && (
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: `${accent}10`, animationDuration: "2.5s" }}
              />
            )}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                border: `1px solid ${accent}`,
                boxShadow: isApproved ? `0 0 28px ${accent}50` : "none",
              }}
            >
              {isApproved ? (
                <Icon className="h-7 w-7" style={{ color: accent }} />
              ) : (
                <RefreshCw className="h-6 w-6" style={{ color: accent }} />
              )}
            </div>
          </div>

          {/* Title */}
          <h2
            className="font-display mt-6"
            style={{
              fontWeight: 300,
              fontSize: 28,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "hsl(var(--foreground))",
            }}
          >
            {isApproved ? (
              <>
                <strong style={{ fontWeight: 700 }}>{notification.badgeName}</strong>
              </>
            ) : (
              <>
                <strong style={{ fontWeight: 700 }}>{notification.badgeName}</strong>
              </>
            )}
          </h2>

          <p
            className="font-mono uppercase mt-3"
            style={{ fontSize: 9, letterSpacing: "2.5px", color: accent }}
          >
            {notification.tierLabel}
          </p>

          <div className="mx-auto h-px mt-5" style={{ width: 36, background: accent }} />

          {/* Body */}
          <p
            className="font-body italic mt-5 leading-snug"
            style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}
          >
            {isApproved
              ? "Tu video fue revisado y aprobado. Este badge ya es parte de tu perfil."
              : "Tu video fue revisado pero no cumplió con los requisitos. Puedes volver a enviarlo."}
          </p>

          {notification.reviewNotes && (
            <div className="mt-5 text-left">
              <p
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
              >
                {isApproved ? "Nota del coach" : "Motivo"}
              </p>
              <p
                className="font-body mt-2"
                style={{ fontWeight: 300, fontSize: 12, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}
              >
                {notification.reviewNotes}
              </p>
            </div>
          )}

          {/* Actions — Atelier CTAs */}
          <div className="mt-8 flex flex-col items-center gap-4">
            {isApproved ? (
              <>
                <button
                  onClick={handleViewBadges}
                  className="press-scale flex items-center gap-3"
                >
                  <span
                    className="font-mono uppercase"
                    style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}
                  >
                    Ver mis badges
                  </span>
                  <span
                    className="liftory-breathe flex items-center justify-center shrink-0"
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      border: `1px solid ${accent}`,
                      boxShadow: `0 0 24px ${accent}40`,
                    }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: accent }} />
                  </span>
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="press-scale flex items-center gap-2 disabled:opacity-50"
                >
                  {sharing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                  )}
                  <span
                    className="font-mono uppercase"
                    style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                  >
                    Compartir
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={handleResubmit}
                className="press-scale flex items-center gap-3"
              >
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}
                >
                  Volver a enviar
                </span>
                <span
                  className="liftory-breathe flex items-center justify-center shrink-0"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: `1px solid ${accent}`,
                    boxShadow: `0 0 18px ${accent}40`,
                  }}
                >
                  <ChevronRight className="h-3.5 w-3.5" style={{ color: accent }} />
                </span>
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN SHARE CARD (captured by html2canvas) */}
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
