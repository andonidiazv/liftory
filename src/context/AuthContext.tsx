import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthError, AuthResponse, AuthTokenResponsePassword } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

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
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      setProfile(data as UserProfile | null);
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let didFinish = false;
    const markDone = () => { if (!didFinish) { didFinish = true; setLoading(false); } };

    // Hard safety net — NEVER stay loading more than 8 seconds no matter what
    const safetyTimer = setTimeout(markDone, 8000);

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          try { await fetchProfile(newSession.user.id); } catch {}
        } else {
          setProfile(null);
        }
        markDone();
      }
    );

    // THEN get current session
    supabase.auth.getSession()
      .then(async ({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          try { await fetchProfile(s.user.id); } catch {}
        }
        markDone();
      })
      .catch(() => markDone());

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
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
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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
