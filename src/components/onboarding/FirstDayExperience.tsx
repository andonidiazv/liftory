import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dumbbell,
  Wind,
  Leaf,
  Home,
  Calendar,
  TrendingUp,
  User,
  ChevronRight,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

interface WeekScheduleDay {
  dayLabel: string;
  workoutName: string;
  workoutType: string; // "strength" | "mobility" | "rest"
  muscleGroups: string;
}

interface FirstDayExperienceProps {
  programName: string;
  weekSchedule: WeekScheduleDay[];
  onComplete: () => void;
}

const TOTAL_SLIDES = 7;

const DAY_ABBREVS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

export default function FirstDayExperience({
  programName,
  weekSchedule,
  onComplete,
}: FirstDayExperienceProps) {
  const [current, setCurrent] = useState(0);
  const [mesoAnimated, setMesoAnimated] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;

  // Meso weeks with FORGED colors
  const MESO_WEEKS = [
    { num: 1, label: "BASE", barLabel: "Base", width: "35%", color: t.accent },
    { num: 2, label: "BASE +", barLabel: "Base+", width: "48%", color: t.accent },
    { num: 3, label: "ACUMULACION", barLabel: "Acum.", width: "62%", color: t.accent },
    { num: 4, label: "INTENSIFICACION", barLabel: "Intens.", width: "78%", color: t.accent },
    { num: 5, label: "PEAK", barLabel: "Peak", width: "92%", color: t.text },
    { num: 6, label: "DELOAD", barLabel: "Deload", width: "28%", color: t.muted },
  ];

  // Count day types for legend
  const strengthCount = weekSchedule.filter((d) => d.workoutType === "strength").length;
  const mobilityCount = weekSchedule.filter((d) => d.workoutType === "mobility").length;
  const restCount = weekSchedule.filter((d) => d.workoutType === "rest").length;

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= TOTAL_SLIDES) return;
      // Reset meso animation when leaving slide 3
      if (current === 3 && idx !== 3) {
        setMesoAnimated(false);
      }
      setCurrent(idx);
    },
    [current]
  );

  // Trigger meso bar animation when reaching slide 3
  useEffect(() => {
    if (current === 3) {
      const timer = setTimeout(() => setMesoAnimated(true), 100);
      return () => clearTimeout(timer);
    }
  }, [current]);

  const handleNext = () => {
    if (current === TOTAL_SLIDES - 1) {
      onComplete();
      return;
    }
    goTo(current + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goTo(current + 1);
      else goTo(current - 1);
    }
  };

  const isLastSlide = current === TOTAL_SLIDES - 1;

  // Animation classes helper
  const anim = (active: boolean, delay: number) => ({
    opacity: active ? 1 : 0,
    transform: active ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.5s ease ${delay * 0.1}s, transform 0.5s ease ${delay * 0.1}s`,
  });

  // Animated checkmark for slide 7
  const [checkAnimated, setCheckAnimated] = useState(false);
  useEffect(() => {
    if (current === 6) {
      const timer = setTimeout(() => setCheckAnimated(true), 400);
      return () => clearTimeout(timer);
    } else {
      setCheckAnimated(false);
    }
  }, [current]);
  const checkSize = 130;
  const checkRadius = 58;
  const checkCirc = 2 * Math.PI * checkRadius;

  // Helper functions for day type styling
  function getIconWrapBg(type: string): string {
    if (type === "strength") return t.accent;
    if (type === "mobility") return t.success;
    return t.muted;
  }

  function getSplitIconBg(type: string): string {
    if (type === "strength") return t.accent;
    if (type === "mobility") return t.success;
    return t.muted;
  }

  function getSplitNameColor(type: string): string | undefined {
    if (type === "mobility") return t.success;
    if (type === "rest") return t.muted;
    return undefined;
  }

  function getDayTypeLabel(type: string): string {
    if (type === "strength") return "Fuerza";
    if (type === "mobility") return "Recup.";
    return "Descanso";
  }

  // Icon stroke color (dark on accent bg for strength, white for others)
  function getDayIconStroke(type: string): string {
    if (type === "strength") return t.btnText;
    return "#fff";
  }

  function DayIcon({ type }: { type: string }) {
    const stroke = getDayIconStroke(type);
    if (type === "strength") return <Dumbbell className="w-[17px] h-[17px]" style={{ color: stroke }} />;
    if (type === "mobility") return <Wind className="w-[17px] h-[17px]" style={{ color: stroke }} />;
    return <Leaf className="w-[17px] h-[17px]" style={{ color: stroke }} />;
  }

  function SplitIcon({ type }: { type: string }) {
    const stroke = getDayIconStroke(type);
    if (type === "strength") return <Dumbbell className="w-[14px] h-[14px]" style={{ color: stroke }} />;
    if (type === "mobility") return <Wind className="w-[14px] h-[14px]" style={{ color: "#fff" }} />;
    return <Leaf className="w-[14px] h-[14px]" style={{ color: "#fff" }} />;
  }

  // Nav icon colors for the "Tu App" slide
  function getNavIconColor(idx: number): string {
    if (idx === 0) return t.accent;
    if (idx === 1) return t.accent;
    if (idx === 2) return t.success;
    return t.muted;
  }

  function getNavIconBg(idx: number): string {
    if (idx === 0) return t.accentBg;
    if (idx === 1) return t.accentBg;
    if (idx === 2) return `${t.success}18`;
    return `${t.muted}18`;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ background: t.bg, WebkitFontSmoothing: "antialiased" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides track */}
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${current * 100}%)`,
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.15, 1)",
        }}
      >
        {/* SLIDE 1: Welcome */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col justify-center px-8 pt-14 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* Decorative elements */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: -40,
              right: -40,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background:
                `radial-gradient(circle at 40% 40%, ${t.accent}18 0%, ${t.accent}0A 60%, transparent 100%)`,
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: 100,
              left: -60,
              width: 180,
              height: 180,
              borderRadius: "50%",
              border: `1px solid ${t.accent}18`,
            }}
          />

          <div
            className="inline-flex items-center gap-1.5 self-start rounded-full px-3.5 py-[7px] mb-6"
            style={{
              background: t.accentBg,
              border: `1px solid ${t.border}`,
              ...anim(current === 0, 1),
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.accent }} />
            <span
              className="font-display font-bold text-[11px] uppercase"
              style={{ letterSpacing: "0.06em", color: t.text }}
            >
              {programName}
            </span>
          </div>

          <h1
            className="font-display font-[800] text-[42px] leading-[1.08] mb-[18px]"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 0, 2) }}
          >
            Tu programa
            <br />
            esta listo
          </h1>

          <p
            className="font-body text-[15px] leading-[1.55] max-w-[280px]"
            style={{ color: t.muted, ...anim(current === 0, 3) }}
          >
            6 semanas disenadas para transformar tu fuerza y rendimiento.
          </p>
        </div>

        {/* SLIDE 2: Tu Semana */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: t.muted, ...anim(current === 1, 1) }}
          >
            Estructura semanal
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-8"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 1, 2) }}
          >
            Tu semana
          </h2>

          <div
            className="grid grid-cols-7 gap-1.5 mb-7"
            style={anim(current === 1, 3)}
          >
            {weekSchedule.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span
                  className="font-mono text-[11px] font-medium"
                  style={{ color: t.muted, letterSpacing: "0.04em" }}
                >
                  {day.dayLabel}
                </span>
                <div
                  className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
                  style={{ background: getIconWrapBg(day.workoutType) }}
                >
                  <DayIcon type={day.workoutType} />
                </div>
                <span
                  className="font-mono text-[8px] text-center"
                  style={{ color: t.muted, letterSpacing: "0.02em" }}
                >
                  {getDayTypeLabel(day.workoutType)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col gap-2 py-[18px]"
            style={{ borderTop: `1px solid ${t.border}`, ...anim(current === 1, 4) }}
          >
            {strengthCount > 0 && (
              <div className="flex items-center gap-2.5 text-[13px]" style={{ color: t.muted }}>
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: t.accent }} />
                <span>{strengthCount} dias de fuerza</span>
              </div>
            )}
            {mobilityCount > 0 && (
              <div className="flex items-center gap-2.5 text-[13px]" style={{ color: t.muted }}>
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: t.success }} />
                <span>{mobilityCount} recuperacion activa (opcional)</span>
              </div>
            )}
            {restCount > 0 && (
              <div className="flex items-center gap-2.5 text-[13px]" style={{ color: t.muted }}>
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: t.muted }} />
                <span>{restCount} descanso completo</span>
              </div>
            )}
          </div>
        </div>

        {/* SLIDE 3: Tu Split */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: t.muted, ...anim(current === 2, 1) }}
          >
            Workout split
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-7"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 2, 2) }}
          >
            Que entrenas
            <br />
            cada dia
          </h2>

          <div className="flex flex-col mt-1" style={anim(current === 2, 3)}>
            {weekSchedule.map((day, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 py-3.5"
                style={{ borderBottom: i < weekSchedule.length - 1 ? `1px solid ${t.border}` : "none" }}
              >
                <span
                  className="font-mono text-[10px] uppercase w-7 text-center flex-shrink-0"
                  style={{ color: t.muted, letterSpacing: "0.04em" }}
                >
                  {DAY_ABBREVS[i] ?? day.dayLabel}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: getSplitIconBg(day.workoutType) }}
                >
                  <SplitIcon type={day.workoutType} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display font-bold text-[13px]"
                    style={{ letterSpacing: "-0.01em", color: getSplitNameColor(day.workoutType) || t.text }}
                  >
                    {day.workoutName}
                  </div>
                  <div className="font-body text-[11px] mt-0.5" style={{ color: t.muted }}>
                    {day.muscleGroups}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLIDE 4: Tu Mesociclo */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: t.muted, ...anim(current === 3, 1) }}
          >
            Periodizacion
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-1.5"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 3, 2) }}
          >
            Tu mesociclo
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55] mb-6"
            style={{ color: t.muted, ...anim(current === 3, 3) }}
          >
            6 semanas de progresion inteligente.
          </p>

          <div className="flex flex-col mt-1" style={anim(current === 3, 4)}>
            {MESO_WEEKS.map((week, i) => (
              <div
                key={week.num}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < MESO_WEEKS.length - 1 ? `1px solid ${t.border}` : "none" }}
              >
                <span
                  className="font-mono text-[10px] text-right flex-shrink-0"
                  style={{ color: t.muted, width: 14 }}
                >
                  {week.num}
                </span>
                <div
                  className="flex-1 h-[26px] rounded-md overflow-hidden"
                  style={{ background: `${t.text}08` }}
                >
                  <div
                    className="h-full rounded-md flex items-center pl-2.5"
                    style={{
                      background: week.color,
                      width: mesoAnimated ? week.width : "0%",
                      transition: `width 0.7s cubic-bezier(0.4, 0, 0.15, 1) ${0.3 + i * 0.1}s`,
                    }}
                  >
                    <span
                      className="font-display font-bold text-[9px] uppercase"
                      style={{ letterSpacing: "0.05em", color: t.btnText }}
                    >
                      {week.barLabel}
                    </span>
                  </div>
                </div>
                <span
                  className="font-mono text-[9px] text-right flex-shrink-0"
                  style={{ color: t.muted, width: 80, letterSpacing: "0.02em" }}
                >
                  {week.label}
                </span>
              </div>
            ))}
          </div>

          <p
            className="text-[13px] leading-[1.5] mt-5 pt-4"
            style={{ color: t.muted, borderTop: `1px solid ${t.border}`, ...anim(current === 3, 5) }}
          >
            Cada fase sube la intensidad progresivamente. Las primeras semanas estableces pesos y tecnica. Hacia la
            semana 5 llegas a tu maximo rendimiento. La semana 6 tu cuerpo se recupera y sobrecompensa.
          </p>
        </div>

        {/* SLIDE 5: RPE y Tempo */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: t.muted, ...anim(current === 4, 1) }}
          >
            Conceptos clave
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-2"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 4, 2) }}
          >
            RPE y Tempo
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55] mb-6"
            style={{ color: t.muted, ...anim(current === 4, 3) }}
          >
            Dos herramientas que vas a ver en cada workout.
          </p>

          {/* RPE Card */}
          <div
            className="rounded-[14px] p-[18px] mb-3.5"
            style={{ background: t.card, border: `1px solid ${t.border}`, ...anim(current === 4, 4) }}
          >
            <div
              className="font-display font-bold text-[14px] mb-2"
              style={{ letterSpacing: "-0.01em", color: t.text }}
            >
              RPE -- Esfuerzo Percibido
            </div>
            <div className="font-body text-[13px] leading-[1.5]" style={{ color: t.muted }}>
              Indica que tan cerca del fallo muscular deberias llegar. RPE 7 = podrias hacer 3 reps mas. RPE 9 = solo
              te queda 1 rep.
            </div>
            <div className="flex gap-1 my-2.5">
              {[
                { val: 6, bg: t.success },
                { val: 7, bg: t.success },
                { val: 8, bg: t.accent },
                { val: 9, bg: t.accent },
                { val: 10, bg: t.text },
              ].map((r) => (
                <div
                  key={r.val}
                  className="flex-1 h-[22px] rounded flex items-center justify-center font-mono text-[9px] font-medium"
                  style={{ background: r.bg, color: r.val <= 7 ? "#fff" : t.btnText }}
                >
                  {r.val}
                </div>
              ))}
            </div>
            <div className="font-body text-[11px]" style={{ color: t.muted }}>
              Facil &larr; - - - - - - - - &rarr; Maximo
            </div>
          </div>

          {/* Tempo Card */}
          <div
            className="rounded-[14px] p-[18px] mb-3.5"
            style={{ background: t.card, border: `1px solid ${t.border}`, ...anim(current === 4, 5) }}
          >
            <div
              className="font-display font-bold text-[14px] mb-2"
              style={{ letterSpacing: "-0.01em", color: t.text }}
            >
              Tempo -- Velocidad del movimiento
            </div>
            <div className="font-body text-[13px] leading-[1.5]" style={{ color: t.muted }}>
              4 numeros que controlan cada fase de la repeticion.
            </div>
            <div className="grid my-3 max-w-[290px]" style={{ gridTemplateColumns: "1fr 16px 1fr 16px 1fr 16px 1fr", alignItems: "start" }}>
              {/* 3 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: t.success }}>
                  3
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: t.success, letterSpacing: "0.02em" }}>
                  Bajar
                  <br />3 seg
                </span>
              </div>
              {/* dash */}
              <div className="flex items-center" style={{ height: 42 }}>
                <span className="font-mono text-[28px] font-medium" style={{ color: t.border }}>
                  -
                </span>
              </div>
              {/* 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: t.accent }}>
                  1
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: t.accent, letterSpacing: "0.02em" }}>
                  Pausa
                  <br />
                  abajo
                </span>
              </div>
              {/* dash */}
              <div className="flex items-center" style={{ height: 42 }}>
                <span className="font-mono text-[28px] font-medium" style={{ color: t.border }}>
                  -
                </span>
              </div>
              {/* 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: t.muted }}>
                  1
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: t.muted, letterSpacing: "0.02em" }}>
                  Subir
                  <br />1 seg
                </span>
              </div>
              {/* dash */}
              <div className="flex items-center" style={{ height: 42 }}>
                <span className="font-mono text-[28px] font-medium" style={{ color: t.border }}>
                  -
                </span>
              </div>
              {/* 0 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: t.text }}>
                  0
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: t.text, letterSpacing: "0.02em" }}>
                  Pausa
                  <br />
                  arriba
                </span>
              </div>
            </div>
          </div>

          {/* Tu data importa Card */}
          <div
            className="rounded-[14px] p-[18px]"
            style={{
              background: t.accentBg,
              border: `1px solid ${t.accent}33`,
              ...anim(current === 4, 6),
            }}
          >
            <div className="font-display font-bold text-[14px] mb-2" style={{ color: t.accent, letterSpacing: "-0.01em" }}>
              Tu data importa
            </div>
            <div className="font-body text-[13px] leading-[1.5]" style={{ color: t.muted }}>
              Registra el peso de cada serie al completarla. La app aprende de tus datos para sugerirte pesos, rastrear
              tu progreso y darte analiticas reales de tu rendimiento. Entre mas registres, mas inteligente se vuelve tu
              programa.
            </div>
            <div className="font-body text-[11px] mt-2.5" style={{ color: t.muted }}>
              Proximamente: integracion con wearables para una foto completa de tu rendimiento.
            </div>
          </div>
        </div>

        {/* SLIDE 6: Tu App */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: t.muted, ...anim(current === 5, 1) }}
          >
            Navegacion
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-2"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 5, 2) }}
          >
            Tu app
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55] mb-6"
            style={{ color: t.muted, ...anim(current === 5, 3) }}
          >
            Donde encontrar cada cosa.
          </p>

          <div className="flex flex-col mt-1" style={anim(current === 5, 4)}>
            {[
              {
                icon: <Home className="w-[18px] h-[18px]" style={{ color: getNavIconColor(0) }} />,
                name: "Home",
                desc: "Tu workout del dia, progreso semanal y acceso rapido a tu sesion.",
              },
              {
                icon: <Calendar className="w-[18px] h-[18px]" style={{ color: getNavIconColor(1) }} />,
                name: "Programa",
                desc: "Calendario completo de tu mesociclo. Navega entre semanas y dias.",
              },
              {
                icon: <TrendingUp className="w-[18px] h-[18px]" style={{ color: getNavIconColor(2) }} />,
                name: "Progreso",
                desc: "Tus estadisticas, records personales y evolucion de fuerza.",
              },
              {
                icon: <User className="w-[18px] h-[18px]" style={{ color: getNavIconColor(3) }} />,
                name: "Perfil",
                desc: "Tus badges, logros y galeria de videos. Tu identidad como atleta.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 py-3.5"
                style={{ borderBottom: i < 3 ? `1px solid ${t.border}` : "none" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: getNavIconBg(i) }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display font-bold text-[14px]"
                    style={{ letterSpacing: "-0.01em", color: t.text }}
                  >
                    {item.name}
                  </div>
                  <div className="font-body text-[12px] mt-0.5 leading-[1.4]" style={{ color: t.muted }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="text-[12px] leading-[1.5] mt-5 pt-4"
            style={{ color: t.muted, borderTop: `1px solid ${t.border}`, ...anim(current === 5, 5) }}
          >
            Cada workout tiene notas de tu coach con indicaciones especificas para ese dia.
          </div>
        </div>

        {/* SLIDE 7: Todo esta listo */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col justify-center items-center text-center px-8 pt-14 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="relative mb-9" style={{ width: checkSize, height: checkSize, ...anim(current === 6, 1) }}>
            <svg width={checkSize} height={checkSize} viewBox="0 0 130 130">
              {/* Background circle */}
              <circle cx="65" cy="65" r={checkRadius} fill="none" stroke={t.border} strokeWidth="3" />
              {/* Animated accent circle that draws in */}
              <circle
                cx="65"
                cy="65"
                r={checkRadius}
                fill="none"
                stroke={t.accent}
                strokeWidth="3.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: checkCirc,
                  strokeDashoffset: checkAnimated ? 0 : checkCirc,
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                  transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.15, 1)",
                }}
              />
              {/* Animated checkmark path */}
              <path
                d="M42 67 L57 82 L88 51"
                fill="none"
                stroke={t.accent}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 75,
                  strokeDashoffset: checkAnimated ? 0 : 75,
                  transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.15, 1) 0.7s",
                }}
              />
            </svg>
          </div>

          <h2
            className="font-display font-[800] text-[36px] leading-[1.08] mb-3"
            style={{ letterSpacing: "-0.03em", color: t.text, ...anim(current === 6, 2) }}
          >
            Todo esta
            <br />
            listo.
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55]"
            style={{ color: t.muted, ...anim(current === 6, 3) }}
          >
            Tu primer entrenamiento te espera.
          </p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-12 pt-7"
        style={{
          background: `linear-gradient(to top, ${t.bg} 70%, transparent)`,
          display: "flex",
          flexDirection: isLastSlide ? "column" : "row",
          alignItems: isLastSlide ? "stretch" : "center",
          justifyContent: isLastSlide ? "flex-end" : "space-between",
          gap: isLastSlide ? 14 : 0,
        }}
      >
        {/* Dots */}
        <div className="flex gap-1.5" style={{ justifyContent: isLastSlide ? "center" : "flex-start" }}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="p-0 border-none cursor-pointer rounded-full"
              style={{
                width: i === current ? 20 : 7,
                height: 7,
                borderRadius: 100,
                background: i === current ? t.accent : `${t.text}1A`,
                transition: "all 0.35s ease",
              }}
            />
          ))}
        </div>

        {/* Nav button */}
        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-[7px] border-none cursor-pointer"
          style={{
            height: isLastSlide ? 54 : 48,
            padding: isLastSlide ? "0" : "0 24px",
            borderRadius: 100,
            background: t.accent,
            color: t.btnText,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: isLastSlide ? 15 : 13,
            letterSpacing: isLastSlide ? "0.06em" : "0.02em",
            textTransform: "uppercase",
            width: isLastSlide ? "100%" : "auto",
            transition: "all 0.3s ease",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span>{isLastSlide ? "EMPEZAR" : "Siguiente"}</span>
          {!isLastSlide && <ChevronRight className="w-[15px] h-[15px]" />}
        </button>
      </div>
    </div>
  );
}
