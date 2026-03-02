import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  onboarding_completed: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isFreeTrial: () => boolean;
  isPremium: () => boolean;
  isExpired: () => boolean;
  daysLeftInTrial: () => number;
  refreshProfile: () => Promise<void>;
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
      .select("id, user_id, full_name, subscription_status, trial_ends_at, onboarding_completed")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer profile fetch to avoid Supabase client deadlock
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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

  const daysLeftInTrial = () => {
    if (!profile?.trial_ends_at) return 0;
    const diff = new Date(profile.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signOut, isFreeTrial, isPremium, isExpired, daysLeftInTrial, refreshProfile }}
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
