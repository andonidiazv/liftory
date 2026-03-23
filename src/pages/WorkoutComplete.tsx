import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData } from "@/hooks/useWorkoutData";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Clock, Dumbbell, Star, Leaf, Send, Skull, Angry, Smile, Flame, ArrowRight, Check } from "lucide-react";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect, useCallback } from "react";

// ── Question pool ──────────────────────────────────────────────
interface FeedbackQuestion {
  id: string;
  text: string;
  type: "emoji" | "chips" | "exercise-vote" | "single";
  options?: { label: string; value: string }[];
}

const QUESTION_POOL: FeedbackQuestion[] = [
  {
    id: "session_mood",
    text: "¿Cómo se sintió la sesión?",
    type: "emoji",
    options: [
      { label: "Brutal", value: "1" },
      { label: "Dura", value: "2" },
      { label: "Bien", value: "3" },
      { label: "Perfecta", value: "4" },
    ],
  },
  {
    id: "hardest_block",
    text: "¿Qué bloque pegó más fuerte?",
    type: "chips",
    options: [
      { label: "Mobility", value: "mobility" },
      { label: "Fuerza", value: "strength" },
      { label: "Sculpt", value: "sculpt" },
      { label: "Finisher", value: "finisher" },
    ],
  },
  {
    id: "preferred_duration",
    text: "¿El ritmo de la sesión estuvo bien?",
    type: "single",
    options: [
      { label: "Más corta", value: "shorter" },
      { label: "Perfecto", value: "perfect" },
      { label: "Más larga", value: "longer" },
    ],
  },
  {
    id: "discomfort_flags",
    text: "¿Algo te molestó?",
    type: "chips",
    options: [
      { label: "Rodillas", value: "knees" },
      { label: "Espalda baja", value: "lower_back" },
      { label: "Hombros", value: "shoulders" },
      { label: "Energía", value: "energy" },
      { label: "Sueño", value: "sleep" },
      { label: "Todo bien", value: "none" },
    ],
  },
];

