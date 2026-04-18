import { useState, useEffect } from "react";
import MilestoneIcon from "./MilestoneIcon";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

export interface PRDetail {
  exerciseName: string;
  weight: number;
  reps: number;
  unit: string;
  previousBest: number | null; // null if first time
}

export interface Milestone {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string; // brand color for the milestone
  prDetail?: PRDetail; // only present for PR milestones
}

interface MilestoneCelebrationProps {
  milestone: Milestone | null;
  onDismiss: () => void;
}

export default function MilestoneCelebration({
  milestone,
  onDismiss,
}: MilestoneCelebrationProps) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!milestone) {
      setVisible(false);
      setAnimate(false);
      return;
    }
    const t1 = setTimeout(() => setVisible(true), 300);
    const t2 = setTimeout(() => setAnimate(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [milestone]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  if (!milestone) return null;

  const isPR = !!milestone.prDetail;
  const pr = milestone.prDetail;
  const improvementRaw = pr && pr.previousBest != null ? pr.weight - pr.previousBest : null;
  // Round to 1 decimal — removes floating-point noise like 0.41000000000000014
  const improvement = improvementRaw != null ? Math.round(improvementRaw * 10) / 10 : null;

  // PR milestones use dark card, others use light card
  if (isPR && pr) {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center"
        style={{
          background: visible ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
          backdropFilter: visible ? "blur(12px)" : "none",
          WebkitBackdropFilter: visible ? "blur(12px)" : "none",
          transition: "background 0.4s ease, backdrop-filter 0.4s ease",
          pointerEvents: visible ? "auto" : "none",
        }}
        onClick={handleDismiss}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.7) translateY(30px)",
            transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            padding: "40px 28px 32px",
            maxWidth: 330,
            width: "88%",
            borderRadius: 24,
            background: t.card,
            border: `1px solid ${t.border}`,
            boxShadow: `0 0 60px ${t.shadow}, 0 25px 60px rgba(0,0,0,0.4)`,
          }}
        >
          {/* PR Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: t.accentBgStrong,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              opacity: animate ? 1 : 0,
              transform: animate ? "scale(1)" : "scale(0.5)",
              transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke={t.accent}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "inline-block",
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: "uppercase" as const,
              color: t.accent,
              background: t.accentBg,
              padding: "4px 14px",
              borderRadius: 20,
              border: `1px solid ${t.accentBgStrong}`,
              marginBottom: 20,
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s ease 0.5s",
            }}
          >
            {milestone.title}
          </div>

          {/* Exercise name */}
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: 20,
              textAlign: "center",
              color: t.text,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
              marginBottom: 24,
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.5s ease 0.6s",
            }}
          >
            {pr.exerciseName}
          </h2>

          {/* Weight */}
          <div
            style={{
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.5s ease 0.7s",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                fontSize: 56,
                color: t.text,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {pr.weight}
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                fontSize: 20,
                color: t.muted,
                marginLeft: 4,
              }}
            >
              {pr.unit}
            </span>
          </div>

          {/* Reps */}
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 14,
              color: t.muted,
              marginTop: 4,
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(8px)",
              transition: "all 0.4s ease 0.8s",
            }}
          >
            {pr.reps} reps
          </p>

          {/* Improvement pill */}
          {improvement != null && improvement > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 20,
                padding: "8px 18px",
                background: t.accentBgStrong,
                borderRadius: 24,
                border: `1px solid ${t.accentBgStrong}`,
                opacity: animate ? 1 : 0,
                transform: animate ? "translateY(0)" : "translateY(8px)",
                transition: "all 0.5s ease 0.9s",
              }}
            >
              <span style={{ color: t.accent, fontSize: 14 }}>&uarr;</span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: t.accent,
                }}
              >
                +{improvement} {pr.unit} vs anterior
              </span>
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              width: animate ? 40 : 0,
              height: 2,
              borderRadius: 1,
              background: t.accent,
              opacity: 0.5,
              margin: "24px auto",
              transition: "width 0.5s cubic-bezier(0.4, 0, 0.15, 1) 1s",
            }}
          />

          {/* Branding */}
          <p
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: "-0.03em",
              color: t.accent, opacity: 0.2,
              opacity: animate ? 1 : 0,
              transition: "opacity 0.4s ease 1.1s",
            }}
          >
            LIFTORY
          </p>

          {/* CTA */}
          <button
            onClick={handleDismiss}
            className="font-display font-bold"
            style={{
              marginTop: 20,
              padding: "14px 48px",
              borderRadius: 100,
              border: "none",
              background: t.accent,
              color: t.btnText,
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              opacity: animate ? 1 : 0,
              transform: animate ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s ease 1.2s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            SEGUIR
          </button>
        </div>
      </div>
    );
  }

  // Default (non-PR) milestone — original light card
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      style={{
        background: visible ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "none",
        WebkitBackdropFilter: visible ? "blur(8px)" : "none",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.7) translateY(30px)",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "40px 32px 32px",
          maxWidth: 320,
          width: "85%",
          borderRadius: 24,
          background: t.card,
          boxShadow: `0 25px 60px ${t.shadow}`,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <MilestoneIcon
            milestoneId={milestone.id}
            accentColor={milestone.accentColor}
            size={110}
            animate={animate}
            delay={200}
          />
        </div>

        <h2
          className="font-display font-[800] text-center"
          style={{
            fontSize: 24,
            letterSpacing: "-0.03em",
            color: t.text,
            lineHeight: 1.15,
            opacity: animate ? 1 : 0,
            transform: animate ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s ease 0.6s",
          }}
        >
          {milestone.title}
        </h2>

        <p
          className="font-body text-center"
          style={{
            fontSize: 14,
            color: t.muted,
            lineHeight: 1.5,
            maxWidth: 240,
            opacity: animate ? 1 : 0,
            transform: animate ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.5s ease 0.8s",
          }}
        >
          {milestone.subtitle}
        </p>

        <div
          style={{
            width: animate ? 40 : 0,
            height: 3,
            borderRadius: 2,
            background: milestone.accentColor,
            marginTop: 8,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.15, 1) 1s",
          }}
        />

        <button
          onClick={handleDismiss}
          className="font-display font-bold"
          style={{
            marginTop: 16,
            padding: "12px 32px",
            borderRadius: 100,
            border: "none",
            background: t.accent,
            color: t.btnText,
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            cursor: "pointer",
            opacity: animate ? 1 : 0,
            transform: animate ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.4s ease 1.1s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          SEGUIR
        </button>
      </div>
    </div>
  );
}
