import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isExpired, hasOnboarded, isAdmin } = useAuth();
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

  // Wait for profile to load before redirect decisions
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0F0F0F" }}>
        <span className="font-display text-sm" style={{ color: "rgba(250,248,245,0.3)", fontWeight: 800, letterSpacing: "-0.04em" }}>
          LIFTORY
        </span>
      </div>
    );
  }

  // Onboarding check (except if already on onboarding-adjacent routes)
  if (!hasOnboarded() && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Admin route protection
  if (location.pathname.startsWith("/admin") && !isAdmin()) {
    return <Navigate to="/home" replace />;
  }

  // Expired users can only access /paywall and /profile
  if (isExpired() && !["/paywall", "/profile"].includes(location.pathname)) {
    return <Navigate to="/paywall" replace />;
  }

  return <>{children}</>;
}
