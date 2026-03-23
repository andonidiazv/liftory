import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SetCompletion {
  exerciseId: string;
  setIndex: number;
  actualWeight?: string;
  actualReps?: string;
}

interface AppState {
  onboardingComplete: boolean;
  workoutActive: boolean;
  currentExerciseIndex: number;
  completedSets: SetCompletion[];
  restTimerActive: boolean;
  restTimeRemaining: number;
  workoutStartTime: number | null;
  workoutElapsed: number;
}

interface AppContextType extends AppState {
  completeOnboarding: (data?: Record<string, unknown>) => void;
  startWorkout: () => void;
  endWorkout: () => void;
  setCurrentExercise: (index: number) => void;
  completeSet: (exerciseId: string, setIndex: number, data?: { weight?: string; reps?: string }) => void;
  getSetData: (exerciseId: string, setIndex: number) => SetCompletion | undefined;
  isSetCompleted: (exerciseId: string, setIndex: number) => boolean;
  startRestTimer: (seconds: number) => void;
  skipRestTimer: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => ({
    onboardingComplete: localStorage.getItem("fbb_onboarding") === "true",
    workoutActive: false,
    currentExerciseIndex: 0,
    completedSets: [],
    restTimerActive: false,
    restTimeRemaining: 0,
    workoutStartTime: null,
    workoutElapsed: 0,
  }));

  // Toggle workout-mode class on html element
  useEffect(() => {
    const html = document.documentElement;
    if (state.workoutActive) {
      html.classList.add("workout-mode");
    } else {
      html.classList.remove("workout-mode");
    }
  }, [state.workoutActive]);

  // Workout timer
  useEffect(() => {
    if (!state.workoutActive || !state.workoutStartTime) return;
    const interval = setInterval(() => {
      setState((s) => ({
        ...s,
        workoutElapsed: Math.floor((Date.now() - s.workoutStartTime!) / 1000),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.workoutActive, state.workoutStartTime]);

  // Rest timer countdown
  useEffect(() => {
    if (!state.restTimerActive || state.restTimeRemaining <= 0) return;
    const interval = setInterval(() => {
      setState((s) => {
        const next = s.restTimeRemaining - 1;
        if (next <= 0) return { ...s, restTimerActive: false, restTimeRemaining: 0 };
        return { ...s, restTimeRemaining: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.restTimerActive, state.restTimeRemaining]);

  const completeOnboarding = useCallback(async (onboardingData?: Record<string, unknown>) => {
    localStorage.setItem("fbb_onboarding", "true");
    setState((s) => ({ ...s, onboardingComplete: true }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_profiles")
        .update({ onboarding_completed: true, ...onboardingData })
        .eq("user_id", user.id);
    }
  }, []);

  const startWorkout = useCallback(() => {
    setState((s) => ({
      ...s,
      workoutActive: true,
      currentExerciseIndex: 0,
      completedSets: [],
      workoutStartTime: Date.now(),
      workoutElapsed: 0,
    }));
  }, []);

  const endWorkout = useCallback(() => {
    setState((s) => ({
      ...s,
      workoutActive: false,
      restTimerActive: false,
      restTimeRemaining: 0,
    }));
  }, []);

  const setCurrentExercise = useCallback((index: number) => {
    setState((s) => ({ ...s, currentExerciseIndex: index }));
  }, []);

  const completeSet = useCallback((exerciseId: string, setIndex: number, data?: { weight?: string; reps?: string }) => {
    setState((s) => {
      const exists = s.completedSets.some(
        (c) => c.exerciseId === exerciseId && c.setIndex === setIndex
      );
      if (exists) return s;
      return {
        ...s,
        completedSets: [...s.completedSets, { exerciseId, setIndex, actualWeight: data?.weight, actualReps: data?.reps }],
      };
    });
  }, []);

  const getSetData = useCallback(
    (exerciseId: string, setIndex: number) => {
      return state.completedSets.find(
        (c) => c.exerciseId === exerciseId && c.setIndex === setIndex
      );
    },
    [state.completedSets]
  );

  const isSetCompleted = useCallback(
    (exerciseId: string, setIndex: number) => {
      return state.completedSets.some(
        (c) => c.exerciseId === exerciseId && c.setIndex === setIndex
      );
    },
    [state.completedSets]
  );

  const startRestTimer = useCallback((seconds: number) => {
    setState((s) => ({ ...s, restTimerActive: true, restTimeRemaining: seconds }));
  }, []);

  const skipRestTimer = useCallback(() => {
    setState((s) => ({ ...s, restTimerActive: false, restTimeRemaining: 0 }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        completeOnboarding,
        startWorkout,
        endWorkout,
        setCurrentExercise,
        completeSet,
        getSetData,
        isSetCompleted,
        startRestTimer,
        skipRestTimer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
