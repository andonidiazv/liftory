import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { ChevronRight, Watch, Activity, Dumbbell, Heart, Flame, Target, Zap, Sparkles } from "lucide-react";

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [days, setDays] = useState(4);
  const [location, setLocation] = useState<string | null>(null);
  const navigate = useNavigate();
  const { completeOnboarding } = useApp();

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 2 ? [...prev, g] : prev
    );
  };

  const finish = () => {
    completeOnboarding();
    navigate("/home", { replace: true });
  };

  // Start loading animation then finish
  const startLoading = () => {
    setStep(4);
    setTimeout(finish, 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress bar */}
      {step < 4 && (
        <div className="px-6 pt-14">
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col px-6 pt-8 animate-fade-up" key={step}>
        {/* Step 0: Welcome + Gender */}
        {step === 0 && (
          <>
            <h1 className="text-hero text-foreground">
              Vamos a construir tu programa perfecto
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Responde algunas preguntas y la IA diseñará un plan hecho para ti
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
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-2xl">
                    {g.icon}
                  </span>
                  <div>
                    <p className="text-card-title text-foreground">{g.id}</p>
                    <p className="text-caption">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1: Goals */}
        {step === 1 && (
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
                    <p className="font-display font-semibold text-foreground">{g.id}</p>
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

        {/* Step 2: Setup */}
        {step === 2 && (
          <>
            <h1 className="text-hero text-foreground">Tu setup</h1>
            <div className="mt-8 space-y-8">
              <div>
                <p className="font-display font-semibold text-foreground">
                  ¿Cuántos días puedes entrenar?
                </p>
                <div className="mt-4 flex gap-3">
                  {[3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`press-scale flex h-14 w-14 items-center justify-center rounded-2xl font-mono text-xl font-semibold transition-all ${
                        days === d
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">
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
                      className={`press-scale card-fbb text-left text-sm font-medium transition-all ${
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
                <p className="font-display font-semibold text-foreground">
                  ¿Algo que te incomode al entrenar?
                </p>
                <textarea
                  placeholder="Ej: me da miedo hacer peso muerto, no me gustan las dominadas..."
                  className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

        {/* Step 3: Wearable */}
        {step === 3 && (
          <>
            <h1 className="text-hero text-foreground">¿Usas algún wearable?</h1>
            <p className="mt-2 text-muted-foreground">
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

        {/* Step 4: Loading */}
        {step === 4 && (
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
            <p className="mt-2 text-center text-muted-foreground">
              La IA está diseñando un plan personalizado para ti
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
