import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════
   LIFTORY ENGINE v1 — Full Mesocycle Generator
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───

interface OnboardingAnswers {
  experience_level: string;
  primary_goal: string;
  training_days: number;
  equipment: string;
  emotional_barriers: string[];
  gender?: string | null;
  injuries?: string[];
}

type ExRow = {
  id: string;
  category: string;
  movement_pattern: string;
  primary_muscles: string[] | null;
  equipment_required: string[] | null;
  emotional_barrier_tag: string | null;
  contraindications: string[] | null;
  default_tempo: string | null;
  difficulty: string;
  [key: string]: any;
};

// ─── Constants ───

const DIFFICULTY_ORDER: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };

const UPPER_PULL_MUSCLES = ["lats", "rhomboids", "upper_back", "teres_major", "rear_deltoid", "biceps", "biceps_brachii", "brachialis", "brachioradialis", "lower_trapezius"];
const UPPER_PUSH_MUSCLES = ["pectoralis_major", "upper_pectoralis", "anterior_deltoid", "deltoid", "deltoid_anterior", "deltoid_medial", "triceps", "triceps_brachii", "triceps_brachii_long_head"];
const LOWER_QUAD_MUSCLES = ["quadriceps"];
const LOWER_HIP_MUSCLES = ["gluteus_maximus", "gluteus_medius", "gluteus_minimus", "hamstrings", "adductors"];
const SHOULDER_MUSCLES = ["deltoid", "deltoid_anterior", "deltoid_medial", "rear_deltoid"];
const BICEP_MUSCLES = ["biceps", "biceps_brachii", "brachialis", "brachioradialis"];
const TRICEP_MUSCLES = ["triceps", "triceps_brachii", "triceps_brachii_long_head"];
const CORE_MUSCLES = ["core", "rectus_abdominis", "obliques", "transverse_abdominis"];
const CALF_MUSCLES = ["calves", "gastrocnemius", "soleus"];
const ADDUCTOR_MUSCLES = ["adductors"];
const ABDUCTOR_MUSCLES = ["abductors", "gluteus_medius"];
const HAMSTRING_MUSCLES = ["hamstrings"];
const GLUTE_MUSCLES = ["gluteus_maximus", "gluteus_medius", "gluteus_minimus"];

// ─── 6-Week Wave ───

interface WaveParams {
  rir: number;
  setsMultiplier: number; // 0 = base, positive = add sets
  weightMultiplier: number; // 1.0 = base
  isDeload: boolean;
  deloadSetReduction: number; // sets to remove in deload
}

function getWaveParams(weekNumber: number): WaveParams {
  const weekInCycle = ((weekNumber - 1) % 6) + 1;
  switch (weekInCycle) {
    case 1:
    case 2:
      return { rir: 3, setsMultiplier: 0, weightMultiplier: 1.0, isDeload: false, deloadSetReduction: 0 };
    case 3:
    case 4:
      return { rir: 2, setsMultiplier: 1, weightMultiplier: 1.05, isDeload: false, deloadSetReduction: 0 };
    case 5:
      return { rir: 1, setsMultiplier: 1, weightMultiplier: 1.05, isDeload: false, deloadSetReduction: 0 };
    case 6:
      return { rir: 3, setsMultiplier: 0, weightMultiplier: 1.0, isDeload: true, deloadSetReduction: 1 };
    default:
      return { rir: 3, setsMultiplier: 0, weightMultiplier: 1.0, isDeload: false, deloadSetReduction: 0 };
  }
}

// ─── Helpers ───

function hasMuscleOverlap(muscles: string[] | null, targets: string[]): boolean {
  if (!muscles) return false;
  return muscles.some((m) => targets.includes(m));
}

function isCompound(ex: ExRow): boolean {
  const muscles = ex.primary_muscles ?? [];
  return muscles.length >= 3 || ["squat", "hinge", "push", "pull"].includes(ex.movement_pattern);
}

function isIsolation(ex: ExRow): boolean {
  return !isCompound(ex);
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickRandomExcluding<T extends { id: string }>(arr: T[], count: number, usedIds: Set<string>): T[] {
  const available = arr.filter((e) => !usedIds.has(e.id));
  const picked = pickRandom(available.length >= count ? available : arr, count);
  picked.forEach((e) => usedIds.add(e.id));
  return picked;
}

// ─── Exercise Classification ───

interface ClassifiedExercises {
  push_compound: ExRow[];
  push_isolation: ExRow[];
  pull_compound: ExRow[];
  pull_isolation: ExRow[];
  quad_compound: ExRow[];
  quad_isolation: ExRow[];
  hip_compound: ExRow[];
  hip_isolation: ExRow[];
  glute_focused: ExRow[];
  hamstring_focused: ExRow[];
  adductor_focused: ExRow[];
  abductor_focused: ExRow[];
  shoulder_focused: ExRow[];
  bicep_focused: ExRow[];
  tricep_focused: ExRow[];
  calf_focused: ExRow[];
  core_exercises: ExRow[];
  mobility: ExRow[];
  activation: ExRow[];
  conditioning: ExRow[];
}

function classifyExercises(exercises: ExRow[]): ClassifiedExercises {
  const r: ClassifiedExercises = {
    push_compound: [], push_isolation: [],
    pull_compound: [], pull_isolation: [],
    quad_compound: [], quad_isolation: [],
    hip_compound: [], hip_isolation: [],
    glute_focused: [], hamstring_focused: [],
    adductor_focused: [], abductor_focused: [],
    shoulder_focused: [], bicep_focused: [], tricep_focused: [],
    calf_focused: [], core_exercises: [],
    mobility: [], activation: [], conditioning: [],
  };

  for (const ex of exercises) {
    if (ex.category === "mobility") { r.mobility.push(ex); continue; }
    if (ex.category === "accessory") { r.activation.push(ex); continue; }
    if (ex.category === "conditioning") { r.conditioning.push(ex); continue; }
    if (ex.movement_pattern === "core" || hasMuscleOverlap(ex.primary_muscles, CORE_MUSCLES)) {
      r.core_exercises.push(ex);
    }

    const isPull = ex.movement_pattern === "pull" || hasMuscleOverlap(ex.primary_muscles, UPPER_PULL_MUSCLES);
    const isPush = ex.movement_pattern === "push" || hasMuscleOverlap(ex.primary_muscles, UPPER_PUSH_MUSCLES);
    const isQuad = ex.movement_pattern === "squat" || hasMuscleOverlap(ex.primary_muscles, LOWER_QUAD_MUSCLES);
    const isHip = ex.movement_pattern === "hinge" || hasMuscleOverlap(ex.primary_muscles, LOWER_HIP_MUSCLES);

    // Fine-grained categories
    if (hasMuscleOverlap(ex.primary_muscles, GLUTE_MUSCLES)) r.glute_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, HAMSTRING_MUSCLES)) r.hamstring_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, ADDUCTOR_MUSCLES)) r.adductor_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, ABDUCTOR_MUSCLES)) r.abductor_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, SHOULDER_MUSCLES)) r.shoulder_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, BICEP_MUSCLES)) r.bicep_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, TRICEP_MUSCLES)) r.tricep_focused.push(ex);
    if (hasMuscleOverlap(ex.primary_muscles, CALF_MUSCLES)) r.calf_focused.push(ex);

    // Broad categories
    if (isPush) {
      if (isCompound(ex)) r.push_compound.push(ex);
      else r.push_isolation.push(ex);
    }
    if (isPull) {
      if (isCompound(ex)) r.pull_compound.push(ex);
      else r.pull_isolation.push(ex);
    }
    if (isQuad && !isPush && !isPull) {
      if (isCompound(ex)) r.quad_compound.push(ex);
      else r.quad_isolation.push(ex);
    }
    if (isHip && !isPush && !isPull) {
      if (isCompound(ex)) r.hip_compound.push(ex);
      else r.hip_isolation.push(ex);
    }
  }

  return r;
}

