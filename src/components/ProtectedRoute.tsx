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

  // Subscription check: if not active → paywall (except paywall itself)
  const isActive = profile.subscription_status === "active";
  if (!isActive && location.pathname !== "/paywall") {
    return <Navigate to="/paywall" replace />;
  }

  // Onboarding check (except if already on onboarding or paywall)
  if (isActive && !hasOnboarded() && !["/onboarding", "/paywall"].includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
