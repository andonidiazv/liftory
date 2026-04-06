/** Shared block constants used by both athlete view and admin editor */

export const BLOCK_ORDER = [
  'PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION',
  'POWER BLOCK', 'HEAVY BLOCK — A', 'HEAVY BLOCK — B',
  'BUILD BLOCK — A', 'BUILD BLOCK — B', 'BUILD BLOCK — C',
  'ATHLETIC HINGE', 'CORE BLOCK', 'ENGINE BLOCK', 'RECOVERY BLOCK',
];

export const BLOCK_LABEL_COLORS: Record<string, string> = {
  'PRIME BLOCK': '#7A8B5C',
  'RESET & BREATHE': '#7A8B5C',
  'SPINE & HIPS': '#7A8B5C',
  'DYNAMIC FLOW': '#7A8B5C',
  'ATHLETIC INTEGRATION': '#7A8B5C',
  'POWER BLOCK': '#D45555',
  'HEAVY BLOCK — A': '#C75B39',
  'HEAVY BLOCK — B': '#C75B39',
  'BUILD BLOCK — A': '#C9A96E',
  'BUILD BLOCK — B': '#C9A96E',
  'BUILD BLOCK — C': '#C9A96E',
  'ATHLETIC HINGE': '#D4896B',
  'CORE BLOCK': '#D4896B',
  'ENGINE BLOCK': '#D45555',
  'RECOVERY BLOCK': '#7A8B5C',
};

export const WORKOUT_TYPES = ['strength', 'hypertrophy', 'conditioning', 'mobility', 'deload', 'rest'] as const;

export const SET_TYPES = ['working', 'warmup', 'amrap', 'emom', 'interval', 'backoff', 'superset', 'cooldown', 'dropset'] as const;

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  strength: '#D45555',
  hypertrophy: '#C9A96E',
  conditioning: '#C75B39',
  mobility: '#7A8B5C',
  deload: '#8A8A8E',
  rest: '#3A3A3A',
};
