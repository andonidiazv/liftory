import { useState } from "react";
import { X, Crown, ArrowRight, ArrowLeft, ChevronRight, BookOpen, Key, Zap, Activity, Skull, Clock, Square, BarChart3 } from "lucide-react";

interface Props {
  firstName: string;
  onStart: () => void;
  onSkip: () => void;
}

const colors = {
  bg: "#0B0B0D",
  card: "#15151A",
  border: "#26262E",
  text: "#FAFAF7",
  muted: "#8E8E96",
  gold: "#C4A24E",
  goldSoft: "rgba(196, 162, 78, 0.12)",
  goldStrong: "rgba(196, 162, 78, 0.28)",
  sage: "#7A8B5C",
};

const animations = `
  @keyframes vipScreenFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes vipFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes vipFadeUpGlow {
    0% { opacity: 0; transform: translateY(20px) scale(0.95); text-shadow: 0 0 0 rgba(196,162,78,0); }
    60% { opacity: 1; transform: translateY(0) scale(1.02); text-shadow: 0 0 80px rgba(196,162,78,0.5); }
    100% { opacity: 1; transform: translateY(0) scale(1); text-shadow: 0 0 60px rgba(196,162,78,0.28); }
  }
  .vip-screen { animation: vipScreenFade 500ms ease both; }
  .vip-fadeup-1 { animation: vipFadeUp 600ms ease 100ms both; }
  .vip-fadeup-2 { animation: vipFadeUp 600ms ease 300ms both; }
  .vip-fadeup-3 { animation: vipFadeUp 600ms ease 500ms both; }
  .vip-fadeup-4 { animation: vipFadeUp 600ms ease 700ms both; }
  .vip-meso-glow { animation: vipFadeUpGlow 900ms cubic-bezier(0.2, 0.8, 0.2, 1) 500ms both; }
`;

