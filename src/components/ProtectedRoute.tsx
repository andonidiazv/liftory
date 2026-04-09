import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PROFILE_TIMEOUT_MS = 6000; // 6 seconds max waiting for profile

function LoadingSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAF8F5" }}>
      <span className="font-display text-sm" style={{ color: "rgba(28,28,30,0.2)", fontWeight: 800, letterSpacing: "-0.04em" }}>
        LIFTORY
      </span>
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin, hasOnboarded, refreshProfile } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Safety net: if profile doesn't load in 6s, stop waiting
  useEffect(() => {
    if (!loading && user && !profile) {
      // Try to re-fetch profile once
      refreshProfile();

      const timer = setTimeout(() => setTimedOut(true), PROFILE_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
    // Reset timeout if profile loads
    if (profile) setTimedOut(false);
  }, [loading, user, profile, refreshProfile]);

  if (loading) {
    return <LoadingSplash />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    // If we've waited too long, send to login instead of blank screen forever
    if (timedOut) {
      return <Navigate to="/login" replace />;
    }
    return <LoadingSplash />;
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