// ─── Block Builder Types ───

interface SessionSet {
  exercise_id: string;
  set_order: number;
  set_type: string;
  planned_reps: number | null;
  planned_weight: number;
  planned_tempo: string | null;
  planned_rpe: null;
  planned_rir: number | null;
  planned_rest_seconds: number;
}

// ─── Session Templates ───

type SessionDef = {
  label: string;
  isRest: boolean;
  isFlowEngine?: boolean;
  restLabel?: string;
};

// BUILD HIM schedules (Mon=0 .. Sun=6)
const BUILD_HIM_3: SessionDef[] = [
  { label: "PRESS ENGINE", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "PULL ENGINE", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "LOWER BODY", isRest: false },
  { label: "Recovery", isRest: true },
  { label: "Recovery", isRest: true },
];

const BUILD_HIM_4: SessionDef[] = [
  { label: "UPPER STRENGTH", isRest: false },
  { label: "LOWER FORCE", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "UPPER SCULPT", isRest: false },
  { label: "POSTERIOR FORCE", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "Recovery", isRest: true },
];

const BUILD_HIM_5: SessionDef[] = [
  { label: "PULL PERFORMANCE", isRest: false },
  { label: "QUAD ENGINE", isRest: false },
  { label: "PRESS POWER", isRest: false },
  { label: "FLOW & ENGINE", isRest: false, isFlowEngine: true },
  { label: "SHOULDER + ARMS + ABS", isRest: false },
  { label: "POSTERIOR FORCE", isRest: false },
  { label: "Recovery", isRest: true },
];

// SCULPT HER schedules
const SCULPT_HER_3: SessionDef[] = [
  { label: "POSTERIOR POWER", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "UPPER SCULPT", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "QUAD & SHAPE", isRest: false },
  { label: "Recovery", isRest: true },
  { label: "Recovery", isRest: true },
];

const SCULPT_HER_4: SessionDef[] = [
  { label: "GLUTE THRONE", isRest: false },
  { label: "UPPER BUILD", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "QUAD QUEEN", isRest: false },
  { label: "SCULPT & DEFINE", isRest: false },
  { label: "Mobility + Zone 2", isRest: true, restLabel: "Mobility + Zone 2" },
  { label: "Recovery", isRest: true },
];

const SCULPT_HER_5: SessionDef[] = [
  { label: "GLUTE THRONE", isRest: false },
  { label: "QUAD QUEEN", isRest: false },
  { label: "UPPER PULL POWER", isRest: false },
  { label: "FLOW & RESTORE", isRest: false, isFlowEngine: true },
  { label: "UPPER PRESS SCULPT", isRest: false },
  { label: "TOTAL SHAPE SESSION", isRest: false },
  { label: "Recovery", isRest: true },
];

function getWeeklySchedule(gender: string | null, days: number): SessionDef[] {
  if (gender === "female") {
    if (days === 3) return SCULPT_HER_3;
    if (days === 4) return SCULPT_HER_4;
    return SCULPT_HER_5;
  }
  if (days === 3) return BUILD_HIM_3;
  if (days === 4) return BUILD_HIM_4;
  return BUILD_HIM_5;
}

// ─── Program Names ───

function getProgramName(gender: string | null, days: number): string {
  if (gender === "female") {
    if (days === 3) return "SCULPT HER™ FOUNDATION — 3 días";
    if (days === 4) return "SCULPT HER™ — 4 días";
    return "SCULPT HER™ ADVANCED — 5 días";
  }
  if (days === 3) return "LIFTORY FOUNDATION — 3 días";
  if (days === 4) return "LIFTORY METHOD — 4 días";
  return "LIFTORY METHOD — 5 días";
}

// ─── Sets per level ───

function primarySets(level: string): number {
  if (level === "beginner") return 3;
  if (level === "intermediate") return 4;
  return 5;
}

// ─── Session Block Generators ───

function buildMobilityBlock(
  c: ClassifiedExercises,
  sessionType: "upper" | "lower" | "full",
  usedIds: Set<string>,
  wave: WaveParams
): SessionSet[] {
  let pool = [...c.mobility, ...c.activation];
  if (sessionType === "upper") {
    const filtered = pool.filter(
      (e) => hasMuscleOverlap(e.primary_muscles, [...UPPER_PULL_MUSCLES, ...UPPER_PUSH_MUSCLES, ...CORE_MUSCLES, ...SHOULDER_MUSCLES]) || e.category === "mobility"
    );
    if (filtered.length >= 3) pool = filtered;
  } else if (sessionType === "lower") {
    const filtered = pool.filter(
      (e) => hasMuscleOverlap(e.primary_muscles, [...LOWER_QUAD_MUSCLES, ...LOWER_HIP_MUSCLES, ...CORE_MUSCLES]) || e.movement_pattern === "squat" || e.movement_pattern === "hinge" || e.category === "mobility"
    );
    if (filtered.length >= 3) pool = filtered;
  }

  const exercises = pickRandomExcluding(pool, 3 + Math.floor(Math.random() * 2), usedIds);
  const sets: SessionSet[] = [];
  let order = 1;
  for (const ex of exercises) {
    for (let s = 0; s < 2; s++) {
      sets.push({
        exercise_id: ex.id,
        set_order: order++,
        set_type: "warmup",
        planned_reps: 10,
        planned_weight: 0,
        planned_tempo: ex.default_tempo || "2.0.1.0",
        planned_rpe: null,
        planned_rir: 5,
        planned_rest_seconds: 30,
      });
    }
  }
  return sets;
}

