/** Shared block constants used by both athlete view and admin editor */

export const BLOCK_ORDER = [
  'PRIME BLOCK', 'PRIME BLOCK — A', 'PRIME BLOCK — B', 'PRIME BLOCK — C',
  'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION',
  'POWER BLOCK', 'HEAVY BLOCK — A', 'HEAVY BLOCK — B', 'HEAVY BLOCK — C',
  'BUILD BLOCK — A', 'BUILD BLOCK — B', 'BUILD BLOCK — C',
  'DENSITY BLOCK A', 'DENSITY BLOCK B', 'HYPERTROPHY BLOCK', 'SKILL PUSH', 'ARM BLOCK',
  'ATHLETIC HINGE', 'CORE BLOCK', 'CARRY BLOCK', 'METCON BLOCK', 'FINISHER BLOCK', 'ENGINE BLOCK', 'RECOVERY BLOCK',
];

export const BLOCK_LABEL_COLORS: Record<string, string> = {
  'PRIME BLOCK': '#7A8B5C',
  // PRIME sub-blocks (M3+): same color as parent
  'PRIME BLOCK — A': '#7A8B5C',
  'PRIME BLOCK — B': '#7A8B5C',
  'PRIME BLOCK — C': '#7A8B5C',
  'RESET & BREATHE': '#7A8B5C',
  'SPINE & HIPS': '#7A8B5C',
  'DYNAMIC FLOW': '#7A8B5C',
  'ATHLETIC INTEGRATION': '#7A8B5C',
  'POWER BLOCK': '#D45555',
  'HEAVY BLOCK — A': '#C4A24E',
  'HEAVY BLOCK — B': '#C4A24E',
  'HEAVY BLOCK — C': '#C4A24E',
  'BUILD BLOCK — A': '#C4A24E',
  'BUILD BLOCK — B': '#C4A24E',
  'BUILD BLOCK — C': '#C4A24E',
  // M3 day-modality blocks (Density Day LUN, Skill Day MIE, Upper Hyp VIE, Lower SAB)
  'DENSITY BLOCK A': '#D45555',
  'DENSITY BLOCK B': '#D45555',
  'HYPERTROPHY BLOCK': '#C4A24E',
  'SKILL PUSH': '#C4A24E',
  'SKILL A': '#C4A24E',
  'SKILL B': '#D45555',
  'LAT VOLUME': '#C4A24E',
  'PULL POWER': '#C4A24E',
  'ARM BLOCK': '#C4A24E',
  // M3 VIE Upper Hypertrophy
  'HEAVY PUSH': '#C4A24E',
  'HEAVY PULL': '#C4A24E',
  'SHOULDER 3D': '#C4A24E',
  'ARM SUPERSET': '#C4A24E',
  'STRENGTH COMPOUND': '#D45555',
  'OPCIONAL · Z2': '#7A8B5C',
  // M3 SAB Lower Hypertrophy Unilateral
  'HEAVY A': '#D45555',
  'HEAVY B': '#C4A24E',
  'GLUTE VOLUME': '#C4A24E',
  'LEG ENGINE': '#D45555',
  'CALF + CARRY': '#D4896B',
  'ATHLETIC HINGE': '#D4896B',
  'CORE BLOCK': '#D4896B',
  'CARRY BLOCK': '#D4896B',
  'METCON BLOCK': '#E07A5F',
  'FINISHER BLOCK': '#B86F4D',
  'ENGINE BLOCK': '#D45555',
  'RECOVERY BLOCK': '#7A8B5C',
};

export const WORKOUT_TYPES = ['strength', 'hypertrophy', 'conditioning', 'mobility', 'deload', 'rest'] as const;

export const SET_TYPES = ['working', 'warmup', 'amrap', 'emom', 'interval', 'backoff', 'superset', 'cooldown', 'dropset'] as const;

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  strength: '#D45555',
  hypertrophy: '#C4A24E',
  conditioning: '#C4A24E',
  mobility: '#7A8B5C',
  deload: '#6B6B6F',
  rest: '#B5ADA8',
};
