import { useEffect, useMemo, useState } from "react";

/**
 * SPLASH · Atelier ceremonial entry — Apple "Hello" cadence.
 *
 * Two variants:
 *   - 'ceremonial' (~5.5s): post-login welcome. Black field stays constant.
 *     Each element fades in slowly on top, one by one, like the iOS update
 *     "Hello" screens. No dramatic color shifts. Cross-fade out.
 *   - 'compact'   (~1.5s): cold-start re-entry. Same Atelier brand entry.
 *
 * Mantras rotate randomly per session — in Coach Adonis voice.
 */

type Variant = "ceremonial" | "compact";

const MANTRAS = [
  "Hoy te toca.",
  "El hierro te espera.",
  "Movement is medicine.",
  "Build the body. Earn the day.",
  "Disciplina, no motivación.",
  "Show up. Lift. Live.",
  "Cada rep es un voto.",
  "El cuerpo recuerda.",
  "Construye al elite.",
];

const GOLD = "#C4A24E";
const PITCH = "#0D0D0F";

function pickMantra(): string {
  return MANTRAS[Math.floor(Math.random() * MANTRAS.length)];
}

export default function Splash({
  name,
  variant = "compact",
}: {
  name?: string;
  variant?: Variant;
}) {
  const [phase, setPhase] = useState<"in" | "fading" | "done">("in");
  const mantra = useMemo(pickMantra, []);

  const isCeremonial = variant === "ceremonial";
  // Ceremonial cadence (Apple "Hello" pacing — slow, contemplative):
  //   0      Black field. Mount.
  //   0-1800 LIFTORY wordmark fades in (1.8s, slow ease)
  //   1300   Hairline begins to draw (sub-second)
  //   2100   "Hola, {name}" fades in (1.2s)
  //   3300   Mantra fades in (1.2s)
  //   2400+  Wordmark begins imperceptible breath (4s cycle, infinite)
  //   4500   Hold ends, cross-fade begins
  //   5500   Unmount
  // Compact:
  //   0-1100 Visible
  //   1100-1600 Fade
  const FADE_START = isCeremonial ? 4500 : 1100;
  const UNMOUNT = isCeremonial ? 5500 : 1600;

  useEffect(() => {
    const fadeT = setTimeout(() => setPhase("fading"), FADE_START);
    const unmountT = setTimeout(() => setPhase("done"), UNMOUNT);
    return () => {
      clearTimeout(fadeT);
      clearTimeout(unmountT);
    };
  }, [FADE_START, UNMOUNT]);

  if (phase === "done") return null;

  // ── CEREMONIAL: Apple Hello — black stays, elements emerge one by one ──
  if (isCeremonial) {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: PITCH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: phase === "fading" ? 0 : 1,
          transition: "opacity 1000ms cubic-bezier(0.4, 0, 0.6, 1)",
          pointerEvents: phase === "fading" ? "none" : "auto",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Wordmark — slow fade-in + perpetual breath */}
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: "-0.04em",
            color: GOLD,
            textTransform: "uppercase",
            textShadow: "0 0 28px rgba(196,162,78,0.32)",
            animation:
              "atelierHelloFade 1800ms cubic-bezier(0.22, 0.61, 0.36, 1) 200ms both, atelierBreath 4000ms ease-in-out 2400ms infinite",
          }}
        >
          LIFTORY
        </span>

        {/* Hairline — draws from center, slow */}
        <div
          style={{
            height: 1,
            background: GOLD,
            marginTop: 28,
            opacity: 0.6,
            animation: "atelierHairlineDraw 1100ms cubic-bezier(0.4, 0, 0.2, 1) 1300ms both",
          }}
        />

        {/* Greeting — Syne 300 italic, fades in alone */}
        {name && (
          <p
            style={{
              margin: 0,
              marginTop: 32,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 300,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "hsl(0,0%,92%)",
              fontStyle: "italic",
              animation:
                "atelierHelloFade 1200ms cubic-bezier(0.22, 0.61, 0.36, 1) 2100ms both",
            }}
          >
            Hola, {name}.
          </p>
        )}

        {/* Mantra — quiet, last to enter */}
        <p
          style={{
            margin: 0,
            marginTop: 28,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            letterSpacing: "3.5px",
            color: "#9C9CA8",
            textTransform: "uppercase",
            opacity: 0,
            animation:
              "atelierHelloFade 1200ms cubic-bezier(0.22, 0.61, 0.36, 1) 3300ms both",
          }}
        >
          {mantra}
        </p>

        <style>{`
          @keyframes atelierHelloFade {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes atelierHairlineDraw {
            from { width: 0; opacity: 0; }
            to   { width: 64px; opacity: 0.6; }
          }
          @keyframes atelierBreath {
            0%, 100% { transform: scale(1); text-shadow: 0 0 28px rgba(196,162,78,0.32); }
            50%      { transform: scale(1.012); text-shadow: 0 0 36px rgba(196,162,78,0.42); }
          }
        `}</style>
      </div>
    );
  }

  // ── COMPACT: cold-start brand entry ──
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(700px 600px at 50% 50%, rgba(196,162,78,0.08), transparent 65%), #0D0D0F",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 500ms ease-out",
        pointerEvents: phase === "fading" ? "none" : "auto",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 44,
          letterSpacing: "-0.04em",
          color: GOLD,
          textTransform: "uppercase",
          textShadow: "0 0 48px rgba(196,162,78,0.5)",
          animation: "compactWordmark 700ms cubic-bezier(0.2,0.8,0.2,1) both",
        }}
      >
        LIFTORY
      </span>
      <div
        style={{
          height: 1,
          background: GOLD,
          opacity: 0.7,
          margin: "28px 0",
          animation: "compactHairline 500ms ease-out 500ms both",
        }}
      />
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: "4px",
          color: "#9C9CA8",
          textTransform: "uppercase",
          opacity: 0,
          animation: "compactFadeIn 500ms ease-out 600ms both",
        }}
      >
        Build him elite
      </span>
      <style>{`
        @keyframes compactWordmark {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes compactHairline {
          from { width: 0; opacity: 0; }
          to   { width: 56px; opacity: 0.7; }
        }
        @keyframes compactFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
