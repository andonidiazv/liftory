import { useState, useEffect } from "react";

interface AnimatedPeachProps {
  size?: number;
  animate?: boolean;
  delay?: number;
}

export default function AnimatedPeach({ size = 120, animate = true, delay = 0 }: AnimatedPeachProps) {
  const [phase, setPhase] = useState<"small" | "growing" | "full">("small");

  useEffect(() => {
    if (!animate) return;
    const t1 = setTimeout(() => setPhase("growing"), delay + 300);
    const t2 = setTimeout(() => setPhase("full"), delay + 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animate, delay]);

  const emojiScale = phase === "small" ? 0.5 : phase === "growing" ? 0.8 : 1;
  const glowOpacity = phase === "full" ? 0.5 : 0;
  const sparkleShow = phase === "full";

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
      {/* Gold glow behind */}
      <div
        style={{
          position: "absolute",
          inset: -12,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,169,110,0.4) 0%, transparent 70%)",
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
          transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span role="img" aria-label="peach">🍑</span>
      </div>

      {/* Sparkle/shine overlay */}
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
        {/* Shine streak */}
        <path
          d="M38 42 Q42 35, 46 40"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 20,
            strokeDashoffset: sparkleShow ? 0 : 20,
            opacity: sparkleShow ? 0.9 : 0,
            transition: "stroke-dashoffset 0.6s ease 0.5s, opacity 0.4s ease 0.4s",
          }}
        />

        {/* Sparkle dots */}
        <circle cx="34" cy="36" r="2" fill="white" style={{ opacity: sparkleShow ? 0.8 : 0, transition: "opacity 0.3s ease 0.8s" }} />
        <circle cx="86" cy="44" r="1.5" fill="#C9A96E" style={{ opacity: sparkleShow ? 0.9 : 0, transition: "opacity 0.3s ease 0.9s" }} />
        <circle cx="42" cy="30" r="1.5" fill="#C9A96E" style={{ opacity: sparkleShow ? 0.7 : 0, transition: "opacity 0.3s ease 1s" }} />
        <circle cx="78" cy="32" r="1" fill="white" style={{ opacity: sparkleShow ? 0.6 : 0, transition: "opacity 0.3s ease 1.1s" }} />

        {/* Star sparkle */}
        <g style={{ opacity: sparkleShow ? 1 : 0, transition: "opacity 0.4s ease 0.7s", transform: "translate(82px, 28px)" }}>
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-4" y1="0" x2="4" y2="0" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-2.8" y1="-2.8" x2="2.8" y2="2.8" stroke="#C9A96E" strokeWidth="1" strokeLinecap="round" />
          <line x1="2.8" y1="-2.8" x2="-2.8" y2="2.8" stroke="#C9A96E" strokeWidth="1" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