export default function VipJoinerWelcomeCard({ firstName, onStart, onSkip }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const goTo = (n: 1 | 2 | 3) => {
    setStep(n);
    requestAnimationFrame(() => {
      const scroll = document.getElementById("vip-scroll");
      if (scroll) scroll.scrollTop = 0;
    });
  };

  const frameStyle: React.CSSProperties = {
    background: `radial-gradient(ellipse 120% 60% at 50% 0%, rgba(196,162,78,0.16) 0%, transparent 65%), radial-gradient(ellipse 80% 50% at 50% 100%, rgba(196,162,78,0.06) 0%, transparent 70%), ${colors.bg}`,
  };

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: "#050507", fontFamily: "'DM Sans', sans-serif", color: colors.text }}
      id="vip-scroll"
    >
      <style>{animations}</style>

      <div className="mx-auto max-w-[420px] px-4 py-8 min-h-screen">
        <div className="rounded-[28px] border" style={{ ...frameStyle, borderColor: "#1c1c22", boxShadow: "0 30px 90px rgba(0,0,0,0.6)" }}>
          <div className="px-7 pt-9 pb-7 flex flex-col" style={{ minHeight: 720 }}>

            {/* Brand header — always visible */}
            <div className="flex items-center justify-center pb-3.5 mb-3.5 relative" style={{ borderBottom: `1px solid #1c1c22` }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em", color: colors.text }}>
                LIFTORY<span style={{ color: colors.gold }}>.</span>
              </span>
              <button
                onClick={onSkip}
                className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: 10, background: colors.card, border: `1px solid ${colors.border}` }}
                aria-label="Cerrar"
              >
                <X className="w-3 h-3" style={{ color: colors.muted }} strokeWidth={2} />
              </button>
            </div>

            {/* ════════ SCREEN 1: GREETING ════════ */}
            {step === 1 && (
              <div className="vip-screen flex flex-col items-center justify-center text-center flex-1 py-3">
                {/* VIP tag */}
                <div className="vip-fadeup-1">
                  <span
                    className="inline-block px-2.5 py-1.5 rounded-full"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      color: colors.gold,
                      letterSpacing: "2.5px",
                      textTransform: "uppercase",
                      border: `1px solid ${colors.goldStrong}`,
                    }}
                  >
                    ⌬ Acceso VIP · Founding
                  </span>
                </div>

                {/* Crown halo */}
                <div className="vip-fadeup-2 my-6">
                  <div
                    className="rounded-full flex items-center justify-center relative"
                    style={{
                      width: 76,
                      height: 76,
                      background: "radial-gradient(circle at 30% 25%, rgba(196,162,78,0.40), rgba(196,162,78,0.05) 70%)",
                      border: `1.5px solid ${colors.goldStrong}`,
                      boxShadow: "0 0 60px rgba(196,162,78,0.25)",
                    }}
                  >
                    <Crown className="w-8 h-8" style={{ color: colors.gold }} strokeWidth={1.8} />
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{ inset: -8, border: "1px dashed rgba(196,162,78,0.18)" }}
                    />
                  </div>
                </div>

                {/* Greeting */}
                <div className="vip-fadeup-3">
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10,
                      color: colors.gold,
                      letterSpacing: "2.5px",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Bienvenido
                  </p>
                  <h1
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 38,
                      letterSpacing: "-0.035em",
                      lineHeight: 1.05,
                      color: colors.gold,
                      marginBottom: 14,
                    }}
                  >
                    {firstName}.
                  </h1>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 16,
                      color: colors.muted,
                      lineHeight: 1.4,
                      padding: "0 8px",
                    }}
                  >
                    Te subes con Andoni y Víctor.<br />
                    Mismo mesociclo, misma fase, misma energía.
                  </p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => goTo(2)}
                  className="vip-fadeup-4 mt-8 inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
                  style={{
                    padding: "14px 32px",
                    borderRadius: 999,
                    background: colors.gold,
                    color: "#1A1408",
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "0.02em",
                    border: "none",
                  }}
                >
                  Continuar
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
                </button>

                {/* Step pips */}
                <div className="flex justify-center gap-1.5 mt-6">
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: colors.gold, boxShadow: "0 0 0 3px rgba(196,162,78,0.18)" }} />
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: colors.border }} />
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: colors.border }} />
                </div>
              </div>
            )}

            {/* ════════ SCREEN 2: PROGRAM ════════ */}
            {step === 2 && (
              <div className="vip-screen flex flex-col flex-1">
                {/* Back bar */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => goTo(1)}
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9.5,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: colors.muted,
                      background: "none",
                      border: "none",
                      padding: "4px 0",
                    }}
                  >
                    <ArrowLeft className="w-3 h-3" strokeWidth={2} />
                    Atrás
                  </button>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "2px", color: colors.muted, textTransform: "uppercase" }}>
                    2 de 3
                  </span>
                </div>

                {/* Tu programa divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)` }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: colors.muted, letterSpacing: "2px", textTransform: "uppercase" }}>
                    Tu programa
                  </span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)` }} />
                </div>

                {/* M2 wordmark */}
                <div className="flex flex-col items-center mb-3">
                  <span
                    className="vip-meso-glow"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 800,
                      fontSize: 56,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                      color: colors.gold,
                      textShadow: "0 0 60px rgba(196,162,78,0.28)",
                    }}
                  >
                    M2
                  </span>
                  <span
                    className="mt-1.5"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      color: colors.muted,
                      letterSpacing: "1.4px",
                      textTransform: "uppercase",
                    }}
                  >
                    27 abr — 7 jun · 6 semanas
                  </span>
                </div>

                {/* Hero */}
                <div className="text-center my-4">
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", color: colors.text }}>
                    Te subes en marcha.
                  </h1>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontSize: 14,
                      color: colors.muted,
                      lineHeight: 1.4,
                      marginTop: 10,
                      padding: "0 8px",
                    }}
                  >
                    El grupo arranca M2. Aprendes los formatos en orden.
                  </p>
                </div>

                {/* W1-W6 journey */}
                <div className="my-4 py-3" style={{ borderTop: "1px solid #1c1c22", borderBottom: "1px solid #1c1c22" }}>
                  <div className="grid grid-cols-6 gap-1 items-center relative">
                    <div
                      className="absolute"
                      style={{
                        left: "calc(8.33% - 4px)",
                        right: "calc(8.33% - 4px)",
                        top: 5,
                        height: 1,
                        background: `linear-gradient(90deg, ${colors.gold} 0%, ${colors.gold} 16.67%, ${colors.border} 16.67%, ${colors.border} 100%)`,
                      }}
                    />
                    {[
                      { label: "W1", tag: "ESTÁS AQUÍ", state: "now" },
                      { label: "W2", tag: "", state: "" },
                      { label: "W3", tag: "", state: "" },
                      { label: "W4", tag: "", state: "" },
                      { label: "W5", tag: "PEAK", state: "peak" },
                      { label: "W6", tag: "DELOAD", state: "deload" },
                    ].map((cell, i) => {
                      const dotBg =
                        cell.state === "now" ? colors.gold :
                        cell.state === "peak" ? colors.goldSoft :
                        cell.state === "deload" ? "rgba(122,139,92,0.15)" :
                        colors.card;
                      const dotBorder =
                        cell.state === "now" ? colors.gold :
                        cell.state === "peak" ? colors.gold :
                        cell.state === "deload" ? colors.sage :
                        colors.border;
                      const dotShadow = cell.state === "now" ? "0 0 0 4px rgba(196,162,78,0.18)" : "none";
                      const wkColor = cell.state === "now" || cell.state === "peak" ? colors.gold : cell.state === "deload" ? colors.sage : colors.muted;
                      const tagColor = cell.state === "deload" ? colors.sage : colors.gold;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5 relative z-10">
                          <div
                            style={{
                              width: 11,
                              height: 11,
                              borderRadius: "50%",
                              background: dotBg,
                              border: `1.5px solid ${dotBorder}`,
                              boxShadow: dotShadow,
                            }}
                          />
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: wkColor, letterSpacing: "0.5px", fontWeight: cell.state === "now" ? 500 : 400 }}>
                            {cell.label}
                          </span>
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 7.5,
                              letterSpacing: "1px",
                              textTransform: "uppercase",
                              color: tagColor,
                              minHeight: 8,
                            }}
                          >
                            {cell.tag}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Formats */}
                <div className="mb-4">
                  <p
                    className="text-center mb-3"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: colors.gold,
                    }}
                  >
                    Lo que aprende tu cuerpo aquí
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { Icon: Zap, name: "Clusters", micro: "Mover más con técnica" },
                      { Icon: Activity, name: "Wave Loading", micro: "Tu PR del día" },
                      { Icon: Skull, name: "Death By", micro: "Hasta donde llegues" },
                      { Icon: Clock, name: "For Time", micro: "Score = tu tiempo" },
                      { Icon: Square, name: "Tabata", micro: "20 on / 10 off" },
                      { Icon: BarChart3, name: "Complex", micro: "Sin soltar la barra" },
                    ].map(({ Icon, name, micro }) => (
                      <div
                        key={name}
                        className="flex items-center gap-2.5 p-3"
                        style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12 }}
                      >
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{ width: 26, height: 26, borderRadius: 7, background: colors.goldSoft, border: `1px solid ${colors.goldStrong}` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: colors.gold }} strokeWidth={2} />
                        </div>
                        <div>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: colors.text, lineHeight: 1.1 }}>
                            {name}
                          </p>
                          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: colors.muted, marginTop: 1, letterSpacing: "0.3px" }}>
                            {micro}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Continuar CTA */}
                <div className="mt-auto pt-3 flex justify-center">
                  <button
                    onClick={() => goTo(3)}
                    className="inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
                    style={{
                      padding: "14px 32px",
                      borderRadius: 999,
                      background: colors.gold,
                      color: "#1A1408",
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: "0.02em",
                      border: "none",
                    }}
                  >
                    Continuar
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════ SCREEN 3: MANUAL + WISH ════════ */}
            {step === 3 && (
              <div className="vip-screen flex flex-col flex-1">
                {/* Back bar */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => goTo(2)}
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9.5,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: colors.muted,
                      background: "none",
                      border: "none",
                      padding: "4px 0",
                    }}
                  >
                    <ArrowLeft className="w-3 h-3" strokeWidth={2} />
                    Atrás
                  </button>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "2px", color: colors.muted, textTransform: "uppercase" }}>
                    3 de 3
                  </span>
                </div>

                {/* Manual pointer card */}
                <div
                  className="my-1 p-4"
                  style={{
                    background: "linear-gradient(180deg, rgba(196,162,78,0.06), rgba(196,162,78,0.02))",
                    border: `1px solid ${colors.goldStrong}`,
                    borderRadius: 14,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 34, height: 34, borderRadius: 9, background: colors.goldSoft, border: `1px solid ${colors.goldStrong}` }}
                    >
                      <BookOpen className="w-4 h-4" style={{ color: colors.gold }} strokeWidth={1.8} />
                    </div>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", color: colors.text }}>
                      El Manual de M2
                    </span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: colors.muted, lineHeight: 1.5, marginBottom: 12 }}>
                    Cada formato (Clusters, Wave Loading, Death By, For Time, Tabata, Complex) está explicado a fondo con ejemplos, FAQ y por qué los usamos. Cuando tengas dudas, ahí lo encuentras todo.
                  </p>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5"
                    style={{
                      borderRadius: 8,
                      background: colors.bg,
                      border: `1px dashed ${colors.goldStrong}`,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9.5,
                      color: colors.gold,
                      letterSpacing: "1.4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Programa
                    <ChevronRight className="w-2.5 h-2.5" style={{ color: colors.gold }} strokeWidth={2} />
                    Manual de M2
                  </div>
                </div>

                {/* Wish */}
                <div className="text-center my-5 px-3 py-4">
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9,
                      color: colors.gold,
                      letterSpacing: "2.5px",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Coach Note
                  </p>
                  <h2
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 22,
                      lineHeight: 1.18,
                      letterSpacing: "-0.025em",
                      color: colors.text,
                      marginBottom: 12,
                    }}
                  >
                    Que tengas un<br />excelente primer entreno.
                  </h2>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 14, color: colors.muted, lineHeight: 1.4 }}>
                    Te espero en M2.<br />
                    <span style={{ color: colors.gold }}>— Andoni</span>
                  </p>
                </div>

                {/* CTA area: password hint + start button */}
                <div className="mt-auto pt-3">
                  <div
                    className="flex items-center gap-2.5 mb-3 p-3"
                    style={{
                      background: "rgba(196,162,78,0.05)",
                      border: `1px dashed ${colors.goldStrong}`,
                      borderRadius: 10,
                    }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 24, height: 24, borderRadius: 6, background: colors.goldSoft }}
                    >
                      <Key className="w-3 h-3" style={{ color: colors.gold }} strokeWidth={2} />
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: colors.muted, lineHeight: 1.4 }}>
                      Tu contraseña actual es temporal.{" "}
                      <strong style={{ color: colors.gold, fontWeight: 500 }}>Cámbiala en Perfil cuando quieras.</strong>
                    </p>
                  </div>

                  <button
                    onClick={onStart}
                    className="w-full active:scale-[0.98] transition-transform"
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: colors.gold,
                      color: "#1A1408",
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: "-0.01em",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    Empezar M2
                    <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
                  </button>

                  <p
                    className="text-center pt-3"
                    style={{
                      borderTop: "1px solid #1c1c22",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 8.5,
                      color: colors.muted,
                      letterSpacing: "2.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    VIP Beta · Founding member
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
