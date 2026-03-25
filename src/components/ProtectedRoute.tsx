import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin, hasOnboarded } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0F0F0F" }}>
        <span className="font-display text-sm" style={{ color: "rgba(250,248,245,0.3)", fontWeight: 800, letterSpacing: "-0.04em" }}>
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0F0F0F" }}>
        <span className="font-display text-sm" style={{ color: "rgba(250,248,245,0.3)", fontWeight: 800, letterSpacing: "-0.04em" }}>
          LIFTORY
        </span>
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
