import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData } from "@/hooks/useWorkoutData";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp, Clock, Dumbbell, Star, Send, Share2, Download, ChevronLeft, Instagram } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useMilestoneDetection } from "@/hooks/useMilestoneDetection";
import MilestoneCelebration from "@/components/celebrations/MilestoneCelebration";

// ── Question pool ──────────────────────────────────────────────
interface FeedbackQuestion {
  id: string;
  text: string;
  type: "emoji" | "chips" | "exercise-vote" | "single";
  options?: { label: string; value: string }[];
  allowOther?: boolean; // show "Otro" with free text input
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
    allowOther: true,
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
  const shuffled = [...QUESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

// ── Prime Score calculation ─────────────────────────────────────
function calculatePrimeScore(args: {
  completedSets: number;
  totalSets: number;
  setsWithWeight: number;
  strengthSets: number;
  prs: number;
  cooldownDone: boolean;
}): number {
  const { completedSets, totalSets, setsWithWeight, strengthSets, prs, cooldownDone } = args;

  // 1. Completion rate (0-45 pts)
  const completionRate = totalSets > 0 ? completedSets / totalSets : 0;
  const completionScore = completionRate * 45;

  // 2. Weight logging rate (0-35 pts)
  const weightLogRate = strengthSets > 0 ? setsWithWeight / strengthSets : 1;
  const weightScore = weightLogRate * 35;

  // 3. PRs bonus (0-15 pts)
  const prScore = Math.min(prs * 5, 15);

  // 4. Cooldown bonus (0-5 pts)
  const cooldownScore = cooldownDone ? 5 : 0;

  return Math.min(100, Math.round(completionScore + weightScore + prScore + cooldownScore));
}

function getScoreLabel(score: number): string {
  if (score >= 95) return "IMPARABLE";
  if (score >= 85) return "CRACK";
  if (score >= 70) return "FIRME";
  if (score >= 50) return "SUBIENDO";
  return "CALENTANDO";
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#C9A96E"; // gold
  if (score >= 70) return "#C75B39"; // terracotta
  if (score >= 50) return "#7A8B5C"; // sage
  return "#B0ACA7"; // muted
}

function getPhaseForWeek(week: number): string {
  if (week === 1) return "BASE";
  if (week === 2) return "BASE +";
  if (week === 3) return "ACUMULACIÓN";
  if (week === 4) return "INTENSIFICACIÓN";
  if (week === 5) return "PEAK";
  return "DELOAD";
}

function getPhaseDescription(week: number): string {
  if (week === 1) return "Construyendo patrones de movimiento y adaptación.";
  if (week === 2) return "Subiendo volumen con la base técnica establecida.";
  if (week === 3) return "Acumulando volumen. Tu cuerpo se adapta a cargas más exigentes.";
  if (week === 4) return "Subiendo intensidad, bajando repeticiones. Preparando cargas máximas.";
  if (week === 5) return "Semana de máximo rendimiento. Pocas reps, máxima intensidad.";
  return "Recuperación activa. Volumen bajo para regenerar y sobrecompensar.";
}

// ── Component ──────────────────────────────────────────────────
export default function WorkoutComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workout, sets, loading, weightUnit, cooldownCompleted } = useWorkoutData(id);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const { activeMilestone, checkMilestones, dismissMilestone } = useMilestoneDetection();
  const milestoneCheckedRef = useRef(false);

  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questions] = useState<FeedbackQuestion[]>(() => pickTwoQuestions());
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [showOtherInput, setShowOtherInput] = useState<Record<string, boolean>>({});
  const [sharing, setSharing] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({ completedSets: 0, volume: 0, prs: 0, durationSec: 0 });
  const [stickerVisible, setStickerVisible] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const animStartedRef = useRef(false);

  const showFeedback = !feedbackDone && !feedbackSkipped;

  const handleSelect = (questionId: string, value: string, multi: boolean) => {
    setAnswers((prev) => {
      if (multi) {
        const current = (prev[questionId] as string[]) || [];
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
      // Merge other texts into responses
      const mergedResponses: Record<string, unknown> = { ...answers };
      for (const [qId, text] of Object.entries(otherTexts)) {
        if (text.trim()) {
          const current = (mergedResponses[qId] as string[]) || [];
          mergedResponses[qId] = [...current.filter(v => v !== "other"), `other:${text.trim()}`];
        }
      }
      await supabase.from("user_feedback").insert({
        user_id: user.id,
        workout_id: id,
        question_ids: questions.map((q) => q.id),
        responses: mergedResponses,
      });
    } catch {
      // Silent fail
    }
    setSubmitting(false);
    setFeedbackDone(true);
  }, [user, id, answers, otherTexts, questions]);

  const stats = useMemo(() => {
    if (!sets.length) return { totalSets: 0, completedSets: 0, volume: 0, prs: 0, duration: "", durationMinutes: 0, setsWithWeight: 0, strengthSets: 0 };

    const completedSets = sets.filter((s) => s.is_completed);
    const volume = completedSets.reduce(
      (acc, s) => acc + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
      0
    );
    const prs = completedSets.filter((s) => s.is_pr).length;

    // Strength sets = non-mobility, non-cooldown
    const mobilityBlocks = ['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION', 'RECOVERY BLOCK'];
    const strengthSets = completedSets.filter(s => !mobilityBlocks.includes(s.block_label || ''));
    const setsWithWeight = strengthSets.filter(s => s.actual_weight != null && s.actual_weight > 0).length;

    let duration = "—";
    let durationMinutes = 0;
    if (workout?.completed_at) {
      const completedTime = new Date(workout.completed_at).getTime();
      // Only consider logged_at timestamps from DURING the session.
      // Post-completion edits (e.g. updating weights later) have logged_at
      // after completed_at and must be excluded from duration calculation.
      const loggedTimes = completedSets
        .filter((s) => s.logged_at)
        .map((s) => new Date(s.logged_at!).getTime())
        .filter((t) => t <= completedTime);
      if (loggedTimes.length > 0) {
        const first = Math.min(...loggedTimes);
        // Use last in-session logged_at — the user may tap "complete workout"
        // hours later, inflating the duration.
        const lastLogged = Math.max(...loggedTimes);
        // Use whichever is earlier: last set logged + buffer or completed_at
        const end = Math.min(lastLogged + 120_000, completedTime); // +2 min buffer for cooldown
        const diffSec = Math.max(0, Math.floor((end - first) / 1000));
        // Cap at 4 hours max to prevent absurd values
        const cappedSec = Math.min(diffSec, 4 * 3600);
        const m = Math.floor(cappedSec / 60);
        const sec = cappedSec % 60;
        duration = `${m}:${sec.toString().padStart(2, "0")}`;
        durationMinutes = m;
      }
    }

    return { totalSets: sets.length, completedSets: completedSets.length, volume: Math.round(volume), prs, duration, durationMinutes, setsWithWeight, strengthSets: strengthSets.length };
  }, [sets, workout]);

  const primeScore = useMemo(() => calculatePrimeScore({
    completedSets: stats.completedSets,
    totalSets: stats.totalSets,
    setsWithWeight: stats.setsWithWeight,
    strengthSets: stats.strengthSets,
    prs: stats.prs,
    cooldownDone: cooldownCompleted,
  }), [stats, cooldownCompleted]);

  const scoreLabel = getScoreLabel(primeScore);
  const scoreColor = getScoreColor(primeScore);

  // Animate score and stats on mount (must be after primeScore/stats are defined)
  useEffect(() => {
    if (loading || animStartedRef.current) return;
    if (sets.length === 0) return; // Wait for data
    animStartedRef.current = true;

    const scoreDuration = 2800; // ring + score counter
    const statsDuration = 3800; // stats take longer — suspense
    const fps = 60;
    const scoreSteps = Math.ceil(scoreDuration / (1000 / fps));
    const statsSteps = Math.ceil(statsDuration / (1000 / fps));
    let step = 0;

    const targetDurationSec = stats.durationMinutes * 60 + (stats.duration !== "—" ? parseInt(stats.duration.split(":")[1] || "0") : 0);

    // Roulette ease: fast start, dramatically slows at the end
    // Hits ~85% of value in the first 50% of time, then crawls the last 15%
    const rouletteEase = (t: number): number => {
      if (t >= 1) return 1;
      // Blend two curves: fast power curve early + extreme deceleration late
      // Using exponent 5 (quintic) makes the tail VERY slow
      return 1 - Math.pow(1 - t, 5);
    };

    const interval = setInterval(() => {
      step++;
      // Score uses cubic ease-out
      const tScore = Math.min(step / scoreSteps, 1);
      const easeScore = 1 - Math.pow(1 - tScore, 3);

      // Stats use roulette ease — rockets up then crawls the last stretch
      const tStats = Math.min(step / statsSteps, 1);
      const easeStats = rouletteEase(tStats);

      setAnimatedScore(Math.round(primeScore * easeScore));
      setAnimatedStats({
        completedSets: Math.round(stats.completedSets * easeStats),
        volume: Math.round(stats.volume * easeStats),
        prs: Math.round(stats.prs * easeStats),
        durationSec: Math.round(targetDurationSec * easeStats),
      });

      if (tScore >= 1 && tStats >= 1) {
        clearInterval(interval);
        setAnimDone(true);
      }
      // Trigger sticker slam 2s after score ring completes
      if (tScore >= 1 && !stickerVisible) {
        setTimeout(() => setStickerVisible(true), 2000);
      }
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [loading, primeScore, stats, sets.length]);

  // Milestone detection — runs once after score animation completes
  useEffect(() => {
    if (loading || milestoneCheckedRef.current || !user || !workout) return;
    if (sets.length === 0) return;
    milestoneCheckedRef.current = true;

    const checkAsync = async () => {
      try {
        // Fetch lifetime stats for milestone detection
        const [completedRes, streakRes, weekRes] = await Promise.all([
          supabase
            .from("workouts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_completed", true),
          supabase
            .from("workouts")
            .select("scheduled_date")
            .eq("user_id", user.id)
            .eq("is_completed", true)
            .lte("scheduled_date", workout.scheduled_date)
            .order("scheduled_date", { ascending: false })
            .limit(30),
          supabase
            .from("workouts")
            .select("id, is_completed, is_rest_day, workout_type")
            .eq("user_id", user.id)
            .eq("week_number", workout.week_number)
            .eq("is_completed", true),
        ]);

        const totalCompleted = completedRes.count ?? 0;

        // Calculate streak
        let streak = 0;
        if (streakRes.data?.length) {
          const today = new Date(workout.scheduled_date + "T12:00:00");
          const check = new Date(today);
          const completedDates = new Set(streakRes.data.map((w) => w.scheduled_date));
          for (let i = 0; i < 30; i++) {
            const ds = check.toISOString().split("T")[0];
            if (completedDates.has(ds)) {
              streak++;
              check.setDate(check.getDate() - 1);
            } else break;
          }
        }

        // Count strength workouts completed this week
        const weekStrengthCompleted = (weekRes.data ?? []).filter(
          (w) => !w.is_rest_day && w.workout_type !== "mobility"
        ).length;

        // Delay milestone popup so score animations finish first
        setTimeout(() => {
          checkMilestones({
            totalCompleted,
            weekStrengthCompleted,
            streak,
            prsThisWorkout: stats.prs,
            weekNumber: workout.week_number,
            primeScore,
          });
        }, 4500); // After score animation (2.8s) + sticker slam (2s)
      } catch {
        // Silent — milestones are non-critical
      }
    };
    checkAsync();
  }, [loading, user, workout, sets.length, stats.prs, primeScore, checkMilestones]);

  const formatAnimDuration = (totalSec: number) => {
    if (stats.duration === "—") return "—";
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Share functionality — canvas-based rendering (no html2canvas)
  const handleShare = async (mode: "story" | "card" = "card") => {
    setSharing(true);
    try {
      const { renderShareCard } = await import("@/utils/renderShareCard");

      const blob = await renderShareCard({
        score: primeScore,
        scoreLabel,
        scoreColor,
        dayLabel: workout?.day_label ?? "Workout",
        weekNumber,
        phaseLabel,
        duration: stats.duration,
        completedSets: stats.completedSets,
        totalSets: stats.totalSets,
        volume: stats.volume,
        prs: stats.prs,
        weightUnit,
        dateStr,
      }, mode);

      if (!blob) { setSharing(false); return; }

      const fileName = mode === "story" ? "prime-score-story.png" : "prime-score.png";
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "LIFTORY Prime Score",
          text: `Prime Score: ${primeScore}/100 — ${workout?.day_label ?? "Workout"} completado en LIFTORY`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prime-score-${mode}-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("[Share] failed:", e);
    }
    setSharing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-background px-6 pt-20">
        <Skeleton className="h-24 w-24 rounded-full bg-muted" />
        <Skeleton className="mt-8 h-8 w-48 bg-muted" />
        <Skeleton className="mt-4 h-4 w-36 bg-muted" />
        <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const weekNumber = workout?.week_number ?? 1;
  const phaseLabel = getPhaseForWeek(weekNumber);
  const phaseDesc = getPhaseDescription(weekNumber);

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14 flex items-center justify-between">
        <button onClick={() => navigate("/home", { replace: true })} className="press-scale flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2">
          <ChevronLeft className="h-4 w-4 text-foreground" />
          <span className="font-body text-sm text-foreground">Inicio</span>
        </button>
        <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", fontWeight: 600 }}>
          SESIÓN COMPLETADA
        </span>
        <div style={{ width: 72 }} /> {/* Spacer for centering */}
      </div>

      <div className="flex flex-col items-center px-5 pb-10 stagger-fade-in">
        {/* ═══ PRIME SCORE CARD (dark, shareable) ═══ */}
        <div
          ref={scoreCardRef}
          className="w-full max-w-md"
          style={{
            background: "linear-gradient(170deg, #1C1C1E 0%, #0D0D0F 50%, #1A1614 100%)",
            padding: "32px 24px 24px",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Top: PRIME SCORE centered + date */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, color: "#FAF8F5", fontWeight: 800, letterSpacing: "-0.03em" }}>
              PRIME SCORE
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", marginTop: 4, fontSize: 9, color: "rgba(250,248,245,0.3)", letterSpacing: "0.1em" }}>
              {dateStr}
            </span>
          </div>

          {/* Score circle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 24 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 150, height: 150 }}>
              {/* Glow behind ring */}
              <div
                style={{
                  position: "absolute", borderRadius: "50%",
                  width: 130, height: 130,
                  background: `radial-gradient(circle, ${scoreColor}20 0%, transparent 70%)`,
                  filter: `blur(12px)`,
                  opacity: animatedScore / primeScore || 0,
                }}
              />
              {/* Ring SVG */}
              <svg width="150" height="150" style={{ position: "absolute" }}>
                <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle
                  cx="75" cy="75" r="62"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedScore / 100) * 390} 390`}
                  strokeDashoffset="0"
                  transform="rotate(-90 75 75)"
                  style={{ filter: `drop-shadow(0 0 6px ${scoreColor}88) drop-shadow(0 0 14px ${scoreColor}44)` }}
                />
              </svg>
              {/* Score number */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", position: "relative", zIndex: 10 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 48, color: "#FAF8F5", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {animatedScore}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "rgba(250,248,245,0.3)", marginLeft: 2 }}>
                  /100
                </span>
              </div>
            </div>

            {/* Sticker label */}
            <div style={{ marginTop: 12, position: "relative", height: 28, overflow: "visible" }}>
              <span
                className={`sticker-label ${stickerVisible ? "sticker-slam" : ""}`}
                style={{
                  fontFamily: "'Syne', sans-serif",
                  textTransform: "uppercase",
                  fontSize: 13,
                  color: scoreColor,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  opacity: stickerVisible ? 1 : 0,
                  display: "inline-block",
                  textShadow: stickerVisible ? `0 0 20px ${scoreColor}66, 0 0 40px ${scoreColor}33` : "none",
                }}
              >
                {scoreLabel}
              </span>
            </div>

            {/* Workout name + phase */}
            <p style={{ fontFamily: "'Syne', sans-serif", marginTop: 8, textAlign: "center", fontSize: 16, color: "rgba(250,248,245,0.85)", fontWeight: 600, letterSpacing: "-0.01em" }}>
              {workout?.day_label ?? "Workout"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", borderRadius: 9999, padding: "2px 10px", fontSize: 9, letterSpacing: "0.12em", fontWeight: 700, color: "#C75B39", background: "rgba(199,91,57,0.15)", border: "1px solid rgba(199,91,57,0.25)" }}>
                SEMANA {weekNumber} · {phaseLabel}
              </span>
            </div>
          </div>

          {/* Stats grid — inline styles for html2canvas compatibility */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
            {[
              { Icon: Clock, label: "DURACIÓN", value: formatAnimDuration(animatedStats.durationSec) },
              { Icon: Dumbbell, label: "SETS", value: `${animatedStats.completedSets}/${stats.totalSets}` },
              { Icon: TrendingUp, label: "VOLUMEN", value: `${animatedStats.volume.toLocaleString()} ${weightUnit}` },
              { Icon: Trophy, label: "PRs", value: String(animatedStats.prs) },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center", padding: "12px 8px" }}
              >
                <stat.Icon style={{ width: 16, height: 16, margin: "0 auto", color: "rgba(250,248,245,0.4)" }} />
                <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, marginTop: 6, fontSize: 18, color: "#FAF8F5", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {stat.value}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", marginTop: 2, fontSize: 8, color: "rgba(250,248,245,0.35)", letterSpacing: "0.15em" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
            {stats.prs > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 9999, padding: "4px 12px", background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.3)" }}>
                <Star style={{ width: 12, height: 12, color: "#C9A96E" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", fontSize: 9, color: "#C9A96E", fontWeight: 600, letterSpacing: "0.1em" }}>
                  {stats.prs} PR{stats.prs > 1 ? "s" : ""}
                </span>
              </span>
            )}
            {primeScore >= 85 && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 9999, padding: "4px 12px", background: "rgba(199,91,57,0.15)", border: "1px solid rgba(199,91,57,0.3)" }}>
                <Trophy style={{ width: 12, height: 12, color: "#C75B39" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", fontSize: 9, color: "#C75B39", fontWeight: 600, letterSpacing: "0.1em" }}>
                  ÉLITE
                </span>
              </span>
            )}
          </div>

          {/* Bottom branding */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", fontSize: 8, color: "rgba(250,248,245,0.65)", letterSpacing: "0.2em" }}>
              POWERED BY
            </span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, color: "#FAF8F5", fontWeight: 800, letterSpacing: "-0.02em" }}>
              LIFTORY
            </span>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex w-full max-w-md gap-3 mt-4">
          <button
            onClick={() => handleShare("story")}
            disabled={sharing}
            className="press-scale flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-display text-[15px] font-semibold text-primary-foreground transition-all"
            style={{ background: "#C75B39" }}
          >
            <Instagram className="h-4 w-4" />
            {sharing ? "..." : "Stories"}
          </button>
          <button
            onClick={() => handleShare("card")}
            disabled={sharing}
            className="press-scale flex flex-1 items-center justify-center gap-2 rounded-xl py-4 font-display text-[15px] font-semibold transition-all"
            style={{ background: "rgba(199,91,57,0.12)", color: "#C75B39", border: "1px solid rgba(199,91,57,0.3)" }}
          >
            <Share2 className="h-4 w-4" />
            {sharing ? "..." : "Compartir"}
          </button>
        </div>

        {/* ── FEEDBACK SECTION ── */}
        {showFeedback && (
          <div className="mt-8 w-full max-w-md">
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
                    <div className="flex flex-col gap-2">
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
                        {q.allowOther && (
                          <button
                            onClick={() => setShowOtherInput(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                            className={`press-scale rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition-all ${
                              showOtherInput[q.id]
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-secondary/50 text-muted-foreground"
                            }`}
                          >
                            + Otro
                          </button>
                        )}
                      </div>
                      {q.allowOther && showOtherInput[q.id] && (
                        <input
                          type="text"
                          placeholder="Describe..."
                          value={otherTexts[q.id] || ""}
                          onChange={(e) => setOtherTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="rounded-xl border-2 border-border bg-secondary/50 px-4 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                          maxLength={200}
                        />
                      )}
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
                className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground disabled:opacity-40"
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

        {/* Feedback done badge */}
        {feedbackDone && (
          <div className="mt-4 w-full max-w-md flex items-center justify-center gap-2 rounded-xl py-3 bg-primary/10 border border-primary/20">
            <Send className="h-3.5 w-3.5 text-primary" />
            <span className="font-body text-sm font-medium text-primary">
              Feedback enviado — gracias
            </span>
          </div>
        )}

        {/* Phase info card */}
        <div className="mt-6 w-full max-w-md rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, color: "#C75B39" }}>
              SEMANA {weekNumber} · {phaseLabel}
            </span>
          </div>
          <p className="font-body text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {phaseDesc}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 mb-8 w-full max-w-md flex flex-col gap-3">
          <button
            onClick={() => navigate(`/workout/${id}`, { replace: true })}
            className="press-scale w-full rounded-xl py-4 font-body text-[15px] font-medium text-foreground transition-all"
            style={{ background: "hsl(var(--secondary))" }}
          >
            Ver resumen del workout
          </button>
          <button
            onClick={() => navigate("/home", { replace: true })}
            className="press-scale w-full rounded-xl py-4 font-body text-[15px] font-medium text-primary-foreground transition-all"
            style={{ background: "#C75B39" }}
          >
            Volver al inicio
          </button>
        </div>
      </div>


      {/* Milestone celebration overlay */}
      <MilestoneCelebration
        milestone={activeMilestone}
        onDismiss={dismissMilestone}
      />
    </div>
  );
}
