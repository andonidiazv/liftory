import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Dumbbell,
  Target,
  TrendingUp,
  Play,
  Calendar,
  BarChart3,
  ChevronDown,
  ArrowRight,
  Check,
  Flame,
  Clock,
  Zap,
} from "lucide-react";

/* ─────────────── CONSTANTS ─────────────── */
const FOUNDERS_SPOTS = 100;
const FOUNDERS_PRICE = 199;
const REGULAR_PRICE = 399;
const FOUNDER_PRICE_ID = "price_1TFjro0XOkcK4IZPvsYWsviF";

/* ─────────────── ANIMATED COUNTER ─────────────── */
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const [rolling, setRolling] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setRolling(true);
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const linearProgress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(linearProgress);
            setValue(Math.round(easedProgress * target));
            if (linearProgress < 1) {
              requestAnimationFrame(tick);
            } else {
              setRolling(false);
            }
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref, rolling };
}

/* ─────────────── FADE-IN ON SCROLL ─────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    visible,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
    } as React.CSSProperties,
  };
}

/* ─────────────── STAGGERED CHILDREN ON SCROLL ─────────────── */
function useStagger(count: number, delayMs = 120) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getItemStyle = (index: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0) translateX(0)" : "translateY(20px) translateX(-16px)",
    transition: `opacity 0.5s ease-out ${index * delayMs}ms, transform 0.5s ease-out ${index * delayMs}ms`,
  });

  return { ref, visible, getItemStyle };
}

/* ─────────────── SECTION WRAPPER ─────────────── */
function Section({
  children,
  className = "",
  dark = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  id?: string;
}) {
  const fade = useFadeIn();
  return (
    <section
      id={id}
      ref={fade.ref}
      style={{ ...fade.style, background: dark ? "#0F0F0F" : "#FAF8F5" }}
      className={`w-full px-6 py-16 md:py-24 ${className}`}
    >
      <div className="mx-auto max-w-3xl">{children}</div>
    </section>
  );
}

/* ─────────────── EYEBROW ─────────────── */
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className="eyebrow-label mb-4 block"
      style={light ? { color: "#C75B39" } : { color: "#C75B39" }}
    >
      {children}
    </span>
  );
}

