import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Shield, Sparkles, Zap, Loader2 } from "lucide-react";
import LoadingScreen from "@/components/onboarding/LoadingScreen";
import { assignProgram } from "@/lib/assignProgram";

const TOTAL_STEPS = 3;
const LOADING_STEP = 2;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [generationPromise, setGenerationPromise] = useState<Promise<any> | undefined>();
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading, refreshProfile } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  const saveToSupabase = async (fn: () => PromiseLike<{ error: any }>) => {
    if (!user) {
      console.error("saveToSupabase: no user session");
      toast({ title: "Sesión expirada", description: "Inicia sesión de nuevo.", variant: "destructive" });
      navigate("/login", { replace: true });
      return false;
    }
    setSaving(true);
    const { error } = await fn();
    setSaving(false);
    if (error) {
      console.error("saveToSupabase error:", error);
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  /* ─── Step 0: Select program (gender) ─── */
  const handleGenderContinue = async () => {
    if (!user || !gender) return;
    const genderDb = gender === "BUILD HIM" ? "male" : "female";
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ gender: genderDb }).eq("user_id", user.id)
    );
    if (ok) setStep(1);
  };

  /* ─── Step 1: Select level ─── */
  const handleLevelContinue = async () => {
    if (!user || !experienceLevel) return;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ experience_level: experienceLevel }).eq("user_id", user.id)
    );
    if (ok) startLoading();
  };

  /* ─── Step 2: Loading & generation ─── */
  const startLoading = async () => {
    if (!user) return;
    setSaving(true);

    const genderDb = gender === "BUILD HIM" ? "male" : "female";
    const level = experienceLevel || "intermediate";

    // Save onboarding_answers with defaults
    const { error: oErr } = await supabase
      .from("onboarding_answers")
      .upsert(
        {
          user_id: user.id,
          experience_level: level,
          primary_goal: "hypertrophy",
          training_days: 5,
          equipment: "full_gym",
          injuries: [],
          emotional_barriers: [],
          connected_wearable: null,
          specific_event: null,
          event_date: null,
          inbody_data: null,
        },
        { onConflict: "user_id" }
      );

    if (oErr) {
      toast({ title: "Error al guardar respuestas", description: oErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Mark onboarding complete & save defaults to profile
    const { error: cErr } = await supabase
      .from("user_profiles")
      .update({
        onboarding_completed: true,
        training_days_per_week: 5,
        training_location: "full_gym",
      })
      .eq("user_id", user.id);

    if (cErr) {
      toast({ title: "Error al completar", description: cErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Start program generation
    const genPromise = assignProgram(user.id, genderDb, level).then((result) => {
      if (result.noExercises) {
        setGenerationWarning("Tu programa se generará cuando la biblioteca de ejercicios esté lista.");
      }
    });

    setGenerationPromise(genPromise);
    setSaving(false);
    setStep(LOADING_STEP);
  };

  const finish = async () => {
    await refreshProfile();
    navigate("/home", { replace: true });
  };

  const savingOverlay = saving ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ) : null;

  /* ─── Loading screen (step 2) ─── */
  if (step === LOADING_STEP) {
    return (
      <LoadingScreen
        onComplete={finish}
        warningMessage={generationWarning}
        generationPromise={generationPromise}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>
      {savingOverlay}

      {/* Back button + Progress bar */}
      <div className="px-6 pt-14">
        <div className="flex items-center justify-between mb-2">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              disabled={saving}
              className="flex items-center gap-1 font-body text-muted-foreground transition-colors active:scale-95 disabled:opacity-40"
              style={{ fontSize: 13 }}
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>
          ) : (
            <span />
          )}
          <span className="font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Paso {step + 1} de {TOTAL_STEPS - 1}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-6 pt-8 pb-8 animate-fade-up" key={step}>

        {/* ═══ PASO 1: Selección de programa ═══ */}
        {step === 0 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              ELIGE TU PROGRAMA
            </p>
            <h1 className="text-hero text-foreground mt-2">
              ¿Qué programa va contigo?
            </h1>
            <p className="mt-3 font-serif italic text-muted-foreground" style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.3 }}>
              Cada programa está diseñado con periodización inteligente para tu fisiología.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {[
                {
                  id: "BUILD HIM",
                  subtitle: "Fuerza · Masa muscular · Rendimiento atlético",
                  Icon: Shield,
                },
                {
                  id: "SCULPT HER™",
                  subtitle: "Esculpe · Fortalece · Define con inteligencia",
                  Icon: Sparkles,
                },
              ].map((opt) => {
                const selected = gender === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setGender(opt.id)}
                    disabled={saving}
                    className="press-scale flex items-center gap-5 text-left transition-all duration-200 disabled:opacity-60"
                    style={{
                      height: 160,
                      borderRadius: 16,
                      border: selected ? "1.5px solid hsl(var(--primary))" : "1px solid hsl(var(--border))",
                      backgroundColor: selected ? "hsla(var(--primary) / 0.08)" : "hsl(var(--card))",
                      padding: "0 24px",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl"
                      style={{
                        width: 56,
                        height: 56,
                        backgroundColor: selected ? "hsla(var(--primary) / 0.15)" : "hsl(var(--secondary))",
                      }}
                    >
                      <opt.Icon
                        className="h-7 w-7"
                        style={{ color: selected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-display font-bold text-foreground"
                        style={{ fontSize: 18, letterSpacing: "-0.02em" }}
                      >
                        {opt.id}
                      </p>
                      <p className="mt-1 font-body text-muted-foreground" style={{ fontSize: 13 }}>
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={handleGenderContinue}
                disabled={!gender || saving}
                className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Continuar <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ═══ PASO 2: Selección de nivel ═══ */}
        {step === 1 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              TU NIVEL
            </p>
            <h1 className="text-hero text-foreground mt-2">
              ¿Cuánta experiencia tienes?
            </h1>
            <p className="mt-3 font-serif italic text-muted-foreground" style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.3 }}>
              Esto define la complejidad de tus ejercicios y la progresión.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {[
                {
                  id: "advanced",
                  label: "ELITE",
                  subtitle: "3+ años de experiencia. Movimientos avanzados, alta intensidad, olympic lifts.",
                  Icon: Zap,
                },
                {
                  id: "intermediate",
                  label: "FOUNDATION",
                  subtitle: "Para cualquier nivel. Construye una base sólida con la metodología LIFTORY.",
                  Icon: Shield,
                },
              ].map((opt) => {
                const selected = experienceLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setExperienceLevel(opt.id)}
                    disabled={saving}
                    className="press-scale flex items-center gap-5 text-left transition-all duration-200 disabled:opacity-60"
                    style={{
                      height: 160,
                      borderRadius: 16,
                      border: selected ? "1.5px solid hsl(var(--primary))" : "1px solid hsl(var(--border))",
                      backgroundColor: selected ? "hsla(var(--primary) / 0.08)" : "hsl(var(--card))",
                      padding: "0 24px",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-2xl"
                      style={{
                        width: 56,
                        height: 56,
                        backgroundColor: selected ? "hsla(var(--primary) / 0.15)" : "hsl(var(--secondary))",
                      }}
                    >
                      <opt.Icon
                        className="h-7 w-7"
                        style={{ color: selected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-display font-bold text-foreground"
                        style={{ fontSize: 18, letterSpacing: "-0.02em" }}
                      >
                        {opt.label}
                      </p>
                      <p className="mt-1 font-body text-muted-foreground" style={{ fontSize: 13 }}>
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={handleLevelContinue}
                disabled={!experienceLevel || saving}
                className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Continuar <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
