import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

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
    return <Navigate to="/" replace />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