/* ─────────────── PROBLEM CARDS (stagger in) ─────────────── */
function ProblemCards() {
  const stagger = useStagger(3, 150);
  return (
    <div ref={stagger.ref} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { icon: Clock, label: "Horas perdidas", desc: "Sin estructura ni dirección" },
        { icon: TrendingUp, label: "Cero progreso", desc: "Rutinas sin periodización" },
        { icon: Target, label: "Sin feedback", desc: "No sabes si vas bien" },
      ].map((item, i) => (
        <div
          key={item.label}
          className="rounded-xl p-5"
          style={{
            background: "#1A1A1A",
            border: "1px solid #2A2A2A",
            ...stagger.getItemStyle(i),
          }}
        >
          <item.icon className="mb-3 h-5 w-5" style={{ color: "#C75B39" }} />
          <p className="font-display text-[14px] font-semibold text-white">{item.label}</p>
          <p className="mt-1 font-body text-[13px]" style={{ color: "#888" }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── SOLUTION BLOCKS (slide in from left, staggered) ─────────────── */
const solutionData = [
  {
    icon: Calendar,
    title: "Programas de 6 semanas",
    desc: "Periodización real con mesociclos, deloads y progresión lineal/ondulante. Nada de rutinas aleatorias.",
    accent: "#C75B39",
  },
  {
    icon: Play,
    title: "Videos demostrativos de cada ejercicio",
    desc: "120+ videos filmados con técnica correcta, coaching cues y tempo indicado en los ejercicios que lo requieren.",
    accent: "#C9A96E",
  },
  {
    icon: TrendingUp,
    title: "Progresión estructurada",
    desc: "Cada semana sube el volumen y la intensidad de forma planificada. Sabes exactamente qué toca y por qué.",
    accent: "#7A8B5C",
  },
  {
    icon: Dumbbell,
    title: "8 patrones de movimiento",
    desc: "Push, pull, squat, hinge, core, rotation, carry y locomotion. Entrenamiento balanceado y funcional.",
    accent: "#C75B39",
  },
  {
    icon: BarChart3,
    title: "Tracking y métricas reales",
    desc: "Volumen total, tonelaje, PRs personales y tendencias para que veas tu progreso con datos concretos.",
    accent: "#C9A96E",
  },
];

function SolutionBlocks() {
  const stagger = useStagger(5, 130);
  return (
    <div ref={stagger.ref} className="mt-10 space-y-6">
      {solutionData.map((block, i) => (
        <div
          key={block.title}
          className="flex gap-5 rounded-xl p-5"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            borderLeft: `3px solid ${block.accent}`,
            ...stagger.getItemStyle(i),
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${block.accent}12` }}
          >
            <block.icon className="h-5 w-5" style={{ color: block.accent }} />
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold" style={{ color: "#1C1C1E" }}>
              {block.title}
            </p>
            <p className="mt-1 font-body text-[13px] leading-relaxed" style={{ color: "#8A8A8E" }}>
              {block.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── HOW IT WORKS (sequential reveal with line) ─────────────── */
const stepsData = [
  {
    step: "01",
    title: "Crea tu perfil",
    desc: "Nivel de experiencia, equipo disponible y objetivos. En 2 minutos, LIFTORY sabe qué necesitas.",
  },
  {
    step: "02",
    title: "Recibe tu programa",
    desc: "Un programa de 6 semanas con progresión semana a semana, videos y coaching cues en cada ejercicio.",
  },
  {
    step: "03",
    title: "Entrena y progresa",
    desc: "Registra tus sets en tiempo real, ve tus PRs y sigue la progresión de cargas y volumen semana a semana.",
  },
];

function HowItWorksSteps() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mt-10 space-y-8 pl-[22px]">
      {/* Vertical connecting line */}
      <div
        className="absolute left-[19px] top-0 w-[2px]"
        style={{
          background: "linear-gradient(180deg, rgba(184,98,47,0.3), rgba(184,98,47,0.05))",
          height: visible ? "100%" : "0%",
          transition: "height 1.2s ease-out 0.3s",
        }}
      />

      {stepsData.map((item, i) => (
        <div
          key={item.step}
          className="relative flex gap-5"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateX(0)" : "translateX(-24px)",
            transition: `opacity 0.5s ease-out ${300 + i * 250}ms, transform 0.5s ease-out ${300 + i * 250}ms`,
          }}
        >
          <div
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-medium"
            style={{
              background: visible ? "rgba(184,98,47,0.15)" : "rgba(184,98,47,0.05)",
              color: "#B8622F",
              transition: `background 0.4s ease-out ${300 + i * 250}ms`,
              boxShadow: visible ? "0 0 12px rgba(184,98,47,0.2)" : "none",
            }}
          >
            {item.step}
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold" style={{ color: "#1C1C1E" }}>
              {item.title}
            </p>
            <p className="mt-1 font-body text-[13px] leading-relaxed" style={{ color: "#8A8A8E" }}>
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── PRICING CARD (glow pulse + staggered benefits) ─────────────── */
function PricingCard({ navigate, claimFounder }: { navigate: (path: string) => void; claimFounder: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const benefits = [
    "Programas periodizados de 6 semanas",
    "120+ ejercicios con video demostrativo",
    "Progresión estructurada de cargas y volumen",
    "Tracking de volumen, tonelaje y PRs",
    "Coaching cues en cada ejercicio",
    "Acceso a todas las actualizaciones futuras",
    "Precio de fundador bloqueado de por vida",
  ];

  return (
    <div
      ref={ref}
      className="relative mx-auto mt-8 max-w-sm overflow-hidden rounded-2xl"
      style={{
        background: "#1A1A1A",
        border: "1px solid rgba(199,91,57,0.3)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.96)",
        transition: "opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)",
      }}
    >
      {/* Animated glow top border */}
      <div
        className="h-[2px] w-full"
        style={{
          background: "linear-gradient(90deg, transparent, #C75B39, transparent)",
          animation: visible ? "glow-slide 2s ease-in-out 0.6s 1" : "none",
        }}
      />

      <div className="p-8 text-center">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ background: "rgba(199,91,57,0.12)", color: "#C75B39" }}
        >
          <Zap className="h-3 w-3" style={{
            animation: visible ? "flicker 1s ease-in-out 0.8s 1" : "none",
          }} />
          Solo {FOUNDERS_SPOTS} lugares
        </span>

        {/* Price — scale pop */}
        <div
          className="mt-6"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.4s ease-out 0.4s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s",
          }}
        >
          <span className="font-body text-[16px] line-through" style={{ color: "#666" }}>
            ${REGULAR_PRICE} MXN
          </span>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span
              className="font-display text-[48px] font-bold"
              style={{ color: "#FFFFFF", letterSpacing: "-0.03em" }}
            >
              ${FOUNDERS_PRICE}
            </span>
            <span className="font-body text-[14px]" style={{ color: "#888" }}>
              MXN/mes
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: "#C75B39" }}>
            50% de descuento — para siempre
          </p>
        </div>

        {/* Benefits — staggered check marks */}
        <div className="mt-8 space-y-3 text-left">
          {benefits.map((benefit, i) => (
            <div
              key={benefit}
              className="flex items-start gap-3"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-12px)",
                transition: `opacity 0.3s ease-out ${600 + i * 80}ms, transform 0.3s ease-out ${600 + i * 80}ms`,
              }}
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#7A8B5C" }} />
              <span className="font-body text-[13px]" style={{ color: "#DEDAD4" }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA — pulses after everything loads */}
        <button
          onClick={claimFounder}
          className="press-scale mt-8 w-full font-display text-[15px] font-semibold text-white"
          style={{
            background: "#C75B39",
            borderRadius: 12,
            height: 52,
            boxShadow: "0 0 24px rgba(199,91,57,0.3)",
            animation: visible ? "pulse-glow 2s ease-in-out 1.8s 2" : "none",
          }}
        >
          Reclamar mi lugar de Founder
        </button>

        <p className="mt-3 font-body text-[11px]" style={{ color: "#666" }}>
          Cancela cuando quieras. Sin contratos. Sin sorpresas.
        </p>
      </div>
    </div>
  );
}

/* ─────────────── FINAL CTA (text reveal) ─────────────── */
function FinalCTA({ navigate, claimFounder }: { navigate: (path: string) => void; claimFounder: () => void }) {
  const fade = useFadeIn();

  return (
    <section
      ref={fade.ref}
      className="relative w-full px-6 py-20"
      style={{
        background: "linear-gradient(180deg, #0F0F0F 0%, #1A1008 100%)",
      }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h3
          className="font-display text-[24px] font-bold md:text-[32px]"
          style={{
            color: "#FAF8F5",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            opacity: fade.visible ? 1 : 0,
            transform: fade.visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
          }}
        >
          Deja de improvisar.
          <br />
          <span
            style={{
              color: "#C75B39",
              display: "inline-block",
              opacity: fade.visible ? 1 : 0,
              transform: fade.visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
              transition: "opacity 0.5s ease-out 0.35s, transform 0.5s ease-out 0.35s",
            }}
          >
            Empieza a progresar.
          </span>
        </h3>
        <p
          className="mx-auto mt-4 max-w-md font-body text-[15px]"
          style={{
            color: "#A89F95",
            opacity: fade.visible ? 1 : 0,
            transition: "opacity 0.5s ease-out 0.5s",
          }}
        >
          Cada semana que pasa entrenando sin estructura es tiempo perdido.
          Tu primer programa te espera.
        </p>

        <button
          onClick={claimFounder}
          className="press-scale mt-8 inline-flex items-center gap-2 font-display text-[15px] font-semibold text-white"
          style={{
            background: "#C75B39",
            borderRadius: 12,
            padding: "14px 40px",
            boxShadow: "0 0 24px rgba(199,91,57,0.3)",
            opacity: fade.visible ? 1 : 0,
            transform: fade.visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease-out 0.65s, transform 0.5s ease-out 0.65s",
          }}
        >
          Comenzar ahora
          <ArrowRight className="h-4 w-4" />
        </button>

        <div
          className="mt-6 flex items-center justify-center gap-3"
          style={{
            opacity: fade.visible ? 1 : 0,
            transition: "opacity 0.5s ease-out 0.8s",
          }}
        >
          <button
            onClick={() => navigate("/login")}
            className="font-body text-[13px] transition-colors hover:underline"
            style={{ color: "#A89F95" }}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-16 border-t pt-6 text-center"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <p className="font-display text-[14px] font-bold" style={{ color: "#FFFFFF", letterSpacing: "-0.02em" }}>
          LIFTORY
        </p>
        <p className="mt-1 font-body text-[11px]" style={{ color: "#666" }}>
          Move Better. Lift Stronger. Live Longer.
        </p>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════ */
/*               WELCOME PAGE               */
/* ═════════════════════════════════════════ */
export default function Welcome() {
  const navigate = useNavigate();
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

  const scrollToPrice = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const claimFounder = () => {
    localStorage.setItem("liftory_founder", FOUNDER_PRICE_ID);
    navigate("/login");
  };

  /* ─── STATS COUNTERS ─── */
  const exercisesCounter = useCountUp(120, 2800);
  const weeksCounter = useCountUp(6, 1000);
  const patternsCounter = useCountUp(8, 1100);

  return (
    <div className="grain-overlay min-h-screen w-full overflow-x-hidden" style={{ background: "#0F0F0F" }}>
      {/* ════════════════════════════════════════ */}
      {/* SECTION 1 — HERO                        */}
      {/* ════════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6" style={{ background: "#0F0F0F" }}>
        {/* Gradient accent */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(199,91,57,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Badge — slides in from left with bounce */}
          <div
            className="overflow-hidden"
            style={{
              opacity: heroReady ? 1 : 0,
              transition: "opacity 0.3s ease-out",
              transitionDelay: "200ms",
            }}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{
                background: "rgba(199,91,57,0.12)",
                color: "#C75B39",
                border: "1px solid rgba(199,91,57,0.25)",
                boxShadow: heroReady ? "0 0 20px rgba(199,91,57,0.15)" : "none",
                transform: heroReady ? "translateX(0) scale(1)" : "translateX(-120%) scale(0.8)",
                transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease-out",
                transitionDelay: "300ms",
              }}
            >
              <Flame className="h-3.5 w-3.5" style={{
                animation: heroReady ? "flicker 1.5s ease-in-out 1s 1" : "none",
              }} />
              Founder's Access — Lugares Limitados
            </span>
          </div>

          {/* Logo */}
          <h1
            className="mt-6 font-display transition-all duration-700"
            style={{
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              lineHeight: 1,
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "100ms",
            }}
          >
            LIFTORY
          </h1>

          {/* Headline */}
          <h2
            className="mt-5 font-display transition-all duration-700"
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#FAF8F5",
              lineHeight: 1.25,
              maxWidth: 480,
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "250ms",
            }}
          >
            Entrena con estructura.
            <br />
            Progresa con intención.
          </h2>

          {/* Sub-headline */}
          <p
            className="mt-4 font-body transition-all duration-700"
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: "#A89F95",
              lineHeight: 1.6,
              maxWidth: 420,
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "400ms",
            }}
          >
            Crafted by movement scientists. La app de entrenamiento para
            personas que quieren resultados reales, sin improvisar.
          </p>

          {/* CTA Buttons */}
          <div
            className="mt-8 flex flex-col items-center gap-3 transition-all duration-700"
            style={{
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "550ms",
            }}
          >
            <button
              onClick={scrollToPrice}
              className="press-scale flex items-center gap-2 font-display text-[15px] font-semibold text-white"
              style={{ background: "#C75B39", borderRadius: 12, padding: "14px 40px" }}
            >
              Quiero mi lugar
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: "#666" }}>
              $199 MXN/mes — solo primeros {FOUNDERS_SPOTS}
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 animate-gentle-pulse transition-all duration-700"
          style={{ opacity: heroReady ? 0.4 : 0 }}
        >
          <ChevronDown className="h-5 w-5" style={{ color: "#A89F95" }} />
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 2 — THE PROBLEM                 */}
      {/* ════════════════════════════════════════ */}
      <Section dark>
        <Eyebrow light>El problema</Eyebrow>
        <h3
          className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
          style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}
        >
          El 80% de la gente entrena sin un plan real.
        </h3>
        <p className="mt-4 font-body text-[15px] leading-relaxed" style={{ color: "#A89F95" }}>
          Copian rutinas de Instagram, cambian de programa cada dos semanas y nunca
          saben si están progresando. El resultado: meses en el gym sin resultados visibles,
          lesiones por mala técnica y cero motivación.
        </p>

        <ProblemCards />
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 3 — THE SOLUTION (5 BLOCKS)     */}
      {/* ════════════════════════════════════════ */}
      <Section>
        <Eyebrow>La solución</Eyebrow>
        <h3
          className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
          style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}
        >
          Tu entrenamiento, con ciencia detrás.
        </h3>
        <p className="mt-3 font-body text-[15px] leading-relaxed" style={{ color: "#8A8A8E" }}>
          LIFTORY combina programación periodizada, biomecánica y tecnología para que
          cada sesión tenga propósito.
        </p>

        <SolutionBlocks />
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 4 — STATS / SOCIAL PROOF        */}
      {/* ════════════════════════════════════════ */}
      <Section dark>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { counter: exercisesCounter, suffix: "+", label: "Ejercicios", sub: "con video" },
            { counter: weeksCounter, suffix: " sem", label: "Programas", sub: "periodizados" },
            { counter: patternsCounter, suffix: "", label: "Patrones", sub: "de movimiento" },
          ].map((stat) => (
            <div key={stat.label} ref={stat.counter.ref} className="flex flex-col items-center">
              <div className="relative overflow-hidden" style={{ height: 56 }}>
                <p
                  className="font-mono font-medium leading-none transition-all"
                  style={{
                    fontSize: 48,
                    color: "#C75B39",
                    letterSpacing: "0.04em",
                    filter: stat.counter.rolling ? "blur(1px)" : "blur(0px)",
                    transform: stat.counter.rolling ? "translateY(-2px)" : "translateY(0)",
                    transition: "filter 0.3s ease-out, transform 0.15s ease-out",
                  }}
                >
                  {stat.counter.value}
                  <span style={{ fontSize: 32 }}>{stat.suffix}</span>
                </p>
              </div>
              <p className="mt-3 font-display text-[13px] font-semibold text-white tracking-wide">{stat.label}</p>
              <p className="font-body text-[11px]" style={{ color: "#888" }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 5 — HOW IT WORKS (3 STEPS)      */}
      {/* ════════════════════════════════════════ */}
      <Section>
        <Eyebrow>Cómo funciona</Eyebrow>
        <h3
          className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
          style={{ color: "#1C1C1E", letterSpacing: "-0.02em" }}
        >
          De cero a entrenar en 3 pasos.
        </h3>

        <HowItWorksSteps />
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 6 — PRICING (FOUNDER'S ACCESS)  */}
      {/* ════════════════════════════════════════ */}
      <Section dark id="pricing">
        <div className="text-center">
          <Eyebrow light>Precio de lanzamiento</Eyebrow>
          <h3
            className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
            style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}
          >
            Founder's Access
          </h3>
          <p className="mt-3 font-body text-[15px] leading-relaxed" style={{ color: "#A89F95" }}>
            Sé de los primeros {FOUNDERS_SPOTS}. Precio exclusivo de por vida.
          </p>
        </div>

        <PricingCard navigate={navigate} claimFounder={claimFounder} />

        {/* Social proof */}
        <p
          className="mt-6 text-center font-serif text-[18px] italic"
          style={{ color: "#C9A96E", lineHeight: 1.4 }}
        >
          "Crafted by movement scientists."
        </p>
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 7 — FINAL CTA                   */}
      {/* ════════════════════════════════════════ */}
      <FinalCTA navigate={navigate} claimFounder={claimFounder} />
    </div>
  );
}
