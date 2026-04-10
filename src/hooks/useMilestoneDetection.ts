import { useState, useCallback } from "react";
import type { Milestone, PRDetail } from "@/components/celebrations/MilestoneCelebration";

// Brand colors
const SAGE = "#7A8B5C";
const TERRACOTTA = "#D4FF00";
const GOLD = "#D4FF00";
const DARK = "#E8E8E8";

interface MilestoneCheckData {
  totalCompleted: number; // lifetime completed workouts
  weekStrengthCompleted: number; // strength workouts completed this week (out of 5)
  streak: number; // consecutive days with completed workouts
  prsThisWorkout: number; // PRs hit in the workout just completed
  weekNumber: number; // current week in mesocycle (1-6)
  primeScore: number; // score for the workout just completed
  prDetail?: PRDetail; // details of the best PR in this workout
}

// Keys stored in localStorage to avoid repeating milestones
const MILESTONE_PREFIX = "liftory_milestone_";

function wasSeen(key: string): boolean {
  try {
    return localStorage.getItem(MILESTONE_PREFIX + key) === "true";
  } catch {
    return false;
  }
}

function markSeen(key: string): void {
  try {
    localStorage.setItem(MILESTONE_PREFIX + key, "true");
  } catch {
    // localStorage unavailable
  }
}

function detectMilestone(data: MilestoneCheckData): Milestone | null {
  // Priority order: most impactful first, only one fires per workout

  // 1. First workout ever
  if (data.totalCompleted === 1 && !wasSeen("first_workout")) {
    markSeen("first_workout");
    return {
      id: "first_workout",
      title: "Primer entrenamiento completo",
      subtitle: "La consistencia empieza con uno. Bienvenido.",
      accentColor: SAGE,
    };
  }

  // 2. PR celebration — fires EVERY time a PR is hit (not just first time)
  if (data.prsThisWorkout > 0 && data.prDetail) {
    // Mark first_pr for legacy tracking but always show PR celebration
    if (!wasSeen("first_pr")) markSeen("first_pr");
    return {
      id: "pr_celebration",
      title: "Nuevo PR",
      subtitle: "",
      accentColor: GOLD,
      prDetail: data.prDetail,
    };
  }

  // 3. Perfect week (5/5 strength days)
  if (data.weekStrengthCompleted >= 5 && !wasSeen(`perfect_week_${data.weekNumber}`)) {
    markSeen(`perfect_week_${data.weekNumber}`);
    return {
      id: "perfect_week",
      title: "Semana perfecta",
      subtitle: "5 de 5 sesiones de fuerza completadas. Consistencia de elite.",
      accentColor: TERRACOTTA,
    };
  }

  // 4. Elite score (85+)
  if (data.primeScore >= 85 && !wasSeen("first_elite")) {
    markSeen("first_elite");
    return {
      id: "first_elite",
      title: "Score ELITE",
      subtitle: "Un prime score de 85+ demuestra que entrenas con intencion real.",
      accentColor: GOLD,
    };
  }

  // 5. Streak milestones
  const streakMilestones = [
    { days: 3, title: "3 dias seguidos", subtitle: "Tres dias sin fallar. El habito se esta formando.", color: SAGE },
    { days: 7, title: "1 semana de streak", subtitle: "7 dias consecutivos entrenando. Ya eres imparable.", color: SAGE },
    { days: 14, title: "2 semanas de streak", subtitle: "14 dias sin parar. Esto ya es disciplina.", color: TERRACOTTA },
    { days: 30, title: "30 dias de streak", subtitle: "Un mes entero sin fallar. Eres de otro nivel.", color: GOLD },
  ];

  for (const sm of streakMilestones) {
    if (data.streak >= sm.days && !wasSeen(`streak_${sm.days}`)) {
      markSeen(`streak_${sm.days}`);
      return {
        id: `streak_${sm.days}`,
        title: sm.title,
        subtitle: sm.subtitle,
        accentColor: sm.color,
      };
    }
  }

  // 6. Workout count milestones
  const countMilestones = [
    { count: 10, title: "10 workouts", subtitle: "Ya llevas 10 sesiones completadas. La base se esta construyendo.", color: SAGE },
    { count: 25, title: "25 workouts", subtitle: "Un cuarto de centenar. Tu cuerpo ya esta cambiando.", color: TERRACOTTA },
    { count: 50, title: "50 workouts", subtitle: "Medio centenar de sesiones. Veterano.", color: TERRACOTTA },
    { count: 100, title: "100 workouts", subtitle: "Triple digitos. Eres parte del 1% que llega aqui.", color: GOLD },
  ];

  for (const cm of countMilestones) {
    if (data.totalCompleted >= cm.count && !wasSeen(`workouts_${cm.count}`)) {
      markSeen(`workouts_${cm.count}`);
      return {
        id: `workouts_${cm.count}`,
        title: cm.title,
        subtitle: cm.subtitle,
        accentColor: cm.color,
      };
    }
  }

  // 7. Phase completion (end of a week boundary)
  const phaseCompletions: Record<number, { title: string; subtitle: string; color: string }> = {
    1: { title: "Fase BASE completada", subtitle: "Los cimientos estan listos. Ahora a construir.", color: SAGE },
    2: { title: "Fase BASE+ completada", subtitle: "El volumen sube. Tu cuerpo se esta adaptando.", color: SAGE },
    3: { title: "ACUMULACION completada", subtitle: "Volumen acumulado. La fuerza real viene ahora.", color: TERRACOTTA },
    4: { title: "INTENSIFICACION completada", subtitle: "La intensidad maxima esta cerca. Preparado para el peak.", color: TERRACOTTA },
    5: { title: "PEAK completado", subtitle: "Alcanzaste tu maximo rendimiento en este ciclo.", color: GOLD },
    6: { title: "Ciclo completado", subtitle: "6 semanas de transformacion. Nuevo ciclo, nuevo nivel.", color: DARK },
  };

  if (data.weekStrengthCompleted >= 5 && phaseCompletions[data.weekNumber]) {
    const key = `phase_${data.weekNumber}`;
    if (!wasSeen(key)) {
      markSeen(key);
      const phase = phaseCompletions[data.weekNumber];
      return {
        id: key,
        title: phase.title,
        subtitle: phase.subtitle,
        accentColor: phase.color,
      };
    }
  }

  return null;
}

export function useMilestoneDetection() {
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

  const checkMilestones = useCallback((data: MilestoneCheckData) => {
    const milestone = detectMilestone(data);
    if (milestone) {
      setActiveMilestone(milestone);
    }
  }, []);

  const dismissMilestone = useCallback(() => {
    setActiveMilestone(null);
  }, []);

  return { activeMilestone, checkMilestones, dismissMilestone };
}
