import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { User, Session } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
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
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data as UserProfile | null);
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
        fetchProfile(s.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || "" },
        emailRedirectTo: window.location.origin,
      },
    });
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
    return lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
  };

  const isFreeTrial = () => {
    if (!profile) return false;
    if (profile.subscription_status !== "trial") return false;
    if (!profile.trial_ends_at) return false;
    return new Date(profile.trial_ends_at) > new Date();
  };

  const isPremium = () => profile?.subscription_status === "active";

  const isExpired = () => {
    if (!profile) return false;
    if (profile.subscription_status === "expired") return true;
    if (profile.subscription_status === "trial") {
      if (!profile.trial_ends_at) return true;
      return new Date(profile.trial_ends_at) <= new Date();
    }
    return false;
  };

  const isAdmin = () => profile?.role === "admin";

  const hasOnboarded = () => profile?.onboarding_completed === true;

  const daysLeftInTrial = () => {
    if (!profile?.trial_ends_at) return 0;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading,
        signUp, signIn, signOut, signInWithGoogle,
        isFreeTrial, isPremium, isExpired, isAdmin, hasOnboarded, daysLeftInTrial,
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
