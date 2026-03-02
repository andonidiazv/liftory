import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, Watch, Activity, Dumbbell, Heart, Flame, Target, Zap, Sparkles, Sprout, TrendingUp, Bolt } from "lucide-react";

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [days, setDays] = useState(4);
  const [location, setLocation] = useState<string | null>(null);
  const navigate = useNavigate();
  const { completeOnboarding } = useApp();
  const { refreshProfile } = useAuth();

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const LOADING_STEP = TOTAL_STEPS - 1; // last step is loading

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 2 ? [...prev, g] : prev
    );
  };

  const finish = async () => {
    await completeOnboarding();
    await refreshProfile();
    navigate("/home", { replace: true });
  };

  const startLoading = () => {
    setStep(LOADING_STEP);
    setTimeout(finish, 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress bar */}
      {step < LOADING_STEP && (
        <div className="px-6 pt-14">
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col px-6 pt-8 animate-fade-up" key={step}>
        {/* Step 0: Welcome + Gender */}
        {step === 0 && (
          <>
            <h1 className="text-hero text-foreground font-body font-normal">
              Antes de construir tu programa, necesitamos conocerte.
            </h1>
            <p className="mt-3 font-serif italic" style={{ fontSize: 15, fontWeight: 300, color: "rgba(250,248,245,0.55)", lineHeight: 1.3 }}>
              Cuatro minutos que cambian todo lo que sigue.
            </p>
            <div className="mt-10 flex flex-col gap-4">
              {[
                { id: "Hombre", icon: "♂", desc: "Optimizado para fisiología masculina" },
                { id: "Mujer", icon: "♀", desc: "Optimizado para fisiología femenina" },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setGender(g.id);
                    setTimeout(next, 300);
                  }}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all ${
                    gender === g.id
                      ? "ring-2 ring-primary"
                      : "hover:shadow-md"
                  }`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
                    {g.icon}
                  </span>
                  <div>
                    <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>{g.id}</p>
                    <p className="text-caption">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1: Experience Level */}
        {step === 1 && (
          <>
            <h1 className="text-hero text-foreground">¿Cuál es tu nivel?</h1>
            <p className="mt-2 text-caption">
              Esto nos ayuda a adaptar cada ejercicio, peso y progresión a donde estás hoy.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              {[
                {
                  id: "beginner",
                  label: "Principiante",
                  icon: Sprout,
                  desc: "Llevo menos de 6 meses entrenando o estoy empezando desde cero. Necesito guía en cada ejercicio.",
                },
                {
                  id: "intermediate",
                  label: "Intermedio",
                  icon: TrendingUp,
                  desc: "Entreno hace 1-3 años. Conozco los ejercicios básicos y busco más estructura y optimización.",
                },
                {
                  id: "advanced",
                  label: "Avanzado",
                  icon: Bolt,
                  desc: "3+ años entrenando. Vengo de CrossFit, bodybuilding o fuerza. Busco metodología superior.",
                },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all ${
                    experienceLevel === lvl.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    experienceLevel === lvl.id ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    <lvl.icon className={`h-6 w-6 ${
                      experienceLevel === lvl.id ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>{lvl.label}</p>
                    <p className="text-caption">{lvl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {experienceLevel && (
              <button
                onClick={next}
                className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground"
              >
                Continuar <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <>
            <h1 className="text-hero text-foreground">¿Qué quieres lograr?</h1>
            <p className="mt-2 text-caption">Selecciona hasta 2 objetivos</p>
            <div className="mt-8 flex flex-col gap-3">
              {[
                { id: "Ganar músculo", icon: Dumbbell, desc: "Hipertrofia y fuerza" },
                { id: "Perder grasa", icon: Flame, desc: "Recomposición corporal" },
                { id: "Mejorar rendimiento", icon: Zap, desc: "Fuerza funcional y potencia" },
                { id: "Salud general", icon: Heart, desc: "Bienestar y longevidad" },
                { id: "Movilidad y flexibilidad", icon: Activity, desc: "Rango de movimiento" },
                { id: "Prepararme para un evento", icon: Target, desc: "Hyrox, Maratón, etc." },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all ${
                    goals.includes(g.id)
                      ? "ring-2 ring-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    goals.includes(g.id) ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    <g.icon className={`h-5 w-5 ${
                      goals.includes(g.id) ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>{g.id}</p>
                    <p className="text-caption">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {goals.length > 0 && (
              <button
                onClick={next}
                className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground"
              >
                Continuar <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </>
        )}

        {/* Step 3: Setup */}
        {step === 3 && (
          <>
            <h1 className="text-hero text-foreground">Tu setup</h1>
            <div className="mt-8 space-y-8">
              <div>
                <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  ¿Cuántos días puedes entrenar?
                </p>
                <div className="mt-4 flex gap-3">
                  {[3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`press-scale flex h-14 w-14 items-center justify-center font-mono text-xl font-medium transition-all ${
                        days === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                      style={{ borderRadius: 12 }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  ¿Dónde entrenas?
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    "Casa sin equipo",
                    "Casa con mancuernas",
                    "Gym completo",
                    "Box funcional",
                  ].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocation(loc)}
                      className={`press-scale card-fbb text-left text-sm font-body font-normal transition-all ${
                        location === loc
                          ? "ring-2 ring-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  ¿Algo que te incomode al entrenar?
                </p>
                <textarea
                  placeholder="Ej: me da miedo hacer peso muerto, no me gustan las dominadas..."
                  className="mt-3 w-full resize-none border border-border bg-card p-4 text-sm text-foreground font-body font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderRadius: 10 }}
                  rows={3}
                />
              </div>
            </div>
            <button
              onClick={next}
              className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground"
            >
              Continuar <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Step 4: Wearable */}
        {step === 4 && (
          <>
            <h1 className="text-hero text-foreground">¿Usas algún wearable?</h1>
            <p className="mt-2 text-muted-foreground font-body font-light">
              Conectar tu wearable permite que la IA ajuste tu entrenamiento a tu
              recuperación real
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { id: "Whoop", icon: "⌚" },
                { id: "Apple Watch", icon: "⌚" },
                { id: "Garmin", icon: "⌚" },
                { id: "Oura", icon: "💍" },
              ].map((w) => (
                <button
                  key={w.id}
                  onClick={startLoading}
                  className="press-scale card-fbb flex flex-col items-center gap-2 py-6 text-center"
                >
                  <Watch className="h-8 w-8 text-muted-foreground" />
                  <span className="font-display font-semibold text-foreground">{w.id}</span>
                </button>
              ))}
            </div>
            <button
              onClick={startLoading}
              className="press-scale mt-6 w-full rounded-xl border border-border py-4 text-center font-display font-medium text-muted-foreground"
            >
              Ninguno · Conectar después
            </button>
          </>
        )}

        {/* Step 5: Loading */}
        {step === LOADING_STEP && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/20 animate-gentle-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="mt-8 text-section text-foreground text-center">
              Construyendo tu programa...
            </h2>
            <p className="mt-2 text-center text-muted-foreground font-body font-light">
              La IA está diseñando un plan personalizado para ti
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
