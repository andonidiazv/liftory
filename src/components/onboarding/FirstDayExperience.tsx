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

const MESO_WEEKS = [
  { num: 1, label: "BASE", barLabel: "Base", width: "35%", color: "#7A8B5C" },
  { num: 2, label: "BASE +", barLabel: "Base+", width: "48%", color: "#7A8B5C" },
  { num: 3, label: "ACUMULACION", barLabel: "Acum.", width: "62%", color: "#C75B39" },
  { num: 4, label: "INTENSIFICACION", barLabel: "Intens.", width: "78%", color: "#C75B39" },
  { num: 5, label: "PEAK", barLabel: "Peak", width: "92%", color: "#1a1a1a" },
  { num: 6, label: "DELOAD", barLabel: "Deload", width: "28%", color: "#C9A96E" },
];

function DayIcon({ type, stroke = "#fff" }: { type: string; stroke?: string }) {
  if (type === "strength") return <Dumbbell className="w-[17px] h-[17px]" style={{ color: stroke }} />;
  if (type === "mobility") return <Wind className="w-[17px] h-[17px]" style={{ color: stroke }} />;
  return <Leaf className="w-[17px] h-[17px]" style={{ color: stroke }} />;
}

function SplitIcon({ type }: { type: string }) {
  if (type === "strength") return <Dumbbell className="w-[14px] h-[14px]" style={{ color: "#fff" }} />;
  if (type === "mobility") return <Wind className="w-[14px] h-[14px]" style={{ color: "#fff" }} />;
  return <Leaf className="w-[14px] h-[14px]" style={{ color: "#fff" }} />;
}

function getDayTypeLabel(type: string): string {
  if (type === "strength") return "Fuerza";
  if (type === "mobility") return "Recup.";
  return "Descanso";
}

function getIconWrapBg(type: string): string {
  if (type === "strength") return "#1a1a1a";
  if (type === "mobility") return "#7A8B5C";
  return "#C9A96E";
}

function getSplitIconBg(type: string): string {
  if (type === "strength") return "#1a1a1a";
  if (type === "mobility") return "#7A8B5C";
  return "#C9A96E";
}

function getSplitNameColor(type: string): string | undefined {
  if (type === "mobility") return "#7A8B5C";
  if (type === "rest") return "#C9A96E";
  return undefined;
}

