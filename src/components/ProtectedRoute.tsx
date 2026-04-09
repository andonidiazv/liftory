import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin, hasOnboarded, fetchProfile, signOut } = useAuth();
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const location = useLocation();
  const retried = useRef(false);
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  // Safety net: if user exists but profile is null, retry once
  useEffect(() => {
    if (!loading && user && !profile && !retried.current) {
      retried.current = true;
      fetchProfile(user.id);
    }
    if (profile) {
      retried.current = false;
      setProfileTimedOut(false);
    }
  }, [loading, user, profile, fetchProfile]);

  // Timeout: if profile is still null after 6s, give user a way out
  useEffect(() => {
    if (!loading && user && !profile) {
      const timer = setTimeout(() => setProfileTimedOut(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: t.bg }}>
        <span className="font-display text-sm" style={{ color: t.accent, opacity: 0.25, fontWeight: 800, letterSpacing: "-0.04em" }}>
          LIFTORY
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: t.bg }}>
        <span className="font-display text-sm" style={{ color: t.accent, opacity: 0.25, fontWeight: 800, letterSpacing: "-0.04em" }}>
          LIFTORY
        </span>
        {profileTimedOut && (
          <>
            <p className="font-body text-[13px]" style={{ color: t.muted }}>
              No se pudo cargar tu perfil.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  retried.current = false;
                  setProfileTimedOut(false);
                  fetchProfile(user.id);
                }}
                className="font-display text-[13px] font-semibold px-5 py-2 rounded-full"
                style={{ background: t.accent, color: t.btnText }}
              >
                Reintentar
              </button>
              <button
                onClick={() => signOut()}
                className="font-body text-[13px] underline"
                style={{ color: t.muted }}
              >
                Cerrar sesion
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Admin bypass — admins can go anywhere
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Subscription check: active, or trial with time remaining → allowed
  const isActive = profile.subscription_status === "active";
  const isTrialValid =
    profile.subscription_status === "trial" &&
    !!profile.trial_ends_at &&
    new Date(profile.trial_ends_at) > new Date();
  const hasAccess = isActive || isTrialValid;

  if (!hasAccess && location.pathname !== "/paywall") {
    return <Navigate to="/paywall" replace />;
  }

  // Onboarding check (except if already on onboarding or paywall)
  if (hasAccess && !hasOnboarded() && !["/onboarding", "/paywall"].includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
