import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChevronRight, Watch, Activity, Dumbbell, Heart, Flame, Target, Zap, Sprout, TrendingUp, Bolt, Loader2 } from "lucide-react";
import LoadingScreen from "@/components/onboarding/LoadingScreen";
import { generateMockProgram } from "@/lib/generateMockProgram";

const TOTAL_STEPS = 6;

// UI label → DB value mappings
const GENDER_MAP: Record<string, string> = { Hombre: "male", Mujer: "female" };
const GOAL_MAP: Record<string, string> = {
  "Ganar músculo": "hypertrophy",
  "Perder grasa": "fat_loss",
  "Mejorar rendimiento": "performance",
  "Salud general": "health",
  "Movilidad y flexibilidad": "mobility",
  "Prepararme para un evento": "event",
};
const EQUIPMENT_MAP: Record<string, string> = {
  "Casa sin equipo": "home_none",
  "Casa con mancuernas": "home_dumbbells",
  "Gym completo": "full_gym",
  "Box funcional": "functional_box",
};
const INJURY_MAP: Record<string, string> = {
  Hombro: "shoulder",
  Rodilla: "knee",
  "Espalda baja": "lower_back",
  Muñeca: "wrist",
  Cuello: "neck",
  Cadera: "hip",
  Tobillo: "ankle",
  Codo: "elbow",
};
const WEARABLE_MAP: Record<string, string> = {
  Whoop: "whoop",
  "Apple Watch": "apple_watch",
  Garmin: "garmin",
  Oura: "oura",
};

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [days, setDays] = useState(4);
  const [location, setLocation] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [injuriesDetail, setInjuriesDetail] = useState("");
  const [emotionalBarriers, setEmotionalBarriers] = useState("");
  const [generationPromise, setGenerationPromise] = useState<Promise<any> | undefined>();
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const LOADING_STEP = TOTAL_STEPS - 1;

  const saveToSupabase = async (fn: () => PromiseLike<{ error: any }>) => {
    setSaving(true);
    const { error } = await fn();
    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleGenderSelect = async (g: string) => {
    setGender(g);
    if (!user) return;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ gender: GENDER_MAP[g] }).eq("user_id", user.id)
    );
    if (ok) setTimeout(next, 200);
  };

  const handleContinueFromLevel = async () => {
    if (!user || !experienceLevel) return;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ experience_level: experienceLevel }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const handleContinueFromGoals = async () => {
    if (!user) return;
    const dbGoals = goals.map((g) => GOAL_MAP[g] || g);
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ goals: dbGoals }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const handleContinueFromSetup = async () => {
    if (!user) return;
    const dbInjuries = injuries.map((i) => INJURY_MAP[i] || i);
    const dbEquipment = EQUIPMENT_MAP[location || ""] || location;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({
        training_days_per_week: days,
        training_location: dbEquipment,
        injuries: dbInjuries,
        injuries_detail: injuriesDetail || null,
        emotional_barriers: emotionalBarriers || null,
      }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const startLoading = async (selectedWearable?: string) => {
    if (!user) return;
    setSaving(true);

    // 1. Save wearable to user_profiles
    const wearableDb = selectedWearable ? (WEARABLE_MAP[selectedWearable] || selectedWearable) : null;
    const { error: wErr } = await supabase
      .from("user_profiles")
      .update({ wearable: wearableDb })
      .eq("user_id", user.id);

    if (wErr) {
      toast({ title: "Error al guardar wearable", description: wErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // 2. Upsert onboarding_answers with all quiz data
    const dbGoals = goals.map((g) => GOAL_MAP[g] || g);
    const dbInjuries = injuries.map((i) => INJURY_MAP[i] || i);
    const dbEquipment = EQUIPMENT_MAP[location || ""] || location || "full_gym";
    const barriers = emotionalBarriers
      ? emotionalBarriers.split(",").map((b) => b.trim()).filter(Boolean)
      : [];

    const { error: oErr } = await supabase
      .from("onboarding_answers")
      .upsert(
        {
          user_id: user.id,
          experience_level: experienceLevel || "beginner",
          primary_goal: dbGoals[0] || "hypertrophy",
          training_days: days,
          equipment: dbEquipment,
          injuries: dbInjuries,
          emotional_barriers: barriers,
          connected_wearable: wearableDb,
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

    // 3. Mark onboarding as completed
    const { error: cErr } = await supabase
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);

    if (cErr) {
      toast({ title: "Error al completar", description: cErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // 4. Start mock program generation (runs in background)
    const genPromise = generateMockProgram(user.id, {
      experience_level: experienceLevel || "beginner",
      primary_goal: dbGoals[0] || "hypertrophy",
      training_days: days,
      equipment: dbEquipment,
      emotional_barriers: barriers,
      gender: gender ? GENDER_MAP[gender] : null,
    }).then((result) => {
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

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 3 ? [...prev, g] : prev
    );
  };

  const SavingOverlay = () =>
    saving ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SavingOverlay />

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
        {/* Step 0: Gender */}
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
                  onClick={() => handleGenderSelect(g.id)}
                  disabled={saving}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all disabled:opacity-60 ${
                    gender === g.id ? "ring-2 ring-primary" : "hover:shadow-md"
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
                { id: "beginner", label: "Principiante", icon: Sprout, desc: "Llevo menos de 6 meses entrenando o estoy empezando desde cero. Necesito guía en cada ejercicio." },
                { id: "intermediate", label: "Intermedio", icon: TrendingUp, desc: "Entreno hace 1-3 años. Conozco los ejercicios básicos y busco más estructura y optimización." },
                { id: "advanced", label: "Avanzado", icon: Bolt, desc: "3+ años entrenando. Vengo de CrossFit, bodybuilding o fuerza. Busco metodología superior." },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setExperienceLevel(lvl.id)}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all ${
                    experienceLevel === lvl.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${experienceLevel === lvl.id ? "bg-primary/10" : "bg-secondary"}`}>
                    <lvl.icon className={`h-6 w-6 ${experienceLevel === lvl.id ? "text-primary" : "text-muted-foreground"}`} />
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
                onClick={handleContinueFromLevel}
                disabled={saving}
                className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ChevronRight className="h-5 w-5" /></>}
              </button>
            )}
          </>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <>
            <h1 className="text-hero text-foreground">¿Qué quieres lograr?</h1>
            <p className="mt-2 text-caption">Selecciona hasta 3 objetivos</p>
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
                    goals.includes(g.id) ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${goals.includes(g.id) ? "bg-primary/10" : "bg-secondary"}`}>
                    <g.icon className={`h-5 w-5 ${goals.includes(g.id) ? "text-primary" : "text-muted-foreground"}`} />
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
                onClick={handleContinueFromGoals}
                disabled={saving}
                className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ChevronRight className="h-5 w-5" /></>}
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
                        days === d ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
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
                  {["Casa sin equipo", "Casa con mancuernas", "Gym completo", "Box funcional"].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocation(loc)}
                      className={`press-scale card-fbb p-4 text-left text-sm font-body font-normal transition-all ${
                        location === loc ? "ring-2 ring-primary bg-primary/5 text-foreground" : "text-muted-foreground hover:shadow-md"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  ¿Tienes alguna lesión o limitación física?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Hombro", "Rodilla", "Espalda baja", "Muñeca", "Cuello", "Cadera", "Tobillo", "Codo"].map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      onClick={() =>
                        setInjuries((prev) =>
                          prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
                        )
                      }
                      className={`press-scale rounded-full border px-4 py-2 text-sm font-body transition-all ${
                        injuries.includes(zone) ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
                <textarea
                  value={injuriesDetail}
                  onChange={(e) => setInjuriesDetail(e.target.value)}
                  placeholder="Ej: Me operaron el menisco hace 6 meses"
                  className="mt-3 w-full resize-none border border-border bg-card p-4 text-sm text-foreground font-body font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderRadius: 10 }}
                  rows={2}
                />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  ¿Hay algo que te incomode o intimide al entrenar?
                </p>
                <textarea
                  value={emotionalBarriers}
                  onChange={(e) => setEmotionalBarriers(e.target.value)}
                  placeholder="Ej: Me da miedo hacer peso muerto, me siento incómodo con ciertos ejercicios"
                  className="mt-3 w-full resize-none border border-border bg-card p-4 text-sm text-foreground font-body font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderRadius: 10 }}
                  rows={3}
                />
              </div>
            </div>
            <button
              onClick={handleContinueFromSetup}
              disabled={saving}
              className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ChevronRight className="h-5 w-5" /></>}
            </button>
          </>
        )}

        {/* Step 4: Wearable */}
        {step === 4 && (
          <>
            <h1 className="text-hero text-foreground">¿Usas algún wearable?</h1>
            <p className="mt-2 text-muted-foreground font-body font-light">
              Conectar tu wearable permite que la IA ajuste tu entrenamiento a tu recuperación real
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
                  onClick={() => startLoading(w.id)}
                  disabled={saving}
                  className="press-scale card-fbb flex flex-col items-center gap-2 py-6 text-center disabled:opacity-60"
                >
                  <Watch className="h-8 w-8 text-muted-foreground" />
                  <span className="font-display font-semibold text-foreground">{w.id}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => startLoading()}
              disabled={saving}
              className="press-scale mt-6 w-full rounded-xl border border-border py-4 text-center font-display font-medium text-muted-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Ninguno · Conectar después"}
            </button>
          </>
        )}

        {/* Step 5: Loading */}
        {step === LOADING_STEP && (
          <LoadingScreen
            onComplete={finish}
            generationPromise={generationPromise}
            warningMessage={generationWarning}
          />
        )}
      </div>
    </div>
  );
}
