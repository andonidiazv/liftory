import { useState, useEffect } from "react";

interface AnimatedBicepProps {
  size?: number;
  animate?: boolean;
  delay?: number;
}

export default function AnimatedBicep({ size = 120, animate = true, delay = 0 }: AnimatedBicepProps) {
  const [phase, setPhase] = useState<"small" | "growing" | "buff">("small");

  useEffect(() => {
    if (!animate) return;
    const t1 = setTimeout(() => setPhase("growing"), delay + 300);
    const t2 = setTimeout(() => setPhase("buff"), delay + 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animate, delay]);

  const emojiScale = phase === "small" ? 0.5 : phase === "growing" ? 0.8 : 1;
  const glowOpacity = phase === "buff" ? 0.5 : 0;
  const veinShow = phase === "buff";

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
      {/* Sage glow behind */}
      <div
        style={{
          position: "absolute",
          inset: -12,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(122,139,92,0.35) 0%, transparent 70%)",
          opacity: glowOpacity,
          transition: "opacity 0.6s ease 0.4s",
          filter: "blur(12px)",
        }}
      />

      {/* Emoji container */}
      <div
        style={{
          fontSize: size * 0.65,
          lineHeight: 1,
          transform: `scale(${emojiScale})`,
          transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span role="img" aria-label="flexed bicep">💪</span>
      </div>

      {/* Vein overlay — SVG positioned on top of the emoji */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        <path
          d="M52 38 Q55 48, 50 58 Q48 64, 52 70"
          fill="none"
          stroke="#7A8B5C"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: veinShow ? 0 : 50,
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.15, 1) 0.5s",
          }}
        />
        <path
          d="M51 52 Q56 50, 58 46"
          fill="none"
          stroke="#7A8B5C"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{
            strokeDasharray: 18,
            strokeDashoffset: veinShow ? 0 : 18,
            transition: "stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.15, 1) 1s",
          }}
        />
      </svg>
    </div>
  );
}
