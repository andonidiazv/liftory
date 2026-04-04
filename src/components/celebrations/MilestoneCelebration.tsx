import { useState, useEffect } from "react";
import MilestoneIcon from "./MilestoneIcon";

export interface Milestone {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string; // brand color for the milestone
}

interface MilestoneCelebrationProps {
  milestone: Milestone | null;
  onDismiss: () => void;
}

export default function MilestoneCelebration({
  milestone,
  onDismiss,
}: MilestoneCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!milestone) {
      setVisible(false);
      setAnimate(false);
      return;
    }
    // Slight delay before showing to let the page settle
    const t1 = setTimeout(() => setVisible(true), 300);
    const t2 = setTimeout(() => setAnimate(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [milestone]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 400); // Wait for exit animation
  };

  if (!milestone) return null;

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
          background: "#FAF9F6",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Animated milestone icon */}
        <div style={{ marginBottom: 8 }}>
          <MilestoneIcon
            milestoneId={milestone.id}
            accentColor={milestone.accentColor}
            size={110}
            animate={animate}
            delay={200}
          />
        </div>

        {/* Title */}
        <h2
          className="font-display font-[800] text-center"
          style={{
            fontSize: 24,
            letterSpacing: "-0.03em",
            color: "#1a1a1a",
            lineHeight: 1.15,
            opacity: animate ? 1 : 0,
            transform: animate ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s ease 0.6s",
          }}
        >
          {milestone.title}
        </h2>

        {/* Subtitle */}
        <p
          className="font-body text-center"
          style={{
            fontSize: 14,
            color: "#888",
            lineHeight: 1.5,
            maxWidth: 240,
            opacity: animate ? 1 : 0,
            transform: animate ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.5s ease 0.8s",
          }}
        >
          {milestone.subtitle}
        </p>

        {/* Accent line */}
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

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="font-display font-bold"
          style={{
            marginTop: 16,
            padding: "12px 32px",
            borderRadius: 100,
            border: "none",
            background: "#1a1a1a",
            color: "#fff",
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
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
