import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ChevronRight,
  Watch,
  Dumbbell,
  Heart,
  Flame,
  Zap,
  Sprout,
  TrendingUp,
  Bolt,
  Loader2,
  Shield,
  Calendar,
} from "lucide-react";
import LoadingScreen from "@/components/onboarding/LoadingScreen";
import { generateMockProgram } from "@/lib/generateMockProgram";

const TOTAL_STEPS = 8;

const GENDER_MAP: Record<string, string> = { Hombre: "male", Mujer: "female" };
const GOAL_MAP: Record<string, string> = {
  "Ganar músculo": "hypertrophy",
  "Fuerza y rendimiento": "performance",
  "Recomposición corporal": "fat_loss",
  "Salud y longevidad": "health",
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

/* ─── Split previews for each day count ─── */
const SPLIT_PREVIEWS: Record<number, { name: string; sessions: string[] }> = {
  3: {
    name: "LIFTORY FOUNDATION",
    sessions: ["PRESS ENGINE — Empuje", "PULL ENGINE — Tracción", "FULL FORCE — Full body"],
  },
  4: {
    name: "LIFTORY METHOD",
    sessions: [
      "UPPER STRENGTH — Fuerza superior",
      "LOWER FORCE — Tren inferior anterior",
      "UPPER SCULPT — Volumen superior",
      "POSTERIOR FORCE — Cadena posterior",
    ],
  },
  5: {
    name: "LIFTORY METHOD",
    sessions: [
      "PULL PERFORMANCE — Tracción",
      "QUAD ENGINE — Cuádriceps",
      "PRESS POWER — Empuje",
      "FLOW & ENGINE — Movilidad + Metcon",
      "POSTERIOR FORCE — Cadena posterior",
    ],
  },
  6: {
    name: "LIFTORY METHOD PRO",
    sessions: [
      "PRESS ENGINE — Empuje A",
      "PULL ENGINE — Tracción A",
      "FULL FORCE — Full body",
      "PRESS ENGINE B — Empuje B",
      "PULL ENGINE B — Tracción B",
      "FULL FORCE B — Full body B",
    ],
  },
};

function getSplitNameForGender(days: number, gender: string | null): string {
  const preview = SPLIT_PREVIEWS[days];
  if (!preview) return "LIFTORY METHOD";
  if (gender === "Mujer" && (days === 4 || days === 5)) return "LIFTORY SCULPT HER™";
  return preview.name;
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [days, setDays] = useState(4);
  const [location, setLocation] = useState<string | null>(null);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [injuriesDetail, setInjuriesDetail] = useState("");
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

  const handleContinueFromGoal = async () => {
    if (!user || !goal) return;
    const dbGoal = GOAL_MAP[goal] || goal;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ goals: [dbGoal] }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const handleContinueFromDays = async () => {
    if (!user) return;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ training_days_per_week: days }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const handleContinueFromEquipment = async () => {
    if (!user || !location) return;
    const dbEquipment = EQUIPMENT_MAP[location] || location;
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({ training_location: dbEquipment }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const handleContinueFromInjuries = async () => {
    if (!user) return;
    const dbInjuries = injuries.map((i) => INJURY_MAP[i] || i);
    const ok = await saveToSupabase(() =>
      supabase.from("user_profiles").update({
        injuries: dbInjuries,
        injuries_detail: injuriesDetail || null,
      }).eq("user_id", user.id)
    );
    if (ok) next();
  };

  const startLoading = async (selectedWearable?: string) => {
    if (!user) return;
    setSaving(true);

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

    const dbGoal = goal ? (GOAL_MAP[goal] || goal) : "hypertrophy";
    const dbInjuries = injuries.map((i) => INJURY_MAP[i] || i);
    const dbEquipment = EQUIPMENT_MAP[location || ""] || location || "full_gym";

    const { error: oErr } = await supabase
      .from("onboarding_answers")
      .upsert(
        {
          user_id: user.id,
          experience_level: experienceLevel || "beginner",
          primary_goal: dbGoal,
          training_days: days,
          equipment: dbEquipment,
          injuries: dbInjuries,
          emotional_barriers: [],
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

    const { error: cErr } = await supabase
      .from("user_profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);

    if (cErr) {
      toast({ title: "Error al completar", description: cErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const genPromise = generateMockProgram(user.id, {
      experience_level: experienceLevel || "beginner",
      primary_goal: dbGoal,
      training_days: days,
      equipment: dbEquipment,
      emotional_barriers: [],
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

  const SavingOverlay = () =>
    saving ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ) : null;

  const splitPreview = SPLIT_PREVIEWS[days];
  const splitName = getSplitNameForGender(days, gender);
  const visibleSteps = TOTAL_STEPS - 1; // exclude loading

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SavingOverlay />

      {/* Progress bar */}
      {step < LOADING_STEP && (
        <div className="px-6 pt-14">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em" }}>
              {step + 1} / {visibleSteps}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / visibleSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col px-6 pt-8 pb-8 animate-fade-up" key={step}>

        {/* ═══ Step 0: Gender ═══ */}
        {step === 0 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              LIFTORY ONBOARDING
            </p>
            <h1 className="text-hero text-foreground font-body font-normal mt-2">
              Antes de construir tu programa, necesitamos conocerte.
            </h1>
            <p className="mt-3 font-serif italic" style={{ fontSize: 15, fontWeight: 300, color: "hsl(var(--muted-foreground))", lineHeight: 1.3 }}>
              Cada respuesta calibra la IA para tu fisiología, nivel y objetivo.
            </p>
            <div className="mt-10 flex flex-col gap-4">
              {[
                { id: "Hombre", icon: "♂", desc: "Volumen y fuerza optimizados para fisiología masculina" },
                { id: "Mujer", icon: "♀", desc: "Énfasis en glúteo, cadena posterior y sculpt femenino" },
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

        {/* ═══ Step 1: Experience Level ═══ */}
        {step === 1 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              DATO MÁS IMPORTANTE
            </p>
            <h1 className="text-hero text-foreground mt-2">¿Cuál es tu nivel de entrenamiento?</h1>
            <p className="mt-2 text-caption">
              Esto define la complejidad de tus ejercicios, la periodización y la progresión de cargas.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              {[
                { id: "beginner", label: "Principiante", icon: Sprout, desc: "Menos de 6 meses entrenando. Necesito aprender técnica y construir base." },
                { id: "intermediate", label: "Intermedio", icon: TrendingUp, desc: "1-3 años entrenando con consistencia. Conozco los básicos, busco estructura." },
                { id: "advanced", label: "Avanzado", icon: Bolt, desc: "3+ años. Vengo de fuerza, bodybuilding o funcional. Busco metodología elite." },
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

        {/* ═══ Step 2: Primary Goal ═══ */}
        {step === 2 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              TU OBJETIVO
            </p>
            <h1 className="text-hero text-foreground mt-2">¿Qué quieres lograr?</h1>
            <p className="mt-2 text-caption">Selecciona tu objetivo principal. Esto define el enfoque de tu mesociclo.</p>
            <div className="mt-8 flex flex-col gap-4">
              {[
                { id: "Ganar músculo", icon: Dumbbell, desc: "Hipertrofia: maximizar masa muscular con volumen progresivo y tensión mecánica." },
                { id: "Fuerza y rendimiento", icon: Zap, desc: "Performance: aumentar fuerza máxima y potencia funcional con compuestos pesados." },
                { id: "Recomposición corporal", icon: Flame, desc: "Recomp: perder grasa y ganar músculo con intensidad alta y volumen controlado." },
                { id: "Salud y longevidad", icon: Heart, desc: "Bienestar: movilidad, fuerza funcional y capacidad cardiovascular equilibrada." },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all ${
                    goal === g.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${goal === g.id ? "bg-primary/10" : "bg-secondary"}`}>
                    <g.icon className={`h-5 w-5 ${goal === g.id ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>{g.id}</p>
                    <p className="text-caption">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {goal && (
              <button
                onClick={handleContinueFromGoal}
                disabled={saving}
                className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ChevronRight className="h-5 w-5" /></>}
              </button>
            )}
          </>
        )}

        {/* ═══ Step 3: Training Days + Split Preview ═══ */}
        {step === 3 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              TU FRECUENCIA
            </p>
            <h1 className="text-hero text-foreground mt-2">¿Cuántos días puedes entrenar?</h1>
            <p className="mt-2 text-caption">Cada frecuencia activa un split diferente de la metodología LIFTORY.</p>

            <div className="mt-8 flex gap-3 justify-center">
              {[3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`press-scale flex flex-col items-center justify-center transition-all ${
                    days === d ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-foreground"
                  }`}
                  style={{ borderRadius: 16, width: 72, height: 72 }}
                >
                  <span className="font-mono text-2xl font-bold">{d}</span>
                  <span className="font-mono" style={{ fontSize: 9, letterSpacing: "0.1em", opacity: 0.7 }}>DÍAS</span>
                </button>
              ))}
            </div>

            {/* Split preview card */}
            {splitPreview && (
              <div className="mt-8 card-fbb">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-mono text-primary" style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 600 }}>
                    {splitName}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {splitPreview.sessions.map((session, i) => {
                    const [name, desc] = session.split(" — ");
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <span className="font-display text-sm font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>
                            {name}
                          </span>
                          {desc && (
                            <span className="ml-2 text-xs text-muted-foreground font-body">{desc}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleContinueFromDays}
              disabled={saving}
              className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ChevronRight className="h-5 w-5" /></>}
            </button>
          </>
        )}

        {/* ═══ Step 4: Equipment ═══ */}
        {step === 4 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              TU EQUIPO
            </p>
            <h1 className="text-hero text-foreground mt-2">¿Dónde entrenas?</h1>
            <p className="mt-2 text-caption">
              Esto filtra los ejercicios disponibles para tu programa.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {[
                { id: "Gym completo", icon: Dumbbell, desc: "Barras, mancuernas, poleas, máquinas. Acceso completo." },
                { id: "Box funcional", icon: Zap, desc: "CrossFit box: barras, kettlebells, rigs, rower." },
                { id: "Casa con mancuernas", icon: TrendingUp, desc: "Set de mancuernas, banda de resistencia, banco." },
                { id: "Casa sin equipo", icon: Sprout, desc: "Solo tu cuerpo. Bodyweight + creatividad." },
              ].map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setLocation(loc.id)}
                  className={`press-scale card-fbb flex items-center gap-4 text-left transition-all ${
                    location === loc.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${location === loc.id ? "bg-primary/10" : "bg-secondary"}`}>
                    <loc.icon className={`h-5 w-5 ${location === loc.id ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>{loc.id}</p>
                    <p className="text-caption">{loc.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {location && (
              <button
                onClick={handleContinueFromEquipment}
                disabled={saving}
                className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ChevronRight className="h-5 w-5" /></>}
              </button>
            )}
          </>
        )}

        {/* ═══ Step 5: Injuries ═══ */}
        {step === 5 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              PREVENCIÓN
            </p>
            <h1 className="text-hero text-foreground mt-2">¿Tienes alguna lesión o limitación?</h1>
            <p className="mt-2 text-caption">
              La IA evitará ejercicios contraindicados y adaptará movimientos a tu situación.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {["Hombro", "Rodilla", "Espalda baja", "Muñeca", "Cuello", "Cadera", "Tobillo", "Codo"].map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() =>
                    setInjuries((prev) =>
                      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
                    )
                  }
                  className={`press-scale rounded-full border px-5 py-2.5 text-sm font-body transition-all ${
                    injuries.includes(zone)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
            {injuries.length > 0 && (
              <textarea
                value={injuriesDetail}
                onChange={(e) => setInjuriesDetail(e.target.value)}
                placeholder="Describe brevemente tu situación (opcional)"
                className="mt-4 w-full resize-none border border-border bg-card p-4 text-sm text-foreground font-body font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ borderRadius: 12 }}
                rows={2}
              />
            )}
            <button
              onClick={handleContinueFromInjuries}
              disabled={saving}
              className="press-scale mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : injuries.length === 0 ? (
                <>Sin lesiones · Continuar <ChevronRight className="h-5 w-5" /></>
              ) : (
                <>Continuar <ChevronRight className="h-5 w-5" /></>
              )}
            </button>
          </>
        )}

        {/* ═══ Step 6: Wearable ═══ */}
        {step === 6 && (
          <>
            <p className="font-mono uppercase text-primary" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
              RECUPERACIÓN INTELIGENTE
            </p>
            <h1 className="text-hero text-foreground mt-2">¿Usas algún wearable?</h1>
            <p className="mt-2 text-caption">
              Conectar tu wearable permite que la IA ajuste intensidad y volumen según tu recuperación real.
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

        {/* ═══ Step 7: Loading ═══ */}
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
