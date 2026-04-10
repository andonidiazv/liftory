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
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

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
  alt = false,
  id,
  t,
}: {
  children: React.ReactNode;
  className?: string;
  alt?: boolean;
  id?: string;
  t: typeof dia;
}) {
  const fade = useFadeIn();
  return (
    <section
      id={id}
      ref={fade.ref}
      style={{ ...fade.style, background: alt ? t.card : t.bg }}
      className={`w-full px-6 py-16 md:py-24 ${className}`}
    >
      <div className="mx-auto max-w-3xl">{children}</div>
    </section>
  );
}

/* ─────────────── EYEBROW ─────────────── */
function Eyebrow({ children, t }: { children: React.ReactNode; t: typeof dia }) {
  return (
    <span
      className="eyebrow-label mb-4 block"
      style={{ color: t.accent }}
    >
      {children}
    </span>
  );
}

/* ─────────────── PROBLEM CARDS (stagger in) ─────────────── */
function ProblemCards({ t }: { t: typeof dia }) {
  const stagger = useStagger(3, 150);
  return (
    <div ref={stagger.ref} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        { icon: Clock, label: "Horas perdidas", desc: "Sin estructura ni direccion" },
        { icon: TrendingUp, label: "Cero progreso", desc: "Rutinas sin periodizacion" },
        { icon: Target, label: "Sin feedback", desc: "No sabes si vas bien" },
      ].map((item, i) => (
        <div
          key={item.label}
          className="rounded-xl p-5"
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            ...stagger.getItemStyle(i),
          }}
        >
          <item.icon className="mb-3 h-5 w-5" style={{ color: t.accent }} />
          <p className="font-display text-[14px] font-semibold" style={{ color: t.text }}>{item.label}</p>
          <p className="mt-1 font-body text-[13px]" style={{ color: t.muted }}>{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── SOLUTION BLOCKS (slide in from left, staggered) ─────────────── */
function SolutionBlocks({ t }: { t: typeof dia }) {
  const stagger = useStagger(5, 130);
  const solutionData = [
    {
      icon: Calendar,
      title: "Programas de 6 semanas",
      desc: "Periodizacion real con mesociclos, deloads y progresion lineal/ondulante. Nada de rutinas aleatorias.",
    },
    {
      icon: Play,
      title: "Videos demostrativos de cada ejercicio",
      desc: "120+ videos filmados con tecnica correcta, coaching cues y tempo indicado en los ejercicios que lo requieren.",
    },
    {
      icon: TrendingUp,
      title: "Progresion estructurada",
      desc: "Cada semana sube el volumen y la intensidad de forma planificada. Sabes exactamente que toca y por que.",
    },
    {
      icon: Dumbbell,
      title: "8 patrones de movimiento",
      desc: "Push, pull, squat, hinge, core, rotation, carry y locomotion. Entrenamiento balanceado y funcional.",
    },
    {
      icon: BarChart3,
      title: "Tracking y metricas reales",
      desc: "Volumen total, tonelaje, PRs personales y tendencias para que veas tu progreso con datos concretos.",
    },
  ];

  return (
    <div ref={stagger.ref} className="mt-10 space-y-6">
      {solutionData.map((block, i) => (
        <div
          key={block.title}
          className="flex gap-5 rounded-xl p-5"
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderLeft: `3px solid ${t.accent}`,
            ...stagger.getItemStyle(i),
          }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: t.accentBg }}
          >
            <block.icon className="h-5 w-5" style={{ color: t.accent }} />
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold" style={{ color: t.text }}>
              {block.title}
            </p>
            <p className="mt-1 font-body text-[13px] leading-relaxed" style={{ color: t.muted }}>
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
    desc: "Nivel de experiencia, equipo disponible y objetivos. En 2 minutos, LIFTORY sabe que necesitas.",
  },
  {
    step: "02",
    title: "Recibe tu programa",
    desc: "Un programa de 6 semanas con progresion semana a semana, videos y coaching cues en cada ejercicio.",
  },
  {
    step: "03",
    title: "Entrena y progresa",
    desc: "Registra tus sets en tiempo real, ve tus PRs y sigue la progresion de cargas y volumen semana a semana.",
  },
];

function HowItWorksSteps({ t }: { t: typeof dia }) {
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
          background: `linear-gradient(180deg, ${t.accent}44, ${t.accent}0D)`,
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
              background: visible ? t.accentBgStrong : t.accentBg,
              color: t.accent,
              transition: `background 0.4s ease-out ${300 + i * 250}ms`,
              boxShadow: visible ? `0 0 12px ${t.shadow}` : "none",
            }}
          >
            {item.step}
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold" style={{ color: t.text }}>
              {item.title}
            </p>
            <p className="mt-1 font-body text-[13px] leading-relaxed" style={{ color: t.muted }}>
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── PRICING CARD (glow pulse + staggered benefits) ─────────────── */
function PricingCard({ navigate, claimFounder, t }: { navigate: (path: string) => void; claimFounder: () => void; t: typeof dia }) {
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
    "Progresion estructurada de cargas y volumen",
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
        background: t.card,
        border: `1px solid ${t.accent}44`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.96)",
        transition: "opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)",
      }}
    >
      {/* Animated glow top border */}
      <div
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
          animation: visible ? "glow-slide 2s ease-in-out 0.6s 1" : "none",
        }}
      />

      <div className="p-8 text-center">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em]"
          style={{ background: t.accentBg, color: t.accent }}
        >
          <Zap className="h-3 w-3" style={{
            animation: visible ? "flicker 1s ease-in-out 0.8s 1" : "none",
          }} />
          Solo {FOUNDERS_SPOTS} lugares
        </span>

        {/* Price -- scale pop */}
        <div
          className="mt-6"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.4s ease-out 0.4s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s",
          }}
        >
          <span className="font-body text-[16px] line-through" style={{ color: t.muted }}>
            ${REGULAR_PRICE} MXN
          </span>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span
              className="font-display text-[48px] font-bold"
              style={{ color: t.text, letterSpacing: "-0.03em" }}
            >
              ${FOUNDERS_PRICE}
            </span>
            <span className="font-body text-[14px]" style={{ color: t.muted }}>
              MXN/mes
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: t.accent }}>
            50% de descuento -- para siempre
          </p>
        </div>

        {/* Benefits -- staggered check marks */}
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
              <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.accent }} />
              <span className="font-body text-[13px]" style={{ color: t.text }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA -- pulses after everything loads */}
        <button
          onClick={claimFounder}
          className="press-scale mt-8 w-full font-display text-[15px] font-semibold"
          style={{
            background: t.accent,
            color: t.btnText,
            borderRadius: 12,
            height: 52,
            boxShadow: `0 0 24px ${t.shadow}`,
            animation: visible ? "pulse-glow 2s ease-in-out 1.8s 2" : "none",
          }}
        >
          Reclamar mi lugar de Founder
        </button>

        <p className="mt-3 font-body text-[11px]" style={{ color: t.muted }}>
          Cancela cuando quieras. Sin contratos. Sin sorpresas.
        </p>
      </div>
    </div>
  );
}

