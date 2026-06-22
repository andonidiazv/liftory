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
  const [showLoadingText, setShowLoadingText] = useState(false);

  // Safety net: if user exists but profile is null, retry once
  useEffect(() => {
    if (!loading && user && !profile && !retried.current) {
      retried.current = true;
      fetchProfile(user.id);
    }
    if (profile) {
      retried.current = false;
      setProfileTimedOut(false);
      setShowLoadingText(false);
    }
  }, [loading, user, profile, fetchProfile]);

  // Two-stage UX so the user is never staring at a silent wordmark:
  //   1. After 1.5s without profile, show "Cargando tu perfil..." text so the
  //      athlete knows the app is alive and working.
  //   2. After 5s (was 12s), surface the Reintentar button. fetchProfile has
  //      a 6s per-attempt hard timeout now, so by 5s we know at least one
  //      attempt has resolved (success → no splash; failure → next attempt).
  //      Waiting longer just makes the bug feel like a crash. With the timeout
  //      in fetchProfile we can be more aggressive about offering the manual
  //      reload without false-positives on slow-but-recovering networks.
  useEffect(() => {
    if (!loading && user && !profile) {
      const textTimer = setTimeout(() => setShowLoadingText(true), 1500);
      const errorTimer = setTimeout(() => setProfileTimedOut(true), 5000);
      return () => { clearTimeout(textTimer); clearTimeout(errorTimer); };
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
        {showLoadingText && !profileTimedOut && (
          <p className="font-body text-[13px]" style={{ color: t.muted, opacity: 0.7 }}>
            Cargando tu perfil...
          </p>
        )}
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
                  setShowLoadingText(false);
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