function buildStrengthBlock(
  pool: ExRow[],
  numSets: number,
  reps: number,
  rest: number,
  wave: WaveParams,
  usedIds: Set<string>,
  label: string
): SessionSet[] {
  const exercises = pickRandomExcluding(pool, 1, usedIds);
  if (exercises.length === 0) return [];
  const ex = exercises[0];
  const actualSets = wave.isDeload ? Math.max(numSets - wave.deloadSetReduction, 2) : numSets + (wave.setsMultiplier > 0 && label === "sculpt" ? wave.setsMultiplier : 0);
  const sets: SessionSet[] = [];
  for (let s = 0; s < actualSets; s++) {
    sets.push({
      exercise_id: ex.id,
      set_order: 0, // will be set later
      set_type: "working",
      planned_reps: reps,
      planned_weight: 0,
      planned_tempo: ex.default_tempo || "3.1.1.0",
      planned_rpe: null,
      planned_rir: wave.rir,
      planned_rest_seconds: rest,
    });
  }
  return sets;
}

function buildSupersetBlock(
  pool: ExRow[],
  count: number,
  numSets: number,
  reps: number,
  wave: WaveParams,
  usedIds: Set<string>
): SessionSet[] {
  const exercises = pickRandomExcluding(pool, count, usedIds);
  if (exercises.length === 0) return [];
  const actualSets = wave.isDeload ? Math.max(numSets - wave.deloadSetReduction, 2) : numSets + wave.setsMultiplier;
  const sets: SessionSet[] = [];
  for (let s = 0; s < actualSets; s++) {
    for (const ex of exercises) {
      sets.push({
        exercise_id: ex.id,
        set_order: 0,
        set_type: "superset",
        planned_reps: reps,
        planned_weight: 0,
        planned_tempo: ex.default_tempo || "2.0.1.0",
        planned_rpe: null,
        planned_rir: Math.min(wave.rir + 1, 3),
        planned_rest_seconds: 60,
      });
    }
  }
  return sets;
}

function buildConditioningBlock(
  c: ClassifiedExercises,
  wave: WaveParams,
  usedIds: Set<string>
): SessionSet[] {
  const count = wave.isDeload ? 2 : 3;
  const exercises = pickRandomExcluding(c.conditioning.length > 0 ? c.conditioning : [...c.activation], count, usedIds);
  if (exercises.length === 0) return [];
  const format = Math.random() > 0.5 ? "emom" : "amrap";
  const sets: SessionSet[] = [];
  const reps = wave.isDeload ? 2 : 3;
  for (let s = 0; s < reps; s++) {
    for (const ex of exercises) {
      sets.push({
        exercise_id: ex.id,
        set_order: 0,
        set_type: format,
        planned_reps: 10,
        planned_weight: 0,
        planned_tempo: null,
        planned_rpe: null,
        planned_rir: 3,
        planned_rest_seconds: format === "emom" ? 20 : 45,
      });
    }
  }
  return sets;
}

function buildCooldownBlock(
  c: ClassifiedExercises,
  usedIds: Set<string>
): SessionSet[] {
  const pool = c.mobility.length > 0 ? c.mobility : c.activation;
  const exercises = pickRandomExcluding(pool, 3, usedIds);
  const sets: SessionSet[] = [];
  for (const ex of exercises) {
    sets.push({
      exercise_id: ex.id,
      set_order: 0,
      set_type: "cooldown",
      planned_reps: null,
      planned_weight: 0,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: 0,
    });
  }
  return sets;
}

function buildFlowEngineSession(
  c: ClassifiedExercises,
  usedIds: Set<string>
): SessionSet[] {
  const sets: SessionSet[] = [];
  // Extended mobility: 6-8 exercises × 2 sets
  const mobilityPool = [...c.mobility, ...c.activation];
  const mobExercises = pickRandomExcluding(mobilityPool, 6 + Math.floor(Math.random() * 3), usedIds);
  for (const ex of mobExercises) {
    for (let s = 0; s < 2; s++) {
      sets.push({
        exercise_id: ex.id,
        set_order: 0,
        set_type: "warmup",
        planned_reps: 10,
        planned_weight: 0,
        planned_tempo: ex.default_tempo || "2.0.1.0",
        planned_rpe: null,
        planned_rir: 5,
        planned_rest_seconds: 30,
      });
    }
  }
  // Zone 2 cardio — store as a single set if conditioning exists
  if (c.conditioning.length > 0) {
    const cardioEx = pickRandomExcluding(c.conditioning, 1, usedIds);
    if (cardioEx.length > 0) {
      sets.push({
        exercise_id: cardioEx[0].id,
        set_order: 0,
        set_type: "cardio",
        planned_reps: 25, // minutes
        planned_weight: 0,
        planned_tempo: null,
        planned_rpe: null,
        planned_rir: null,
        planned_rest_seconds: 0,
      });
    }
  }
  return sets;
}

// ─── BUILD HIM Session Builders ───

