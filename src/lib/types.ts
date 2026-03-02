export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | null;
  role: 'athlete' | 'admin';
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled' | 'grace' | 'past_due';
  subscription_tier: 'monthly' | 'semiannual' | 'annual' | null;
  trial_ends_at: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  weight_unit: 'kg' | 'lb';
  onboarding_completed: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingAnswers {
  id: string;
  user_id: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  primary_goal: 'hypertrophy' | 'fat_loss' | 'performance' | 'health' | 'mobility' | 'event';
  training_days: number;
  equipment: 'home_none' | 'home_dumbbells' | 'full_gym' | 'functional_box';
  injuries: string[];
  emotional_barriers: string[];
  connected_wearable: 'whoop' | 'apple_watch' | 'garmin' | 'oura' | null;
  specific_event: string | null;
  event_date: string | null;
  inbody_data: any | null;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  category: 'strength' | 'olympic' | 'conditioning' | 'mobility' | 'accessory';
  movement_pattern: 'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'rotation' | 'core';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment_required: string[];
  primary_muscles: string[];
  contraindications: string[];
  emotional_barrier_tag: string | null;
  default_tempo: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  video_duration_seconds: number | null;
  founder_notes: string | null;
  coaching_cue: string | null;
  is_active: boolean;
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  total_weeks: number;
  current_week: number;
  current_block: 'accumulation' | 'intensification' | 'peaking' | 'deload';
  is_active: boolean;
  ai_params: any;
  generated_at: string;
}

export interface Workout {
  id: string;
  program_id: string;
  user_id: string;
  scheduled_date: string;
  week_number: number;
  day_label: string;
  workout_type: 'strength' | 'hypertrophy' | 'conditioning' | 'mobility' | 'deload' | 'rest';
  estimated_duration: number | null;
  is_completed: boolean;
  is_rest_day: boolean;
  ai_adjustments: any | null;
  notes: string | null;
  completed_at: string | null;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_id: string;
  set_order: number;
  set_type: 'working' | 'warmup' | 'amrap' | 'emom' | 'backoff';
  planned_reps: number | null;
  planned_weight: number | null;
  planned_tempo: string | null;
  planned_rpe: number | null;
  planned_rir: number | null;
  planned_rest_seconds: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_rpe: number | null;
  actual_rir: number | null;
  is_pr: boolean;
  is_completed: boolean;
  logged_at: string | null;
  exercise?: Exercise;
}

export interface Insight {
  id: string;
  title: string;
  category: 'analytical' | 'motivational';
  description_template: string;
  price_cents: number;
  min_data_days: number;
  requires_wearable: boolean;
  is_active: boolean;
}

export interface WearableData {
  id: string;
  user_id: string;
  source: string;
  date: string;
  hrv_ms: number | null;
  recovery_score: number | null;
  sleep_score: number | null;
  sleep_duration_minutes: number | null;
  resting_hr: number | null;
  strain_score: number | null;
}
