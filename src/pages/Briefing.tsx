import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { todayWorkout, sessionBlocks, user } from "@/data/workout";
import { ChevronLeft, ChevronRight, Sun, Zap, HeartPulse, Leaf } from "lucide-react";
import heroImage from "@/assets/briefing-hero.jpg";

const blockMeta = [
  {
    id: "warmup",
    icon: Sun,
    accentFrom: "#C9A96E",
    accentTo: "#D4A055",
    iconColor: "#C9A96E",
    iconBg: "rgba(201,169,110,0.08)",
  },
  {
    id: "strength",
    icon: Zap,
    accentFrom: "#B8622F",
    accentTo: "#D4784A",
    iconColor: "#B8622F",
    iconBg: "rgba(184,98,47,0.08)",
  },
  {
    id: "conditioning",
    icon: HeartPulse,
    accentFrom: "#B8622F",
    accentTo: "#E09060",
    iconColor: "#B8622F",
    iconBg: "rgba(184,98,47,0.08)",
  },
  {
    id: "cooldown",
    icon: Leaf,
    accentFrom: "#8A8A8E",
    accentTo: "#9B9690",
    iconColor: "#8A8A8E",
    iconBg: "rgba(138,138,142,0.08)",
  },
];

export default function Briefing() {
  const navigate = useNavigate();
  const { startWorkout } = useApp();

  const handleStart = () => {
    startWorkout();
    navigate("/workout", { replace: true });
  };

  const cycleDay = (user.week - 1) * 4 + 4;
  const totalDays = user.totalWeeks * 4;
  const progressPct = (cycleDay / totalDays) * 100;

  return (
    <div className="min-h-screen" style={{ background: "#0D0C0A" }}>
      {/* HERO IMAGE */}
      <div className="relative w-full" style={{ height: "48vh" }}>
        <img
          src={heroImage}
          alt="Workout del día"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Top gradient */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: 80,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)",
          }}
        />
        {/* Bottom gradient */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "60%",
            background:
              "linear-gradient(to top, #0D0C0A 0%, rgba(13,12,10,0.92) 30%, rgba(13,12,10,0.4) 60%, transparent 100%)",
          }}
        />

        {/* Nav overlay */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-14">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: "#FAF8F5" }} />
          </button>
          <div
            className="font-mono rounded-full px-3 py-1.5"
            style={{
              color: "#FAF8F5",
              fontSize: 11,
              letterSpacing: "0.15em",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Sem {user.week} de {user.totalWeeks}
          </div>
        </div>

        {/* Content over hero */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-4">
          <p
            className="font-mono uppercase"
            style={{ color: "#B8622F", fontSize: 11, letterSpacing: "2.5px" }}
          >
            DÍA {cycleDay} DE {totalDays}
          </p>
          <h1
            className="font-display mt-1"
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#FAF8F5",
              lineHeight: 1.1,
            }}
          >
            {todayWorkout.name}
          </h1>
          <p className="mt-1" style={{ color: "#8A8A8E", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
            Construye pecho y hombros
          </p>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="flex items-center gap-3 px-6 py-3.5">
        <div className="flex-1 overflow-hidden" style={{ height: 4, background: "#1C1C1E", borderRadius: 2 }}>
          <div
            className="h-full"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(to right, #B8622F, #C9A96E)",
              borderRadius: 2,
            }}
          />
        </div>
        <span className="font-mono" style={{ color: "#8A8A8E", fontSize: 11, letterSpacing: "0.05em" }}>
          {cycleDay}/{totalDays}
        </span>
      </div>

      {/* STATEMENT CARD */}
      <div className="px-6">
        <div
          style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", borderRadius: 12, padding: 20 }}
        >
          <p className="font-serif italic" style={{ color: "#FAF8F5", fontSize: 15, lineHeight: 1.65, fontWeight: 300 }}>
            Hoy el foco es{" "}
            <span className="not-italic" style={{ color: "#B8622F", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              tensión mecánica en pecho
            </span>
            . Controla la bajada, domina el peso. Arrancas con movilidad para preparar
            articulaciones, construyes fuerza con tempos que transforman cada rep, subes la
            intensidad con un EMOM de 10 minutos y cierras con recuperación activa.
          </p>

          {/* Whoop line */}
          <div
            className="mt-4 flex items-center gap-3 pt-3.5"
            style={{ borderTop: "1px solid rgba(250,248,245,0.08)" }}
          >
            <div
              className="font-mono flex h-5 w-5 shrink-0 items-center justify-center"
              style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "#8A8A8E" }}
            >
              W
            </div>
            <div className="flex flex-1 items-center">
              {[
                { value: "78%", label: "Recovery" },
                { value: "14.2", label: "Esfuerzo" },
                { value: "485", label: "kcal target" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="flex flex-1 flex-col items-center"
                  style={i < 2 ? { borderRight: "1px solid rgba(250,248,245,0.08)" } : undefined}
                >
                  <span className="font-mono" style={{ color: "#FAF8F5", fontSize: 14, fontWeight: 500 }}>
                    {stat.value}
                  </span>
                  <span
                    className="mt-0.5 uppercase"
                    style={{ color: "#8A8A8E", fontSize: 9, letterSpacing: "0.8px", fontFamily: "'DM Mono', monospace" }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SESSION LABEL */}
      <div className="flex items-center gap-3 px-6 pb-2 pt-6">
        <span className="shrink-0" style={{ color: "#8A8A8E", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
          55-65 min · 4 bloques
        </span>
        <div className="flex-1" style={{ height: 1, background: "rgba(250,248,245,0.08)" }} />
      </div>

      {/* BLOCK GRID */}
      <div className="grid grid-cols-2 gap-2.5 px-6 pb-40">
        {sessionBlocks.map((block, index) => {
          const meta = blockMeta.find((m) => m.id === block.id) || blockMeta[0];
          const Icon = meta.icon;

          return (
            <div
              key={block.id}
              className="relative overflow-hidden"
              style={{
                background: "#1C1C1E",
                border: "1px solid rgba(250,248,245,0.08)",
                borderRadius: 12,
                animationDelay: `${index * 0.06}s`,
                animation: "fade-up-in 0.4s ease-out both",
              }}
            >
              {/* Accent bar */}
              <div
                className="h-[3px] w-full"
                style={{
                  background: `linear-gradient(to right, ${meta.accentFrom}, ${meta.accentTo})`,
                }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-[38px] w-[38px] items-center justify-center"
                    style={{ background: meta.iconBg, borderRadius: 12 }}
                  >
                    <Icon
                      className="h-[18px] w-[18px]"
                      style={{ color: meta.iconColor }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="font-mono" style={{ color: "#8A8A8E", fontSize: 11, letterSpacing: "0.05em" }}>
                    {block.estimatedTime}
                  </span>
                </div>
                <p
                  className="mt-3 font-display font-bold"
                  style={{ color: "#FAF8F5", fontSize: 14 }}
                >
                  {block.name}
                </p>
                <p className="mt-0.5" style={{ color: "#8A8A8E", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  {block.exercises.length} ejercicios
                </p>
                {block.format && (
                  <span
                    className="font-mono mt-2 inline-block px-2 py-1"
                    style={{
                      color: "#B8622F",
                      background: "rgba(184,98,47,0.08)",
                      border: "1px solid rgba(184,98,47,0.12)",
                      borderRadius: 4,
                      fontSize: 10,
                    }}
                  >
                    {block.format}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FIXED CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 px-6 pb-8 pt-4"
        style={{
          background: "linear-gradient(to top, #0D0C0A 60%, transparent)",
        }}
      >
        <button
          onClick={handleStart}
          className="press-scale flex w-full items-center justify-center gap-2 py-[18px] font-body font-medium text-white"
          style={{
            background: "linear-gradient(to right, #B8622F, #8B4513)",
            boxShadow: "0 8px 28px rgba(184,98,47,0.3)",
            fontSize: 15,
            borderRadius: 12,
          }}
        >
          Comenzar sesión
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