function buildPressEngine(c: ClassifiedExercises, level: string, wave: WaveParams, genderBias: "male" | "female"): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  // Block 1: Mobility
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  // Block 2: Primary push compound
  allSets.push(...buildStrengthBlock(c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  // Block 3: Secondary push
  allSets.push(...buildStrengthBlock(c.push_compound.length > 1 ? c.push_compound : c.push_isolation, 3, 8, 75, wave, usedIds, "secondary"));
  // Block 4: Sculpt — push isolation superset
  const sculptPool = [...c.push_isolation, ...c.shoulder_focused.filter(isIsolation)];
  const sculptSets = genderBias === "male" ? 4 : 3;
  allSets.push(...buildSupersetBlock(sculptPool, 2, sculptSets, 12, wave, usedIds));
  // Block 5: Conditioning
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  // Block 6: Cooldown
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildPullEngine(c: ClassifiedExercises, level: string, wave: WaveParams, genderBias: "male" | "female"): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.pull_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.pull_compound.length > 1 ? c.pull_compound : c.pull_isolation, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock([...c.pull_isolation, ...c.bicep_focused], 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildLowerBody(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.quad_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.hip_compound, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock([...c.glute_focused, ...c.hip_isolation], 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildUpperStrength(c: ClassifiedExercises, level: string, wave: WaveParams, genderBias: "male" | "female"): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.pull_compound, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock([...c.push_isolation, ...c.shoulder_focused.filter(isIsolation)], 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock([...c.pull_isolation, ...c.bicep_focused], 2, 3, 12, wave, usedIds));
  // Arms superset
  const armsSets = genderBias === "male" ? 4 : 3;
  allSets.push(...buildSupersetBlock([...c.bicep_focused, ...c.tricep_focused], 2, armsSets, 12, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildLowerForce(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.quad_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock([...c.quad_compound, ...c.quad_isolation], 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.quad_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.hamstring_focused, 2, 3, 12, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildUpperSculpt(c: ClassifiedExercises, level: string, wave: WaveParams, genderBias: "male" | "female"): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.pull_compound, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.shoulder_focused, 2, 3, 12, wave, usedIds));
  const armSets = genderBias === "male" ? 4 : 3;
  allSets.push(...buildSupersetBlock([...c.bicep_focused, ...c.tricep_focused], 2, armSets, 12, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildPosteriorForce(c: ClassifiedExercises, level: string, wave: WaveParams, gender: "male" | "female"): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.hip_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock([...c.hip_compound, ...c.hip_isolation], 3, 8, 75, wave, usedIds, "secondary"));
  const gluteSets = gender === "female" ? 4 : 3;
  allSets.push(...buildSupersetBlock(c.glute_focused.length > 0 ? c.glute_focused : c.hip_isolation, 2, gluteSets, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.hamstring_focused.length > 0 ? c.hamstring_focused : c.hip_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildPullPerformance(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.pull_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.pull_compound.length > 1 ? c.pull_compound : c.pull_isolation, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.pull_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.bicep_focused, 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildQuadEngine(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.quad_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock([...c.quad_compound, ...c.quad_isolation], 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.adductor_focused.length > 0 ? c.adductor_focused : c.quad_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.calf_focused.length > 0 ? c.calf_focused : c.quad_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildPressPower(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.push_compound.length > 1 ? c.push_compound : c.push_isolation, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.push_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.tricep_focused, 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildShoulderArmsAbs(c: ClassifiedExercises, level: string, wave: WaveParams, genderBias: "male" | "female"): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  // Vertical push strength
  allSets.push(...buildStrengthBlock(c.shoulder_focused.filter(isCompound).length > 0 ? c.shoulder_focused.filter(isCompound) : c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  // Shoulder/bicep sculpt superset
  allSets.push(...buildSupersetBlock([...c.shoulder_focused.filter(isIsolation), ...c.bicep_focused], 2, 3, 12, wave, usedIds));
  // Shoulder/tricep sculpt superset
  allSets.push(...buildSupersetBlock([...c.shoulder_focused.filter(isIsolation), ...c.tricep_focused], 2, 3, 12, wave, usedIds));
  // Bicep/tricep sculpt superset
  const armSets = genderBias === "male" ? 4 : 3;
  allSets.push(...buildSupersetBlock([...c.bicep_focused, ...c.tricep_focused], 2, armSets, 12, wave, usedIds));
  // Ab circuit
  allSets.push(...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

// ─── SCULPT HER Session Builders ───

function buildPosteriorPower(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  // Hip thrust primary (4-5 sets)
  allSets.push(...buildStrengthBlock(c.glute_focused.length > 0 ? c.glute_focused : c.hip_compound, 5, 8, 90, wave, usedIds, "primary"));
  // Single leg RDL
  allSets.push(...buildStrengthBlock(c.hip_compound, 3, 10, 75, wave, usedIds, "secondary"));
  // Hamstring superset
  allSets.push(...buildSupersetBlock(c.hamstring_focused.length > 0 ? c.hamstring_focused : c.hip_isolation, 2, 3, 12, wave, usedIds));
  // Glute shape superset
  allSets.push(...buildSupersetBlock(c.glute_focused.length > 0 ? c.glute_focused : c.hip_isolation, 2, 4, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildUpperSculptHer(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  // Pull primary
  allSets.push(...buildStrengthBlock(c.pull_compound, primarySets(level), 8, 90, wave, usedIds, "primary"));
  // Push secondary
  allSets.push(...buildStrengthBlock(c.push_compound, 3, 8, 75, wave, usedIds, "secondary"));
  // Cable row / rear delt superset
  allSets.push(...buildSupersetBlock([...c.pull_isolation, ...c.shoulder_focused.filter(e => hasMuscleOverlap(e.primary_muscles, ["rear_deltoid"]))], 2, 3, 12, wave, usedIds));
  // Lateral raise / curl / tricep triset
  allSets.push(...buildSupersetBlock([...c.shoulder_focused.filter(isIsolation), ...c.bicep_focused, ...c.tricep_focused], 3, 3, 12, wave, usedIds));
  // Core finisher
  allSets.push(...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildQuadAndShape(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.quad_compound, primarySets(level), 8, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock([...c.quad_compound, ...c.quad_isolation], 3, 10, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.adductor_focused.length > 0 ? c.adductor_focused : c.quad_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock([...(c.quad_isolation.length > 0 ? c.quad_isolation : c.quad_compound), ...(c.calf_focused.length > 0 ? c.calf_focused : [])], 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildGluteThrone(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.glute_focused.length > 0 ? c.glute_focused : c.hip_compound, 5, 8, 90, wave, usedIds, "primary"));
  // Nordic curl / secondary hip
  allSets.push(...buildStrengthBlock(c.hamstring_focused.length > 0 ? c.hamstring_focused : c.hip_compound, 3, 8, 75, wave, usedIds, "secondary"));
  // Glute development superset
  allSets.push(...buildSupersetBlock(c.glute_focused.length > 0 ? c.glute_focused : c.hip_isolation, 2, 4, 12, wave, usedIds));
  // Hamstring/adductor superset
  allSets.push(...buildSupersetBlock([...c.hamstring_focused, ...c.adductor_focused].length > 0 ? [...c.hamstring_focused, ...c.adductor_focused] : c.hip_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildUpperBuild(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.pull_compound, primarySets(level), 8, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.push_compound, 3, 8, 75, wave, usedIds, "secondary"));
  // Row/rear delt superset
  allSets.push(...buildSupersetBlock([...c.pull_isolation, ...c.shoulder_focused.filter(isIsolation)], 2, 3, 12, wave, usedIds));
  // Lateral raise/press
  allSets.push(...buildSupersetBlock(c.shoulder_focused, 2, 3, 12, wave, usedIds));
  // Core block
  allSets.push(...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildQuadQueen(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.quad_compound, primarySets(level), 8, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock([...c.quad_compound, ...c.quad_isolation], 3, 10, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.adductor_focused.length > 0 ? c.adductor_focused : c.quad_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock([...(c.abductor_focused.length > 0 ? c.abductor_focused : c.quad_isolation), ...(c.calf_focused.length > 0 ? c.calf_focused : [])], 2, 3, 12, wave, usedIds));
  allSets.push(...buildConditioningBlock(c, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildSculptAndDefine(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  // Upper hypertrophy supersets
  allSets.push(...buildSupersetBlock([...c.push_isolation, ...c.pull_isolation], 2, 3, 12, wave, usedIds));
  // Arms/rear delt
  allSets.push(...buildSupersetBlock([...c.bicep_focused, ...c.tricep_focused, ...c.shoulder_focused.filter(isIsolation)], 3, 3, 12, wave, usedIds));
  // Posterior finisher light
  allSets.push(...buildSupersetBlock(c.glute_focused.length > 0 ? c.glute_focused : c.hip_isolation, 2, 3, 15, wave, usedIds));
  // Core finisher
  allSets.push(...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildUpperPullPower(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.pull_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.pull_compound.length > 1 ? c.pull_compound : c.pull_isolation, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.bicep_focused, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.shoulder_focused.filter(e => hasMuscleOverlap(e.primary_muscles, ["rear_deltoid"])).length > 0 ? c.shoulder_focused.filter(e => hasMuscleOverlap(e.primary_muscles, ["rear_deltoid"])) : c.pull_isolation, 2, 3, 12, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildUpperPressSculpt(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "upper", usedIds, wave));
  allSets.push(...buildStrengthBlock(c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.push_compound.length > 1 ? c.push_compound : c.push_isolation, 3, 8, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock(c.shoulder_focused.filter(isIsolation), 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.tricep_focused, 2, 3, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

function buildTotalShapeSession(c: ClassifiedExercises, level: string, wave: WaveParams): SessionSet[] {
  const usedIds = new Set<string>();
  const allSets: SessionSet[] = [];
  allSets.push(...buildMobilityBlock(c, "lower", usedIds, wave));
  // Full lower body hypertrophy
  allSets.push(...buildStrengthBlock(c.hip_compound, primarySets(level), 8, 90, wave, usedIds, "primary"));
  allSets.push(...buildStrengthBlock(c.quad_compound, 3, 10, 75, wave, usedIds, "secondary"));
  allSets.push(...buildSupersetBlock([...c.glute_focused, ...c.hamstring_focused], 2, 4, 12, wave, usedIds));
  allSets.push(...buildSupersetBlock(c.adductor_focused.length > 0 ? c.adductor_focused : c.quad_isolation, 2, 3, 12, wave, usedIds));
  // Arm finisher
  allSets.push(...buildSupersetBlock([...c.bicep_focused, ...c.tricep_focused], 2, 3, 12, wave, usedIds));
  allSets.push(...buildCooldownBlock(c, usedIds));
  return numberSets(allSets);
}

// ─── Session Router ───

function buildSession(
  label: string,
  c: ClassifiedExercises,
  level: string,
  wave: WaveParams,
  gender: string | null,
  isFlowEngine?: boolean
): SessionSet[] {
  const genderBias: "male" | "female" = gender === "female" ? "female" : "male";

  if (isFlowEngine) {
    return numberSets(buildFlowEngineSession(c, new Set<string>()));
  }

  switch (label) {
    // BUILD HIM 3-day
    case "PRESS ENGINE": return buildPressEngine(c, level, wave, genderBias);
    case "PULL ENGINE": return buildPullEngine(c, level, wave, genderBias);
    case "LOWER BODY": return buildLowerBody(c, level, wave);
    // BUILD HIM 4-day
    case "UPPER STRENGTH": return buildUpperStrength(c, level, wave, genderBias);
    case "LOWER FORCE": return buildLowerForce(c, level, wave);
    case "UPPER SCULPT":
      return gender === "female"
        ? buildUpperSculptHer(c, level, wave)
        : buildUpperSculpt(c, level, wave, genderBias);
    case "POSTERIOR FORCE": return buildPosteriorForce(c, level, wave, genderBias);
    // BUILD HIM 5-day
    case "PULL PERFORMANCE": return buildPullPerformance(c, level, wave);
    case "QUAD ENGINE": return buildQuadEngine(c, level, wave);
    case "PRESS POWER": return buildPressPower(c, level, wave);
    case "SHOULDER + ARMS + ABS": return buildShoulderArmsAbs(c, level, wave, genderBias);
    // SCULPT HER 3-day
    case "POSTERIOR POWER": return buildPosteriorPower(c, level, wave);
    case "QUAD & SHAPE": return buildQuadAndShape(c, level, wave);
    // SCULPT HER 4-day
    case "GLUTE THRONE": return buildGluteThrone(c, level, wave);
    case "UPPER BUILD": return buildUpperBuild(c, level, wave);
    case "QUAD QUEEN": return buildQuadQueen(c, level, wave);
    case "SCULPT & DEFINE": return buildSculptAndDefine(c, level, wave);
    // SCULPT HER 5-day
    case "UPPER PULL POWER": return buildUpperPullPower(c, level, wave);
    case "UPPER PRESS SCULPT": return buildUpperPressSculpt(c, level, wave);
    case "TOTAL SHAPE SESSION": return buildTotalShapeSession(c, level, wave);
    case "FLOW & RESTORE": return numberSets(buildFlowEngineSession(c, new Set<string>()));
    case "FLOW & ENGINE": return numberSets(buildFlowEngineSession(c, new Set<string>()));
    default:
      // Fallback: generic upper session
      return buildUpperStrength(c, level, wave, genderBias);
  }
}

function numberSets(sets: SessionSet[]): SessionSet[] {
  return sets.map((s, i) => ({ ...s, set_order: i + 1 }));
}

// ─── Filter Exercises ───

function filterExercises(exercises: ExRow[], answers: OnboardingAnswers): ExRow[] {
  const userLevel = DIFFICULTY_ORDER[answers.experience_level] || 2;
  const userInjuries = answers.injuries ?? [];

  return exercises.filter((e) => {
    // Difficulty filter
    const exLevel = DIFFICULTY_ORDER[e.difficulty] || 2;
    if (exLevel > userLevel) return false;

    // Equipment filter
    const eq = e.equipment_required;
    if (eq && eq.length > 0) {
      if (answers.equipment === "home_none" && !eq.some((x) => ["none", "bodyweight"].includes(x))) return false;
      if (answers.equipment === "home_dumbbells" && !eq.some((x) => ["dumbbell", "none", "bodyweight", "resistance_band"].includes(x))) return false;
    }

    // Emotional barrier filter
    if (answers.emotional_barriers.length > 0 && e.emotional_barrier_tag) {
      if (answers.emotional_barriers.includes(e.emotional_barrier_tag)) return false;
    }

    // Injury / contraindication filter
    if (userInjuries.length > 0 && e.contraindications && e.contraindications.length > 0) {
      if (e.contraindications.some((c) => userInjuries.includes(c))) return false;
    }

    return true;
  });
}

// ─── Finisher Format Metadata ───

function generateFinisherMeta(): Record<string, any> {
  const format = Math.random() > 0.5 ? "AMRAP" : "EMOM";
  const duration = format === "AMRAP" ? 12 : 12;
  return {
    finisher_format: format,
    duration_minutes: duration,
    target_rounds: format === "AMRAP" ? 4 : undefined,
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT: generateProgram
   ═══════════════════════════════════════════════════════════════ */

export async function generateProgram(
  userId: string,
  answers: OnboardingAnswers
): Promise<{ success: boolean; noExercises?: boolean }> {
  // 1. Fetch exercises
  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true);

  if (!exercises || exercises.length === 0) {
    // Create empty program placeholder
    await supabase.from("programs").insert({
      user_id: userId,
      name: getProgramName(answers.gender || null, answers.training_days),
      total_weeks: 6,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      ai_params: {
        experience_level: answers.experience_level,
        primary_goal: answers.primary_goal,
        training_days: answers.training_days,
        equipment: answers.equipment,
        gender: answers.gender || null,
        generated_by: "liftory_engine_v1",
        needs_regeneration: true,
      },
    });
    return { success: true, noExercises: true };
  }

  // 2. Filter & classify
  const available = filterExercises(exercises as ExRow[], answers);
  const classified = classifyExercises(available);

  // 3. Create program
  const gender = answers.gender || null;
  const level = answers.experience_level;
  const daysPerWeek = answers.training_days;
  const programName = getProgramName(gender, daysPerWeek);

  const { data: program, error: pErr } = await supabase
    .from("programs")
    .insert({
      user_id: userId,
      name: programName,
      total_weeks: 6,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      ai_params: {
        mesocycle_number: 1,
        generated_by: "liftory_engine_v1",
        experience_level: level,
        primary_goal: answers.primary_goal,
        training_days: daysPerWeek,
        equipment: answers.equipment,
        gender: gender,
        wave_applied: true,
      },
    })
    .select()
    .single();

  if (pErr || !program) return { success: false };

  // 4. Generate 6 weeks (42 days)
  const schedule = getWeeklySchedule(gender, daysPerWeek);
  const totalDays = 42;
  const startDate = new Date();
  // Align to Monday
  const dayOfWeekToday = startDate.getDay();
  const daysToMonday = dayOfWeekToday === 0 ? 1 : dayOfWeekToday === 1 ? 0 : 8 - dayOfWeekToday;
  startDate.setDate(startDate.getDate() + daysToMonday);

  const workoutInserts: any[] = [];
  const setInserts: { tempId: string; data: any }[] = [];

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const weekNumber = Math.floor(d / 7) + 1;
    const dayInWeek = d % 7; // 0=Mon, 6=Sun
    const sessionDef = schedule[dayInWeek];

    if (!sessionDef) continue;

    const wave = getWaveParams(weekNumber);

    if (sessionDef.isRest) {
      workoutInserts.push({
        tempId: `temp_${d}`,
        isRest: true,
        data: {
          program_id: program.id,
          user_id: userId,
          scheduled_date: dateStr,
          week_number: weekNumber,
          day_label: sessionDef.restLabel || sessionDef.label,
          workout_type: "rest",
          is_rest_day: true,
        },
      });
    } else {
      const tempId = `temp_${d}`;
      const finisherMeta = generateFinisherMeta();

      workoutInserts.push({
        tempId,
        isRest: false,
        data: {
          program_id: program.id,
          user_id: userId,
          scheduled_date: dateStr,
          week_number: weekNumber,
          day_label: sessionDef.label,
          workout_type: sessionDef.isFlowEngine ? "mobility" : "hypertrophy",
          estimated_duration: sessionDef.isFlowEngine ? 45 : 55 + Math.floor(Math.random() * 20),
          is_rest_day: false,
          ai_adjustments: sessionDef.isFlowEngine ? null : finisherMeta,
        },
      });

      // Generate session sets
      const sessionSets = buildSession(sessionDef.label, classified, level, wave, gender, sessionDef.isFlowEngine);
      for (const s of sessionSets) {
        setInserts.push({
          tempId,
          data: {
            user_id: userId,
            exercise_id: s.exercise_id,
            set_order: s.set_order,
            set_type: s.set_type,
            planned_reps: s.planned_reps,
            planned_weight: s.planned_weight,
            planned_tempo: s.planned_tempo,
            planned_rpe: null,
            planned_rir: s.planned_rir,
            planned_rest_seconds: s.planned_rest_seconds,
          },
        });
      }
    }
  }

  // 5. Insert workouts in bulk
  const { data: createdWorkouts, error: wErr } = await supabase
    .from("workouts")
    .insert(workoutInserts.map((w) => w.data))
    .select("id, scheduled_date");

  if (wErr || !createdWorkouts) return { success: false };

  // Map dates to workout IDs
  const dateToWorkoutId = new Map<string, string>();
  createdWorkouts.forEach((w) => dateToWorkoutId.set(w.scheduled_date, w.id));

  const dateByTemp = new Map<string, string>();
  workoutInserts
    .filter((w) => !w.isRest)
    .forEach((w) => dateByTemp.set(w.tempId, w.data.scheduled_date));

  const finalSets = setInserts
    .map((s) => {
      const date = dateByTemp.get(s.tempId);
      if (!date) return null;
      const workoutId = dateToWorkoutId.get(date);
      if (!workoutId) return null;
      return { ...s.data, workout_id: workoutId };
    })
    .filter(Boolean);

  if (finalSets.length > 0) {
    // Insert in batches of 500 to avoid payload limits
    for (let i = 0; i < finalSets.length; i += 500) {
      const batch = finalSets.slice(i, i + 500);
      await supabase.from("workout_sets").insert(batch as any[]);
    }
  }

  return { success: true, noExercises: false };
}

/* ═══════════════════════════════════════════════════════════════
   AUTO-GENERATE NEXT MESOCYCLE
   ═══════════════════════════════════════════════════════════════ */

const MESOCYCLE_PROGRESSION: Record<number, { weightMultiplier: number; extraPrimarySets: number; extraSculptSets: number; notes: string }> = {
  2: { weightMultiplier: 1.075, extraPrimarySets: 0, extraSculptSets: 1, notes: "New secondary variations" },
  3: { weightMultiplier: 1.125, extraPrimarySets: 1, extraSculptSets: 1, notes: "Introduce paused reps" },
  4: { weightMultiplier: 1.175, extraPrimarySets: 1, extraSculptSets: 1, notes: "1.5 rep method in sculpt" },
  5: { weightMultiplier: 1.15, extraPrimarySets: 1, extraSculptSets: 0, notes: "Reduce sculpt, explosive variations" },
  6: { weightMultiplier: 1.075, extraPrimarySets: 0, extraSculptSets: 2, notes: "Peak sculpt volume, drop sets" },
  7: { weightMultiplier: 1.275, extraPrimarySets: 1, extraSculptSets: 0, notes: "Cluster sets, heavy singles" },
  8: { weightMultiplier: 1.3, extraPrimarySets: 0, extraSculptSets: 0, notes: "Peak loads, maintenance volume" },
};

export async function generateNextMesocycle(
  userId: string,
  completedProgramId: string
): Promise<{ success: boolean; isTransition?: boolean }> {
  // 1. Read completed program
  const { data: oldProgram } = await supabase
    .from("programs")
    .select("*")
    .eq("id", completedProgramId)
    .single();

  if (!oldProgram) return { success: false };

  const aiParams = (oldProgram.ai_params as any) || {};
  const currentMC = aiParams.mesocycle_number || 1;
  const nextMC = currentMC >= 8 ? 1 : currentMC + 1;
  const isTransition = currentMC >= 8; // MC8→MC1 annual transition

  // 2. Get onboarding answers
  const { data: onboarding } = await supabase
    .from("onboarding_answers")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!onboarding) return { success: false };

  // 3. Calculate progression from completed workout_sets
  const { data: completedSets } = await supabase
    .from("workout_sets")
    .select("exercise_id, actual_weight, actual_rir, set_type")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .in("workout_id", (
      await supabase
        .from("workouts")
        .select("id")
        .eq("program_id", completedProgramId)
    ).data?.map((w) => w.id) || []);

  // Calculate avg weight per exercise for base weights
  const exerciseWeightMap = new Map<string, number>();
  if (completedSets) {
    const exerciseWeights: Record<string, number[]> = {};
    for (const s of completedSets) {
      if (s.actual_weight && s.actual_weight > 0 && s.set_type === "working") {
        if (!exerciseWeights[s.exercise_id]) exerciseWeights[s.exercise_id] = [];
        exerciseWeights[s.exercise_id].push(Number(s.actual_weight));
      }
    }
    for (const [exId, weights] of Object.entries(exerciseWeights)) {
      const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
      exerciseWeightMap.set(exId, avg);
    }
  }

  // Progression params
  const prog = MESOCYCLE_PROGRESSION[nextMC] || MESOCYCLE_PROGRESSION[2];
  const compoundLoadIncrease = Math.round((prog.weightMultiplier - 1) * 100);

  // 4. Deactivate old program
  await supabase.from("programs").update({ is_active: false }).eq("id", completedProgramId);

  // 5. Build answers
  const answers: OnboardingAnswers = {
    experience_level: aiParams.experience_level || onboarding.experience_level,
    primary_goal: aiParams.primary_goal || onboarding.primary_goal,
    training_days: aiParams.training_days || onboarding.training_days,
    equipment: aiParams.equipment || onboarding.equipment,
    emotional_barriers: onboarding.emotional_barriers || [],
    gender: aiParams.gender,
    injuries: onboarding.injuries || [],
  };

  // 6. Handle MC8→MC1 transition: 4-week recovery program
  if (isTransition) {
    const gender = answers.gender || null;
    const programName = gender === "female"
      ? "SCULPT HER™ TRANSITION — Recovery"
      : "LIFTORY TRANSITION — Recovery";

    const { data: program, error: pErr } = await supabase
      .from("programs")
      .insert({
        user_id: userId,
        name: programName,
        total_weeks: 4,
        current_week: 1,
        current_block: "deload",
        is_active: true,
        ai_params: {
          mesocycle_number: 0, // transition
          generated_by: "liftory_engine_v1",
          experience_level: answers.experience_level,
          primary_goal: answers.primary_goal,
          training_days: answers.training_days,
          equipment: answers.equipment,
          gender: gender,
          wave_applied: false,
          is_transition: true,
          previous_program_id: completedProgramId,
          progression_applied: {
            compound_load_increase_pct: 0,
            sculpt_sets_change: -2,
            new_techniques_added: ["active_recovery", "mobility_focus"],
          },
        },
      })
      .select()
      .single();

    if (pErr || !program) return { success: false };

    // Generate 4 weeks of recovery: mobility + zone 2 + light strength
    const { data: exercises } = await supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true);

    if (exercises && exercises.length > 0) {
      const available = filterExercises(exercises as ExRow[], answers);
      const classified = classifyExercises(available);
      const schedule = getWeeklySchedule(gender, answers.training_days);
      const startDate = new Date();
      const dayOfWeekToday = startDate.getDay();
      const daysToMonday = dayOfWeekToday === 0 ? 1 : dayOfWeekToday === 1 ? 0 : 8 - dayOfWeekToday;
      startDate.setDate(startDate.getDate() + daysToMonday);

      const workoutInserts: any[] = [];
      const setInserts: { tempId: string; data: any }[] = [];

      for (let d = 0; d < 28; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split("T")[0];
        const weekNumber = Math.floor(d / 7) + 1;
        const dayInWeek = d % 7;
        const sessionDef = schedule[dayInWeek];
        if (!sessionDef) continue;

        // Recovery wave: all sessions are deload-like
        const wave: WaveParams = { rir: 3, setsMultiplier: 0, weightMultiplier: 0.7, isDeload: true, deloadSetReduction: 2 };

        if (sessionDef.isRest) {
          workoutInserts.push({
            tempId: `temp_${d}`, isRest: true,
            data: { program_id: program.id, user_id: userId, scheduled_date: dateStr, week_number: weekNumber, day_label: sessionDef.restLabel || "Recovery", workout_type: "rest", is_rest_day: true },
          });
        } else {
          const tempId = `temp_${d}`;
          // For transition: use flow engine for all sessions (mobility + light cardio + light strength)
          const usedIds = new Set<string>();
          const sessionSets = buildFlowEngineSession(classified, usedIds);
          // Add a few light strength sets
          const lightSets = buildStrengthBlock(
            [...classified.push_compound, ...classified.pull_compound, ...classified.quad_compound, ...classified.hip_compound],
            2, 8, 90, wave, usedIds, "primary"
          );
          const allSets = numberSets([...sessionSets, ...lightSets]);

          workoutInserts.push({
            tempId, isRest: false,
            data: { program_id: program.id, user_id: userId, scheduled_date: dateStr, week_number: weekNumber, day_label: `RECOVERY — ${sessionDef.label}`, workout_type: "mobility", estimated_duration: 40, is_rest_day: false },
          });

          for (const s of allSets) {
            setInserts.push({
              tempId,
              data: { user_id: userId, exercise_id: s.exercise_id, set_order: s.set_order, set_type: s.set_type, planned_reps: s.planned_reps, planned_weight: s.planned_weight, planned_tempo: s.planned_tempo, planned_rpe: null, planned_rir: s.planned_rir, planned_rest_seconds: s.planned_rest_seconds },
            });
          }
        }
      }

      const { data: createdWorkouts } = await supabase
        .from("workouts")
        .insert(workoutInserts.map((w) => w.data))
        .select("id, scheduled_date");

      if (createdWorkouts) {
        const dateToId = new Map<string, string>();
        createdWorkouts.forEach((w) => dateToId.set(w.scheduled_date, w.id));
        const dateByTemp = new Map<string, string>();
        workoutInserts.filter((w) => !w.isRest).forEach((w) => dateByTemp.set(w.tempId, w.data.scheduled_date));

        const finalSets = setInserts
          .map((s) => { const dt = dateByTemp.get(s.tempId); if (!dt) return null; const wid = dateToId.get(dt); if (!wid) return null; return { ...s.data, workout_id: wid }; })
          .filter(Boolean);

        for (let i = 0; i < finalSets.length; i += 500) {
          await supabase.from("workout_sets").insert(finalSets.slice(i, i + 500) as any[]);
        }
      }
    }

    return { success: true, isTransition: true };
  }

  // 7. Normal next mesocycle — generate with enriched ai_params
  // Override generateProgram to include progression data
  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true);

  if (!exercises || exercises.length === 0) return { success: false };

  const available = filterExercises(exercises as ExRow[], answers);
  const classified = classifyExercises(available);
  const gender = answers.gender || null;
  const level = answers.experience_level;
  const daysPerWeek = answers.training_days;
  const programName = getProgramName(gender, daysPerWeek);

  const { data: program, error: pErr } = await supabase
    .from("programs")
    .insert({
      user_id: userId,
      name: programName,
      total_weeks: 6,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      ai_params: {
        mesocycle_number: nextMC,
        generated_by: "liftory_engine_v1",
        experience_level: level,
        primary_goal: answers.primary_goal,
        training_days: daysPerWeek,
        equipment: answers.equipment,
        gender: gender,
        wave_applied: true,
        previous_program_id: completedProgramId,
        progression_applied: {
          compound_load_increase_pct: compoundLoadIncrease,
          sculpt_sets_change: prog.extraSculptSets,
          new_techniques_added: prog.notes ? [prog.notes] : [],
        },
      },
    })
    .select()
    .single();

  if (pErr || !program) return { success: false };

  // Generate 42 days with the schedule
  const schedule = getWeeklySchedule(gender, daysPerWeek);
  const startDate = new Date();
  const dayOfWeekToday = startDate.getDay();
  const daysToMonday = dayOfWeekToday === 0 ? 1 : dayOfWeekToday === 1 ? 0 : 8 - dayOfWeekToday;
  startDate.setDate(startDate.getDate() + daysToMonday);

  const workoutInserts: any[] = [];
  const setInserts: { tempId: string; data: any }[] = [];

  for (let d = 0; d < 42; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const weekNumber = Math.floor(d / 7) + 1;
    const dayInWeek = d % 7;
    const sessionDef = schedule[dayInWeek];
    if (!sessionDef) continue;

    const wave = getWaveParams(weekNumber);

    if (sessionDef.isRest) {
      workoutInserts.push({
        tempId: `temp_${d}`, isRest: true,
        data: { program_id: program.id, user_id: userId, scheduled_date: dateStr, week_number: weekNumber, day_label: sessionDef.restLabel || sessionDef.label, workout_type: "rest", is_rest_day: true },
      });
    } else {
      const tempId = `temp_${d}`;
      workoutInserts.push({
        tempId, isRest: false,
        data: { program_id: program.id, user_id: userId, scheduled_date: dateStr, week_number: weekNumber, day_label: sessionDef.label, workout_type: sessionDef.isFlowEngine ? "mobility" : "hypertrophy", estimated_duration: sessionDef.isFlowEngine ? 45 : 55 + Math.floor(Math.random() * 20), is_rest_day: false, ai_adjustments: sessionDef.isFlowEngine ? null : generateFinisherMeta() },
      });

      const sessionSets = buildSession(sessionDef.label, classified, level, wave, gender, sessionDef.isFlowEngine);

      // Apply weight progression from previous mesocycle
      for (const s of sessionSets) {
        let weight = s.planned_weight;
        if (s.set_type === "working" && exerciseWeightMap.has(s.exercise_id)) {
          weight = Math.round(exerciseWeightMap.get(s.exercise_id)! * prog.weightMultiplier * 2) / 2; // round to 0.5
        }
        setInserts.push({
          tempId,
          data: { user_id: userId, exercise_id: s.exercise_id, set_order: s.set_order, set_type: s.set_type, planned_reps: s.planned_reps, planned_weight: weight, planned_tempo: s.planned_tempo, planned_rpe: null, planned_rir: s.planned_rir, planned_rest_seconds: s.planned_rest_seconds },
        });
      }

      dayInWeek; // no-op, just for clarity
    }
  }

  const { data: createdWorkouts, error: wErr } = await supabase
    .from("workouts")
    .insert(workoutInserts.map((w) => w.data))
    .select("id, scheduled_date");

  if (wErr || !createdWorkouts) return { success: false };

  const dateToWorkoutId = new Map<string, string>();
  createdWorkouts.forEach((w) => dateToWorkoutId.set(w.scheduled_date, w.id));
  const dateByTemp = new Map<string, string>();
  workoutInserts.filter((w) => !w.isRest).forEach((w) => dateByTemp.set(w.tempId, w.data.scheduled_date));

  const finalSets = setInserts
    .map((s) => { const dt = dateByTemp.get(s.tempId); if (!dt) return null; const wid = dateToWorkoutId.get(dt); if (!wid) return null; return { ...s.data, workout_id: wid }; })
    .filter(Boolean);

  for (let i = 0; i < finalSets.length; i += 500) {
    await supabase.from("workout_sets").insert(finalSets.slice(i, i + 500) as any[]);
  }

  return { success: true };
}

/* ═══════════════════════════════════════════════════════════════
   CHECK IF MESOCYCLE IS COMPLETE
   ═══════════════════════════════════════════════════════════════ */

export async function checkMesocycleComplete(userId: string): Promise<{
  isComplete: boolean;
  programId: string | null;
}> {
  // Get active program
  const { data: program } = await supabase
    .from("programs")
    .select("id, total_weeks, current_week, ai_params")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!program) return { isComplete: false, programId: null };

  // Get the last scheduled date of the program
  const { data: lastWorkout } = await supabase
    .from("workouts")
    .select("scheduled_date")
    .eq("program_id", program.id)
    .order("scheduled_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastWorkout) return { isComplete: false, programId: null };

  const today = new Date();
  const lastDate = new Date(lastWorkout.scheduled_date + "T23:59:59");

  // Option 1: date has passed
  if (today > lastDate) {
    return { isComplete: true, programId: program.id };
  }

  // Option 2: all workouts in last week completed
  const { data: lastWeekWorkouts } = await supabase
    .from("workouts")
    .select("is_completed, is_rest_day")
    .eq("program_id", program.id)
    .eq("week_number", program.total_weeks);

  if (lastWeekWorkouts && lastWeekWorkouts.length > 0) {
    const trainingDays = lastWeekWorkouts.filter((w) => !w.is_rest_day);
    const allCompleted = trainingDays.length > 0 && trainingDays.every((w) => w.is_completed);
    if (allCompleted) {
      return { isComplete: true, programId: program.id };
    }
  }

  return { isComplete: false, programId: null };
}