function pickTwoQuestions(): FeedbackQuestion[] {
  // Simple random pick of 2 unique questions
  const shuffled = [...QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

// ── Component ──────────────────────────────────────────────────
export default function WorkoutComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workout, sets, loading, weightUnit, cooldownCompleted, exerciseGroups } = useWorkoutData(id);

  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questions] = useState<FeedbackQuestion[]>(() => pickTwoQuestions());
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Exercise vote state (question id = "exercise_vote")
  const [likedExercises, setLikedExercises] = useState<string[]>([]);
  const [dislikedExercises, setDislikedExercises] = useState<string[]>([]);

  const showFeedback = !feedbackDone && !feedbackSkipped;

  const handleSelect = (questionId: string, value: string, multi: boolean) => {
    setAnswers((prev) => {
      if (multi) {
        const current = (prev[questionId] as string[]) || [];
        // "none" clears others; selecting other clears "none"
        if (value === "none") return { ...prev, [questionId]: ["none"] };
        const withoutNone = current.filter((v) => v !== "none");
        const updated = withoutNone.includes(value)
          ? withoutNone.filter((v) => v !== value)
          : [...withoutNone, value];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: value };
    });
  };

  const isSelected = (questionId: string, value: string): boolean => {
    const a = answers[questionId];
    if (Array.isArray(a)) return a.includes(value);
    return a === value;
  };

  const submitFeedback = useCallback(async () => {
    if (!user || !id) return;
    setSubmitting(true);
    try {
      const responses: Record<string, unknown> = { ...answers };
      if (likedExercises.length > 0) responses.liked_exercises = likedExercises;
      if (dislikedExercises.length > 0) responses.disliked_exercises = dislikedExercises;

      await supabase.from("user_feedback").insert({
        user_id: user.id,
        workout_id: id,
        question_ids: questions.map((q) => q.id),
        responses,
      });
    } catch {
      // Silent fail — V1.1 will handle retry
    }
    setSubmitting(false);
    setFeedbackDone(true);
  }, [user, id, answers, likedExercises, dislikedExercises, questions]);

  const stats = useMemo(() => {
    if (!sets.length) return { totalSets: 0, volume: 0, prs: 0, duration: "" };

    const completedSets = sets.filter((s) => s.is_completed);
    const volume = completedSets.reduce(
      (acc, s) => acc + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
      0
    );
    const prs = completedSets.filter((s) => s.is_pr).length;

    let duration = "—";
    if (workout?.completed_at) {
      const loggedTimes = completedSets
        .filter((s) => s.logged_at)
        .map((s) => new Date(s.logged_at!).getTime());
      if (loggedTimes.length > 0) {
        const first = Math.min(...loggedTimes);
        const end = new Date(workout.completed_at).getTime();
        const diffSec = Math.floor((end - first) / 1000);
        const m = Math.floor(diffSec / 60);
        const sec = diffSec % 60;
        duration = `${m}:${sec.toString().padStart(2, "0")}`;
      }
    }

    return { totalSets: completedSets.length, volume: Math.round(volume), prs, duration };
  }, [sets, workout]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center px-6 pt-20">
          <Skeleton className="h-24 w-24 rounded-full bg-muted" />
          <Skeleton className="mt-8 h-8 w-48 bg-muted" />
          <Skeleton className="mt-4 h-4 w-36 bg-muted" />
          <div className="mt-10 grid w-full grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const hasPRs = stats.prs > 0;
  const motivationalMessage = hasPRs
    ? "Nuevo récord personal. No fue suerte — fue el trabajo acumulado."
    : "Sesión registrada. Eso es exactamente de lo que está hecho el progreso real.";

  return (
    <Layout>
      <div className="flex flex-col items-center px-6 pt-20 stagger-fade-in">
        {/* Celebration glow */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-primary/20 glow-primary flex items-center justify-center animate-set-complete">
            {hasPRs ? <Star className="h-10 w-10 text-gold" /> : <Trophy className="h-10 w-10 text-primary" />}
          </div>
        </div>

        <h1 className="mt-8 text-hero text-foreground text-center">
          Sesión completada
        </h1>
        <p className="mt-2 text-muted-foreground text-center font-body font-light">
          {workout?.day_label ?? "Workout"}
        </p>

        {/* ── FEEDBACK SECTION (before stats) ── */}
        {showFeedback && (
          <div className="mt-8 w-full animate-fade-up">
            <p className="font-mono uppercase text-muted-foreground text-center mb-5" style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 600 }}>
              FEEDBACK RÁPIDO
            </p>

            <div className="flex flex-col gap-5">
              {questions.map((q) => (
                <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-display text-[15px] font-semibold text-foreground mb-3" style={{ letterSpacing: "-0.02em" }}>
                    {q.text}
                  </p>

                  {q.type === "emoji" && q.options && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSelect(q.id, opt.value, false)}
                          className={`press-scale rounded-xl border-2 py-3 px-2 font-body text-sm font-medium transition-all ${
                            isSelected(q.id, opt.value)
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "single" && q.options && (
                    <div className="flex gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSelect(q.id, opt.value, false)}
                          className={`press-scale flex-1 rounded-xl border-2 py-3 font-body text-sm font-medium transition-all ${
                            isSelected(q.id, opt.value)
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "chips" && q.options && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleSelect(q.id, opt.value, true)}
                          className={`press-scale rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition-all ${
                            isSelected(q.id, opt.value)
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit / Skip */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={submitFeedback}
                disabled={submitting || Object.keys(answers).length === 0}
                className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Enviando..." : "Enviar feedback"}
              </button>
              <button
                onClick={() => setFeedbackSkipped(true)}
                className="w-full py-2 text-center font-body text-sm text-muted-foreground"
              >
                Saltar
              </button>
            </div>
          </div>
        )}

        {/* ── STATS (shown after feedback or skip) ── */}
        {!showFeedback && (
          <>
            <div className="mt-10 grid w-full grid-cols-2 gap-3 animate-fade-up">
              {[
                { icon: Clock, label: "DURACIÓN", value: stats.duration, unit: "MIN" },
                { icon: Dumbbell, label: "SETS", value: String(stats.totalSets), unit: "COMPLETADOS" },
                { icon: TrendingUp, label: "VOLUMEN", value: stats.volume.toLocaleString(), unit: `${weightUnit.toUpperCase()} TOTAL` },
                { icon: Trophy, label: "PRs", value: String(stats.prs), unit: "RÉCORDS" },
              ].map((stat) => (
                <div key={stat.label} className="card-fbb text-center">
                  <stat.icon className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-2 font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {stat.unit}
                  </p>
                  <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Motivational message */}
            <div className="mt-6 w-full card-fbb card-accent-gold bg-success/5 border border-success/20">
              <p className="font-serif italic" style={{ fontSize: 17, fontWeight: 300, color: "rgba(250,248,245,0.7)", lineHeight: 1.4 }}>
                {motivationalMessage}
              </p>
            </div>

            {/* Cool-down badge */}
            {cooldownCompleted && (
              <div className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: "hsl(var(--success) / 0.1)", border: "1px solid hsl(var(--success) / 0.25)" }}>
                <Leaf className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
                <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--success))" }}>
                  Cool-down completado
                </span>
              </div>
            )}

            {/* Feedback submitted badge */}
            {feedbackDone && (
              <div className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 bg-primary/10 border border-primary/20">
                <Send className="h-3.5 w-3.5 text-primary" />
                <span className="font-body text-sm font-medium text-primary">
                  Feedback enviado — gracias
                </span>
              </div>
            )}

            <button
              onClick={() => navigate("/home", { replace: true })}
              className="press-scale mt-8 mb-8 w-full rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground"
            >
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}
