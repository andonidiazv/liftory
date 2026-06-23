import { useEffect, useState } from "react";

/**
 * SPLASH · Atelier journey screen 01.
 *
 * Brand entry shown for ~900ms on PWA cold-start. Just the LIFTORY
 * wordmark, a gold hairline, and the program tagline. The optional name
 * fades in at the bottom — when the AuthContext has rehydrated the
 * profile in time we greet the athlete by name; otherwise we just show
 * the mark and the rest of the UI takes over silently.
 *
 * Design source: public/home-redesign-atelier-journey.html (screen 01).
 *
 * Mounted once at the App root so it shows on every cold start (router
 * navigations don't remount it). Self-unmounts after the fade completes
 * so it can't intercept clicks.
 */
export default function Splash({ name }: { name?: string }) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 750);
    const hideTimer = setTimeout(() => setVisible(false), 1150);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(600px 500px at 50% 50%, rgba(196,162,78,0.06), transparent 65%), #0D0D0F",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 400ms ease-out",
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 40,
          letterSpacing: "-0.04em",
          color: "#C4A24E",
          textTransform: "uppercase",
          textShadow: "0 0 40px rgba(196,162,78,0.4)",
        }}
      >
        LIFTORY
      </span>
      <div
        style={{
          width: 48,
          height: 1,
          background: "#C4A24E",
          opacity: 0.6,
          margin: "24px 0",
        }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "4px",
          color: "#9C9CA8",
          textTransform: "uppercase",
        }}
      >
        Build him elite
      </span>
      {name && (
        <p
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 300,
            fontSize: 18,
            letterSpacing: "-0.02em",
            color: "#9C9CA8",
            fontStyle: "italic",
            animation: "splashGreet 600ms ease-out 200ms both",
          }}
        >
          Hola, {name}.
        </p>
      )}
      <style>{`
        @keyframes splashGreet {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
