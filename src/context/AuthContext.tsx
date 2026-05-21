import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthError, AuthResponse, AuthTokenResponsePassword } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";
import { clearWorkoutCache } from "@/lib/workoutCache";
import { offlineStorage } from "@/lib/offlineStorage";
import { readCachedProfile, writeCachedProfile, clearCachedProfile } from "@/lib/profileCache";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthTokenResponsePassword>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  isPremium: () => boolean;
  isAdmin: () => boolean;
  hasOnboarded: () => boolean;
  refreshProfile: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // Try up to 3 times with exponential backoff (0ms, 800ms, 2400ms).
    // PWA cold-start on cell networks sometimes takes 2-4 seconds before
    // Supabase queries land — one retry isn't enough.
    const delays = [0, 800, 2400];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        const prof = data as UserProfile;
        setProfile(prof);
        // Cache locally so the next cold-start can paint immediately
        writeCachedProfile(userId, prof);
        return;
      }
      if (error && i < delays.length - 1) {
        console.warn(`[AuthContext] fetchProfile attempt ${i + 1} failed:`, error.message);
        continue;
      }
      if (!data && !error) {
        // No row found — explicit null so UI shows the right state
        setProfile(null);
        return;
      }
    }
    // All attempts failed — leave profile as-is (cache, if any, stays)
    console.warn("[AuthContext] fetchProfile gave up after 3 attempts");
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Paint from cache immediately (if available) so the home screen
          // shows instantly — then refresh in background.
          const cached = readCachedProfile(newSession.user.id);
          if (cached) setProfile(cached);
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN get current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Paint from cache immediately. Background refresh updates if changed.
        const cached = readCachedProfile(s.user.id);
        if (cached) setProfile(cached);
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || "" },
        emailRedirectTo: window.location.origin,
      },
    });

    // Auto-create user_profiles row for the new user
    if (result.data?.user && !result.error) {
      await supabase.from("user_profiles").upsert(
        {
          user_id: result.data.user.id,
          full_name: fullName || "",
          role: "athlete",
          subscription_status: "trial",
          onboarding_completed: false,
        },
        { onConflict: "user_id" }
      );
    }

    return result;
  };

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    // Mirror the session into AuthContext state synchronously instead of
    // relying on onAuthStateChange (which fires in a later macrotask). This
    // eliminates the race where Login.tsx navigates to /home before the
    // listener has updated user/session, and ProtectedRoute sees user=null
    // and bounces back to /login. Symptom on PWA: "first login does nothing,
    // close + reopen and you're in."
    if (result.data?.session && result.data?.user) {
      setSession(result.data.session);
      setUser(result.data.user);
      // Paint from cache immediately if available (returning users), so
      // ProtectedRoute lets the athlete through without waiting for the
      // network. Background fetchProfile refreshes the data.
      const cached = readCachedProfile(result.data.user.id);
      if (cached) setProfile(cached);
      setLoading(false);
      fetchProfile(result.data.user.id);
    }
    return result;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    // Wipe offline cache + pending writes + profile cache — never leak
    // one athlete's data into another's session on a shared device.
    // Best-effort: don't fail signOut over storage errors.
    try {
      await clearWorkoutCache();
      await offlineStorage.clearPendingWrites();
      clearCachedProfile();
    } catch { /* noop */ }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const isPremium = () => profile?.subscription_status === "active";

  const isAdmin = () => profile?.role === "admin";

  const hasOnboarded = () => profile?.onboarding_completed === true;

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading,
        signUp, signIn, signOut, signInWithGoogle,
        isPremium, isAdmin, hasOnboarded,
        refreshProfile, fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
