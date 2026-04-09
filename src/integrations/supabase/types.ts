export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_rules: {
        Row: {
          description: string
          id: string
          is_active: boolean | null
          rule_category: string
          rule_key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description: string
          id?: string
          is_active?: boolean | null
          rule_category: string
          rule_key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string
          id?: string
          is_active?: boolean | null
          rule_category?: string
          rule_key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          is_impersonation: boolean | null
          new_values: Json | null
          old_values: Json | null
          target_id: string
          target_table: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_impersonation?: boolean | null
          new_values?: Json | null
          old_values?: Json | null
          target_id: string
          target_table: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          is_impersonation?: boolean | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          exercise_name: string
          fun_fact: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          exercise_name: string
          fun_fact?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          exercise_name?: string
          fun_fact?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      badge_tiers: {
        Row: {
          badge_id: string
          color: string
          id: string
          reps_female: number
          reps_male: number
          sort_order: number | null
          tier: string
          tier_label: string
          weight_female: number | null
          weight_male: number | null
        }
        Insert: {
          badge_id: string
          color?: string
          id?: string
          reps_female: number
          reps_male: number
          sort_order?: number | null
          tier: string
          tier_label: string
          weight_female?: number | null
          weight_male?: number | null
        }
        Update: {
          badge_id?: string
          color?: string
          id?: string
          reps_female?: number
          reps_male?: number
          sort_order?: number | null
          tier?: string
          tier_label?: string
          weight_female?: number | null
          weight_male?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_tiers_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_substitutions: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          priority: number
          substitute_exercise_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          priority?: number
          substitute_exercise_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          priority?: number
          substitute_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_substitutions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_substitutions_substitute_exercise_id_fkey"
            columns: ["substitute_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          coaching_cue: string | null
          contraindications: string[] | null
          created_at: string | null
          default_tempo: string | null
          description: string | null
          difficulty: string
          emotional_barrier_tag: string | null
          equipment_required: string[]
          founder_notes: string | null
          id: string
          is_active: boolean | null
          movement_pattern: string
          name: string
          name_es: string
          primary_muscles: string[]
          thumbnail_url: string | null
          updated_at: string | null
          video_duration_seconds: number | null
          video_url: string | null
        }
        Insert: {
          category: string
          coaching_cue?: string | null
          contraindications?: string[] | null
          created_at?: string | null
          default_tempo?: string | null
          description?: string | null
          difficulty: string
          emotional_barrier_tag?: string | null
          equipment_required: string[]
          founder_notes?: string | null
          id?: string
          is_active?: boolean | null
          movement_pattern: string
          name: string
          name_es: string
          primary_muscles: string[]
          thumbnail_url?: string | null
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Update: {
          category?: string
          coaching_cue?: string | null
          contraindications?: string[] | null
          created_at?: string | null
          default_tempo?: string | null
          description?: string | null
          difficulty?: string
          emotional_barrier_tag?: string | null
          equipment_required?: string[]
          founder_notes?: string | null
          id?: string
          is_active?: boolean | null
          movement_pattern?: string
          name?: string
          name_es?: string
          primary_muscles?: string[]
          thumbnail_url?: string | null
          updated_at?: string | null
          video_duration_seconds?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          category: string
          created_at: string | null
          description_template: string
          id: string
          is_active: boolean | null
          min_data_days: number | null
          price_cents: number | null
          requires_wearable: boolean | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description_template: string
          id?: string
          is_active?: boolean | null
          min_data_days?: number | null
          price_cents?: number | null
          requires_wearable?: boolean | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description_template?: string
          id?: string
          is_active?: boolean | null
          min_data_days?: number | null
          price_cents?: number | null
          requires_wearable?: boolean | null
          title?: string
        }
        Relationships: []
      }
      insights_unlocked: {
        Row: {
          generated_content: string
          id: string
          insight_id: string
          payment_id: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          generated_content: string
          id?: string
          insight_id: string
          payment_id?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          generated_content?: string
          id?: string
          insight_id?: string
          payment_id?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_unlocked_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_unlocked_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      mesocycles: {
        Row: {
          created_at: string
          cycle_end_date: string | null
          cycle_number: number
          cycle_start_date: string
          id: string
          previous_cycle_id: string | null
          program_name: string
          status: string
          template_program_id: string
          total_weeks: number
        }
        Insert: {
          created_at?: string
          cycle_end_date?: string | null
          cycle_number: number
          cycle_start_date: string
          id?: string
          previous_cycle_id?: string | null
          program_name: string
          status?: string
          template_program_id: string
          total_weeks?: number
        }
        Update: {
          created_at?: string
          cycle_end_date?: string | null
          cycle_number?: number
          cycle_start_date?: string
          id?: string
          previous_cycle_id?: string | null
          program_name?: string
          status?: string
          template_program_id?: string
          total_weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "mesocycles_previous_cycle_id_fkey"
            columns: ["previous_cycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mesocycles_template_program_id_fkey"
            columns: ["template_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_answers: {
        Row: {
          connected_wearable: string | null
          created_at: string | null
          emotional_barriers: string[] | null
          equipment: string
          event_date: string | null
          experience_level: string
          id: string
          inbody_data: Json | null
          injuries: string[] | null
          primary_goal: string
          specific_event: string | null
          training_days: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connected_wearable?: string | null
          created_at?: string | null
          emotional_barriers?: string[] | null
          equipment: string
          event_date?: string | null
          experience_level: string
          id?: string
          inbody_data?: Json | null
          injuries?: string[] | null
          primary_goal: string
          specific_event?: string | null
          training_days: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connected_wearable?: string | null
          created_at?: string | null
          emotional_barriers?: string[] | null
          equipment?: string
          event_date?: string | null
          experience_level?: string
          id?: string
          inbody_data?: Json | null
          injuries?: string[] | null
          primary_goal?: string
          specific_event?: string | null
          training_days?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string | null
          currency: string | null
          id: string
          insight_id: string | null
          payment_type: string
          status: string
          stripe_payment_intent_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          currency?: string | null
          id?: string
          insight_id?: string | null
          payment_type: string
          status: string
          stripe_payment_intent_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          insight_id?: string | null
          payment_type?: string
          status?: string
          stripe_payment_intent_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_insight"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          ai_params: Json | null
          created_at: string | null
          current_block: string | null
          current_week: number | null
          generated_at: string | null
          id: string
          is_active: boolean | null
          mesocycle_id: string | null
          name: string
          total_weeks: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_params?: Json | null
          created_at?: string | null
          current_block?: string | null
          current_week?: number | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          mesocycle_id?: string | null
          name: string
          total_weeks: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_params?: Json | null
          created_at?: string | null
          current_block?: string | null
          current_week?: number | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          mesocycle_id?: string | null
          name?: string
          total_weeks?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          device_token: string | null
          endpoint: string | null
          id: string
          p256dh: string | null
          platform: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          device_token?: string | null
          endpoint?: string | null
          id?: string
          p256dh?: string | null
          platform?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          device_token?: string | null
          endpoint?: string | null
          id?: string
          p256dh?: string | null
          platform?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_tier_id: string
          created_at: string
          earned_at: string | null
          id: string
          proof_notes: string | null
          proof_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          badge_tier_id: string
          created_at?: string
          earned_at?: string | null
          id?: string
          proof_notes?: string | null
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          badge_tier_id?: string
          created_at?: string
          earned_at?: string | null
          id?: string
          proof_notes?: string | null
          proof_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_tier_id_fkey"
            columns: ["badge_tier_id"]
            isOneToOne: false
            referencedRelation: "badge_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          question_ids: string[]
          responses: Json
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_ids?: string[]
          responses?: Json
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_ids?: string[]
          responses?: Json
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_period_end: string | null
          deleted_at: string | null
          dunning_step: number
          experience_level: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_deleted: boolean | null
          onboarding_completed: boolean | null
          payment_failed_at: string | null
          role: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          training_days_per_week: number | null
          training_location: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
          weight_unit: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_period_end?: string | null
          deleted_at?: string | null
          dunning_step?: number
          experience_level?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_deleted?: boolean | null
          onboarding_completed?: boolean | null
          payment_failed_at?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          training_days_per_week?: number | null
          training_location?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
          weight_unit?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_period_end?: string | null
          deleted_at?: string | null
          dunning_step?: number
          experience_level?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_deleted?: boolean | null
          onboarding_completed?: boolean | null
          payment_failed_at?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          training_days_per_week?: number | null
          training_location?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
          weight_unit?: string | null
        }
        Relationships: []
      }
      wearable_data: {
        Row: {
          date: string
          hrv_ms: number | null
          id: string
          raw_data: Json | null
          recovery_score: number | null
          resting_hr: number | null
          sleep_duration_minutes: number | null
          sleep_score: number | null
          source: string
          strain_score: number | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          date: string
          hrv_ms?: number | null
          id?: string
          raw_data?: Json | null
          recovery_score?: number | null
          resting_hr?: number | null
          sleep_duration_minutes?: number | null
          sleep_score?: number | null
          source: string
          strain_score?: number | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          date?: string
          hrv_ms?: number | null
          id?: string
          raw_data?: Json | null
          recovery_score?: number | null
          resting_hr?: number | null
          sleep_duration_minutes?: number | null
          sleep_score?: number | null
          source?: string
          strain_score?: number | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_exercise_swaps: {
        Row: {
          block_label: string
          created_at: string | null
          id: string
          original_exercise_id: string
          replacement_exercise_id: string
          user_id: string
          workout_id: string
        }
        Insert: {
          block_label: string
          created_at?: string | null
          id?: string
          original_exercise_id: string
          replacement_exercise_id: string
          user_id: string
          workout_id: string
        }
        Update: {
          block_label?: string
          created_at?: string | null
          id?: string
          original_exercise_id?: string
          replacement_exercise_id?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_swaps_original_exercise_id_fkey"
            columns: ["original_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_swaps_replacement_exercise_id_fkey"
            columns: ["replacement_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_swaps_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          actual_reps: number | null
          actual_rir: number | null
          actual_rpe: number | null
          actual_weight: number | null
          block_label: string | null
          coaching_cue_override: string | null
          exercise_id: string
          id: string
          is_completed: boolean | null
          is_pr: boolean | null
          logged_at: string | null
          planned_duration_seconds: number | null
          planned_reps: number | null
          planned_rest_seconds: number | null
          planned_rir: number | null
          planned_rpe: number | null
          planned_tempo: string | null
          planned_weight: number | null
          set_order: number
          set_type: string
          user_id: string | null
          workout_id: string
        }
        Insert: {
          actual_reps?: number | null
          actual_rir?: number | null
          actual_rpe?: number | null
          actual_weight?: number | null
          block_label?: string | null
          coaching_cue_override?: string | null
          exercise_id: string
          id?: string
          is_completed?: boolean | null
          is_pr?: boolean | null
          logged_at?: string | null
          planned_duration_seconds?: number | null
          planned_reps?: number | null
          planned_rest_seconds?: number | null
          planned_rir?: number | null
          planned_rpe?: number | null
          planned_tempo?: string | null
          planned_weight?: number | null
          set_order: number
          set_type: string
          user_id?: string | null
          workout_id: string
        }
        Update: {
          actual_reps?: number | null
          actual_rir?: number | null
          actual_rpe?: number | null
          actual_weight?: number | null
          block_label?: string | null
          coaching_cue_override?: string | null
          exercise_id?: string
          id?: string
          is_completed?: boolean | null
          is_pr?: boolean | null
          logged_at?: string | null
          planned_duration_seconds?: number | null
          planned_reps?: number | null
          planned_rest_seconds?: number | null
          planned_rir?: number | null
          planned_rpe?: number | null
          planned_tempo?: string | null
          planned_weight?: number | null
          set_order?: number
          set_type?: string
          user_id?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          ai_adjustments: Json | null
          coach_note: string | null
          completed_at: string | null
          created_at: string | null
          day_label: string
          estimated_duration: number | null
          id: string
          is_completed: boolean | null
          is_rest_day: boolean | null
          mesocycle_id: string | null
          notes: string | null
          program_id: string
          scheduled_date: string
          short_on_time_note: string | null
          updated_at: string | null
          user_id: string | null
          week_number: number
          workout_type: string
        }
        Insert: {
          ai_adjustments?: Json | null
          coach_note?: string | null
          completed_at?: string | null
          created_at?: string | null
          day_label: string
          estimated_duration?: number | null
          id?: string
          is_completed?: boolean | null
          is_rest_day?: boolean | null
          mesocycle_id?: string | null
          notes?: string | null
          program_id: string
          scheduled_date: string
          short_on_time_note?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_number: number
          workout_type: string
        }
        Update: {
          ai_adjustments?: Json | null
          coach_note?: string | null
          completed_at?: string | null
          created_at?: string | null
          day_label?: string
          estimated_duration?: number | null
          id?: string
          is_completed?: boolean | null
          is_rest_day?: boolean | null
          mesocycle_id?: string | null
          notes?: string | null
          program_id?: string
          scheduled_date?: string
          short_on_time_note?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_number?: number
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ex: { Args: { p_name: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      propagate_template_sets: {
        Args: {
          p_from_week?: number
          p_template_program_id: string
          p_to_week?: number
        }
        Returns: Json
      }
      recalculate_workout_dates: {
        Args: { p_cycle_start_date: string; p_program_id: string }
        Returns: number
      }
      wk: {
        Args: { p_day_offset: number; p_prog: string; p_week: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