export default function FirstDayExperience({
  programName,
  weekSchedule,
  onComplete,
}: FirstDayExperienceProps) {
  const [current, setCurrent] = useState(0);
  const [mesoAnimated, setMesoAnimated] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ background: "#FAF9F6", WebkitFontSmoothing: "antialiased" }}
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
                "radial-gradient(circle at 40% 40%, rgba(122,139,92,0.1) 0%, rgba(201,169,110,0.05) 60%, transparent 100%)",
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
              border: "1px solid rgba(122,139,92,0.1)",
            }}
          />

          <div
            className="inline-flex items-center gap-1.5 self-start rounded-full px-3.5 py-[7px] mb-6"
            style={{
              background: "rgba(26,26,26,0.04)",
              border: "1px solid rgba(26,26,26,0.07)",
              ...anim(current === 0, 1),
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#7A8B5C" }} />
            <span
              className="font-display font-bold text-[11px] uppercase"
              style={{ letterSpacing: "0.06em", color: "#1a1a1a" }}
            >
              {programName}
            </span>
          </div>

          <h1
            className="font-display font-[800] text-[42px] leading-[1.08] mb-[18px]"
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 0, 2) }}
          >
            Tu programa
            <br />
            esta listo
          </h1>

          <p
            className="font-body text-[15px] leading-[1.55] max-w-[280px]"
            style={{ color: "#777", ...anim(current === 0, 3) }}
          >
            6 semanas disenadas para transformar tu fuerza y rendimiento.
          </p>
        </div>

        {/* SLIDE 2: Tu Semana */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: "#aaa", ...anim(current === 1, 1) }}
          >
            Estructura semanal
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-8"
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 1, 2) }}
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
                  style={{ color: "#999", letterSpacing: "0.04em" }}
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
                  style={{ color: "#bbb", letterSpacing: "0.02em" }}
                >
                  {getDayTypeLabel(day.workoutType)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col gap-2 py-[18px]"
            style={{ borderTop: "1px solid rgba(0,0,0,0.05)", ...anim(current === 1, 4) }}
          >
            {strengthCount > 0 && (
              <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "#666" }}>
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "#1a1a1a" }} />
                <span>{strengthCount} dias de fuerza</span>
              </div>
            )}
            {mobilityCount > 0 && (
              <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "#666" }}>
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "#7A8B5C" }} />
                <span>{mobilityCount} recuperacion activa (opcional)</span>
              </div>
            )}
            {restCount > 0 && (
              <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "#666" }}>
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "#C9A96E" }} />
                <span>{restCount} descanso completo</span>
              </div>
            )}
          </div>
        </div>

        {/* SLIDE 3: Tu Split */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: "#aaa", ...anim(current === 2, 1) }}
          >
            Workout split
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-7"
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 2, 2) }}
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
                style={{ borderBottom: i < weekSchedule.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
              >
                <span
                  className="font-mono text-[10px] uppercase w-7 text-center flex-shrink-0"
                  style={{ color: "#aaa", letterSpacing: "0.04em" }}
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
                    style={{ letterSpacing: "-0.01em", color: getSplitNameColor(day.workoutType) || "#1a1a1a" }}
                  >
                    {day.workoutName}
                  </div>
                  <div className="font-body text-[11px] mt-0.5" style={{ color: "#999" }}>
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
            style={{ letterSpacing: "0.12em", color: "#aaa", ...anim(current === 3, 1) }}
          >
            Periodizacion
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-1.5"
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 3, 2) }}
          >
            Tu mesociclo
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55] mb-6"
            style={{ color: "#777", ...anim(current === 3, 3) }}
          >
            6 semanas de progresion inteligente.
          </p>

          <div className="flex flex-col mt-1" style={anim(current === 3, 4)}>
            {MESO_WEEKS.map((week, i) => (
              <div
                key={week.num}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < MESO_WEEKS.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
              >
                <span
                  className="font-mono text-[10px] text-right flex-shrink-0"
                  style={{ color: "#bbb", width: 14 }}
                >
                  {week.num}
                </span>
                <div
                  className="flex-1 h-[26px] rounded-md overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.03)" }}
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
                      className="font-display font-bold text-[9px] uppercase text-white"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      {week.barLabel}
                    </span>
                  </div>
                </div>
                <span
                  className="font-mono text-[9px] text-right flex-shrink-0"
                  style={{ color: "#999", width: 80, letterSpacing: "0.02em" }}
                >
                  {week.label}
                </span>
              </div>
            ))}
          </div>

          <p
            className="text-[13px] leading-[1.5] mt-5 pt-4"
            style={{ color: "#888", borderTop: "1px solid rgba(0,0,0,0.05)", ...anim(current === 3, 5) }}
          >
            Cada fase sube la intensidad progresivamente. Las primeras semanas estableces pesos y tecnica. Hacia la
            semana 5 llegas a tu maximo rendimiento. La semana 6 tu cuerpo se recupera y sobrecompensa.
          </p>
        </div>

        {/* SLIDE 5: RPE y Tempo */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: "#aaa", ...anim(current === 4, 1) }}
          >
            Conceptos clave
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-2"
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 4, 2) }}
          >
            RPE y Tempo
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55] mb-6"
            style={{ color: "#777", ...anim(current === 4, 3) }}
          >
            Dos herramientas que vas a ver en cada workout.
          </p>

          {/* RPE Card */}
          <div
            className="rounded-[14px] p-[18px] mb-3.5"
            style={{ background: "rgba(0,0,0,0.03)", ...anim(current === 4, 4) }}
          >
            <div
              className="font-display font-bold text-[14px] mb-2"
              style={{ letterSpacing: "-0.01em", color: "#1a1a1a" }}
            >
              RPE -- Esfuerzo Percibido
            </div>
            <div className="font-body text-[13px] leading-[1.5]" style={{ color: "#777" }}>
              Indica que tan cerca del fallo muscular deberias llegar. RPE 7 = podrias hacer 3 reps mas. RPE 9 = solo
              te queda 1 rep.
            </div>
            <div className="flex gap-1 my-2.5">
              {[
                { val: 6, bg: "#7A8B5C" },
                { val: 7, bg: "#7A8B5C" },
                { val: 8, bg: "#C9A96E" },
                { val: 9, bg: "#C75B39" },
                { val: 10, bg: "#1a1a1a" },
              ].map((r) => (
                <div
                  key={r.val}
                  className="flex-1 h-[22px] rounded flex items-center justify-center font-mono text-[9px] font-medium text-white"
                  style={{ background: r.bg }}
                >
                  {r.val}
                </div>
              ))}
            </div>
            <div className="font-body text-[11px]" style={{ color: "#aaa" }}>
              Facil &larr; - - - - - - - - &rarr; Maximo
            </div>
          </div>

          {/* Tempo Card */}
          <div
            className="rounded-[14px] p-[18px] mb-3.5"
            style={{ background: "rgba(0,0,0,0.03)", ...anim(current === 4, 5) }}
          >
            <div
              className="font-display font-bold text-[14px] mb-2"
              style={{ letterSpacing: "-0.01em", color: "#1a1a1a" }}
            >
              Tempo -- Velocidad del movimiento
            </div>
            <div className="font-body text-[13px] leading-[1.5]" style={{ color: "#777" }}>
              4 numeros que controlan cada fase de la repeticion.
            </div>
            <div className="grid my-3 max-w-[290px]" style={{ gridTemplateColumns: "1fr 16px 1fr 16px 1fr 16px 1fr", alignItems: "start" }}>
              {/* 3 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: "#7A8B5C" }}>
                  3
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: "#7A8B5C", letterSpacing: "0.02em" }}>
                  Bajar
                  <br />3 seg
                </span>
              </div>
              {/* dash */}
              <div className="flex items-center" style={{ height: 42 }}>
                <span className="font-mono text-[28px] font-medium" style={{ color: "#ccc" }}>
                  -
                </span>
              </div>
              {/* 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: "#C75B39" }}>
                  1
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: "#C75B39", letterSpacing: "0.02em" }}>
                  Pausa
                  <br />
                  abajo
                </span>
              </div>
              {/* dash */}
              <div className="flex items-center" style={{ height: 42 }}>
                <span className="font-mono text-[28px] font-medium" style={{ color: "#ccc" }}>
                  -
                </span>
              </div>
              {/* 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: "#C9A96E" }}>
                  1
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: "#C9A96E", letterSpacing: "0.02em" }}>
                  Subir
                  <br />1 seg
                </span>
              </div>
              {/* dash */}
              <div className="flex items-center" style={{ height: 42 }}>
                <span className="font-mono text-[28px] font-medium" style={{ color: "#ccc" }}>
                  -
                </span>
              </div>
              {/* 0 */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[28px] font-medium" style={{ color: "#1a1a1a" }}>
                  0
                </span>
                <span className="font-mono text-[9px] text-center leading-[1.3]" style={{ color: "#1a1a1a", letterSpacing: "0.02em" }}>
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
              background: "rgba(122,139,92,0.04)",
              border: "1px solid rgba(122,139,92,0.2)",
              ...anim(current === 4, 6),
            }}
          >
            <div className="font-display font-bold text-[14px] mb-2" style={{ color: "#7A8B5C", letterSpacing: "-0.01em" }}>
              Tu data importa
            </div>
            <div className="font-body text-[13px] leading-[1.5]" style={{ color: "#777" }}>
              Registra el peso de cada serie al completarla. La app aprende de tus datos para sugerirte pesos, rastrear
              tu progreso y darte analiticas reales de tu rendimiento. Entre mas registres, mas inteligente se vuelve tu
              programa.
            </div>
            <div className="font-body text-[11px] mt-2.5" style={{ color: "#aaa" }}>
              Proximamente: integracion con wearables para una foto completa de tu rendimiento.
            </div>
          </div>
        </div>

        {/* SLIDE 6: Tu App */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col px-8 pt-16 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <span
            className="font-mono text-[10px] uppercase mb-2.5"
            style={{ letterSpacing: "0.12em", color: "#aaa", ...anim(current === 5, 1) }}
          >
            Navegacion
          </span>
          <h2
            className="font-display font-[800] text-[30px] leading-[1.08] mb-2"
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 5, 2) }}
          >
            Tu app
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55] mb-6"
            style={{ color: "#777", ...anim(current === 5, 3) }}
          >
            Donde encontrar cada cosa.
          </p>

          <div className="flex flex-col mt-1" style={anim(current === 5, 4)}>
            {[
              {
                icon: <Home className="w-[18px] h-[18px]" style={{ color: "#1a1a1a" }} />,
                bgClass: "rgba(26,26,26,0.08)",
                name: "Home",
                desc: "Tu workout del dia, progreso semanal y acceso rapido a tu sesion.",
              },
              {
                icon: <Calendar className="w-[18px] h-[18px]" style={{ color: "#C75B39" }} />,
                bgClass: "rgba(199,91,57,0.1)",
                name: "Programa",
                desc: "Calendario completo de tu mesociclo. Navega entre semanas y dias.",
              },
              {
                icon: <TrendingUp className="w-[18px] h-[18px]" style={{ color: "#7A8B5C" }} />,
                bgClass: "rgba(122,139,92,0.12)",
                name: "Progreso",
                desc: "Tus estadisticas, records personales y evolucion de fuerza.",
              },
              {
                icon: <User className="w-[18px] h-[18px]" style={{ color: "#C9A96E" }} />,
                bgClass: "rgba(201,169,110,0.12)",
                name: "Perfil",
                desc: "Tus badges, logros y galeria de videos. Tu identidad como atleta.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 py-3.5"
                style={{ borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: item.bgClass }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display font-bold text-[14px]"
                    style={{ letterSpacing: "-0.01em", color: "#1a1a1a" }}
                  >
                    {item.name}
                  </div>
                  <div className="font-body text-[12px] mt-0.5 leading-[1.4]" style={{ color: "#999" }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="text-[12px] leading-[1.5] mt-5 pt-4"
            style={{ color: "#aaa", borderTop: "1px solid rgba(0,0,0,0.05)", ...anim(current === 5, 5) }}
          >
            Cada workout tiene notas de tu coach con indicaciones especificas para ese dia.
          </div>
        </div>

        {/* SLIDE 7: Todo esta listo */}
        <div className="w-full min-w-full max-w-full h-full flex-shrink-0 relative flex flex-col justify-center items-center text-center px-8 pt-14 pb-36 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="relative mb-9" style={{ width: checkSize, height: checkSize, ...anim(current === 6, 1) }}>
            <svg width={checkSize} height={checkSize} viewBox="0 0 130 130">
              {/* Background circle */}
              <circle cx="65" cy="65" r={checkRadius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
              {/* Animated green circle that draws in */}
              <circle
                cx="65"
                cy="65"
                r={checkRadius}
                fill="none"
                stroke="#7A8B5C"
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
                stroke="#7A8B5C"
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
            style={{ letterSpacing: "-0.03em", color: "#1a1a1a", ...anim(current === 6, 2) }}
          >
            Todo esta
            <br />
            listo.
          </h2>
          <p
            className="font-body text-[15px] leading-[1.55]"
            style={{ color: "#777", ...anim(current === 6, 3) }}
          >
            Tu primer entrenamiento te espera.
          </p>
        </div>
      </div>

      {/* Bottom navigation */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-12 pt-7"
        style={{
          background: "linear-gradient(to top, #FAF9F6 70%, transparent)",
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
                background: i === current ? "#1a1a1a" : "rgba(0,0,0,0.1)",
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
            background: "#1a1a1a",
            color: "#fff",
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