/* ─────────────── FINAL CTA (text reveal) ─────────────── */
function FinalCTA({ navigate, claimFounder, t }: { navigate: (path: string) => void; claimFounder: () => void; t: typeof dia }) {
  const fade = useFadeIn();

  return (
    <section
      ref={fade.ref}
      className="relative w-full px-6 py-20"
      style={{
        background: `linear-gradient(180deg, ${t.bg} 0%, ${t.card} 100%)`,
      }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h3
          className="font-display text-[24px] font-bold md:text-[32px]"
          style={{
            color: t.text,
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
              color: t.accent,
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
            color: t.muted,
            opacity: fade.visible ? 1 : 0,
            transition: "opacity 0.5s ease-out 0.5s",
          }}
        >
          Cada semana que pasa entrenando sin estructura es tiempo perdido.
          Tu primer programa te espera.
        </p>

        <button
          onClick={claimFounder}
          className="press-scale mt-8 inline-flex items-center gap-2 font-display text-[15px] font-semibold"
          style={{
            background: t.accent,
            color: t.btnText,
            borderRadius: 12,
            padding: "14px 40px",
            boxShadow: `0 0 24px ${t.shadow}`,
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
            onClick={() => navigate("/onboarding")}
            className="font-body text-[13px] transition-colors hover:underline"
            style={{ color: t.muted }}
          >
            Ya tienes cuenta? Inicia sesion
          </button>
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-16 border-t pt-6 text-center"
        style={{ borderColor: t.border }}
      >
        <p className="font-display text-[14px] font-[800]" style={{ color: t.accent, letterSpacing: "-0.03em" }}>
          LIFTORY
        </p>
        <p className="mt-1 font-body text-[11px]" style={{ color: t.muted }}>
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
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;

  useEffect(() => {
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

  const scrollToPrice = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const claimFounder = () => {
    localStorage.setItem("liftory_founder", FOUNDER_PRICE_ID);
    navigate("/onboarding");
  };

  /* ─── STATS COUNTERS ─── */
  const exercisesCounter = useCountUp(120, 2800);
  const weeksCounter = useCountUp(6, 1000);
  const patternsCounter = useCountUp(8, 1100);

  return (
    <div className="grain-overlay min-h-screen w-full overflow-x-hidden" style={{ background: t.bg }}>
      {/* ════════════════════════════════════════ */}
      {/* SECTION 1 -- HERO                        */}
      {/* ════════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6" style={{ background: t.bg }}>
        {/* Gradient accent */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              `radial-gradient(ellipse 60% 40% at 50% 0%, ${t.accent}1A 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Badge -- slides in from left with bounce */}
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
                background: t.accentBg,
                color: t.accent,
                border: `1px solid ${t.accent}40`,
                boxShadow: heroReady ? `0 0 20px ${t.shadow}` : "none",
                transform: heroReady ? "translateX(0) scale(1)" : "translateX(-120%) scale(0.8)",
                transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease-out",
                transitionDelay: "300ms",
              }}
            >
              <Flame className="h-3.5 w-3.5" style={{
                animation: heroReady ? "flicker 1.5s ease-in-out 1s 1" : "none",
              }} />
              Founder's Access -- Lugares Limitados
            </span>
          </div>

          {/* Logo */}
          <h1
            className="mt-6 font-display transition-all duration-700"
            style={{
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: t.accent,
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
              color: t.text,
              lineHeight: 1.25,
              maxWidth: 480,
              opacity: heroReady ? 1 : 0,
              transform: heroReady ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "250ms",
            }}
          >
            Entrena con estructura.
            <br />
            Progresa con intencion.
          </h2>

          {/* Sub-headline */}
          <p
            className="mt-4 font-body transition-all duration-700"
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: t.muted,
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
              className="press-scale flex items-center gap-2 font-display text-[15px] font-semibold"
              style={{ background: t.accent, color: t.btnText, borderRadius: 12, padding: "14px 40px" }}
            >
              Quiero mi lugar
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: t.muted }}>
              $199 MXN/mes -- solo primeros {FOUNDERS_SPOTS}
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 animate-gentle-pulse transition-all duration-700"
          style={{ opacity: heroReady ? 0.4 : 0 }}
        >
          <ChevronDown className="h-5 w-5" style={{ color: t.muted }} />
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 2 -- THE PROBLEM                 */}
      {/* ════════════════════════════════════════ */}
      <Section alt t={t}>
        <Eyebrow t={t}>El problema</Eyebrow>
        <h3
          className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
          style={{ color: t.text, letterSpacing: "-0.02em" }}
        >
          El 80% de la gente entrena sin un plan real.
        </h3>
        <p className="mt-4 font-body text-[15px] leading-relaxed" style={{ color: t.muted }}>
          Copian rutinas de Instagram, cambian de programa cada dos semanas y nunca
          saben si estan progresando. El resultado: meses en el gym sin resultados visibles,
          lesiones por mala tecnica y cero motivacion.
        </p>

        <ProblemCards t={t} />
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 3 -- THE SOLUTION (5 BLOCKS)     */}
      {/* ════════════════════════════════════════ */}
      <Section t={t}>
        <Eyebrow t={t}>La solucion</Eyebrow>
        <h3
          className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
          style={{ color: t.text, letterSpacing: "-0.02em" }}
        >
          Tu entrenamiento, con ciencia detras.
        </h3>
        <p className="mt-3 font-body text-[15px] leading-relaxed" style={{ color: t.muted }}>
          LIFTORY combina programacion periodizada, biomecanica y tecnologia para que
          cada sesion tenga proposito.
        </p>

        <SolutionBlocks t={t} />
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 4 -- STATS / SOCIAL PROOF        */}
      {/* ════════════════════════════════════════ */}
      <Section alt t={t}>
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
                    color: t.accent,
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
              <p className="mt-3 font-display text-[13px] font-semibold tracking-wide" style={{ color: t.text }}>{stat.label}</p>
              <p className="font-body text-[11px]" style={{ color: t.muted }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 5 -- HOW IT WORKS (3 STEPS)      */}
      {/* ════════════════════════════════════════ */}
      <Section t={t}>
        <Eyebrow t={t}>Como funciona</Eyebrow>
        <h3
          className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
          style={{ color: t.text, letterSpacing: "-0.02em" }}
        >
          De cero a entrenar en 3 pasos.
        </h3>

        <HowItWorksSteps t={t} />
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 6 -- PRICING (FOUNDER'S ACCESS)  */}
      {/* ════════════════════════════════════════ */}
      <Section alt id="pricing" t={t}>
        <div className="text-center">
          <Eyebrow t={t}>Precio de lanzamiento</Eyebrow>
          <h3
            className="font-display text-[22px] font-bold leading-tight md:text-[28px]"
            style={{ color: t.text, letterSpacing: "-0.02em" }}
          >
            Founder's Access
          </h3>
          <p className="mt-3 font-body text-[15px] leading-relaxed" style={{ color: t.muted }}>
            Se de los primeros {FOUNDERS_SPOTS}. Precio exclusivo de por vida.
          </p>
        </div>

        <PricingCard navigate={navigate} claimFounder={claimFounder} t={t} />

        {/* Social proof */}
        <p
          className="mt-6 text-center font-serif text-[18px] italic"
          style={{ color: t.accent, lineHeight: 1.4 }}
        >
          "Crafted by movement scientists."
        </p>
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION 7 -- FINAL CTA                   */}
      {/* ════════════════════════════════════════ */}
      <FinalCTA navigate={navigate} claimFounder={claimFounder} t={t} />
    </div>
  );
}
