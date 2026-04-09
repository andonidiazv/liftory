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
  'HEAVY BLOCK — A': '#652F23',
  'HEAVY BLOCK — B': '#652F23',
  'BUILD BLOCK — A': '#652F23',
  'BUILD BLOCK — B': '#652F23',
  'BUILD BLOCK — C': '#652F23',
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
  hypertrophy: '#652F23',
  conditioning: '#652F23',
  mobility: '#7A8B5C',
  deload: '#816D66',
  rest: '#B5ADA8',
};
