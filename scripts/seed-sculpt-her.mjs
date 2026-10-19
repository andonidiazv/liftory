#!/usr/bin/env node

/**
 * Seed script for SCULPT HER ELITE and SCULPT HER FOUNDATION workout templates.
 * Generates 42 workouts (6 weeks × 7 days) per program with workout_sets.
 *
 * Usage: node scripts/seed-sculpt-her.mjs
 */

const SUPABASE_URL = "https://yjgasprksvplswemprsu.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZ2FzcHJrc3ZwbHN3ZW1wcnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3ODA2NCwiZXhwIjoyMDg4MDU0MDY0fQ.6OvpONGEykUFlBCNyV6GLbi9pI-kVGGDWgg-KWJf8bQ";
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const ELITE_PROGRAM_ID = "22bbb97c-8362-4e44-8a04-62aeee66249c";
const FOUNDATION_PROGRAM_ID = "e7f93b9c-165a-4354-b2f7-2921b34fe434";

const START_DATE = "2026-03-23"; // Monday

// ─── Muscle group constants ───────────────────────────────────────────────────

const UPPER_PULL_MUSCLES = [
  "lats", "rhomboids", "upper_back", "teres_major", "rear_deltoid",
  "biceps", "biceps_brachii", "brachialis", "brachioradialis", "lower_trapezius",
];
const UPPER_PUSH_MUSCLES = [
  "pectoralis_major", "upper_pectoralis", "anterior_deltoid", "deltoid",
  "deltoid_anterior", "deltoid_medial", "triceps", "triceps_brachii",
  "triceps_brachii_long_head",
];
const LOWER_QUAD_MUSCLES = ["quadriceps"];
const LOWER_HIP_MUSCLES = [
  "gluteus_maximus", "gluteus_medius", "gluteus_minimus", "hamstrings", "adductors",
];
const SHOULDER_MUSCLES = ["deltoid", "deltoid_anterior", "deltoid_medial", "rear_deltoid"];
const BICEP_MUSCLES = ["biceps", "biceps_brachii", "brachialis", "brachioradialis"];
const TRICEP_MUSCLES = ["triceps", "triceps_brachii", "triceps_brachii_long_head"];
const CORE_MUSCLES = ["core", "rectus_abdominis", "obliques", "transverse_abdominis"];
const CALF_MUSCLES = ["calves", "gastrocnemius", "soleus"];
const ADDUCTOR_MUSCLES = ["adductors"];
const ABDUCTOR_MUSCLES = ["abductors", "gluteus_medius"];
const HAMSTRING_MUSCLES = ["hamstrings"];
const GLUTE_MUSCLES = ["gluteus_maximus", "gluteus_medius", "gluteus_minimus"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasMuscleOverlap(muscles, targets) {
  if (!muscles || !muscles.length) return false;
  return muscles.some((m) => targets.includes(m));
}

function isCompound(ex) {
  const muscles = ex.primary_muscles || [];
  return (
    muscles.length >= 3 ||
    ["squat", "hinge", "push", "pull"].includes(ex.movement_pattern)
  );
}

function isIsolation(ex) {
  return !isCompound(ex);
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickRandomExcluding(arr, count, usedIds) {
  const available = arr.filter((e) => !usedIds.has(e.id));
  const picked = pickRandom(available.length >= count ? available : arr, count);
  picked.forEach((e) => usedIds.add(e.id));
  return picked;
}

function primarySets(level) {
  if (level === "beginner") return 3;
  if (level === "intermediate") return 4;
  return 5;
}

function getWaveParams(weekNumber) {
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
  }
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${REST_URL}${path}`, { headers, ...options });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${options.method || "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function fetchAllExercises() {
  // Supabase paginates at 1000 by default; fetch all pages
  let allExercises = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const batch = await supabaseFetch(
      `/exercises?select=*&is_active=eq.true&order=id&offset=${offset}&limit=${limit}`
    );
    allExercises = allExercises.concat(batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return allExercises;
}

async function insertWorkouts(workouts) {
  return supabaseFetch("/workouts", {
    method: "POST",
    body: JSON.stringify(workouts),
  });
}

async function insertSetsBatched(sets) {
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < sets.length; i += BATCH) {
    const batch = sets.slice(i, i + BATCH);
    await supabaseFetch("/workout_sets", {
      method: "POST",
      body: JSON.stringify(batch),
    });
    inserted += batch.length;
    if (sets.length > BATCH) {
      console.log(`  Sets inserted: ${inserted}/${sets.length}`);
    }
  }
  return inserted;
}

// ─── Exercise Classification ──────────────────────────────────────────────────

function classifyExercises(exercises) {
  const c = {
    push_compound: [],
    push_isolation: [],
    pull_compound: [],
    pull_isolation: [],
    quad_compound: [],
    quad_isolation: [],
    hip_compound: [],
    hip_isolation: [],
    glute_focused: [],
    hamstring_focused: [],
    adductor_focused: [],
    abductor_focused: [],
    shoulder_focused: [],
    bicep_focused: [],
    tricep_focused: [],
    calf_focused: [],
    core_exercises: [],
    mobility: [],
    activation: [],
    conditioning: [],
  };

  for (const ex of exercises) {
    const pm = ex.primary_muscles || [];

    // Category-based buckets
    if (ex.category === "mobility") {
      c.mobility.push(ex);
      continue;
    }
    if (ex.category === "accessory") {
      c.activation.push(ex);
      continue;
    }
    if (ex.category === "conditioning") {
      c.conditioning.push(ex);
      continue;
    }

    // Core
    if (ex.movement_pattern === "core" || hasMuscleOverlap(pm, CORE_MUSCLES)) {
      c.core_exercises.push(ex);
      continue;
    }

    // Fine-grained lower body
    if (hasMuscleOverlap(pm, GLUTE_MUSCLES)) c.glute_focused.push(ex);
    if (hasMuscleOverlap(pm, HAMSTRING_MUSCLES)) c.hamstring_focused.push(ex);
    if (hasMuscleOverlap(pm, ADDUCTOR_MUSCLES)) c.adductor_focused.push(ex);
    if (hasMuscleOverlap(pm, ABDUCTOR_MUSCLES)) c.abductor_focused.push(ex);
    if (hasMuscleOverlap(pm, CALF_MUSCLES)) c.calf_focused.push(ex);

    // Fine-grained upper body
    if (hasMuscleOverlap(pm, SHOULDER_MUSCLES)) c.shoulder_focused.push(ex);
    if (hasMuscleOverlap(pm, BICEP_MUSCLES)) c.bicep_focused.push(ex);
    if (hasMuscleOverlap(pm, TRICEP_MUSCLES)) c.tricep_focused.push(ex);

    // Broad categories
    if (hasMuscleOverlap(pm, UPPER_PUSH_MUSCLES)) {
      if (isCompound(ex)) c.push_compound.push(ex);
      else c.push_isolation.push(ex);
    }
    if (hasMuscleOverlap(pm, UPPER_PULL_MUSCLES)) {
      if (isCompound(ex)) c.pull_compound.push(ex);
      else c.pull_isolation.push(ex);
    }
    if (hasMuscleOverlap(pm, LOWER_QUAD_MUSCLES)) {
      if (isCompound(ex)) c.quad_compound.push(ex);
      else c.quad_isolation.push(ex);
    }
    if (hasMuscleOverlap(pm, LOWER_HIP_MUSCLES)) {
      if (isCompound(ex)) c.hip_compound.push(ex);
      else c.hip_isolation.push(ex);
    }
  }

  return c;
}

// ─── Block Builders ───────────────────────────────────────────────────────────

function buildMobilityBlock(c, sessionType, usedIds, wave) {
  let pool = [...c.mobility, ...c.activation];

  if (sessionType === "upper") {
    const upperTargets = [...UPPER_PULL_MUSCLES, ...UPPER_PUSH_MUSCLES, ...CORE_MUSCLES, ...SHOULDER_MUSCLES];
    const filtered = pool.filter(
      (ex) => hasMuscleOverlap(ex.primary_muscles, upperTargets) || ex.category === "mobility"
    );
    if (filtered.length >= 3) pool = filtered;
  } else if (sessionType === "lower") {
    const lowerTargets = [...LOWER_QUAD_MUSCLES, ...LOWER_HIP_MUSCLES, ...CORE_MUSCLES];
    const filtered = pool.filter(
      (ex) =>
        hasMuscleOverlap(ex.primary_muscles, lowerTargets) ||
        ["squat", "hinge"].includes(ex.movement_pattern) ||
        ex.category === "mobility"
    );
    if (filtered.length >= 3) pool = filtered;
  }

  const count = randomInt(3, 4);
  const exercises = pickRandomExcluding(pool, count, usedIds);
  const sets = [];
  for (const ex of exercises) {
    for (let s = 0; s < 2; s++) {
      sets.push({
        exercise_id: ex.id,
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

function buildStrengthBlock(pool, numSets, reps, rest, wave, usedIds, label) {
  const exercises = pickRandomExcluding(pool, 1, usedIds);
  if (exercises.length === 0) return [];
  const ex = exercises[0];

  let actualSets;
  if (wave.isDeload) {
    actualSets = Math.max(numSets - wave.deloadSetReduction, 2);
  } else {
    actualSets = numSets + (wave.setsMultiplier > 0 && label === "sculpt" ? wave.setsMultiplier : 0);
  }

  const sets = [];
  for (let s = 0; s < actualSets; s++) {
    sets.push({
      exercise_id: ex.id,
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

function buildSupersetBlock(pool, count, numSets, reps, wave, usedIds) {
  const exercises = pickRandomExcluding(pool, count, usedIds);
  if (exercises.length === 0) return [];

  let actualSets;
  if (wave.isDeload) {
    actualSets = Math.max(numSets - wave.deloadSetReduction, 2);
  } else {
    actualSets = numSets + wave.setsMultiplier;
  }

  const sets = [];
  for (let s = 0; s < actualSets; s++) {
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const isLast = i === exercises.length - 1;
      sets.push({
        exercise_id: ex.id,
        set_type: "superset",
        planned_reps: reps,
        planned_weight: 0,
        planned_tempo: ex.default_tempo || "2.0.1.0",
        planned_rpe: null,
        planned_rir: wave.rir,
        planned_rest_seconds: isLast ? 60 : 30,
      });
    }
  }
  return sets;
}

function buildConditioningBlock(c, wave, usedIds) {
  if (wave.isDeload) return [];
  let pool = c.conditioning.length > 0 ? c.conditioning : c.core_exercises;
  const exercises = pickRandomExcluding(pool, 3, usedIds);
  const sets = [];
  for (const ex of exercises) {
    sets.push({
      exercise_id: ex.id,
      set_type: "amrap",
      planned_reps: randomInt(7, 15),
      planned_weight: 0,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: 0,
    });
  }
  return sets;
}

function buildCooldownBlock(c, usedIds) {
  const pool = c.mobility;
  const exercises = pickRandomExcluding(pool, 2, usedIds);
  const sets = [];
  for (const ex of exercises) {
    sets.push({
      exercise_id: ex.id,
      set_type: "cooldown",
      planned_reps: 1,
      planned_weight: 0,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: 0,
    });
  }
  return sets;
}

function buildFlowEngineSession(c, usedIds) {
  const pool = [...c.mobility, ...c.activation, ...c.core_exercises];
  const count = randomInt(8, 10);
  const exercises = pickRandomExcluding(pool, count, usedIds);
  const sets = [];
  for (const ex of exercises) {
    for (let s = 0; s < 2; s++) {
      sets.push({
        exercise_id: ex.id,
        set_type: "working",
        planned_reps: 10,
        planned_weight: 0,
        planned_tempo: "3.0.3.0",
        planned_rpe: null,
        planned_rir: 5,
        planned_rest_seconds: 20,
      });
    }
  }
  return sets;
}

// ─── Session Builders ─────────────────────────────────────────────────────────

function buildGluteThrone(c, level, wave) {
  const usedIds = new Set();
  const sets = [
    ...buildMobilityBlock(c, "lower", usedIds, wave),
    ...buildStrengthBlock(
      c.glute_focused.length > 0 ? c.glute_focused : c.hip_compound,
      5, 8, 90, wave, usedIds, "primary"
    ),
    ...buildStrengthBlock(
      c.hamstring_focused.length > 0 ? c.hamstring_focused : c.hip_compound,
      3, 8, 75, wave, usedIds, "secondary"
    ),
    ...buildSupersetBlock(
      c.glute_focused.length > 0 ? c.glute_focused : c.hip_isolation,
      2, 4, 12, wave, usedIds
    ),
    ...buildSupersetBlock(
      [...c.hamstring_focused, ...c.adductor_focused].length > 0
        ? [...c.hamstring_focused, ...c.adductor_focused]
        : c.hip_isolation,
      2, 3, 12, wave, usedIds
    ),
    ...buildConditioningBlock(c, wave, usedIds),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildUpperBuild(c, level, wave) {
  const usedIds = new Set();
  const sets = [
    ...buildMobilityBlock(c, "upper", usedIds, wave),
    ...buildStrengthBlock(c.pull_compound, primarySets(level), 8, 90, wave, usedIds, "primary"),
    ...buildStrengthBlock(c.push_compound, 3, 8, 75, wave, usedIds, "secondary"),
    ...buildSupersetBlock(
      [...c.pull_isolation, ...c.shoulder_focused.filter(isIsolation)],
      2, 3, 12, wave, usedIds
    ),
    ...buildSupersetBlock(c.shoulder_focused, 2, 3, 12, wave, usedIds),
    ...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildQuadQueen(c, level, wave) {
  const usedIds = new Set();
  const sets = [
    ...buildMobilityBlock(c, "lower", usedIds, wave),
    ...buildStrengthBlock(c.quad_compound, primarySets(level), 8, 90, wave, usedIds, "primary"),
    ...buildStrengthBlock(
      [...c.quad_compound, ...c.quad_isolation],
      3, 10, 75, wave, usedIds, "secondary"
    ),
    ...buildSupersetBlock(
      c.adductor_focused.length > 0 ? c.adductor_focused : c.quad_isolation,
      2, 3, 12, wave, usedIds
    ),
    ...buildSupersetBlock(
      [
        ...(c.abductor_focused.length > 0 ? c.abductor_focused : c.quad_isolation),
        ...c.calf_focused,
      ],
      2, 3, 12, wave, usedIds
    ),
    ...buildConditioningBlock(c, wave, usedIds),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildSculptAndDefine(c, level, wave) {
  const usedIds = new Set();
  const sets = [
    ...buildMobilityBlock(c, "upper", usedIds, wave),
    ...buildSupersetBlock(
      [...c.push_isolation, ...c.pull_isolation],
      2, 3, 12, wave, usedIds
    ),
    ...buildSupersetBlock(
      [...c.bicep_focused, ...c.tricep_focused, ...c.shoulder_focused.filter(isIsolation)],
      3, 3, 12, wave, usedIds
    ),
    ...buildSupersetBlock(
      c.glute_focused.length > 0 ? c.glute_focused : c.hip_isolation,
      2, 3, 15, wave, usedIds
    ),
    ...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildUpperPullPower(c, level, wave) {
  const usedIds = new Set();
  const rearDeltPool = c.shoulder_focused.filter((ex) =>
    hasMuscleOverlap(ex.primary_muscles, ["rear_deltoid"])
  );
  const sets = [
    ...buildMobilityBlock(c, "upper", usedIds, wave),
    ...buildStrengthBlock(c.pull_compound, primarySets(level), 6, 90, wave, usedIds, "primary"),
    ...buildStrengthBlock(
      c.pull_compound.length > 1 ? c.pull_compound : c.pull_isolation,
      3, 8, 75, wave, usedIds, "secondary"
    ),
    ...buildSupersetBlock(c.bicep_focused, 2, 3, 12, wave, usedIds),
    ...buildSupersetBlock(
      rearDeltPool.length > 0 ? rearDeltPool : c.pull_isolation,
      2, 3, 12, wave, usedIds
    ),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildUpperPressSculpt(c, level, wave) {
  const usedIds = new Set();
  const sets = [
    ...buildMobilityBlock(c, "upper", usedIds, wave),
    ...buildStrengthBlock(c.push_compound, primarySets(level), 6, 90, wave, usedIds, "primary"),
    ...buildStrengthBlock(
      c.push_compound.length > 1 ? c.push_compound : c.push_isolation,
      3, 8, 75, wave, usedIds, "secondary"
    ),
    ...buildSupersetBlock(c.shoulder_focused.filter(isIsolation), 2, 3, 12, wave, usedIds),
    ...buildSupersetBlock(c.tricep_focused, 2, 3, 12, wave, usedIds),
    ...buildSupersetBlock(c.core_exercises, 3, 3, 15, wave, usedIds),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildTotalShapeSession(c, level, wave) {
  const usedIds = new Set();
  const sets = [
    ...buildMobilityBlock(c, "lower", usedIds, wave),
    ...buildStrengthBlock(c.hip_compound, primarySets(level), 8, 90, wave, usedIds, "primary"),
    ...buildStrengthBlock(c.quad_compound, 3, 10, 75, wave, usedIds, "secondary"),
    ...buildSupersetBlock(
      [...c.glute_focused, ...c.hamstring_focused],
      2, 4, 12, wave, usedIds
    ),
    ...buildSupersetBlock(
      c.adductor_focused.length > 0 ? c.adductor_focused : c.quad_isolation,
      2, 3, 12, wave, usedIds
    ),
    ...buildSupersetBlock(
      [...c.bicep_focused, ...c.tricep_focused],
      2, 3, 12, wave, usedIds
    ),
    ...buildCooldownBlock(c, usedIds),
  ];
  return numberSets(sets);
}

function buildFlowAndRestore(c) {
  const usedIds = new Set();
  const sets = buildFlowEngineSession(c, usedIds);
  return numberSets(sets);
}

function numberSets(sets) {
  return sets.map((s, i) => ({ ...s, set_order: i + 1 }));
}

// ─── Schedule Definitions ─────────────────────────────────────────────────────

const FOUNDATION_SCHEDULE = [
  { name: "GLUTE THRONE", builder: "gluteThrone", isRest: false, workoutType: "hypertrophy" },
  { name: "UPPER BUILD", builder: "upperBuild", isRest: false, workoutType: "hypertrophy" },
  { name: "Mobility + Zone 2", builder: null, isRest: true, workoutType: "rest" },
  { name: "QUAD QUEEN", builder: "quadQueen", isRest: false, workoutType: "hypertrophy" },
  { name: "SCULPT & DEFINE", builder: "sculptAndDefine", isRest: false, workoutType: "hypertrophy" },
  { name: "Mobility + Zone 2", builder: null, isRest: true, workoutType: "rest" },
  { name: "Recovery", builder: null, isRest: true, workoutType: "rest" },
];

const ELITE_SCHEDULE = [
  { name: "GLUTE THRONE", builder: "gluteThrone", isRest: false, workoutType: "hypertrophy" },
  { name: "QUAD QUEEN", builder: "quadQueen", isRest: false, workoutType: "hypertrophy" },
  { name: "UPPER PULL POWER", builder: "upperPullPower", isRest: false, workoutType: "hypertrophy" },
  { name: "FLOW & RESTORE", builder: "flowAndRestore", isRest: false, workoutType: "mobility" },
  { name: "UPPER PRESS SCULPT", builder: "upperPressSculpt", isRest: false, workoutType: "hypertrophy" },
  { name: "TOTAL SHAPE SESSION", builder: "totalShapeSession", isRest: false, workoutType: "hypertrophy" },
  { name: "Recovery", builder: null, isRest: true, workoutType: "rest" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

const BUILDERS = {
  gluteThrone: buildGluteThrone,
  upperBuild: buildUpperBuild,
  quadQueen: buildQuadQueen,
  sculptAndDefine: buildSculptAndDefine,
  upperPullPower: buildUpperPullPower,
  upperPressSculpt: buildUpperPressSculpt,
  totalShapeSession: buildTotalShapeSession,
  flowAndRestore: buildFlowAndRestore,
};

async function generateProgram(programId, schedule, level, classified, programName) {
  console.log(`\n=== Generating ${programName} (${level}) ===`);

  const workouts = [];
  const allSetsMap = []; // { workoutIndex, sets[] }

  for (let day = 0; day < 42; day++) {
    const weekNumber = Math.floor(day / 7) + 1;
    const dayInWeek = day % 7;
    const scheduledDate = addDays(START_DATE, day);
    const slot = schedule[dayInWeek];
    const wave = getWaveParams(weekNumber);

    const workout = {
      user_id: null,
      program_id: programId,
      scheduled_date: scheduledDate,
      week_number: weekNumber,
      is_rest_day: slot.isRest,
      workout_type: slot.workoutType,
      name: slot.name,
      estimated_duration: slot.isRest
        ? null
        : slot.workoutType === "mobility"
          ? 45
          : 55 + randomInt(0, 19),
    };

    workouts.push(workout);

    if (!slot.isRest && slot.builder) {
      let sets;
      if (slot.builder === "flowAndRestore") {
        sets = BUILDERS[slot.builder](classified);
      } else {
        sets = BUILDERS[slot.builder](classified, level, wave);
      }
      allSetsMap.push({ workoutIndex: day, sets });
    }
  }

  // Insert workouts
  console.log(`Inserting ${workouts.length} workouts...`);
  const insertedWorkouts = await insertWorkouts(workouts);
  console.log(`Inserted ${insertedWorkouts.length} workouts.`);

  // Build workout_sets with correct workout_id
  const allSets = [];
  const exerciseIdsUsed = new Set();

  for (const { workoutIndex, sets } of allSetsMap) {
    const workoutId = insertedWorkouts[workoutIndex].id;
    for (const s of sets) {
      exerciseIdsUsed.add(s.exercise_id);
      allSets.push({
        ...s,
        workout_id: workoutId,
        user_id: null,
      });
    }
  }

  console.log(`Inserting ${allSets.length} workout sets...`);
  const insertedCount = await insertSetsBatched(allSets);
  console.log(`Inserted ${insertedCount} workout sets.`);

  return {
    workoutCount: insertedWorkouts.length,
    setCount: insertedCount,
    exerciseIds: exerciseIdsUsed,
  };
}

async function main() {
  console.log("Fetching exercises...");
  const exercises = await fetchAllExercises();
  console.log(`Fetched ${exercises.length} active exercises.`);

  console.log("Classifying exercises...");
  const classified = classifyExercises(exercises);

  // Log classification counts
  for (const [key, arr] of Object.entries(classified)) {
    console.log(`  ${key}: ${arr.length}`);
  }

  const eliteStats = await generateProgram(
    ELITE_PROGRAM_ID,
    ELITE_SCHEDULE,
    "advanced",
    classified,
    "SCULPT HER ELITE"
  );

  const foundationStats = await generateProgram(
    FOUNDATION_PROGRAM_ID,
    FOUNDATION_SCHEDULE,
    "intermediate",
    classified,
    "SCULPT HER FOUNDATION"
  );

  const allExerciseIds = new Set([...eliteStats.exerciseIds, ...foundationStats.exerciseIds]);

  console.log("\n════════════════════════════════════════");
  console.log("           SEED COMPLETE");
  console.log("════════════════════════════════════════");
  console.log(`SCULPT HER ELITE:      ${eliteStats.workoutCount} workouts, ${eliteStats.setCount} sets`);
  console.log(`SCULPT HER FOUNDATION: ${foundationStats.workoutCount} workouts, ${foundationStats.setCount} sets`);
  console.log(`Total exercises used:  ${allExerciseIds.size}`);
  console.log("════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
