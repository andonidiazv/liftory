import { useState, useEffect } from "react";

interface MilestoneIconProps {
  milestoneId: string;
  accentColor: string;
  size?: number;
  animate?: boolean;
  delay?: number;
}

/**
 * Clean SVG stroke icons for each milestone type.
 * Animated with stroke-dasharray / dashoffset drawing effect.
 */
export default function MilestoneIcon({
  milestoneId,
  accentColor,
  size = 90,
  animate = false,
  delay = 0,
}: MilestoneIconProps) {
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    if (!animate) {
      setDraw(false);
      return;
    }
    const timer = setTimeout(() => setDraw(true), delay);
    return () => clearTimeout(timer);
  }, [animate, delay]);

  // Resolve which icon to render based on milestoneId prefix
  const iconType = resolveIconType(milestoneId);

  const strokeStyle = (len: number, extraDelay = 0): React.CSSProperties => ({
    strokeDasharray: len,
    strokeDashoffset: draw ? 0 : len,
    transition: `stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.15, 1) ${extraDelay}s`,
  });

  const glowStyle: React.CSSProperties = {
    opacity: draw ? 1 : 0,
    transition: "opacity 0.5s ease 0.6s",
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 70 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background glow circle */}
        <circle
          cx="35"
          cy="35"
          r="30"
          fill={accentColor}
          fillOpacity={0.08}
          style={glowStyle}
        />

        {iconType === "flame" && (
          <path
            d="M35 52 C25 52, 18 43, 18 35 C18 26, 24 20, 28 16 C28 24, 32 26, 35 22 C38 26, 42 24, 42 16 C46 20, 52 26, 52 35 C52 43, 45 52, 35 52Z"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={strokeStyle(140, 0.2)}
          />
        )}

        {iconType === "arrow" && (
          <>
            <line
              x1="14"
              y1="28"
              x2="56"
              y2="28"
              stroke={accentColor}
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity={draw ? 0.4 : 0}
              style={{ transition: "opacity 0.5s ease 0.3s" }}
            />
            <path
              d="M35 56 L35 22 M27 30 L35 22 L43 30"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={strokeStyle(60, 0.2)}
            />
            <line
              x1="28"
              y1="16"
              x2="42"
              y2="16"
              stroke={accentColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={draw ? 0.5 : 0}
              style={{ transition: "opacity 0.4s ease 0.8s" }}
            />
          </>
        )}

        {iconType === "bars" && (
          <>
            <rect x="11" y="38" width="6" height="16" rx="2" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(50, 0.1)} />
            <rect x="21" y="32" width="6" height="22" rx="2" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(56, 0.2)} />
            <rect x="31" y="26" width="6" height="28" rx="2" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(62, 0.3)} />
            <rect x="41" y="20" width="6" height="34" rx="2" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(68, 0.4)} />
            <rect x="51" y="14" width="6" height="40" rx="2" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(74, 0.5)} />
            <path d="M10 58 L58 58" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" opacity={draw ? 0.3 : 0} style={{ transition: "opacity 0.4s ease 0.6s" }} />
          </>
        )}

        {iconType === "bolt" && (
          <path
            d="M40 12 L24 36 L33 36 L28 58 L48 32 L38 32 Z"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={strokeStyle(140, 0.2)}
          />
        )}

        {iconType === "chain" && (
          <>
            <rect x="12" y="24" width="22" height="12" rx="6" stroke={accentColor} strokeWidth="2" style={strokeStyle(60, 0.1)} />
            <rect x="28" y="24" width="22" height="12" rx="6" stroke={accentColor} strokeWidth="2" style={strokeStyle(60, 0.3)} />
            <rect x="20" y="36" width="22" height="12" rx="6" stroke={accentColor} strokeWidth="2" style={strokeStyle(60, 0.5)} />
            <rect x="36" y="36" width="22" height="12" rx="6" stroke={accentColor} strokeWidth="2" style={strokeStyle(60, 0.7)} />
          </>
        )}

        {iconType === "rocket" && (
          <>
            <path
              d="M35 14 C35 14, 48 22, 48 38 L42 44 L28 44 L22 38 C22 22, 35 14, 35 14Z"
              stroke={accentColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={strokeStyle(110, 0.1)}
            />
            <circle cx="35" cy="32" r="4" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(26, 0.5)} />
            <path
              d="M30 44 L28 54 L35 50 L42 54 L40 44"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={strokeStyle(50, 0.7)}
            />
          </>
        )}

        {iconType === "target" && (
          <>
            <circle cx="35" cy="35" r="22" stroke={accentColor} strokeWidth="2" style={strokeStyle(139, 0.1)} />
            <circle cx="35" cy="35" r="14" stroke={accentColor} strokeWidth="1.8" style={strokeStyle(88, 0.4)} />
            <circle cx="35" cy="35" r="5" stroke={accentColor} strokeWidth="2.5" style={strokeStyle(32, 0.7)} />
          </>
        )}

        {iconType === "crown" && (
          <>
            <path
              d="M16 46 L16 30 L26 38 L35 24 L44 38 L54 30 L54 46 Z"
              stroke={accentColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={strokeStyle(130, 0.1)}
            />
            <line x1="16" y1="50" x2="54" y2="50" stroke={accentColor} strokeWidth="2" strokeLinecap="round" style={strokeStyle(38, 0.6)} />
            <circle cx="26" cy="28" r="2" stroke={accentColor} strokeWidth="1.5" style={strokeStyle(13, 0.8)} />
            <circle cx="35" cy="22" r="2" stroke={accentColor} strokeWidth="1.5" style={strokeStyle(13, 0.9)} />
            <circle cx="44" cy="28" r="2" stroke={accentColor} strokeWidth="1.5" style={strokeStyle(13, 1.0)} />
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Maps milestone IDs to icon types.
 * Milestone IDs can have suffixes (e.g. "streak_7", "workouts_25", "phase_3")
 */
function resolveIconType(id: string): string {
  if (id === "first_workout") return "flame";
  if (id === "first_pr") return "arrow";
  if (id === "perfect_week" || id.startsWith("perfect_week")) return "bars";
  if (id === "first_elite") return "bolt";
  if (id.startsWith("streak_")) return "chain";
  if (id.startsWith("workouts_")) {
    // 100 workouts = crown (legendary), others = rocket
    if (id === "workouts_100") return "crown";
    return "rocket";
  }
  if (id.startsWith("phase_")) {
    // Phase 6 (full cycle) = crown, others = target
    if (id === "phase_6") return "crown";
    return "target";
  }
  // Default fallback
  return "flame";
}
