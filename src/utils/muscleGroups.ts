/**
 * Maps granular muscle names from the DB (primary_muscles array) into
 * macro training groups used for volume/effective-set analysis.
 *
 * Source: based on standard hypertrophy science (Schoenfeld et al.) which
 * tracks "effective sets per muscle group per week" rather than raw tonnage,
 * because tonnage is biased by muscle size (a hip thrust will always dwarf
 * a bicep curl regardless of training intensity).
 *
 * Target: 10–20 effective sets per muscle group per week.
 */

export type MacroGroup =
  | "Pecho"
  | "Espalda"
  | "Lumbar"
  | "Hombros"
  | "Biceps"
  | "Triceps"
  | "Antebrazos"
  | "Cuadriceps"
  | "Hamstrings"
  | "Gluteos"
  | "Pantorrillas"
  | "Core"
  | "Cadera";

const MUSCLE_TO_MACRO: Record<string, MacroGroup> = {
  // Pecho
  chest: "Pecho",
  pectoralis_major: "Pecho",
  upper_pectoralis: "Pecho",
  serratus: "Pecho",
  serratus_anterior: "Pecho",

  // Espalda (lats + mid-back)
  back: "Espalda",
  upper_back: "Espalda",
  lats: "Espalda",
  rhomboids: "Espalda",
  lower_trapezius: "Espalda",
  upper_trapezius: "Espalda",
  traps: "Espalda",
  teres_major: "Espalda",

  // Lumbar (erectors)
  lower_back: "Lumbar",
  erector_spinae: "Lumbar",
  spine: "Lumbar",
  thoracic_extensors: "Lumbar",
  thoracic_spine: "Lumbar",

  // Hombros (delts)
  shoulders: "Hombros",
  deltoid: "Hombros",
  anterior_deltoid: "Hombros",
  deltoid_anterior: "Hombros",
  front_delts: "Hombros",
  deltoid_medial: "Hombros",
  side_delts: "Hombros",
  rear_deltoid: "Hombros",
  rear_delts: "Hombros",
  rotator_cuff: "Hombros",

  // Biceps
  biceps: "Biceps",
  biceps_brachii: "Biceps",
  brachialis: "Biceps",
  brachioradialis: "Biceps",

  // Triceps
  triceps: "Triceps",
  triceps_brachii: "Triceps",
  triceps_brachii_long_head: "Triceps",

  // Antebrazos / grip
  forearms: "Antebrazos",
  wrists: "Antebrazos",
  grip: "Antebrazos",

  // Cuadriceps
  quads: "Cuadriceps",
  quadriceps: "Cuadriceps",

  // Hamstrings
  hamstrings: "Hamstrings",

  // Gluteos
  glutes: "Gluteos",
  gluteus_maximus: "Gluteos",
  gluteus_medius: "Gluteos",
  gluteus_minimus: "Gluteos",
  glute_med: "Gluteos",

  // Pantorrillas
  calves: "Pantorrillas",
  gastrocnemius: "Pantorrillas",
  soleus: "Pantorrillas",

  // Cadera
  hips: "Cadera",
  hip_flexors: "Cadera",
  hip_external_rotators: "Cadera",
  hip_internal_rotators: "Cadera",
  abductors: "Cadera",
  adductors: "Cadera",
  groin: "Cadera",
  gracilis: "Cadera",
  piriformis: "Cadera",
  TFL: "Cadera",

  // Core
  core: "Core",
  obliques: "Core",
  transverse_abdominis: "Core",
};

// Muscles we intentionally ignore (too generic, non-muscle, or cardio):
// cardio, cardiovascular, coordination, arms, legs, ankles, neck, diaphragm

/**
 * Target effective sets per week per macro group.
 * Schoenfeld 2017: 10 sets/week is the minimum effective dose, 20 is the
 * upper end of diminishing returns for most intermediate lifters.
 */
export const SETS_PER_WEEK_MIN = 10;
export const SETS_PER_WEEK_MAX = 20;

/** Returns the macro group for a granular muscle, or null if ignored. */
export function muscleToMacro(muscle: string): MacroGroup | null {
  return MUSCLE_TO_MACRO[muscle] ?? null;
}

/**
 * Given a set's primary_muscles array, returns the unique set of macro
 * groups it trains. Deduplicates — a deadlift hitting "hamstrings" and
 * "erector_spinae" produces {Hamstrings, Lumbar} (no double-count).
 */
export function setMacroGroups(primaryMuscles: string[] | null | undefined): MacroGroup[] {
  if (!primaryMuscles || primaryMuscles.length === 0) return [];
  const macros = new Set<MacroGroup>();
  for (const m of primaryMuscles) {
    const macro = muscleToMacro(m);
    if (macro) macros.add(macro);
  }
  return [...macros];
}

/** All macro groups in display order (upper → lower → core). */
export const ALL_MACRO_GROUPS: MacroGroup[] = [
  "Pecho",
  "Espalda",
  "Hombros",
  "Biceps",
  "Triceps",
  "Antebrazos",
  "Cuadriceps",
  "Hamstrings",
  "Gluteos",
  "Pantorrillas",
  "Cadera",
  "Lumbar",
  "Core",
];

/** Visual state for a given set-count vs target range. */
export type VolumeStatus = "none" | "low" | "in_range" | "high";

export function volumeStatus(sets: number): VolumeStatus {
  if (sets === 0) return "none";
  if (sets < SETS_PER_WEEK_MIN) return "low";
  if (sets <= SETS_PER_WEEK_MAX) return "in_range";
  return "high";
}
